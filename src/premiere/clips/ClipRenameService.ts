import type { VideoClipTrackItem } from "@adobe/premierepro";
import { PremiereError } from "../../core/errors/AppError";
import { Logger } from "../../core/logging/Logger";
import type { RenamePreviewItem } from "../../features/batch-renaming/renameEngine";
import { getPremiereModule } from "../adapters/premiereModule";
import { projectService } from "../project/ProjectService";
import { sequenceService } from "../sequence/SequenceService";

/**
 * Applies rename preview results to selected ProjectItems via createSetNameAction.
 */
export class ClipRenameService {
  async applyProjectItemRenames(previews: RenamePreviewItem[]): Promise<number> {
    const project = await projectService.requireActiveProject();
    const changed = previews.filter((p) => p.changed);
    if (changed.length === 0) {
      return 0;
    }

    const ppro = getPremiereModule();
    try {
      const selection = await ppro.ProjectUtils.getSelection(project);
      const items = await selection.getItems();
      const byName = new Map<string, typeof items>();

      for (let i = 0; i < items.length; i += 1) {
        const item = items[i];
        const list = byName.get(item.name) ?? [];
        list.push(item);
        byName.set(item.name, list);
      }

      let applied = 0;
      project.lockedAccess(() => {
        project.executeTransaction((ca) => {
          for (let i = 0; i < changed.length; i += 1) {
            const preview = changed[i];
            const bucket = byName.get(preview.before);
            const target = bucket && bucket.length > 0 ? bucket.shift() : undefined;
            if (!target) {
              continue;
            }
            ca.addAction(target.createSetNameAction(preview.after));
            applied += 1;
          }
        }, "MasterMotion: Batch rename");
      });

      return applied;
    } catch (cause) {
      Logger.error("Batch rename failed", { cause: String(cause) });
      throw new PremiereError("Unable to apply batch rename.", { cause });
    }
  }

  async applyTimelineClipRenames(
    renames: Array<{ trackIndex: number; clipName: string; newName: string }>
  ): Promise<number> {
    if (renames.length === 0) {
      return 0;
    }

    const project = await projectService.requireActiveProject();
    const sequence = await sequenceService.requireActiveSequence(project);
    const ppro = getPremiereModule();

    try {
      const planned = renames.slice();
      let applied = 0;
      const videoCount = await sequence.getVideoTrackCount();
      const matched: Array<{ item: VideoClipTrackItem; newName: string }> = [];

      for (let t = 0; t < videoCount; t += 1) {
        const track = await sequence.getVideoTrack(t);
        const items = track.getTrackItems(ppro.Constants.TrackItemType.CLIP, false);
        for (let i = 0; i < items.length; i += 1) {
          const item = items[i];
          const name = await item.getName();
          const match = planned.find((r) => r.trackIndex === t && r.clipName === name);
          if (match) {
            matched.push({ item, newName: match.newName });
          }
        }
      }

      if (matched.length === 0) {
        return 0;
      }

      project.lockedAccess(() => {
        project.executeTransaction((ca) => {
          for (let i = 0; i < matched.length; i += 1) {
            ca.addAction(matched[i].item.createSetNameAction(matched[i].newName));
            applied += 1;
          }
        }, "MasterMotion: Rename timeline clips");
      });

      return applied;
    } catch (cause) {
      Logger.error("Timeline clip rename failed", { cause: String(cause) });
      throw new PremiereError("Unable to rename timeline clips.", { cause });
    }
  }
}

export const clipRenameService = new ClipRenameService();
