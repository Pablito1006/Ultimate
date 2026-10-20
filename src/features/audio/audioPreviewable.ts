import { AUDIO_CLEANUP_DISPLAY_CANDIDATES } from "../../premiere/components/paramAliases";
import { componentService } from "../../premiere/components/ComponentService";
import { keyframeService } from "../../premiere/keyframes/KeyframeService";
import { getPremiereModule } from "../../premiere/adapters/premiereModule";
import { projectService } from "../../premiere/project/ProjectService";
import { timelineService } from "../../premiere/timeline/TimelineService";
import { assertPlanReady } from "../preview/guards";
import type {
  ApplyReport,
  PreviewablePlan,
  PreviewSummary,
  PreviewVisual,
  VerifyReport,
} from "../preview/types";
import { getAudioFeatureStatus } from "./audioCapabilities";
import {
  buildDuckingKeyframes,
  buildFadeKeyframes,
  gainDbFromLufs,
  resolveTargetLufs,
  sampleVolumeCurve,
  type LoudnessPlatform,
  type SpeechSegment,
  type VolumeKeyframe,
} from "./audioMath";

export type AudioToolMode = "ducking" | "fade" | "gain" | "cleanup";

export interface AudioPlanInput {
  mode: AudioToolMode;
  /** Music / target audio track index (default 0). */
  musicTrackIndex?: number;
  /** Prefer clip on this track; else first audio clip. */
  clipIndex?: number;
  speechSegments?: SpeechSegment[];
  /** ISO-ish JSON segments from captions if speechSegments empty. */
  duckDb?: number;
  attack?: number;
  release?: number;
  fadeInSeconds?: number;
  fadeOutSeconds?: number;
  measuredLufs?: number;
  platform?: LoudnessPlatform;
  customTargetLufs?: number;
  overwriteExisting?: boolean;
}

export interface AudioClipBinding {
  clipId: string;
  clipName: string;
  trackIndex: number;
  start: number;
  end: number;
  keyframes: VolumeKeyframe[];
  gainDb?: number;
  cleanupFilter?: string | null;
}

export interface AudioPlan {
  mode: AudioToolMode;
  bindings: AudioClipBinding[];
  warnings: string[];
  samples: Array<{ t: number; value: number }>;
  overwriteExisting: boolean;
}

function pickAudioClips(
  clips: Array<{
    id: string;
    name: string;
    trackIndex: number;
    start: number;
    end: number;
    trackKind: string;
  }>,
  musicTrackIndex: number,
  clipIndex: number
): typeof clips {
  const audio = clips.filter((c) => c.trackKind === "audio");
  const onTrack = audio.filter((c) => c.trackIndex === musicTrackIndex);
  const pool = onTrack.length > 0 ? onTrack : audio;
  if (pool.length === 0) {
    return [];
  }
  if (clipIndex >= 0 && clipIndex < pool.length) {
    return [pool[clipIndex]];
  }
  return pool.slice(0, 1);
}

export function planAudioPure(
  clips: Array<{
    id: string;
    name: string;
    trackIndex: number;
    start: number;
    end: number;
    trackKind: string;
  }>,
  input: AudioPlanInput
): AudioPlan {
  const musicTrackIndex = input.musicTrackIndex ?? 0;
  const selected = pickAudioClips(clips, musicTrackIndex, input.clipIndex ?? 0);
  const warnings = getAudioFeatureStatus()
    .filter((f) => f.status === "unavailable")
    .map((f) => `${f.id}: ${f.reason}`);
  warnings.push("Aperçu B = courbe planifiée (dB), pas un analyseur temps réel.");

  const overwriteExisting = Boolean(input.overwriteExisting);
  const bindings: AudioClipBinding[] = [];

  for (const c of selected) {
    let keyframes: VolumeKeyframe[] = [];
    let gainDb: number | undefined;
    let cleanupFilter: string | null = null;

    if (input.mode === "ducking") {
      const speech = input.speechSegments ?? [];
      if (speech.length === 0) {
        warnings.push("Aucun segment de parole — fournir speechSegments (transcription ou saisie).");
      }
      keyframes = buildDuckingKeyframes(c.start, c.end, speech, {
        duckDb: input.duckDb,
        attack: input.attack,
        release: input.release,
      });
    } else if (input.mode === "fade") {
      keyframes = buildFadeKeyframes(
        c.start,
        c.end,
        input.fadeInSeconds ?? 0.5,
        input.fadeOutSeconds ?? 0.5
      );
    } else if (input.mode === "gain") {
      const measured = input.measuredLufs;
      if (measured === undefined || Number.isNaN(measured)) {
        warnings.push("Mesure LUFS manquante — saisissez une mesure externe.");
        gainDb = 0;
      } else {
        const target = resolveTargetLufs(input.platform ?? "youtube", input.customTargetLufs);
        gainDb = gainDbFromLufs(measured, target);
      }
      keyframes = [
        { timeSeconds: c.start, valueDb: gainDb ?? 0 },
        { timeSeconds: c.end, valueDb: gainDb ?? 0 },
      ];
    } else {
      cleanupFilter = AUDIO_CLEANUP_DISPLAY_CANDIDATES[0];
      warnings.push(
        "Nettoyage: append filtre si displayName présent sur l’hôte ; sinon unavailable (pas de DSP inventé)."
      );
      keyframes = [
        { timeSeconds: c.start, valueDb: 0 },
        { timeSeconds: c.end, valueDb: 0 },
      ];
    }

    bindings.push({
      clipId: c.id,
      clipName: c.name,
      trackIndex: c.trackIndex,
      start: c.start,
      end: c.end,
      keyframes,
      gainDb,
      cleanupFilter,
    });
  }

  const first = bindings[0];
  const samples = first
    ? sampleVolumeCurve(first.keyframes, first.start, first.end)
    : [];

  return { mode: input.mode, bindings, warnings, samples, overwriteExisting };
}

export const audioPreviewable: PreviewablePlan<AudioPlanInput, AudioPlan> = {
  id: "audio-tools",
  label: "Audio tools",

  async plan(input) {
    const analysis = await timelineService.analyzeActive({ bypassCache: true });
    return planAudioPure(analysis.clips, input);
  },

  describe(plan): PreviewSummary {
    const kfCount = plan.bindings.reduce((n, b) => n + b.keyframes.length, 0);
    return {
      title: `Audio — ${plan.mode}`,
      headline: `${plan.bindings.length} clip(s) · ${kfCount} keyframe(s) volume`,
      counts: { clips: plan.bindings.length, keyframes: kfCount },
      warnings: plan.warnings,
      estimatedMs: 120 * plan.bindings.length,
      levels: ["A", "B"],
      levelCNote: "Level C unavailable (WP8).",
      changes: plan.bindings.map((b) => ({
        id: b.clipId,
        label: b.clipName,
        after:
          plan.mode === "gain"
            ? `gain ${b.gainDb?.toFixed(1)} dB`
            : plan.mode === "cleanup"
              ? `try ${b.cleanupFilter}`
              : `${b.keyframes.length} volume KFs`,
        meta: `${b.start.toFixed(2)}–${b.end.toFixed(2)}s`,
      })),
    };
  },

  render(plan): PreviewVisual {
    return {
      kind: "volume-curve",
      payload: {
        mode: plan.mode,
        samples: plan.samples,
        keyframes: plan.bindings[0]?.keyframes ?? [],
        clipName: plan.bindings[0]?.clipName ?? "",
      },
    };
  },

  async apply(plan): Promise<ApplyReport> {
    assertPlanReady(plan, this.label);
    if (plan.bindings.length === 0) {
      return { ok: false, message: "Aucun clip audio ciblé.", affected: 0 };
    }
    const project = await projectService.requireActiveProject();
    let affected = 0;
    const failures: string[] = [];

    for (const b of plan.bindings) {
      const item = await timelineService.getAudioClipTrackItem(b.trackIndex, b.clipName, b.start);
      if (!item) {
        failures.push(`${b.clipName}: audio item not found`);
        continue;
      }

      if (plan.mode === "cleanup" && b.cleanupFilter) {
        const ppro = getPremiereModule();
        let names: string[] = [];
        try {
          names = (await ppro.AudioFilterFactory?.getDisplayNames?.()) ?? [];
        } catch {
          names = [];
        }
        const pick =
          AUDIO_CLEANUP_DISPLAY_CANDIDATES.find((n) => names.indexOf(n) >= 0) ||
          (names.length === 0 ? b.cleanupFilter : null);
        if (!pick) {
          failures.push(`${b.clipName}: no cleanup filter on host — unavailable`);
          continue;
        }
        const ok = await componentService.tryAppendAudioFilter(
          project,
          item,
          [pick],
          `MasterMotion: Audio cleanup ${pick}`
        );
        if (ok) {
          affected += 1;
        } else {
          failures.push(`${b.clipName}: cleanup append failed`);
        }
        continue;
      }

      const volumeParam = await componentService.ensureVolumeParam(
        project,
        item,
        `MasterMotion: Ensure Volume ${b.clipName}`
      );
      if (!volumeParam) {
        failures.push(`${b.clipName}: Volume param unavailable`);
        continue;
      }

      if (plan.mode === "gain" && b.gainDb !== undefined && b.keyframes.length <= 2) {
        try {
          await componentService.setStaticValue(
            project,
            volumeParam,
            b.gainDb,
            `MasterMotion: Audio gain ${b.gainDb.toFixed(1)} dB`
          );
          affected += 1;
        } catch (cause) {
          failures.push(`${b.clipName}: ${String(cause)}`);
        }
        continue;
      }

      const series = b.keyframes.map((k) => ({
        timeSeconds: k.timeSeconds,
        value: k.valueDb,
      }));
      const result = await keyframeService.applySeries(project, volumeParam, series, {
        label: `MasterMotion: Audio ${plan.mode} ${b.clipName}`,
        overwriteExisting: plan.overwriteExisting,
      });
      if (result.skipped) {
        failures.push(`${b.clipName}: ${result.reason}`);
      } else {
        affected += 1;
      }
    }

    timelineService.invalidateCache();
    return {
      ok: affected > 0,
      message:
        affected > 0
          ? `Audio ${plan.mode}: ${affected} clip(s).${failures.length ? ` Issues: ${failures.length}` : ""}`
          : `Audio apply failed. ${failures.slice(0, 2).join("; ")}`,
      affected,
      details: { failures },
    };
  },

  async verify(plan): Promise<VerifyReport> {
    assertPlanReady(plan, this.label);
    if (plan.mode === "cleanup") {
      return {
        ok: true,
        message: "Cleanup verify: filter append only (params host-dependent).",
      };
    }
    const mismatches: string[] = [];
    for (const b of plan.bindings) {
      const item = await timelineService.getAudioClipTrackItem(b.trackIndex, b.clipName, b.start);
      if (!item) {
        mismatches.push(`${b.clipName}: missing`);
        continue;
      }
      const map = await componentService.mapClipComponents(
        item as unknown as import("@adobe/premierepro").VideoClipTrackItem
      );
      const vol = map.params.volume;
      if (!vol) {
        mismatches.push(`${b.clipName}: no volume param`);
        continue;
      }
      const count = await keyframeService.countKeyframes(vol.param);
      if (plan.mode === "gain") {
        const n = await componentService.readNumeric(vol);
        if (n === null || (b.gainDb !== undefined && Math.abs(n - b.gainDb) > 0.5)) {
          mismatches.push(`${b.clipName}: gain ${n} ≠ ${b.gainDb}`);
        }
      } else if (count < Math.min(2, b.keyframes.length)) {
        mismatches.push(`${b.clipName}: expected ≥2 KFs, got ${count}`);
      }
    }
    return {
      ok: mismatches.length === 0,
      message: mismatches.length === 0 ? "Volume re-read OK" : `Verify: ${mismatches.length} issue(s)`,
      mismatches: mismatches.length ? mismatches : undefined,
    };
  },
};
