import type { Action, FolderItem, ProjectItem } from "@adobe/premierepro";
import { PremiereError } from "../../core/errors/AppError";
import { Logger } from "../../core/logging/Logger";
import { getPremiereModule } from "../adapters/premiereModule";
import { projectService } from "../project/ProjectService";
import { transactionService } from "../transactions/TransactionService";

export interface BinSnapshot {
  name: string;
  type: string;
}

/**
 * Project bins via FolderItem (Since 25.6).
 * @see https://developer.adobe.com/premiere-pro/uxp/ppro-reference/classes/folderitem/
 */
export class BinService {
  async getRootFolder(): Promise<FolderItem> {
    const project = await projectService.requireActiveProject();
    if (typeof project.getRootItem !== "function") {
      throw new PremiereError("Project.getRootItem unavailable.");
    }
    return project.getRootItem();
  }

  async listRootChildNames(): Promise<string[]> {
    const root = await this.getRootFolder();
    const items = await root.getItems();
    return items.map((i) => i.name);
  }

  async createBins(names: string[], undoLabel = "MasterMotion: Create bins"): Promise<number> {
    const project = await projectService.requireActiveProject();
    const root = await this.getRootFolder();
    const existing = new Set((await root.getItems()).map((i) => i.name.toLowerCase()));
    const toCreate = names.filter((n) => !existing.has(n.toLowerCase()));
    if (toCreate.length === 0) {
      return 0;
    }

    // Adobe ESLint requires executeTransaction / action creation visible here (D9 via assertCommitted).
    project.lockedAccess(() => {
      const committed = project.executeTransaction((ca) => {
        for (const name of toCreate) {
          const action = root.createBinAction(name, true) as Action;
          ca.addAction(action);
        }
      }, undoLabel);
      transactionService.assertCommitted(committed, undoLabel);
    });

    // Re-read
    const after = await root.getItems();
    const afterNames = new Set(after.map((i) => i.name.toLowerCase()));
    let created = 0;
    for (const name of toCreate) {
      if (afterNames.has(name.toLowerCase())) {
        created += 1;
      }
    }
    if (created < toCreate.length) {
      Logger.warn("Bin create verify incomplete", {
        expected: toCreate.length,
        created,
      });
    }
    return created;
  }

  async importFiles(
    filePaths: string[],
    opts?: { suppressUI?: boolean; targetBinName?: string }
  ): Promise<boolean> {
    const project = await projectService.requireActiveProject();
    if (typeof project.importFiles !== "function") {
      throw new PremiereError("Project.importFiles unavailable.");
    }
    let target: ProjectItem | undefined;
    if (opts?.targetBinName) {
      const root = await this.getRootFolder();
      const items = await root.getItems();
      const found = items.find((i) => i.name === opts.targetBinName);
      target = found;
    }
    const ok = await project.importFiles(filePaths, opts?.suppressUI ?? true, target);
    return Boolean(ok);
  }

  async createSequence(name: string, presetPath?: string): Promise<boolean> {
    const project = await projectService.requireActiveProject();
    try {
      if (presetPath && typeof project.createSequenceWithPresetPath === "function") {
        await project.createSequenceWithPresetPath(name, presetPath);
        return true;
      }
      if (typeof project.createSequence === "function") {
        await project.createSequence(name, presetPath);
        return true;
      }
      return false;
    } catch (cause) {
      Logger.error("createSequence failed", { cause: String(cause) });
      throw new PremiereError("Impossible de créer la séquence.", { cause });
    }
  }

  async getActiveProductionName(): Promise<string | null> {
    const ppro = getPremiereModule();
    const prod = ppro.PRProduction as { getActiveProduction?: () => { name?: string } | null } | undefined;
    if (!prod?.getActiveProduction) {
      return null;
    }
    try {
      const active = prod.getActiveProduction();
      if (!active) {
        return null;
      }
      return active.name ?? "(production active)";
    } catch {
      return null;
    }
  }
}

export const binService = new BinService();
