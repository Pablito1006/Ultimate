import type { Project, Sequence } from "@adobe/premierepro";
import { PremiereError } from "../../core/errors/AppError";
import { Logger } from "../../core/logging/Logger";
import { getPremiereModule } from "../adapters/premiereModule";
import { guidToString } from "../clips/clipIdentity";
import { projectService } from "../project/ProjectService";
import { sequenceService } from "../sequence/SequenceService";
import { timelineService } from "../timeline/TimelineService";
import { transactionService } from "../transactions/TransactionService";

export class MarkerService {
  async addMarkerAtPlayhead(options: {
    name: string;
    comments?: string;
    markerType?: string;
    durationSeconds?: number;
  }): Promise<void> {
    const project = await projectService.requireActiveProject();
    const sequence = await sequenceService.requireActiveSequence(project);
    await this.addMarker(project, sequence, options);
  }

  async addMarker(
    project: Project,
    sequence: Sequence,
    options: {
      name: string;
      comments?: string;
      markerType?: string;
      startSeconds?: number;
      durationSeconds?: number;
    }
  ): Promise<void> {
    const ppro = getPremiereModule();
    try {
      const startSeconds =
        options.startSeconds !== undefined
          ? options.startSeconds
          : (await sequence.getPlayerPosition()).seconds;
      const durationSeconds = options.durationSeconds ?? 0;
      const markers = await ppro.Markers.getMarkers(sequence);
      const start = ppro.TickTime.createWithSeconds(startSeconds);
      const duration = ppro.TickTime.createWithSeconds(durationSeconds);
      const label = `MasterMotion: Add marker ${options.name}`;

      // Adobe ESLint requires executeTransaction visible in this file; boolean checked via TransactionService (D9).
      project.lockedAccess(() => {
        const committed = project.executeTransaction((ca) => {
          const action = markers.createAddMarkerAction(
            options.name,
            options.markerType || "Comment",
            start,
            duration,
            options.comments || ""
          );
          ca.addAction(action);
        }, label);
        transactionService.assertCommitted(committed, label);
      });

      timelineService.invalidateCache(guidToString(sequence.guid));
    } catch (cause) {
      Logger.error("addMarker failed", { cause: String(cause) });
      if (cause instanceof PremiereError) {
        throw cause;
      }
      throw new PremiereError("Unable to add marker.", { cause });
    }
  }

  async addMarkersBatch(
    project: Project,
    sequence: Sequence,
    items: Array<{ name: string; comments?: string; start: number; duration?: number }>
  ): Promise<void> {
    const ppro = getPremiereModule();
    const markers = await ppro.Markers.getMarkers(sequence);
    const label = "MasterMotion: Add caption markers";

    project.lockedAccess(() => {
      const committed = project.executeTransaction((ca) => {
        for (let i = 0; i < items.length; i += 1) {
          const item = items[i];
          const action = markers.createAddMarkerAction(
            item.name,
            "Comment",
            ppro.TickTime.createWithSeconds(item.start),
            ppro.TickTime.createWithSeconds(item.duration ?? 0),
            item.comments || ""
          );
          ca.addAction(action);
        }
      }, label);
      transactionService.assertCommitted(committed, label);
    });

    timelineService.invalidateCache(guidToString(sequence.guid));
  }
}

export const markerService = new MarkerService();
