import { assertPlanReady } from "../preview/guards";
import type {
  ApplyReport,
  PreviewablePlan,
  PreviewSummary,
  PreviewVisual,
  VerifyReport,
} from "../preview/types";
import { expandMacroPlan } from "./macroEngine";
import { macroRunner } from "./MacroRunner";
import type { Macro, MacroRunResult, PlannedMacroStep } from "./macroTypes";

export interface MacroPlanInput {
  macro: Macro;
  continueOnError?: boolean;
}

export interface MacroPlan {
  macro: Macro;
  steps: PlannedMacroStep[];
  continueOnError: boolean;
}

/** Pure macro plan — expands if/loop/preview without running mutations. */
export function planMacroPure(macro: Macro, continueOnError = false): MacroPlan {
  const expanded = expandMacroPlan(macro);
  return {
    macro,
    steps: expanded.steps,
    continueOnError,
  };
}

export const macroPreviewable: PreviewablePlan<MacroPlanInput, MacroPlan> = {
  id: "macros",
  label: "Macros",

  async plan(input) {
    if (!input.macro) {
      throw new Error("Select a macro first.");
    }
    return planMacroPure(input.macro, Boolean(input.continueOnError));
  },

  describe(plan): PreviewSummary {
    const mutating = plan.steps.filter(
      (s) =>
        !s.previewOnly &&
        s.type !== "analyzeTimeline" &&
        s.type !== "refreshContext" &&
        s.type !== "logMessage" &&
        s.type !== "noop" &&
        s.type !== "setVar" &&
        s.type !== "preview" &&
        s.type !== "branch" &&
        s.type !== "loop-iter"
    ).length;
    const warnings = [
      plan.continueOnError
        ? "continueOnError: les étapes suivantes peuvent s’exécuter après un échec (précédentes non annulées)."
        : "Arrêt sur erreur (défaut) — étapes déjà OK non annulées (Undo Premiere).",
    ];
    if (mutating > 0) {
      warnings.push("Apply exécute la macro pour de vrai.");
    }
    return {
      title: plan.macro.name,
      headline: `${plan.steps.length} étape(s) expansée(s) · ${mutating} mutante(s) · schema v${plan.macro.schemaVersion ?? 1}`,
      counts: { steps: plan.steps.length, mutating },
      warnings,
      estimatedMs: Math.max(30, plan.steps.length * 40),
      levels: ["A", "B"],
      levelCNote: "Pas de copie de séquence pour dry-run macro (C unavailable).",
      changes: plan.steps.map((step) => ({
        id: step.actionId,
        label: String(step.type),
        after: step.description,
        meta: step.previewOnly ? "preview-only" : undefined,
      })),
    };
  },

  render(plan): PreviewVisual {
    return {
      kind: "macro-flow",
      payload: {
        name: plan.macro.name,
        steps: plan.steps.map((s) => ({
          id: s.actionId,
          type: s.type,
          label: s.description,
          previewOnly: Boolean(s.previewOnly),
        })),
      },
    };
  },

  async apply(plan): Promise<ApplyReport> {
    assertPlanReady(plan, this.label);
    const result: MacroRunResult = await macroRunner.run(plan.macro, {
      continueOnError: plan.continueOnError,
      stopOnError: !plan.continueOnError,
    });
    return {
      ok: result.ok,
      message: result.ok
        ? "Macro completed."
        : `Macro stopped${result.stoppedAt ? ` at ${result.stoppedAt}` : ""} — previous steps not rolled back.`,
      affected: result.steps.filter((s) => s.ok && !s.skipped).length,
      details: { steps: result.steps, variables: result.variables, stoppedAt: result.stoppedAt },
    };
  },

  async verify(plan): Promise<VerifyReport> {
    assertPlanReady(plan, this.label);
    const expanded = expandMacroPlan(plan.macro);
    if (expanded.steps.length === 0) {
      return { ok: false, message: "Verify: no expanded steps", mismatches: ["empty"] };
    }
    return {
      ok: true,
      message: `Verify: macro “${plan.macro.name}” — ${expanded.steps.length} step(s) planned; re-check host state if mutations ran.`,
    };
  },
};
