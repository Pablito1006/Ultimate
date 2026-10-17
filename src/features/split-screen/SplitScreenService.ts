import type { VideoClipTrackItem } from "@adobe/premierepro";
import { PremiereError } from "../../core/errors/AppError";
import { Logger } from "../../core/logging/Logger";
import { getPremiereModule } from "../../premiere/adapters/premiereModule";
import { projectService } from "../../premiere/project/ProjectService";
import { sequenceService } from "../../premiere/sequence/SequenceService";
import { timelineService } from "../../premiere/timeline/TimelineService";
import {
  calculateGridLayout,
  type LayoutCell,
  type LayoutType,
  type SplitScreenConfig,
} from "./layoutEngine";

export interface SplitScreenPlan {
  cells: LayoutCell[];
  config: SplitScreenConfig;
  clipNames: string[];
  limitation: string;
}

/**
 * Plans geometric split layouts and aligns candidate clips to a shared start time
 * across consecutive video tracks. Crop/scale transforms are not invented —
 * Premiere Motion effect params are not fully exposed for arbitrary setValue here.
 */
export class SplitScreenService {
  async plan(layout: LayoutType, gap = 8): Promise<SplitScreenPlan> {
    const analysis = await timelineService.analyzeActive();
    const videoClips = analysis.clips.filter((c) => c.trackKind === "video");
    const clipCount = Math.max(1, Math.min(videoClips.length || 2, 9));
    const config: SplitScreenConfig = {
      layout,
      gap,
      border: 0,
      padding: 0,
      margin: 0,
      width: analysis.frameWidth || 1920,
      height: analysis.frameHeight || 1080,
      clipCount,
    };
    const cells = calculateGridLayout(config);
    return {
      cells,
      config,
      clipNames: videoClips.slice(0, cells.length).map((c) => c.name),
      limitation:
        "Layout geometry is calculated. Aligning clip starts across tracks is applied when possible. " +
        "Per-clip crop/scale requires Motion effect parameters or a MOGRT — not simulated.",
    };
  }

  /**
   * Aligns the first N video clips (one per track when possible) to the playhead time.
   */
  async alignClipsToPlayhead(clipCount: number): Promise<number> {
    const project = await projectService.requireActiveProject();
    const sequence = await sequenceService.requireActiveSequence(project);
    const ppro = getPremiereModule();

    try {
      const playhead = await sequence.getPlayerPosition();
      const videoCount = await sequence.getVideoTrackCount();
      const moves: Array<{
        item: VideoClipTrackItem;
        deltaSeconds: number;
      }> = [];
      let used = 0;

      for (let t = 0; t < videoCount && used < clipCount; t += 1) {
        const track = await sequence.getVideoTrack(t);
        const items = track.getTrackItems(ppro.Constants.TrackItemType.CLIP, false);
        if (items.length === 0) {
          continue;
        }
        const item = items[0];
        const start = await item.getStartTime();
        moves.push({ item, deltaSeconds: playhead.seconds - start.seconds });
        used += 1;
      }

      if (moves.length === 0) {
        throw new PremiereError("No video clips found to align for split screen.");
      }

      project.lockedAccess(() => {
        project.executeTransaction((ca) => {
          for (let i = 0; i < moves.length; i += 1) {
            ca.addAction(
              moves[i].item.createMoveAction(
                ppro.TickTime.createWithSeconds(moves[i].deltaSeconds)
              )
            );
          }
        }, "MasterMotion: Align split-screen clips");
      });

      return moves.length;
    } catch (cause) {
      Logger.error("Split screen align failed", { cause: String(cause) });
      if (cause instanceof PremiereError) {
        throw cause;
      }
      throw new PremiereError("Unable to align clips for split screen.", { cause });
    }
  }
}

export const splitScreenService = new SplitScreenService();
