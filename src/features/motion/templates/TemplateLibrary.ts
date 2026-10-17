import { Logger } from "../../../core/logging/Logger";
import { settingsService } from "../../../services/storage/SettingsService";
import type { MotionCategory, MotionTemplateDefinition, TemplateStatus } from "../templateTypes";
import { hydrateTemplate } from "./builtinCatalog";
import { GENERATED_TEMPLATES } from "./generatedCatalog";
import { draftTemplateFromMasters, extractMasterProperties, type MogrtMasterProperty } from "./mogrtInspector";
import { validateTemplateJson } from "./validateTemplateJson";

export interface TemplateSearchOptions {
  query?: string;
  category?: MotionCategory | "all";
  status?: TemplateStatus | "all";
  favoritesOnly?: boolean;
  recentOnly?: boolean;
}

/**
 * Local template library: embedded catalog + optional user folder entries,
 * favorites / recents via SettingsService.
 */
export class TemplateLibrary {
  private cache: MotionTemplateDefinition[] | null = null;
  private userImports: MotionTemplateDefinition[] = [];

  /** Load / refresh cache (embedded + user imports). */
  async listAll(): Promise<MotionTemplateDefinition[]> {
    if (this.cache) {
      return this.cache.slice();
    }
    const embedded = GENERATED_TEMPLATES.map((t) => hydrateTemplate(t));
    this.cache = embedded.concat(this.userImports.map((t) => hydrateTemplate(t)));
    return this.cache.slice();
  }

  invalidate(): void {
    this.cache = null;
  }

  async getById(id: string): Promise<MotionTemplateDefinition | undefined> {
    const all = await this.listAll();
    return all.find((t) => t.id === id);
  }

  async search(options: TemplateSearchOptions = {}): Promise<MotionTemplateDefinition[]> {
    const all = await this.listAll();
    const settings = await settingsService.load();
    const q = (options.query || "").trim().toLowerCase();
    const fav = new Set(settings.favoriteTemplateIds || []);
    const recent = new Set(settings.recentTemplateIds || []);

    return all.filter((t) => {
      if (options.category && options.category !== "all" && t.category !== options.category) {
        return false;
      }
      if (options.status && options.status !== "all" && t.status !== options.status) {
        return false;
      }
      if (options.favoritesOnly && !fav.has(t.id)) {
        return false;
      }
      if (options.recentOnly && !recent.has(t.id)) {
        return false;
      }
      if (!q) {
        return true;
      }
      const hay = `${t.name} ${t.category} ${t.tags.join(" ")} ${t.description}`.toLowerCase();
      return hay.indexOf(q) >= 0;
    });
  }

  async listCategories(): Promise<MotionCategory[]> {
    const all = await this.listAll();
    const set = new Set<MotionCategory>();
    for (const t of all) {
      set.add(t.category);
    }
    return Array.from(set).sort();
  }

  async toggleFavorite(id: string): Promise<string[]> {
    const settings = await settingsService.load();
    const current = settings.favoriteTemplateIds.slice();
    const idx = current.indexOf(id);
    if (idx >= 0) {
      current.splice(idx, 1);
    } else {
      current.push(id);
    }
    await settingsService.update({ favoriteTemplateIds: current });
    return current;
  }

  async pushRecent(id: string): Promise<string[]> {
    const settings = await settingsService.load();
    const next = [id].concat((settings.recentTemplateIds || []).filter((x) => x !== id)).slice(0, 20);
    await settingsService.update({ recentTemplateIds: next });
    return next;
  }

  /**
   * Register an imported template (mogrt + template.json already validated).
   */
  importDefinition(raw: unknown): MotionTemplateDefinition {
    const result = validateTemplateJson(raw);
    if (!result.ok || !result.template) {
      throw new Error(
        `Invalid template.json: ${result.issues.map((i) => i.message).join("; ")}`
      );
    }
    this.userImports = this.userImports.filter((t) => t.id !== result.template!.id);
    this.userImports.push(result.template);
    this.invalidate();
    Logger.info("Template imported", { id: result.template.id, status: result.template.status });
    return result.template;
  }

  /**
   * Assisted draft from unknown .mogrt master property list (already inspected).
   */
  draftFromMogrtMasters(
    id: string,
    masters: MogrtMasterProperty[],
    mogrtFileName: string
  ): Record<string, unknown> {
    return draftTemplateFromMasters(id, masters, mogrtFileName);
  }

  /**
   * Parse a definition.json object extracted from a .mogrt (Node or pre-unzipped).
   */
  mastersFromDefinition(definition: unknown): MogrtMasterProperty[] {
    return extractMasterProperties(definition);
  }

  /** Resolve absolute mogrt path when known (user library / test). */
  resolveMogrtPath(template: MotionTemplateDefinition, baseDir?: string): string | null {
    const rel = template.mogrt || template.mogrtPath;
    if (!rel) {
      return null;
    }
    if (/^[a-zA-Z]:[\\/]/.test(rel) || rel.startsWith("/") || rel.startsWith("\\\\")) {
      return rel;
    }
    if (baseDir) {
      const sep = baseDir.includes("\\") ? "\\" : "/";
      return `${baseDir.replace(/[\\/]$/, "")}${sep}${rel}`;
    }
    return rel;
  }
}

export const templateLibrary = new TemplateLibrary();
