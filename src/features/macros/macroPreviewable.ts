import { assertPlanReady } from "../preview/guards";
import type { ApplyReport, PreviewablePlan, PreviewSummary, PreviewVisual, VerifyReport } from "../preview/types";
import type { Macro, MacroAction, MacroRunResult } from "./macroTypes";
import { macroRunner } from "./MacroRunner";

export interface MacroPlanInput {
  macro: Macro;
}

export interface MacroPlan {
  macro: Macro;
  /** Dry-run description of each action (no mutation). */
  steps: Array<{ actionId: string; type: MacroAction["type"]; description: string }>;
}

/** Pure macro plan — describes actions without running them. */
export function planMacroPure(macro: Macro): MacroPlan {
  return {
    macro,
    steps: macro.actions.map((action) => ({
      actionId: action.id,
      type: action.type,
      description: describeAction(action),
    })),
  };
}

function describeAction(action: MacroAction): string {
  switch (action.type) {
    case "analyzeTimeline":
    case "refreshContext":
      return "Read timeline analysis (no mutation)";
    case "addMarkerAtPlayhead":
      return `Add marker “${String(action.params?.name ?? "MM Cue")}” at playhead`;
    case "renameSelectedPrefix":
      return `Prefix selected project items with “${String(action.params?.prefix ?? "MM_")}”`;
    case "muteAudioTrack":
      return `Mute audio track ${Number(action.params?.trackIndex ?? 0)}`;
    case "unmuteAudioTrack":
      return `Unmute audio track ${Number(action.params?.trackIndex ?? 0)}`;
    default:
      return `Action ${action.type}`;
  }
}

export const macroPreviewable: PreviewablePlan<MacroPlanInput, MacroPlan> = {
  id: "macros",
  label: "Macros",

  async plan(input) {
    if (!input.macro) {
      throw new Error("Select a macro first.");
    }
    return planMacroPure(input.macro);
  },

  describe(plan): PreviewSummary {
    const mutating = plan.steps.filter(
      (s) => s.type !== "analyzeTimeline" && s.type !== "refreshContext"
    ).length;
    return {
      title: plan.macro.name,
      headline: `${plan.steps.length} step(s) · ${mutating} mutating`,
      counts: { steps: plan.steps.length, mutating },
      warnings:
        mutating > 0
          ? ["Apply runs the macro for real (one Premiere undo stack entry per mutating step)."]
          : ["This macro is read-only."],
      estimatedMs: Math.max(30, plan.steps.length * 50),
      levels: ["A"],
      levelCNote: "Level C (dry-run on sequence copy) unavailable in WP1.",
      changes: plan.steps.map((step) => ({
        id: step.actionId,
        label: step.type,
        after: step.description,
      })),
    };
  },

  render(plan): PreviewVisual {
    return {
      kind: "list",
      payload: { steps: plan.steps },
    };
  },

  async apply(plan): Promise<ApplyReport> {
    assertPlanReady(plan, this.label);
    const result: MacroRunResult = await macroRunner.run(plan.macro);
    return {
      ok: result.ok,
      message: result.ok ? "Macro completed." : "Macro stopped on failure.",
      affected: result.steps.filter((s) => s.ok).length,
      details: { steps: result.steps },
    };
  },

  async verify(plan): Promise<VerifyReport> {
    assertPlanReady(plan, this.label);
    // Macros are heterogeneous; verify = re-describe steps executed count from last apply details is soft
    return {
      ok: true,
      message: `Verify: macro “${plan.macro.name}” apply finished — re-check timeline/markers manually if needed.`,
    };
  },
};
