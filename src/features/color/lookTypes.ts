import type { ParamRole } from "../../premiere/components/paramAliases";

/** Lumetri-like Basic Correction values (Premiere English UI conventions). */
export type LookParamKey =
  | "temperature"
  | "tint"
  | "exposure"
  | "contrast"
  | "highlights"
  | "shadows"
  | "whites"
  | "blacks"
  | "saturation"
  | "vibrance";

export type LookParams = Partial<Record<LookParamKey, number>>;

export type LookCategory =
  | "neutral"
  | "warm"
  | "cool"
  | "cinematic"
  | "vintage"
  | "high-contrast"
  | "desat"
  | "social"
  | "lut-ref";

export interface LookDefinition {
  id: string;
  name: string;
  category: LookCategory;
  description: string;
  /** Absolute target values at intensity=1 (merged over neutrals). */
  params: LookParams;
  /**
   * Optional reference .cube under assets/luts/ — for manual import only.
   * File LUT GUID write is unavailable in UXP for plugin paths.
   */
  lutFile?: string;
  /** Approximate preview biases (not a true grade). */
  preview: {
    warm: number;
    cool: number;
    contrast: number;
    sat: number;
  };
}

export interface AppliedLookValues {
  temperature: number;
  tint: number;
  exposure: number;
  contrast: number;
  highlights: number;
  shadows: number;
  whites: number;
  blacks: number;
  saturation: number;
  vibrance: number;
}

export const LOOK_NEUTRALS: AppliedLookValues = {
  temperature: 0,
  tint: 0,
  exposure: 0,
  contrast: 0,
  highlights: 0,
  shadows: 0,
  whites: 0,
  blacks: 0,
  saturation: 100,
  vibrance: 0,
};

export function lookKeyToRole(key: LookParamKey): ParamRole {
  return key;
}
