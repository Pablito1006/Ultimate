import type { SpeedRampPresetId, SpeedRampSample } from "./speedRamps";

export type SpeedMode = "constant" | "target-duration" | "ramp";

export interface SpeedClipSnapshot {
  id: string;
  name: string;
  trackIndex: number;
  trackKind: "video" | "audio";
  start: number;
  end: number;
  duration: number;
  /** Playback ratio from getSpeed (1 = 100 %). */
  speed: number;
  reversed: boolean;
  /** True when speed ≠ 1 or reversed — scalar API cannot prove true time-remap. */
  nonDefaultSpeed: boolean;
}

export interface SpeedPlanInput {
  mode: SpeedMode;
  /** Constant mode: target speed ratio (1 = 100 %). */
  targetSpeed?: number;
  /** Constant mode: percent UI (100 = 100 %). Takes precedence if set with mode constant. */
  targetPercent?: number;
  /** Target-duration mode: desired sequence duration in seconds. */
  targetDuration?: number;
  /** Reverse flag (plan only — write unavailable). */
  reverse?: boolean;
  /** Preserve pitch (plan only — unavailable). */
  preserveAudio?: boolean;
  /** Ramp preset. */
  rampPreset?: SpeedRampPresetId;
  rampStartSpeed?: number;
  rampEndSpeed?: number;
  rampPeakSpeed?: number;
  /** Limit to video clips only (default true for speed UI). */
  videoOnly?: boolean;
}

export interface SpeedClipPlanRow {
  clip: SpeedClipSnapshot;
  currentSpeed: number;
  targetSpeed: number;
  currentDuration: number;
  resultingDuration: number;
  durationDelta: number;
  reverseRequested: boolean;
  warnings: string[];
}

export interface SpeedPlan {
  mode: SpeedMode;
  reverse: boolean;
  preserveAudio: boolean;
  rampPreset: SpeedRampPresetId | null;
  /** Curve samples for preview B (constant = flat line). */
  samples: SpeedRampSample[];
  rows: SpeedClipPlanRow[];
  writeAvailable: boolean;
  warnings: string[];
  detectedNonDefault: SpeedClipSnapshot[];
}
