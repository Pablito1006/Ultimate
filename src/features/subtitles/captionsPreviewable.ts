import { assertPlanReady } from "../preview/guards";
import type { ApplyReport, PreviewablePlan, PreviewSummary, PreviewVisual, VerifyReport } from "../preview/types";
import { timelineService } from "../../premiere/timeline/TimelineService";
import { getCaptionStyle, type CaptionStyleId } from "./captionStyles";
import { mockTranscriptionProvider } from "./mockTranscriptionProvider";
import type { TranscriptionResult } from "./transcriptionTypes";
import { subtitleEngine } from "./SubtitleEngine";
import {
  buildCaptionCues,
  cuesToSegments,
  type CaptionCue,
  type CaptionReadingOptions,
} from "../transcript/captionReadingRules";
import { parsePremiereTranscriptJson } from "../transcript/parsePremiereTranscript";
import type { MmTranscript } from "../transcript/transcriptModel";
import { cuesToSrt } from "../transcript/subtitleExport";
import { importTranscriptAuto } from "../transcript/subtitleImport";

export type CaptionsSourceMode = "mock-text" | "premiere-native" | "import";

export interface CaptionsPlanInput {
  mode: CaptionsSourceMode;
  /** Used when mode = mock-text or as fallback. */
  text?: string;
  /** Raw SRT/VTT/JSON when mode = import. */
  importRaw?: string;
  /** Pre-parsed transcript (e.g. after native export / edits). */
  transcript?: MmTranscript | null;
  styleId: CaptionStyleId;
  language?: string;
  durationSeconds?: number;
  reading?: CaptionReadingOptions;
}

export interface CaptionsPlan {
  styleId: CaptionStyleId;
  transcript: MmTranscript;
  cues: CaptionCue[];
  srt: string;
  /** Legacy shape for marker apply. */
  transcription: TranscriptionResult;
  segments: ReturnType<typeof cuesToSegments>;
  warnings: string[];
}

function mmToLegacy(transcript: MmTranscript): TranscriptionResult {
  return {
    providerId: transcript.source === "mock" ? "mock" : "premiere-native",
    language: transcript.language,
    segments: transcript.segments.map((seg) => ({
      id: seg.id,
      text: seg.text,
      start: seg.start,
      end: seg.end,
      words: seg.words.map((w) => ({
        text: w.text,
        start: w.start,
        end: w.end,
      })),
    })),
  };
}

/** Pure captions plan from text (mock timings) — unit-testable. */
export async function planCaptionsPure(input: {
  text: string;
  styleId: CaptionStyleId;
  language?: string;
  durationSeconds?: number;
  reading?: CaptionReadingOptions;
}): Promise<CaptionsPlan> {
  const durationSeconds = input.durationSeconds ?? 12;
  const transcription = await mockTranscriptionProvider.transcribe({
    textOverride: input.text,
    language: input.language || "en",
    durationSeconds,
  });
  const asJson = {
    language: transcription.language,
    speakers: [{ id: "mock-sp", name: "Speaker" }],
    segments: transcription.segments.map((seg) => ({
      start: seg.start,
      duration: seg.end - seg.start,
      language: transcription.language,
      speaker: "mock-sp",
      words: seg.words.map((w) => ({
        text: w.text,
        start: w.start,
        duration: Math.max(0.05, w.end - w.start),
        confidence: 1,
        eos: false,
        tags: [],
        type: "word" as const,
      })),
    })),
  };
  const transcript = parsePremiereTranscriptJson(JSON.stringify(asJson));
  transcript.source = "mock";
  const cues = buildCaptionCues(transcript, input.reading);
  const styleId = input.styleId || "minimal";
  getCaptionStyle(styleId);
  return {
    styleId,
    transcript,
    cues,
    srt: cuesToSrt(cues),
    transcription: mmToLegacy(transcript),
    segments: cuesToSegments(cues),
    warnings: transcript.warnings,
  };
}

export const captionsPreviewable: PreviewablePlan<CaptionsPlanInput, CaptionsPlan> = {
  id: "captions",
  label: "Captions Studio",

  async plan(input) {
    getCaptionStyle(input.styleId);

    if (input.transcript && input.transcript.segments.length > 0) {
      const cues = buildCaptionCues(input.transcript, input.reading);
      return {
        styleId: input.styleId,
        transcript: input.transcript,
        cues,
        srt: cuesToSrt(cues),
        transcription: mmToLegacy(input.transcript),
        segments: cuesToSegments(cues),
        warnings: input.transcript.warnings.slice(),
      };
    }

    if (input.mode === "import" && input.importRaw) {
      const transcript = importTranscriptAuto(input.importRaw);
      const cues = buildCaptionCues(transcript, input.reading);
      return {
        styleId: input.styleId,
        transcript,
        cues,
        srt: cuesToSrt(cues),
        transcription: mmToLegacy(transcript),
        segments: cuesToSegments(cues),
        warnings: transcript.warnings,
      };
    }

    let durationSeconds = input.durationSeconds ?? 12;
    try {
      const analysis = await timelineService.analyzeActive();
      durationSeconds = Math.max(analysis.endTime, 4);
    } catch {
      // keep default
    }

    return planCaptionsPure({
      text: input.text || "",
      styleId: input.styleId,
      language: input.language,
      durationSeconds,
      reading: input.reading,
    });
  },

  describe(plan): PreviewSummary {
    const style = getCaptionStyle(plan.styleId);
    const overLong = plan.cues.filter((c) =>
      c.lines.some((l) => l.length > 42)
    ).length;
    const warnings = plan.warnings.slice();
    warnings.push(
      "CaptionTrack item writing remains limited — apply places Comment markers + SRT (honest)."
    );
    if (style.delivery === "mogrt-pending") {
      warnings.push(`Style “${style.name}” MOGRT pending (WP3) — marker preset used.`);
    }
    if (overLong > 0) {
      warnings.push(`${overLong} cue(s) still exceed 42 characters on a line after wrap.`);
    }
    return {
      title: "Captions Studio",
      headline: `${plan.cues.length} cue(s) · style “${style.name}” · source ${plan.transcript.source}`,
      counts: {
        cues: plan.cues.length,
        segments: plan.transcript.segments.length,
        words: plan.transcript.segments.reduce((n, s) => n + s.words.length, 0),
      },
      warnings,
      estimatedMs: Math.max(60, plan.cues.length * 20),
      levels: ["A", "B"],
      levelCNote: "Level C sequence-copy trial not enabled.",
      changes: plan.cues.map((cue) => ({
        id: cue.id,
        label: `${cue.start.toFixed(2)}–${cue.end.toFixed(2)}`,
        after: cue.lines.join(" | "),
      })),
    };
  },

  render(plan): PreviewVisual {
    const words = plan.cues.flatMap((c) =>
      c.words.map((w) => ({ text: w.text, start: w.start, end: w.end }))
    );
    const duration = words.reduce((max, w) => Math.max(max, w.end), 1);
    return {
      kind: "caption-karaoke",
      payload: { words, duration },
    };
  },

  async apply(plan): Promise<ApplyReport> {
    assertPlanReady(plan, this.label);
    const count = await subtitleEngine.applyAsMarkers({
      transcription: plan.transcription,
      styleId: plan.styleId,
      srt: plan.srt,
      segments: plan.segments.map((s) => ({
        id: s.id,
        text: s.text,
        start: s.start,
        end: s.end,
        words: s.words.map((w) => ({ text: w.text, start: w.start, end: w.end })),
      })),
    });
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
    if (capMarkers.length < plan.cues.length) {
      return {
        ok: false,
        message: `Verify: found ${capMarkers.length} CAP markers, expected ${plan.cues.length}.`,
      };
    }
    return {
      ok: true,
      message: `Verify: ${capMarkers.length} CAP marker(s) present on sequence.`,
    };
  },
};
