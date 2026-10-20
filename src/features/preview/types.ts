/**
 * Shared preview contract (§4 / WP1).
 * plan/describe/render must not mutate the Premiere project.
 */

export type PreviewLevel = "A" | "B" | "C";

export interface PreviewChangeRow {
  id: string;
  label: string;
  before?: string;
  after?: string;
  meta?: string;
}

export interface PreviewSummary {
  title: string;
  /** Human-readable one-liner, e.g. "14 clips renamed, 3 unchanged". */
  headline: string;
  counts: Record<string, number>;
  warnings: string[];
  /** Estimated apply duration in milliseconds (heuristic). */
  estimatedMs: number;
  changes: PreviewChangeRow[];
  /** Highest preview level this feature supports. */
  levels: PreviewLevel[];
  /** Honest note when level C is unavailable. */
  levelCNote?: string;
}

export type PreviewVisualKind =
  | "none"
  | "list"
  | "rename-flip"
  | "split-grid"
  | "caption-karaoke"
  | "timeline"
  | "motion-template"
  | "preset-curve"
  | "speed-curve"
  | "look-grade"
  | "volume-curve"
  | "assembly-ranges"
  | "delivery-queue"
  | "macro-flow"
  | "ai-proposal";

export interface PreviewVisual {
  kind: PreviewVisualKind;
  /** Deterministic payload for AnimatedPreview / TimelineMiniMap. */
  payload: unknown;
}

export interface ApplyReport {
  ok: boolean;
  message: string;
  affected: number;
  details?: Record<string, unknown>;
}

export interface VerifyReport {
  ok: boolean;
  message: string;
  mismatches?: string[];
}

/**
 * Common contract for every mutable feature.
 * `apply` MUST call `assertPlanReady` (or equivalent) — never mutate without a plan.
 */
export interface PreviewablePlan<TInput, TPlan> {
  readonly id: string;
  readonly label: string;
  plan(input: TInput): Promise<TPlan>;
  describe(plan: TPlan): PreviewSummary;
  render(plan: TPlan): PreviewVisual;
  apply(plan: TPlan): Promise<ApplyReport>;
  verify(plan: TPlan): Promise<VerifyReport>;
}
