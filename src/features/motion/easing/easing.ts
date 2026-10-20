/**
 * Pure easing curves for WP4 presets.
 * Sampled into keyframe series when Premiere lacks cubic-bezier keyframe API parity.
 */

export type EasingId =
  | "linear"
  | "easeIn"
  | "easeOut"
  | "easeInOut"
  | "easeInQuad"
  | "easeOutQuad"
  | "easeInOutQuad"
  | "easeInCubic"
  | "easeOutCubic"
  | "easeInOutCubic"
  | "easeInQuart"
  | "easeOutQuart"
  | "easeInOutQuart"
  | "easeInBack"
  | "easeOutBack"
  | "easeInOutBack"
  | "easeInElastic"
  | "easeOutElastic"
  | "easeInOutElastic"
  | "easeOutBounce"
  | "easeInBounce"
  | "easeInOutBounce"
  | "spring"
  | "cubicBezier";

export interface CubicBezierOpts {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface SpringOpts {
  stiffness?: number;
  damping?: number;
  mass?: number;
}

/** Clamp t to [0, 1]. */
export function clamp01(t: number): number {
  if (t <= 0) {
    return 0;
  }
  if (t >= 1) {
    return 1;
  }
  return t;
}

export function linear(t: number): number {
  return clamp01(t);
}

export function easeInQuad(t: number): number {
  const x = clamp01(t);
  return x * x;
}

export function easeOutQuad(t: number): number {
  const x = clamp01(t);
  return x * (2 - x);
}

export function easeInOutQuad(t: number): number {
  const x = clamp01(t);
  return x < 0.5 ? 2 * x * x : -1 + (4 - 2 * x) * x;
}

export function easeInCubic(t: number): number {
  const x = clamp01(t);
  return x * x * x;
}

export function easeOutCubic(t: number): number {
  const x = clamp01(t);
  return 1 - Math.pow(1 - x, 3);
}

export function easeInOutCubic(t: number): number {
  const x = clamp01(t);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

export function easeInQuart(t: number): number {
  const x = clamp01(t);
  return x * x * x * x;
}

export function easeOutQuart(t: number): number {
  const x = clamp01(t);
  return 1 - Math.pow(1 - x, 4);
}

export function easeInOutQuart(t: number): number {
  const x = clamp01(t);
  return x < 0.5 ? 8 * x * x * x * x : 1 - Math.pow(-2 * x + 2, 4) / 2;
}

/** Aliases used in UI. */
export const easeIn = easeInCubic;
export const easeOut = easeOutCubic;
export const easeInOut = easeInOutCubic;

const C1 = 1.70158;
const C2 = C1 * 1.525;
const C3 = C1 + 1;

export function easeInBack(t: number): number {
  const x = clamp01(t);
  return C3 * x * x * x - C1 * x * x;
}

export function easeOutBack(t: number): number {
  const x = clamp01(t);
  return 1 + C3 * Math.pow(x - 1, 3) + C1 * Math.pow(x - 1, 2);
}

export function easeInOutBack(t: number): number {
  const x = clamp01(t);
  return x < 0.5
    ? (Math.pow(2 * x, 2) * ((C2 + 1) * 2 * x - C2)) / 2
    : (Math.pow(2 * x - 2, 2) * ((C2 + 1) * (x * 2 - 2) + C2) + 2) / 2;
}

export function easeOutBounce(t: number): number {
  const x = clamp01(t);
  const n1 = 7.5625;
  const d1 = 2.75;
  if (x < 1 / d1) {
    return n1 * x * x;
  }
  if (x < 2 / d1) {
    const y = x - 1.5 / d1;
    return n1 * y * y + 0.75;
  }
  if (x < 2.5 / d1) {
    const y = x - 2.25 / d1;
    return n1 * y * y + 0.9375;
  }
  const y = x - 2.625 / d1;
  return n1 * y * y + 0.984375;
}

export function easeInBounce(t: number): number {
  return 1 - easeOutBounce(1 - clamp01(t));
}

export function easeInOutBounce(t: number): number {
  const x = clamp01(t);
  return x < 0.5 ? (1 - easeOutBounce(1 - 2 * x)) / 2 : (1 + easeOutBounce(2 * x - 1)) / 2;
}

export function easeInElastic(t: number): number {
  const x = clamp01(t);
  if (x === 0 || x === 1) {
    return x;
  }
  const c4 = (2 * Math.PI) / 3;
  return -Math.pow(2, 10 * x - 10) * Math.sin((x * 10 - 10.75) * c4);
}

export function easeOutElastic(t: number): number {
  const x = clamp01(t);
  if (x === 0 || x === 1) {
    return x;
  }
  const c4 = (2 * Math.PI) / 3;
  return Math.pow(2, -10 * x) * Math.sin((x * 10 - 0.75) * c4) + 1;
}

export function easeInOutElastic(t: number): number {
  const x = clamp01(t);
  if (x === 0 || x === 1) {
    return x;
  }
  const c5 = (2 * Math.PI) / 4.5;
  return x < 0.5
    ? -(Math.pow(2, 20 * x - 10) * Math.sin((20 * x - 11.125) * c5)) / 2
    : (Math.pow(2, -20 * x + 10) * Math.sin((20 * x - 11.125) * c5)) / 2 + 1;
}

/**
 * Underdamped spring normalized so f(0)=0, f(1)≈1 (deterministic sample).
 */
export function spring(t: number, opts: SpringOpts = {}): number {
  const x = clamp01(t);
  const stiffness = opts.stiffness ?? 120;
  const damping = opts.damping ?? 14;
  const mass = opts.mass ?? 1;
  const omega = Math.sqrt(stiffness / mass);
  const zeta = damping / (2 * Math.sqrt(stiffness * mass));
  if (zeta < 1) {
    const omegaD = omega * Math.sqrt(1 - zeta * zeta);
    const envelope = Math.exp(-zeta * omega * x * 2.5);
    return 1 - envelope * Math.cos(omegaD * x * 2.5);
  }
  return easeOutCubic(x);
}

/** Approximate cubic-bezier Y given X in [0,1] via Newton + binary (deterministic). */
export function cubicBezier(t: number, opts: CubicBezierOpts): number {
  const x = clamp01(t);
  const { x1, y1, x2, y2 } = opts;
  // Sample bezier at parameter u where Bx(u) ≈ x
  let u = x;
  for (let i = 0; i < 8; i += 1) {
    const bx = bezier1(u, x1, x2);
    const dx = bezier1Deriv(u, x1, x2);
    if (Math.abs(dx) < 1e-6) {
      break;
    }
    u -= (bx - x) / dx;
    u = clamp01(u);
  }
  return bezier1(u, y1, y2);
}

function bezier1(u: number, p1: number, p2: number): number {
  const c = 3 * p1;
  const b = 3 * (p2 - p1) - c;
  const a = 1 - c - b;
  return ((a * u + b) * u + c) * u;
}

function bezier1Deriv(u: number, p1: number, p2: number): number {
  const c = 3 * p1;
  const b = 3 * (p2 - p1) - c;
  const a = 1 - c - b;
  return (3 * a * u + 2 * b) * u + c;
}

export type EasingFn = (t: number) => number;

export function getEasing(
  id: EasingId,
  opts?: { bezier?: CubicBezierOpts; spring?: SpringOpts }
): EasingFn {
  switch (id) {
    case "linear":
      return linear;
    case "easeIn":
    case "easeInCubic":
      return easeInCubic;
    case "easeOut":
    case "easeOutCubic":
      return easeOutCubic;
    case "easeInOut":
    case "easeInOutCubic":
      return easeInOutCubic;
    case "easeInQuad":
      return easeInQuad;
    case "easeOutQuad":
      return easeOutQuad;
    case "easeInOutQuad":
      return easeInOutQuad;
    case "easeInQuart":
      return easeInQuart;
    case "easeOutQuart":
      return easeOutQuart;
    case "easeInOutQuart":
      return easeInOutQuart;
    case "easeInBack":
      return easeInBack;
    case "easeOutBack":
      return easeOutBack;
    case "easeInOutBack":
      return easeInOutBack;
    case "easeInElastic":
      return easeInElastic;
    case "easeOutElastic":
      return easeOutElastic;
    case "easeInOutElastic":
      return easeInOutElastic;
    case "easeOutBounce":
      return easeOutBounce;
    case "easeInBounce":
      return easeInBounce;
    case "easeInOutBounce":
      return easeInOutBounce;
    case "spring":
      return (t) => spring(t, opts?.spring);
    case "cubicBezier":
      return (t) =>
        cubicBezier(t, opts?.bezier ?? { x1: 0.42, y1: 0, x2: 0.58, y2: 1 });
    default:
      return linear;
  }
}

export interface SampledKeyframe {
  /** Normalized time 0..1 along the preset duration. */
  t: number;
  /** Eased progress 0..1 (or overshoot). */
  eased: number;
  value: number;
}

/**
 * Adaptive sampling: denser where curvature is high.
 */
export function sampleCurve(
  from: number,
  to: number,
  durationSeconds: number,
  easing: EasingFn,
  options: { minSamples?: number; maxSamples?: number; tolerance?: number } = {}
): SampledKeyframe[] {
  const minSamples = options.minSamples ?? 8;
  const maxSamples = options.maxSamples ?? 48;
  const tolerance = options.tolerance ?? 0.01;
  void durationSeconds;

  const points: SampledKeyframe[] = [];
  function add(t: number): void {
    const eased = easing(t);
    points.push({ t, eased, value: from + (to - from) * eased });
  }

  add(0);
  add(1);

  function subdivide(t0: number, t1: number, depth: number): void {
    if (points.length >= maxSamples || depth <= 0) {
      return;
    }
    const tm = (t0 + t1) / 2;
    const e0 = easing(t0);
    const e1 = easing(t1);
    const em = easing(tm);
    const linearMid = (e0 + e1) / 2;
    if (Math.abs(em - linearMid) > tolerance) {
      add(tm);
      subdivide(t0, tm, depth - 1);
      subdivide(tm, t1, depth - 1);
    }
  }

  subdivide(0, 1, 6);

  // Ensure minimum samples evenly if still sparse
  while (points.length < minSamples) {
    const t = points.length / minSamples;
    add(t);
  }

  points.sort((a, b) => a.t - b.t);
  // Dedupe close times
  const out: SampledKeyframe[] = [];
  for (const p of points) {
    if (out.length === 0 || Math.abs(out[out.length - 1].t - p.t) > 1e-6) {
      out.push(p);
    }
  }
  return out;
}
