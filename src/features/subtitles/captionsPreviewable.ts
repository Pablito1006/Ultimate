import { assertPlanReady } from "../preview/guards";
import type { ApplyReport, PreviewablePlan, PreviewSummary, PreviewVisual, VerifyReport } from "../preview/types";
import { timelineService } from "../../premiere/timeline/TimelineService";
import { getCaptionStyle, type CaptionStyleId } from "./captionStyles";
import { buildCaptionTimeline, segmentsToSrt } from "./segmentation";
import { mockTranscriptionProvider } from "./mockTranscriptionProvider";
import type { TranscriptionResult, TranscriptSegment } from "./transcriptionTypes";
import { subtitleEngine } from "./SubtitleEngine";

export interface CaptionsPlanInput {
  text: string;
  styleId: CaptionStyleId;
  providerId?: string;
  language?: string;
  /** Optional override for pure tests (seconds). */
  durationSeconds?: number;
}

export interface CaptionsPlan {
  transcription: TranscriptionResult;
  styleId: CaptionStyleId;
  srt: string;
  segments: TranscriptSegment[];
}

/** Pure captions plan from text + duration (no Premiere). */
export async function planCaptionsPure(input: CaptionsPlanInput): Promise<CaptionsPlan> {
  const durationSeconds = input.durationSeconds ?? 12;
  const transcription = await mockTranscriptionProvider.transcribe({
    textOverride: input.text,
    language: input.language || "en",
    durationSeconds,
  });
  const segments = buildCaptionTimeline(transcription.segments);
  const styleId = input.styleId || "minimal";
  getCaptionStyle(styleId);
  return {
    transcription,
    styleId,
    segments,
    srt: segmentsToSrt(segments),
  };
}

export const captionsPreviewable: PreviewablePlan<CaptionsPlanInput, CaptionsPlan> = {
  id: "captions",
  label: "Captions",

  async plan(input) {
    let durationSeconds = input.durationSeconds ?? 12;
    try {
      const analysis = await timelineService.analyzeActive();
      durationSeconds = Math.max(analysis.endTime, 4);
    } catch {
      // keep default
    }
    return planCaptionsPure({ ...input, durationSeconds });
  },

  describe(plan): PreviewSummary {
    const style = getCaptionStyle(plan.styleId);
    return {
      title: "Captions",
      headline: `${plan.segments.length} segment(s) · style “${style.name}” · provider ${plan.transcription.providerId}`,
      counts: {
        segments: plan.segments.length,
        words: plan.segments.reduce((n, s) => n + (s.words?.length ?? 0), 0),
      },
      warnings: [
        "CaptionTrack item writing is limited — apply places Comment markers + SRT (honest).",
        "Transcription provider is mock (offline) until WP2.",
      ],
      estimatedMs: Math.max(60, plan.segments.length * 20),
      levels: ["A", "B"],
      levelCNote: "Level C sequence-copy trial not enabled in WP1.",
      changes: plan.segments.map((seg) => ({
        id: seg.id,
        label: `${seg.start.toFixed(2)}–${seg.end.toFixed(2)}`,
        after: seg.text,
      })),
    };
  },

  render(plan): PreviewVisual {
    const words: Array<{ text: string; start: number; end: number }> = [];
    for (let s = 0; s < plan.segments.length; s += 1) {
      const seg = plan.segments[s];
      if (seg.words && seg.words.length > 0) {
        for (let w = 0; w < seg.words.length; w += 1) {
          words.push({
            text: seg.words[w].text,
            start: seg.words[w].start,
            end: seg.words[w].end,
          });
        }
      } else {
        words.push({ text: seg.text, start: seg.start, end: seg.end });
      }
    }
    const duration = words.reduce((max, w) => Math.max(max, w.end), 1);
    return {
      kind: "caption-karaoke",
      payload: { words, duration },
    };
  },

  async apply(plan): Promise<ApplyReport> {
    assertPlanReady(plan, this.label);
    const count = await subtitleEngine.applyAsMarkers(plan);
    return {
      ok: true,
      message: `Applied ${count} caption marker(s).`,
      affected: count,
    };
  },

  async verify(plan): Promise<VerifyReport> {
    assertPlanReady(plan, this.label);
    const analysis = await timelineService.analyzeActive({ bypassCache: true });
    const capMarkers = analysis.markers.filter((m) => m.name.startsWith("CAP:"));
    if (capMarkers.length < plan.segments.length) {
      return {
        ok: false,
        message: `Verify: found ${capMarkers.length} CAP markers, expected ${plan.segments.length}.`,
      };
    }
    return {
      ok: true,
      message: `Verify: ${capMarkers.length} CAP marker(s) present on sequence.`,
    };
  },
};
