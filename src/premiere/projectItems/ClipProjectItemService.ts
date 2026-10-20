import type { ClipProjectItem, ProjectItem } from "@adobe/premierepro";
import { PremiereError } from "../../core/errors/AppError";
import { Logger } from "../../core/logging/Logger";
import { getPremiereModule } from "../adapters/premiereModule";
import { projectService } from "../project/ProjectService";
import { binService } from "./BinService";

export interface MediaItemStatus {
  id: string;
  name: string;
  offline: boolean;
  hasProxy: boolean;
  proxyPath: string | null;
  canProxy: boolean;
  canChangeMediaPath: boolean;
  mediaPath: string | null;
}

/**
 * ClipProjectItem media / proxy / relink (Since 25.6).
 * attachProxy / changeMediaFilePath are **not undoable** per Adobe docs.
 * @see https://developer.adobe.com/premiere-pro/uxp/ppro-reference/classes/clipprojectitem/
 */
export class ClipProjectItemService {
  cast(item: ProjectItem): ClipProjectItem {
    const ppro = getPremiereModule();
    const castFn = ppro.ClipProjectItem?.cast;
    if (typeof castFn !== "function") {
      throw new PremiereError("ClipProjectItem.cast unavailable.");
    }
    return castFn(item);
  }

  async listRootMediaStatuses(): Promise<MediaItemStatus[]> {
    const root = await binService.getRootFolder();
    const items = await root.getItems();
    const out: MediaItemStatus[] = [];
    for (const item of items) {
      const status = await this.statusForProjectItem(item);
      if (status) {
        out.push(status);
      }
    }
    return out;
  }

  async statusForProjectItem(item: ProjectItem): Promise<MediaItemStatus | null> {
    try {
      const clip = this.cast(item);
      const type = (item as { type?: string | number }).type;
      // Skip obvious bins when type exposes BIN/ROOT
      if (type === "bin" || type === 1 /* common BIN enum in fakes */) {
        // Still try isSequence — bins may not cast cleanly
      }
      const isSeq =
        typeof clip.isSequence === "function" ? await clip.isSequence() : false;
      if (isSeq) {
        return null;
      }
      const offline =
        typeof clip.isOffline === "function" ? Boolean(await clip.isOffline()) : false;
      const hasProxy =
        typeof clip.hasProxy === "function" ? Boolean(await clip.hasProxy()) : false;
      const canProxy =
        typeof clip.canProxy === "function" ? Boolean(await clip.canProxy()) : false;
      const canChange =
        typeof clip.canChangeMediaPath === "function"
          ? Boolean(await clip.canChangeMediaPath())
          : false;
      let proxyPath: string | null = null;
      if (hasProxy && typeof clip.getProxyPath === "function") {
        proxyPath = (await clip.getProxyPath()) || null;
      }
      let mediaPath: string | null = null;
      const anyClip = clip as ClipProjectItem & {
        getMediaFilePath?: () => Promise<string>;
        mediaPath?: string;
      };
      if (typeof anyClip.getMediaFilePath === "function") {
        mediaPath = (await anyClip.getMediaFilePath()) || null;
      } else if (typeof anyClip.mediaPath === "string") {
        mediaPath = anyClip.mediaPath;
      }
      const withGuid = item as unknown as { guid?: { toString(): string } };
      const id =
        typeof withGuid.guid?.toString === "function" ? withGuid.guid.toString() : item.name;
      return {
        id,
        name: item.name,
        offline,
        hasProxy,
        proxyPath,
        canProxy,
        canChangeMediaPath: canChange,
        mediaPath,
      };
    } catch (cause) {
      Logger.warn("ClipProjectItem status skipped", {
        name: item.name,
        cause: String(cause),
      });
      return null;
    }
  }

  /**
   * Relink — NOT undoable. Caller must confirm.
   */
  async relink(itemName: string, newPath: string): Promise<boolean> {
    const item = await this.findRootItemByName(itemName);
    if (!item) {
      throw new PremiereError(`Item introuvable: ${itemName}`);
    }
    const clip = this.cast(item);
    const can =
      typeof clip.canChangeMediaPath === "function"
        ? await clip.canChangeMediaPath()
        : false;
    if (!can) {
      throw new PremiereError(`Relink impossible pour ${itemName} (canChangeMediaPath=false).`);
    }
    const ok = await clip.changeMediaFilePath(newPath, true);
    if (!ok) {
      return false;
    }
    const after = await this.statusForProjectItem(item);
    if (after?.offline) {
      throw new PremiereError(
        `Relink a renvoyé true mais isOffline reste true pour ${itemName} — effet non constaté.`
      );
    }
    return true;
  }

  /**
   * Attach proxy — NOT undoable.
   */
  async attachProxy(itemName: string, proxyPath: string): Promise<boolean> {
    const item = await this.findRootItemByName(itemName);
    if (!item) {
      throw new PremiereError(`Item introuvable: ${itemName}`);
    }
    const clip = this.cast(item);
    const can = typeof clip.canProxy === "function" ? await clip.canProxy() : false;
    if (!can) {
      throw new PremiereError(`Proxy impossible pour ${itemName} (canProxy=false).`);
    }
    const ok = await clip.attachProxy(proxyPath, false);
    if (!ok) {
      return false;
    }
    const after = await this.statusForProjectItem(item);
    if (!after?.hasProxy) {
      throw new PremiereError(
        `attachProxy true mais hasProxy=false pour ${itemName} — effet non constaté.`
      );
    }
    return true;
  }

  private async findRootItemByName(name: string): Promise<ProjectItem | null> {
    await projectService.requireActiveProject();
    const root = await binService.getRootFolder();
    const items = await root.getItems();
    return items.find((i) => i.name === name) ?? null;
  }
}

export const clipProjectItemService = new ClipProjectItemService();
