/**
 * Pure speed-ramp presets for WP6 preview / planning.
 * Curves are speed multipliers vs normalized sequence time u ∈ [0, 1].
 */

import { easeInOutCubic, easeInQuad, easeOutQuad } from "../motion/easing/easing";

export type SpeedRampPresetId = "constant" | "ease" | "hero" | "rise-fall";

export interface SpeedRampSample {
  /** Normalized time along the resulting clip [0, 1]. */
  u: number;
  /** Playback speed ratio (1 = 100 %). */
  speed: number;
}

export interface SpeedRampSpec {
  id: SpeedRampPresetId;
  name: string;
  description: string;
}

export const SPEED_RAMP_PRESETS: SpeedRampSpec[] = [
  {
    id: "constant",
    name: "Constant",
    description: "Vitesse fixe sur toute la durée",
  },
  {
    id: "ease",
    name: "Ease",
    description: "Transition douce startSpeed → endSpeed (ease-in-out)",
  },
  {
    id: "hero",
    name: "Héros",
    description: "Lent au début, accélération, puis ralentissement cinématique",
  },
  {
    id: "rise-fall",
    name: "Montée-descente",
    description: "Accélère jusqu’au pic puis redescend",
  },
];

export interface BuildRampInput {
  preset: SpeedRampPresetId;
  /** Start speed ratio (constant / ease / endpoints). Default 1. */
  startSpeed?: number;
  /** End speed ratio. Default = startSpeed for constant; 2 for ease. */
  endSpeed?: number;
  /** Peak speed for hero / rise-fall. Default 2. */
  peakSpeed?: number;
  /** Sample count (≥ 2). Default 33. */
  sampleCount?: number;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Build deterministic ramp samples for preview B and duration math.
 */
export function buildRampSamples(input: BuildRampInput): SpeedRampSample[] {
  const n = Math.max(2, input.sampleCount ?? 33);
  const start = input.startSpeed !== undefined && input.startSpeed > 0 ? input.startSpeed : 1;
  const end =
    input.endSpeed !== undefined && input.endSpeed > 0
      ? input.endSpeed
      : input.preset === "constant"
        ? start
        : 2;
  const peak = input.peakSpeed !== undefined && input.peakSpeed > 0 ? input.peakSpeed : 2;
  const samples: SpeedRampSample[] = [];

  for (let i = 0; i < n; i += 1) {
    const u = i / (n - 1);
    let speed = start;
    if (input.preset === "constant") {
      speed = start;
    } else if (input.preset === "ease") {
      speed = lerp(start, end, easeInOutCubic(u));
    } else if (input.preset === "hero") {
      // Slow hold → accelerate (ease-in) → settle toward end (ease-out)
      if (u < 0.25) {
        speed = lerp(start, start * 1.05, u / 0.25);
      } else if (u < 0.55) {
        const t = (u - 0.25) / 0.3;
        speed = lerp(start * 1.05, peak, easeInQuad(t));
      } else {
        const t = (u - 0.55) / 0.45;
        speed = lerp(peak, end, easeOutQuad(t));
      }
    } else {
      // rise-fall: start → peak at mid → end
      if (u <= 0.5) {
        speed = lerp(start, peak, easeInQuad(u / 0.5));
      } else {
        speed = lerp(peak, end, easeOutQuad((u - 0.5) / 0.5));
      }
    }
    samples.push({ u, speed: speed > 0 ? speed : 0.01 });
  }

  return samples;
}
