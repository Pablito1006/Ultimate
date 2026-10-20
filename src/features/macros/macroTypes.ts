/** Macro action types (Premiere-facing + pure runtime). */
export type MacroActionType =
  | "refreshContext"
  | "addMarkerAtPlayhead"
  | "renameSelectedPrefix"
  | "muteAudioTrack"
  | "unmuteAudioTrack"
  | "analyzeTimeline"
  | "setVariable"
  | "logMessage"
  | "noop";

export type MacroValue = string | number | boolean;

export interface MacroAction {
  id: string;
  type: MacroActionType;
  params?: Record<string, MacroValue>;
}

export type MacroCompareOp = "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "truthy" | "falsy";

export interface MacroCondition {
  /** Variable name or literal (string starting with `=` is literal). */
  left: string;
  op: MacroCompareOp;
  /** Optional right operand (var name or `=literal`). */
  right?: string;
}

export type MacroStep =
  | { kind: "action"; id: string; type: MacroActionType; params?: Record<string, MacroValue> }
  | { kind: "setVar"; id: string; name: string; value: MacroValue }
  | { kind: "if"; id: string; when: MacroCondition; then: MacroStep[]; else?: MacroStep[] }
  | { kind: "loop"; id: string; times: number | string; steps: MacroStep[] }
  | { kind: "preview"; id: string; label: string };

/**
 * Schema v2 document. `actions` kept for migration / display of flattened plan.
 */
export interface Macro {
  /** 1 = legacy flat actions; 2 = steps + variables. */
  schemaVersion?: 1 | 2;
  id: string;
  name: string;
  description?: string;
  /** Declared variables (defaults). Runtime copies are mutable. */
  variables?: Record<string, MacroValue>;
  /** v2 control-flow steps. If absent, `actions` is used. */
  steps?: MacroStep[];
  /** Legacy flat list (also used as compiled plan cache). */
  actions: MacroAction[];
  /** Default true — stop remaining steps on failure. */
  stopOnError?: boolean;
  tags?: string[];
}

export interface MacroRunOptions {
  /** Override stopOnError (default: macro.stopOnError ?? true). */
  stopOnError?: boolean;
  /** Initial variable bag (merged over macro.variables). */
  variables?: Record<string, MacroValue>;
  /**
   * If true, continue after failure (dangerous). Default false.
   * Previous successful steps are never auto-rolled-back.
   */
  continueOnError?: boolean;
}

export interface MacroRunResult {
  macroId: string;
  ok: boolean;
  steps: Array<{
    actionId: string;
    ok: boolean;
    message: string;
    skipped?: boolean;
  }>;
  /** Final variable state after run. */
  variables?: Record<string, MacroValue>;
  stoppedAt?: string;
}

export interface PlannedMacroStep {
  actionId: string;
  type: MacroActionType | "preview" | "setVar" | "branch" | "loop-iter";
  description: string;
  /** Preview-only — no mutation on apply. */
  previewOnly?: boolean;
  params?: Record<string, MacroValue>;
}

export const MACRO_SCHEMA_VERSION = 2 as const;
