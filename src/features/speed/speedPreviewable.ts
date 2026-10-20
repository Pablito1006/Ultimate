import { timelineService } from "../../premiere/timeline/TimelineService";
import { assertPlanReady } from "../preview/guards";
import type {
  ApplyReport,
  PreviewablePlan,
  PreviewSummary,
  PreviewVisual,
  VerifyReport,
} from "../preview/types";
import { canApplySpeedWrite, getSpeedFeatureStatus } from "./speedCapabilities";
import {
  resultingDurationConstant,
  resultingDurationRamp,
  speedForTargetDuration,
  speedToPercent,
} from "./speedMath";
import { buildRampSamples, type SpeedRampPresetId } from "./speedRamps";
import type {
  SpeedClipPlanRow,
  SpeedClipSnapshot,
  SpeedPlan,
  SpeedPlanInput,
} from "./speedTypes";

function toSnapshot(clip: {
  id: string;
  name: string;
  trackIndex: number;
  trackKind: "video" | "audio";
  start: number;
  end: number;
  duration: number;
  speed: number;
  reversed: boolean;
}): SpeedClipSnapshot {
  const speed = clip.speed > 0 ? clip.speed : 1;
  return {
    id: clip.id,
    name: clip.name,
    trackIndex: clip.trackIndex,
    trackKind: clip.trackKind,
    start: clip.start,
    end: clip.end,
    duration: clip.duration,
    speed,
    reversed: clip.reversed,
    nonDefaultSpeed: Math.abs(speed - 1) > 1e-6 || clip.reversed,
  };
}

function resolveTargetSpeed(input: SpeedPlanInput, currentSpeed: number, duration: number): number {
  if (input.mode === "target-duration") {
    const targetDur = input.targetDuration ?? duration;
    return speedForTargetDuration(duration, currentSpeed, targetDur).resultingSpeed;
  }
  if (input.targetPercent !== undefined) {
    return input.targetPercent / 100;
  }
  if (input.targetSpeed !== undefined && input.targetSpeed > 0) {
    return input.targetSpeed;
  }
  return currentSpeed;
}

function resolveRampPreset(input: SpeedPlanInput): SpeedRampPresetId {
  return input.rampPreset ?? "ease";
}

/**
 * Pure planner — no Premiere I/O (used by tests + plan()).
 */
export function planSpeedPure(clips: SpeedClipSnapshot[], input: SpeedPlanInput): SpeedPlan {
  const reverse = Boolean(input.reverse);
  const preserveAudio = Boolean(input.preserveAudio);
  const writeAvailable = canApplySpeedWrite();
  const warnings: string[] = [];
  const caps = getSpeedFeatureStatus();
  const writeCap = caps.find((c) => c.id === "speed.writeConstant");
  if (writeCap?.status === "unavailable") {
    warnings.push(
      "Écriture vitesse unavailable (pas d’API UXP) — plan + aperçu seulement ; appliquer Speed/Duration manuellement dans Premiere."
    );
  }
  if (reverse) {
    warnings.push("Inverser : unavailable en écriture — flag planifié uniquement.");
  }
  if (preserveAudio) {
    warnings.push("Préserver hauteur audio : unavailable (option Premiere non exposée).");
  }
  if (input.mode === "ramp") {
    warnings.push("Rampes / Time Remapping : écriture unavailable — courbe calculée pour aperçu B uniquement.");
  }

  const rampPreset = input.mode === "ramp" ? resolveRampPreset(input) : null;
  let samples = buildRampSamples({
    preset: rampPreset ?? "constant",
    startSpeed:
      input.mode === "ramp"
        ? input.rampStartSpeed ?? 1
        : resolveTargetSpeed(input, 1, 1),
    endSpeed: input.mode === "ramp" ? input.rampEndSpeed ?? 2 : undefined,
    peakSpeed: input.rampPeakSpeed,
  });

  if (input.mode !== "ramp") {
    const flat = resolveTargetSpeed(
      input,
      clips[0]?.speed ?? 1,
      clips[0]?.duration ?? 1
    );
    samples = buildRampSamples({ preset: "constant", startSpeed: flat });
  }

  const rows: SpeedClipPlanRow[] = clips.map((clip) => {
    const rowWarnings: string[] = [];
    if (clip.nonDefaultSpeed) {
      rowWarnings.push(
        `Vitesse non standard détectée (${speedToPercent(clip.speed)}%${clip.reversed ? ", reversed" : ""}) — courbe time-remap réelle non lisible via l’API.`
      );
    }
    let targetSpeed: number;
    let resultingDuration: number;
    let durationDelta: number;
    if (input.mode === "ramp") {
      const ramp = resultingDurationRamp(clip.duration, clip.speed, samples);
      targetSpeed = ramp.targetSpeed;
      resultingDuration = ramp.resultingDuration;
      durationDelta = ramp.durationDelta;
    } else {
      targetSpeed = resolveTargetSpeed(input, clip.speed, clip.duration);
      const constant = resultingDurationConstant(clip.duration, clip.speed, targetSpeed);
      resultingDuration = constant.resultingDuration;
      durationDelta = constant.durationDelta;
    }
    return {
      clip,
      currentSpeed: clip.speed,
      targetSpeed,
      currentDuration: clip.duration,
      resultingDuration,
      durationDelta,
      reverseRequested: reverse,
      warnings: rowWarnings,
    };
  });

  const detectedNonDefault = clips.filter((c) => c.nonDefaultSpeed);

  return {
    mode: input.mode,
    reverse,
    preserveAudio,
    rampPreset,
    samples,
    rows,
    writeAvailable,
    warnings,
    detectedNonDefault,
  };
}

export const speedPreviewable: PreviewablePlan<SpeedPlanInput, SpeedPlan> = {
  id: "speed",
  label: "Vitesse et temps",

  async plan(input) {
    const analysis = await timelineService.analyzeActive({ bypassCache: true });
    const videoOnly = input.videoOnly !== false;
    const clips = analysis.clips
      .filter((c) => (videoOnly ? c.trackKind === "video" : true))
      .map(toSnapshot);
    if (clips.length === 0) {
      throw new Error("Aucun clip vidéo sur la timeline active.");
    }
    return planSpeedPure(clips, input);
  },

  describe(plan): PreviewSummary {
    const totalDelta = plan.rows.reduce((s, r) => s + r.durationDelta, 0);
    const warnings = [
      ...plan.warnings,
      ...plan.rows.flatMap((r) => r.warnings),
    ];
    return {
      title: "Vitesse et temps",
      headline: `${plan.rows.length} clip(s) · mode ${plan.mode}${
        plan.writeAvailable ? "" : " · écriture unavailable"
      } · Δ durée ${totalDelta >= 0 ? "+" : ""}${totalDelta.toFixed(3)}s`,
      counts: {
        clips: plan.rows.length,
        nonDefault: plan.detectedNonDefault.length,
      },
      warnings,
      estimatedMs: plan.writeAvailable ? 80 * plan.rows.length : 0,
      levels: ["A", "B"],
      levelCNote: "Level C unavailable (WP6).",
      changes: plan.rows.map((r) => ({
        id: r.clip.id,
        label: r.clip.name,
        before: `${speedToPercent(r.currentSpeed)}% · ${r.currentDuration.toFixed(3)}s`,
        after: `${speedToPercent(r.targetSpeed)}% · ${r.resultingDuration.toFixed(3)}s${
          r.reverseRequested ? " · reverse*" : ""
        }`,
        meta: r.durationDelta === 0 ? undefined : `Δ ${r.durationDelta.toFixed(3)}s`,
      })),
    };
  },

  render(plan): PreviewVisual {
    return {
      kind: "speed-curve",
      payload: {
        mode: plan.mode,
        rampPreset: plan.rampPreset,
        samples: plan.samples.map((s) => ({ t: s.u, value: s.speed })),
        resultingDurations: plan.rows.map((r) => ({
          name: r.clip.name,
          before: r.currentDuration,
          after: r.resultingDuration,
        })),
        writeAvailable: plan.writeAvailable,
      },
    };
  },

  async apply(plan): Promise<ApplyReport> {
    assertPlanReady(plan, "Vitesse et temps");
    if (!plan.writeAvailable) {
      return {
        ok: false,
        message:
          "Écriture vitesse unavailable : aucune createSetSpeedAction dans l’API Premiere UXP. Utilisez Clip → Speed/Duration avec les valeurs du plan.",
        affected: 0,
        details: {
          fallback: "Premiere Speed/Duration dialog",
          plannedClips: plan.rows.length,
        },
      };
    }
    // Future: when Adobe exposes write, mutate via TransactionService here.
    return {
      ok: false,
      message: "Speed write path not implemented for this host build.",
      affected: 0,
    };
  },

  async verify(plan): Promise<VerifyReport> {
    assertPlanReady(plan, "Vitesse et temps");
    if (!plan.writeAvailable) {
      // Re-read confirms we can still observe speeds; no mutation expected.
      const analysis = await timelineService.analyzeActive({ bypassCache: true });
      const mismatches: string[] = [];
      for (const row of plan.rows) {
        const live = analysis.clips.find((c) => c.id === row.clip.id);
        if (!live) {
          mismatches.push(`Clip manquant à la relecture: ${row.clip.name}`);
          continue;
        }
        if (Math.abs(live.speed - row.currentSpeed) > 1e-4) {
          mismatches.push(
            `${row.clip.name}: speed lu ${live.speed} ≠ snapshot ${row.currentSpeed}`
          );
        }
      }
      return {
        ok: mismatches.length === 0,
        message:
          mismatches.length === 0
            ? "Relecture OK — aucune écriture attendue (unavailable)."
            : "Écarts à la relecture des vitesses.",
        mismatches: mismatches.length ? mismatches : undefined,
      };
    }
    return {
      ok: false,
      message: "Verify write path not applicable without speed write API.",
    };
  },
};
