import { assertPlanReady } from "../preview/guards";
import type { ApplyReport, PreviewablePlan, PreviewSummary, PreviewVisual, VerifyReport } from "../preview/types";
import { timelineService } from "../../premiere/timeline/TimelineService";
import {
  eventsFromClipBounds,
  suggestSoundEffects,
  type SoundSuggestion,
  type TimelineEvent,
} from "./soundDesignEngine";
import { soundDesignService } from "./SoundDesignService";

export interface SoundPlanInput {
  /** Reserved for future thresholds. */
  minScore?: number;
}

export interface SoundPlan {
  events: TimelineEvent[];
  suggestions: SoundSuggestion[];
  sequenceEnd: number;
  playhead: number;
  clips: Array<{ start: number; end: number; track: number; label: string }>;
}

/** Pure sound plan from clip/marker-like events. */
export function planSoundPure(
  clips: Array<{ id: string; start: number; end: number; trackIndex: number; name: string }>,
  markers: Array<{ start: number; name: string }> = []
): Pick<SoundPlan, "events" | "suggestions"> {
  const events = eventsFromClipBounds(clips);
  for (let i = 0; i < markers.length; i += 1) {
    events.push({
      id: `marker_${i}_${markers[i].start}`,
      type: "marker",
      time: markers[i].start,
      label: markers[i].name,
    });
  }
  return {
    events,
    suggestions: suggestSoundEffects(events),
  };
}

export const soundPreviewable: PreviewablePlan<SoundPlanInput, SoundPlan> = {
  id: "sound",
  label: "Sound design",

  async plan(input) {
    void input;
    const analysis = await timelineService.analyzeActive();
    const videoClips = analysis.clips.filter((c) => c.trackKind === "video");
    const pure = planSoundPure(
      videoClips.map((c) => ({
        id: c.id,
        start: c.start,
        end: c.end,
        trackIndex: c.trackIndex,
        name: c.name,
      })),
      analysis.markers.map((m) => ({ start: m.start, name: m.name }))
    );
    return {
      ...pure,
      sequenceEnd: analysis.endTime,
      playhead: analysis.playerPosition,
      clips: videoClips.map((c) => ({
        start: c.start,
        end: c.end,
        track: c.trackIndex,
        label: c.name,
      })),
    };
  },

  describe(plan): PreviewSummary {
    return {
      title: "Sound",
      headline: `${plan.events.length} event(s), ${plan.suggestions.length} SFX suggestion(s)`,
      counts: {
        events: plan.events.length,
        suggestions: plan.suggestions.length,
      },
      warnings: [
        "Suggestions never insert media. Apply places approval markers only.",
        "Loudness/ducking not claimed without Premiere API support.",
      ],
      estimatedMs: Math.max(40, plan.suggestions.length * 25),
      levels: ["A"],
      levelCNote: "Level C unavailable in WP1.",
      changes: plan.suggestions.map((s) => ({
        id: `${s.eventId}_${s.sfxId}`,
        label: `${s.time.toFixed(2)}s`,
        after: `${s.sfxName} (${(s.score * 100).toFixed(0)}%)`,
        meta: s.reason,
      })),
    };
  },

  render(plan): PreviewVisual {
    return {
      kind: "timeline",
      payload: {
        duration: plan.sequenceEnd,
        playhead: plan.playhead,
        clips: plan.clips,
        markers: plan.suggestions.map((s) => ({ time: s.time, label: s.sfxName })),
      },
    };
  },

  async apply(plan): Promise<ApplyReport> {
    assertPlanReady(plan, this.label);
    const count = await soundDesignService.applySuggestionMarkers(plan.suggestions);
    return {
      ok: true,
      message: `Placed ${count} SFX suggestion marker(s).`,
      affected: count,
    };
  },

  async verify(plan): Promise<VerifyReport> {
    assertPlanReady(plan, this.label);
    if (plan.suggestions.length === 0) {
      return { ok: true, message: "Verify: nothing to apply." };
    }
    const analysis = await timelineService.analyzeActive({ bypassCache: true });
    const sfx = analysis.markers.filter((m) => m.name.startsWith("SFX:"));
    if (sfx.length < plan.suggestions.length) {
      return {
        ok: false,
        message: `Verify: found ${sfx.length} SFX markers, expected ${plan.suggestions.length}.`,
      };
    }
    return { ok: true, message: `Verify: ${sfx.length} SFX marker(s) on sequence.` };
  },
};
