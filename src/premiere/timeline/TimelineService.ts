import type { Project, Sequence, VideoClipTrackItem } from "@adobe/premierepro";
import { PremiereError } from "../../core/errors/AppError";
import { Logger } from "../../core/logging/Logger";
import { getPremiereModule } from "../adapters/premiereModule";
import { buildClipId, guidToString } from "../clips/clipIdentity";
import { projectService } from "../project/ProjectService";
import { sequenceService } from "../sequence/SequenceService";
import { timelineCache } from "./TimelineCache";

export interface TimelineClipInfo {
  id: string;
  name: string;
  trackIndex: number;
  trackKind: "video" | "audio";
  start: number;
  end: number;
  duration: number;
}

export interface TimelineMarkerInfo {
  name: string;
  comments: string;
  type: string;
  start: number;
  duration: number;
}

export interface TimelineAnalysis {
  sequenceName: string;
  sequenceGuid: string;
  projectGuid: string;
  frameWidth: number;
  frameHeight: number;
  videoTrackCount: number;
  audioTrackCount: number;
  captionTrackCount: number;
  playerPosition: number;
  endTime: number;
  clips: TimelineClipInfo[];
  markers: TimelineMarkerInfo[];
  /** Milliseconds spent reading from Premiere (excludes cache hits). */
  readMs: number;
  fromCache: boolean;
}

export interface AnalyzeOptions {
  /** Bypass cache and force a fresh read. */
  bypassCache?: boolean;
}

type ClipTimes = {
  name: string;
  start: number;
  end: number;
  duration: number;
};

export class TimelineService {
  async analyzeActive(options: AnalyzeOptions = {}): Promise<TimelineAnalysis> {
    const project = await projectService.requireActiveProject();
    const sequence = await sequenceService.requireActiveSequence(project);
    return this.analyzeSequence(sequence, project, options);
  }

  async analyzeSequence(
    sequence: Sequence,
    project?: Project,
    options: AnalyzeOptions = {}
  ): Promise<TimelineAnalysis> {
    const activeProject = project ?? (await projectService.requireActiveProject());
    const projectGuid = guidToString(activeProject.guid);
    const sequenceGuid = guidToString(sequence.guid);
    const cacheKey = timelineCache.buildKey(sequenceGuid, sequence.name);

    if (!options.bypassCache) {
      const cached = timelineCache.get(cacheKey);
      if (cached) {
        return { ...cached, fromCache: true, readMs: 0 };
      }
    }

    const ppro = getPremiereModule();
    const started = Date.now();
    try {
      const [videoTrackCount, audioTrackCount, captionTrackCount, frameSize, playerPosition, endTime] =
        await Promise.all([
          sequence.getVideoTrackCount(),
          sequence.getAudioTrackCount(),
          sequence.getCaptionTrackCount(),
          sequence.getFrameSize(),
          sequence.getPlayerPosition(),
          sequence.getEndTime(),
        ]);

      const videoTrackIndexes = Array.from({ length: videoTrackCount }, (_, i) => i);
      const audioTrackIndexes = Array.from({ length: audioTrackCount }, (_, i) => i);

      const videoTracks = await Promise.all(
        videoTrackIndexes.map((v) => sequence.getVideoTrack(v))
      );
      const audioTracks = await Promise.all(
        audioTrackIndexes.map((a) => sequence.getAudioTrack(a))
      );

      const videoItemGroups = videoTracks.map((track) =>
        track.getTrackItems(ppro.Constants.TrackItemType.CLIP, false)
      );
      const audioItemGroups = audioTracks.map((track) =>
        track.getTrackItems(ppro.Constants.TrackItemType.CLIP, false)
      );

      const clips: TimelineClipInfo[] = [];

      for (let v = 0; v < videoItemGroups.length; v += 1) {
        const items = videoItemGroups[v] as VideoClipTrackItem[];
        const times = await this.readClipsBatched(items);
        for (let i = 0; i < times.length; i += 1) {
          const t = times[i];
          clips.push({
            id: buildClipId({
              trackKind: "video",
              trackIndex: v,
              startSeconds: t.start,
              endSeconds: t.end,
              name: t.name,
              projectGuid,
            }),
            name: t.name,
            trackIndex: v,
            trackKind: "video",
            start: t.start,
            end: t.end,
            duration: t.duration,
          });
        }
      }

      for (let a = 0; a < audioItemGroups.length; a += 1) {
        const items = audioItemGroups[a];
        const times = await this.readClipsBatched(items);
        for (let i = 0; i < times.length; i += 1) {
          const t = times[i];
          clips.push({
            id: buildClipId({
              trackKind: "audio",
              trackIndex: a,
              startSeconds: t.start,
              endSeconds: t.end,
              name: t.name,
              projectGuid,
            }),
            name: t.name,
            trackIndex: a,
            trackKind: "audio",
            start: t.start,
            end: t.end,
            duration: t.duration,
          });
        }
      }

      const markersApi = await ppro.Markers.getMarkers(sequence);
      const rawMarkers = markersApi.getMarkers();
      const markers: TimelineMarkerInfo[] = [];
      for (let m = 0; m < rawMarkers.length; m += 1) {
        const marker = rawMarkers[m];
        const start = marker.getStart();
        const duration = marker.getDuration();
        markers.push({
          name: marker.getName(),
          comments: marker.getComments(),
          type: marker.getType(),
          start: start.seconds,
          duration: duration.seconds,
        });
      }

      const analysis: TimelineAnalysis = {
        sequenceName: sequence.name,
        sequenceGuid,
        projectGuid,
        frameWidth: frameSize.width,
        frameHeight: frameSize.height,
        videoTrackCount,
        audioTrackCount,
        captionTrackCount,
        playerPosition: playerPosition.seconds,
        endTime: endTime.seconds,
        clips: clips.sort((a, b) => a.start - b.start || a.trackIndex - b.trackIndex),
        markers: markers.sort((a, b) => a.start - b.start),
        readMs: Date.now() - started,
        fromCache: false,
      };

      timelineCache.set(cacheKey, analysis);
      return analysis;
    } catch (cause) {
      Logger.error("Timeline analysis failed", { cause: String(cause) });
      throw new PremiereError("Unable to analyze the active timeline.", { cause });
    }
  }

  /**
   * Batch-read clip metadata with Promise.all (D6) instead of serial await.
   */
  private async readClipsBatched(
    items: Array<{
      getName: () => Promise<string>;
      getStartTime: () => Promise<{ seconds: number }>;
      getEndTime: () => Promise<{ seconds: number }>;
      getDuration: () => Promise<{ seconds: number }>;
    }>
  ): Promise<ClipTimes[]> {
    return Promise.all(
      items.map(async (item) => {
        const [name, start, end, duration] = await Promise.all([
          item.getName(),
          item.getStartTime(),
          item.getEndTime(),
          item.getDuration(),
        ]);
        return {
          name,
          start: start.seconds,
          end: end.seconds,
          duration: duration.seconds,
        };
      })
    );
  }

  invalidateCache(sequenceGuid?: string): void {
    if (sequenceGuid) {
      timelineCache.invalidateSequence(sequenceGuid);
    } else {
      timelineCache.invalidateAll();
    }
  }

  async listSelectedProjectItems(project: Project): Promise<Array<{ id: string; name: string }>> {
    const ppro = getPremiereModule();
    try {
      const selection = await ppro.ProjectUtils.getSelection(project);
      const items = await selection.getItems();
      const projectGuid = guidToString(project.guid);
      return items.map((item, index) => ({
        id: buildClipId({
          trackKind: "video",
          trackIndex: index,
          startSeconds: 0,
          endSeconds: 0,
          name: item.name,
          projectGuid,
        }),
        name: item.name,
      }));
    } catch (cause) {
      Logger.error("getSelection failed", { cause: String(cause) });
      throw new PremiereError("Unable to read project panel selection.", { cause });
    }
  }
}

export const timelineService = new TimelineService();
