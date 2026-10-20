import { Logger } from "../../core/logging/Logger";
import type { AiConsentState } from "../../features/ai/aiTypes";
import { DEFAULT_AI_CONSENT } from "../../features/ai/aiTypes";
import type { CaptionStyleId } from "../../features/subtitles/captionStyles";
import type { MacroTriggerBinding } from "../../features/macros/macroTriggers";
import type { Macro } from "../../features/macros/macroTypes";
import { BUILTIN_MACROS } from "../../features/macros/MacroRunner";
import { getUxpModule, isUxpRuntimeAvailable } from "../../premiere/adapters/uxpModule";

export interface PluginSettings {
  theme: "dark" | "light";
  language: "en" | "fr";
  transcriptionProvider: string;
  defaultCaptionStyle: CaptionStyleId;
  loggingLevel: "debug" | "info" | "warn" | "error";
  macros: Macro[];
  favoriteTemplateIds: string[];
  recentTemplateIds: string[];
  /** Optional user-chosen local templates folder (absolute path). */
  templateLibraryPath: string;
  /** commandId → chord (e.g. "mod+k"). */
  shortcuts: Record<string, string>;
  /** Opt-in EventManager → macro bindings (disabled by default). */
  macroTriggers: MacroTriggerBinding[];
  /**
   * AI consent flags only — API key lives in AiKeyStore (never here).
   */
  ai: AiConsentState;
}

const STORAGE_KEY = "mastermotion.settings.v1";

const DEFAULT_SETTINGS: PluginSettings = {
  theme: "dark",
  language: "en",
  transcriptionProvider: "mock",
  defaultCaptionStyle: "minimal",
  loggingLevel: "info",
  macros: BUILTIN_MACROS,
  favoriteTemplateIds: [],
  recentTemplateIds: [],
  templateLibraryPath: "",
  shortcuts: {
    "cmd.palette": "mod+k",
    "cmd.macros.runSelected": "mod+shift+m",
  },
  macroTriggers: [],
  ai: { ...DEFAULT_AI_CONSENT },
};

function readLocalStorage(): string | null {
  try {
    if (typeof localStorage !== "undefined") {
      return localStorage.getItem(STORAGE_KEY);
    }
  } catch {
    // ignore
  }
  return null;
}

function writeLocalStorage(raw: string): void {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(STORAGE_KEY, raw);
    }
  } catch {
    // ignore
  }
}

export class SettingsService {
  private cache: PluginSettings | null = null;

  getDefaults(): PluginSettings {
    return {
      ...DEFAULT_SETTINGS,
      macros: DEFAULT_SETTINGS.macros.map((m) => ({
        ...m,
        actions: m.actions.map((a) => ({ ...a, params: a.params ? { ...a.params } : undefined })),
      })),
      favoriteTemplateIds: DEFAULT_SETTINGS.favoriteTemplateIds.slice(),
      recentTemplateIds: DEFAULT_SETTINGS.recentTemplateIds.slice(),
      templateLibraryPath: DEFAULT_SETTINGS.templateLibraryPath,
      shortcuts: { ...DEFAULT_SETTINGS.shortcuts },
      macroTriggers: DEFAULT_SETTINGS.macroTriggers.slice(),
      ai: { ...DEFAULT_AI_CONSENT },
    };
  }

  async load(): Promise<PluginSettings> {
    if (this.cache) {
      return this.cache;
    }

    let raw: string | null = null;
    if (isUxpRuntimeAvailable()) {
      try {
        const uxp = getUxpModule();
        // persistent storage when available
        const storage = (uxp as { storage?: { localStorage?: Storage } }).storage;
        raw = storage?.localStorage?.getItem(STORAGE_KEY) ?? readLocalStorage();
      } catch {
        raw = readLocalStorage();
      }
    } else {
      raw = readLocalStorage();
    }

    if (!raw) {
      this.cache = this.getDefaults();
      return this.cache;
    }

    try {
      const parsed = JSON.parse(raw) as Partial<PluginSettings>;
      this.cache = {
        ...this.getDefaults(),
        ...parsed,
        macros: Array.isArray(parsed.macros) && parsed.macros.length > 0 ? parsed.macros : this.getDefaults().macros,
        favoriteTemplateIds: Array.isArray(parsed.favoriteTemplateIds)
          ? parsed.favoriteTemplateIds
          : [],
        recentTemplateIds: Array.isArray(parsed.recentTemplateIds) ? parsed.recentTemplateIds : [],
        templateLibraryPath:
          typeof parsed.templateLibraryPath === "string" ? parsed.templateLibraryPath : "",
        shortcuts:
          parsed.shortcuts && typeof parsed.shortcuts === "object"
            ? { ...DEFAULT_SETTINGS.shortcuts, ...parsed.shortcuts }
            : { ...DEFAULT_SETTINGS.shortcuts },
        macroTriggers: Array.isArray(parsed.macroTriggers) ? parsed.macroTriggers : [],
        ai: {
          ...DEFAULT_AI_CONSENT,
          ...(parsed.ai && typeof parsed.ai === "object" ? parsed.ai : {}),
          // Never accept a key from settings JSON
        },
      };
      return this.cache;
    } catch (cause) {
      Logger.warn("Settings parse failed, using defaults", { cause: String(cause) });
      this.cache = this.getDefaults();
      return this.cache;
    }
  }

  async save(next: PluginSettings): Promise<void> {
    this.cache = next;
    const raw = JSON.stringify(next);
    writeLocalStorage(raw);
    if (isUxpRuntimeAvailable()) {
      try {
        const uxp = getUxpModule();
        const storage = (uxp as { storage?: { localStorage?: Storage } }).storage;
        storage?.localStorage?.setItem(STORAGE_KEY, raw);
      } catch (cause) {
        Logger.warn("UXP settings persist failed; localStorage used", { cause: String(cause) });
      }
    }
  }

  async update(partial: Partial<PluginSettings>): Promise<PluginSettings> {
    const current = await this.load();
    const next = { ...current, ...partial };
    await this.save(next);
    return next;
  }
}

export const settingsService = new SettingsService();
