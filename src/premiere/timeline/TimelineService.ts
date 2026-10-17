import type { Project, Sequence, VideoClipTrackItem } from "@adobe/premierepro";
import { PremiereError } from "../../core/errors/AppError";
import { Logger } from "../../core/logging/Logger";
import { getPremiereModule } from "../adapters/premiereModule";
import { projectService } from "../project/ProjectService";
import { sequenceService } from "../sequence/SequenceService";

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
  frameWidth: number;
  frameHeight: number;
  videoTrackCount: number;
  audioTrackCount: number;
  captionTrackCount: number;
  playerPosition: number;
  endTime: number;
  clips: TimelineClipInfo[];
  markers: TimelineMarkerInfo[];
}

export class TimelineService {
  async analyzeActive(): Promise<TimelineAnalysis> {
    const project = await projectService.requireActiveProject();
    const sequence = await sequenceService.requireActiveSequence(project);
    return this.analyzeSequence(sequence);
  }

  async analyzeSequence(sequence: Sequence): Promise<TimelineAnalysis> {
    const ppro = getPremiereModule();
    try {
      const videoTrackCount = await sequence.getVideoTrackCount();
      const audioTrackCount = await sequence.getAudioTrackCount();
      const captionTrackCount = await sequence.getCaptionTrackCount();
      const frameSize = await sequence.getFrameSize();
      const playerPosition = await sequence.getPlayerPosition();
      const endTime = await sequence.getEndTime();

      const clips: TimelineClipInfo[] = [];

      for (let v = 0; v < videoTrackCount; v += 1) {
        const track = await sequence.getVideoTrack(v);
        const items = track.getTrackItems(ppro.Constants.TrackItemType.CLIP, false);
        for (let i = 0; i < items.length; i += 1) {
          clips.push(await this.readClip(items[i], v, "video"));
        }
      }

      for (let a = 0; a < audioTrackCount; a += 1) {
        const track = await sequence.getAudioTrack(a);
        const items = track.getTrackItems(ppro.Constants.TrackItemType.CLIP, false);
        for (let i = 0; i < items.length; i += 1) {
          const item = items[i];
          const name = await item.getName();
          const start = await item.getStartTime();
          const end = await item.getEndTime();
          const duration = await item.getDuration();
          clips.push({
            id: `a${a}_${i}_${name}`,
            name,
            trackIndex: a,
            trackKind: "audio",
            start: start.seconds,
            end: end.seconds,
            duration: duration.seconds,
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

      return {
        sequenceName: sequence.name,
        frameWidth: frameSize.width,
        frameHeight: frameSize.height,
        videoTrackCount,
        audioTrackCount,
        captionTrackCount,
        playerPosition: playerPosition.seconds,
        endTime: endTime.seconds,
        clips: clips.sort((a, b) => a.start - b.start || a.trackIndex - b.trackIndex),
        markers: markers.sort((a, b) => a.start - b.start),
      };
    } catch (cause) {
      Logger.error("Timeline analysis failed", { cause: String(cause) });
      throw new PremiereError("Unable to analyze the active timeline.", { cause });
    }
  }

  private async readClip(
    item: VideoClipTrackItem,
    trackIndex: number,
    trackKind: "video" | "audio"
  ): Promise<TimelineClipInfo> {
    const name = await item.getName();
    const start = await item.getStartTime();
    const end = await item.getEndTime();
    const duration = await item.getDuration();
    return {
      id: `${trackKind[0]}${trackIndex}_${name}_${start.seconds}`,
      name,
      trackIndex,
      trackKind,
      start: start.seconds,
      end: end.seconds,
      duration: duration.seconds,
    };
  }

  async listSelectedProjectItems(project: Project): Promise<Array<{ id: string; name: string }>> {
    const ppro = getPremiereModule();
    try {
      const selection = await ppro.ProjectUtils.getSelection(project);
      const items = await selection.getItems();
      return items.map((item, index) => ({
        id: `pi_${index}_${item.name}`,
        name: item.name,
      }));
    } catch (cause) {
      Logger.error("getSelection failed", { cause: String(cause) });
      throw new PremiereError("Unable to read project panel selection.", { cause });
    }
  }
}

export const timelineService = new TimelineService();
