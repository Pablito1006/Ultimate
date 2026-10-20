import {
  LOOK_NEUTRALS,
  type AppliedLookValues,
  type LookDefinition,
  type LookParamKey,
  type LookParams,
} from "./lookTypes";

const KEYS: LookParamKey[] = [
  "temperature",
  "tint",
  "exposure",
  "contrast",
  "highlights",
  "shadows",
  "whites",
  "blacks",
  "saturation",
  "vibrance",
];

export function clamp01(t: number): number {
  if (t <= 0) {
    return 0;
  }
  if (t >= 1) {
    return 1;
  }
  return t;
}

/**
 * Blend look toward neutrals by intensity.
 * value = neutral + (lookTarget − neutral) × intensity
 */
export function blendLook(look: LookDefinition, intensity: number): AppliedLookValues {
  const t = clamp01(intensity);
  const out = { ...LOOK_NEUTRALS };
  for (const key of KEYS) {
    const target = look.params[key];
    if (target === undefined) {
      continue;
    }
    const neutral = LOOK_NEUTRALS[key];
    out[key] = neutral + (target - neutral) * t;
  }
  return out;
}

/** Diff for plan display. */
export function describeLookDelta(before: LookParams, after: AppliedLookValues): string[] {
  const lines: string[] = [];
  for (const key of KEYS) {
    const b = before[key] ?? LOOK_NEUTRALS[key];
    const a = after[key];
    if (Math.abs(a - b) > 1e-4) {
      lines.push(`${key}: ${fmt(b)} → ${fmt(a)}`);
    }
  }
  return lines;
}

function fmt(n: number): string {
  return Math.abs(n) >= 10 ? n.toFixed(1) : n.toFixed(2);
}

/**
 * Approximate RGB tint for preview B (NOT a true Lumetri simulation).
 * Returns css-like rgb string for a mid-gray sample after fake grade.
 */
export function approximatePreviewRgb(
  values: AppliedLookValues,
  base: [number, number, number] = [140, 140, 140]
): { r: number; g: number; b: number; css: string } {
  let [r, g, b] = base;
  // Temperature: warm ↑ R, cool ↑ B
  const temp = values.temperature / 100;
  r += temp * 40;
  b -= temp * 40;
  // Tint: green ↔ magenta
  const tint = values.tint / 100;
  g += tint * 25;
  r -= tint * 10;
  b -= tint * 10;
  // Exposure (stops → linear-ish)
  const exp = Math.pow(2, values.exposure * 0.35);
  r *= exp;
  g *= exp;
  b *= exp;
  // Contrast around mid
  const c = 1 + values.contrast / 200;
  r = 128 + (r - 128) * c;
  g = 128 + (g - 128) * c;
  b = 128 + (b - 128) * c;
  // Saturation
  const sat = values.saturation / 100;
  const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  r = luma + (r - luma) * sat;
  g = luma + (g - luma) * sat;
  b = luma + (b - luma) * sat;
  // Vibrance (gentle sat on mid)
  const vib = 1 + values.vibrance / 200;
  r = luma + (r - luma) * vib;
  g = luma + (g - luma) * vib;
  b = luma + (b - luma) * vib;

  const clamp = (x: number) => Math.max(0, Math.min(255, Math.round(x)));
  const rr = clamp(r);
  const gg = clamp(g);
  const bb = clamp(b);
  return { r: rr, g: gg, b: bb, css: `rgb(${rr},${gg},${bb})` };
}

export function valuesEqual(
  a: AppliedLookValues,
  b: AppliedLookValues,
  epsilon = 0.05
): boolean {
  return KEYS.every((k) => Math.abs(a[k] - b[k]) <= epsilon);
}

export function snapshotFromPartial(partial: LookParams): AppliedLookValues {
  return {
    temperature: partial.temperature ?? LOOK_NEUTRALS.temperature,
    tint: partial.tint ?? LOOK_NEUTRALS.tint,
    exposure: partial.exposure ?? LOOK_NEUTRALS.exposure,
    contrast: partial.contrast ?? LOOK_NEUTRALS.contrast,
    highlights: partial.highlights ?? LOOK_NEUTRALS.highlights,
    shadows: partial.shadows ?? LOOK_NEUTRALS.shadows,
    whites: partial.whites ?? LOOK_NEUTRALS.whites,
    blacks: partial.blacks ?? LOOK_NEUTRALS.blacks,
    saturation: partial.saturation ?? LOOK_NEUTRALS.saturation,
    vibrance: partial.vibrance ?? LOOK_NEUTRALS.vibrance,
  };
}
