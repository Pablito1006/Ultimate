import { PremiereError } from "../../core/errors/AppError";
import { Logger } from "../../core/logging/Logger";
import { markerService } from "../../premiere/markers/MarkerService";
import { projectService } from "../../premiere/project/ProjectService";
import { sequenceService } from "../../premiere/sequence/SequenceService";
import { timelineService } from "../../premiere/timeline/TimelineService";
import {
  eventsFromClipBounds,
  suggestSoundEffects,
  type SoundSuggestion,
  type TimelineEvent,
} from "./soundDesignEngine";

export interface SoundDesignReport {
  events: TimelineEvent[];
  suggestions: SoundSuggestion[];
}

export class SoundDesignService {
  async analyzeAndSuggest(): Promise<SoundDesignReport> {
    const analysis = await timelineService.analyzeActive();
    const videoClips = analysis.clips.filter((c) => c.trackKind === "video");
    const events = eventsFromClipBounds(
      videoClips.map((c) => ({
        id: c.id,
        start: c.start,
        end: c.end,
        trackIndex: c.trackIndex,
        name: c.name,
      }))
    );

    for (let i = 0; i < analysis.markers.length; i += 1) {
      const marker = analysis.markers[i];
      events.push({
        id: `marker_${i}_${marker.start}`,
        type: "marker",
        time: marker.start,
        label: marker.name,
      });
    }

    const suggestions = suggestSoundEffects(events);
    return { events, suggestions };
  }

  /**
   * Places suggestion markers for user approval workflow (no silent mass media insert).
   */
  async applySuggestionMarkers(suggestions: SoundSuggestion[]): Promise<number> {
    if (suggestions.length === 0) {
      return 0;
    }
    const project = await projectService.requireActiveProject();
    const sequence = await sequenceService.requireActiveSequence(project);

    await markerService.addMarkersBatch(
      project,
      sequence,
      suggestions.map((s) => ({
        name: `SFX:${s.sfxName}`,
        comments: JSON.stringify({
          sfxId: s.sfxId,
          score: s.score,
          reason: s.reason,
          eventType: s.eventType,
          note: "Preview suggestion — import your SFX media manually or via a configured library path.",
        }),
        start: s.time,
        duration: 0.1,
      }))
    );

    Logger.info("SFX suggestion markers applied", { count: suggestions.length });
    return suggestions.length;
  }

  async setAudioTrackMute(trackIndex: number, mute: boolean): Promise<void> {
    const project = await projectService.requireActiveProject();
    const sequence = await sequenceService.requireActiveSequence(project);
    try {
      const count = await sequence.getAudioTrackCount();
      if (trackIndex < 0 || trackIndex >= count) {
        throw new PremiereError(`Audio track index out of range: ${trackIndex}`);
      }
      const track = await sequence.getAudioTrack(trackIndex);
      await track.setMute(mute);
    } catch (cause) {
      Logger.error("setAudioTrackMute failed", { cause: String(cause) });
      if (cause instanceof PremiereError) {
        throw cause;
      }
      throw new PremiereError("Unable to change audio track mute state.", { cause });
    }
  }
}

export const soundDesignService = new SoundDesignService();
