import type { EasingId } from "../easing/easing";
import type { ParamRole } from "../../../premiere/components/paramAliases";
import type { PlannedKeyframe } from "../../../premiere/keyframes/KeyframeService";

export type PresetCategory =
  | "Zoom"
  | "Pan"
  | "Slide"
  | "Scale"
  | "Rotation"
  | "Opacity"
  | "Camera"
  | "Crop"
  | "Glitch"
  | "Utility";

export interface PresetParamDef {
  id: string;
  label: { en: string; fr: string };
  type: "number" | "slider" | "checkbox" | "dropdown" | "easing";
  defaultValue: string | number | boolean;
  min?: number;
  max?: number;
  step?: number;
  options?: string[];
}

export interface PresetChannelPlan {
  role: ParamRole;
  keyframes: PlannedKeyframe[];
  /** Relative to clip start (seconds). */
  rangeStart: number;
  rangeEnd: number;
}

export interface PresetDefinition {
  id: string;
  name: string;
  category: PresetCategory;
  tags: string[];
  description: string;
  /** Roles required — missing role → partial / unavailable with message. */
  requiredRoles: ParamRole[];
  optionalRoles?: ParamRole[];
  /** Optional VideoFilterFactory matchNames (e.g. directional blur). */
  optionalFilters?: string[];
  parameters: PresetParamDef[];
  /**
   * Pure planner: clip-local times (0 = clip in-point).
   * `base` holds current resolved values for roles when known.
   */
  planChannels: (
    opts: Record<string, string | number | boolean>,
    ctx: PresetPlanContext
  ) => PresetChannelPlan[];
}

export interface PresetPlanContext {
  clipDuration: number;
  /** Current values by role when readable (scale=100, opacity=100, …). */
  base: Partial<Record<ParamRole, number | [number, number]>>;
}

export interface PresetApplyOptions {
  intensity?: number;
  duration?: number;
  easing?: EasingId;
  overwriteExisting?: boolean;
  /** Anchor 0..1 for zoom (0.5 = center). */
  anchorX?: number;
  anchorY?: number;
}

export function num(opts: Record<string, string | number | boolean>, id: string, fallback: number): number {
  const v = opts[id];
  return typeof v === "number" ? v : Number(v ?? fallback);
}

export function bool(opts: Record<string, string | number | boolean>, id: string, fallback: boolean): boolean {
  const v = opts[id];
  return typeof v === "boolean" ? v : Boolean(v ?? fallback);
}

export function str(opts: Record<string, string | number | boolean>, id: string, fallback: string): string {
  const v = opts[id];
  return typeof v === "string" ? v : String(v ?? fallback);
}
