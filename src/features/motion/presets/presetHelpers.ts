import { getEasing, sampleCurve, type EasingId } from "../easing/easing";
import type { ParamRole } from "../../../premiere/components/paramAliases";
import type { PlannedKeyframe } from "../../../premiere/keyframes/KeyframeService";
import type { PresetChannelPlan, PresetPlanContext } from "./presetTypes";
import { num, str } from "./presetTypes";

export function commonParams(): import("./presetTypes").PresetParamDef[] {
  return [
    {
      id: "intensity",
      label: { en: "Intensity", fr: "Intensité" },
      type: "slider",
      defaultValue: 50,
      min: 1,
      max: 100,
      step: 1,
    },
    {
      id: "duration",
      label: { en: "Duration (s)", fr: "Durée (s)" },
      type: "number",
      defaultValue: 1,
      min: 0.1,
      max: 10,
      step: 0.05,
    },
    {
      id: "easing",
      label: { en: "Easing", fr: "Courbe" },
      type: "easing",
      defaultValue: "easeInOut",
      options: [
        "linear",
        "easeIn",
        "easeOut",
        "easeInOut",
        "easeOutBack",
        "easeOutBounce",
        "easeOutElastic",
        "spring",
      ],
    },
    {
      id: "overwriteExisting",
      label: { en: "Overwrite existing keyframes", fr: "Écraser keyframes existants" },
      type: "checkbox",
      defaultValue: false,
    },
  ];
}

export function easingFromOpts(opts: Record<string, string | number | boolean>): EasingId {
  return str(opts, "easing", "easeInOut") as EasingId;
}

export function seriesFromTo(
  role: ParamRole,
  from: number,
  to: number,
  startSec: number,
  durationSec: number,
  easingId: EasingId
): PresetChannelPlan {
  const samples = sampleCurve(from, to, durationSec, getEasing(easingId), {
    minSamples: 6,
    maxSamples: 32,
  });
  const keyframes: PlannedKeyframe[] = samples.map((s) => ({
    timeSeconds: startSec + s.t * durationSec,
    value: s.value,
  }));
  return {
    role,
    keyframes,
    rangeStart: startSec,
    rangeEnd: startSec + durationSec,
  };
}

export function seriesPoint(
  role: ParamRole,
  from: [number, number],
  to: [number, number],
  startSec: number,
  durationSec: number,
  easingId: EasingId
): PresetChannelPlan {
  const samples = sampleCurve(0, 1, durationSec, getEasing(easingId), {
    minSamples: 6,
    maxSamples: 32,
  });
  const keyframes: PlannedKeyframe[] = samples.map((s) => ({
    timeSeconds: startSec + s.t * durationSec,
    value: [from[0] + (to[0] - from[0]) * s.eased, from[1] + (to[1] - from[1]) * s.eased] as [
      number,
      number,
    ],
  }));
  return {
    role,
    keyframes,
    rangeStart: startSec,
    rangeEnd: startSec + durationSec,
  };
}

export function baseScale(ctx: PresetPlanContext): number {
  const s = ctx.base.scale;
  return typeof s === "number" ? s : 100;
}

export function baseOpacity(ctx: PresetPlanContext): number {
  const o = ctx.base.opacity;
  return typeof o === "number" ? o : 100;
}

export function baseRotation(ctx: PresetPlanContext): number {
  const r = ctx.base.rotation;
  return typeof r === "number" ? r : 0;
}

export function basePosition(ctx: PresetPlanContext): [number, number] {
  const p = ctx.base.position;
  if (Array.isArray(p) && p.length >= 2) {
    return [Number(p[0]), Number(p[1])];
  }
  return [0.5, 0.5];
}

export function dur(opts: Record<string, string | number | boolean>, ctx: PresetPlanContext): number {
  const d = num(opts, "duration", 1);
  return Math.min(Math.max(0.05, d), Math.max(0.05, ctx.clipDuration));
}

export function intensity01(opts: Record<string, string | number | boolean>): number {
  return num(opts, "intensity", 50) / 100;
}
