import { assertPlanReady } from "../preview/guards";
import type { ApplyReport, PreviewablePlan, PreviewSummary, PreviewVisual, VerifyReport } from "../preview/types";
import { clipRenameService } from "../../premiere/clips/ClipRenameService";
import { projectService } from "../../premiere/project/ProjectService";
import { timelineService } from "../../premiere/timeline/TimelineService";
import { renameItems, type RenameOptions, type RenamePreviewItem } from "./renameEngine";

export interface RenamePlanInput {
  options: RenameOptions;
}

export interface RenamePlan {
  items: RenamePreviewItem[];
  options: RenameOptions;
}

/**
 * Pure planning helper (no Premiere) — used by unit tests and by plan().
 */
export function planRenamePure(
  items: Array<{ id: string; name: string }>,
  options: RenameOptions
): RenamePlan {
  return {
    items: renameItems(items, options),
    options,
  };
}

export const renamePreviewable: PreviewablePlan<RenamePlanInput, RenamePlan> = {
  id: "rename",
  label: "Batch rename",

  async plan(input) {
    const project = await projectService.requireActiveProject();
    const selected = await timelineService.listSelectedProjectItems(project);
    if (selected.length === 0) {
      throw new Error("Select one or more items in the Project panel first.");
    }
    return planRenamePure(selected, input.options);
  },

  describe(plan): PreviewSummary {
    const changed = plan.items.filter((i) => i.changed).length;
    const unchanged = plan.items.length - changed;
    return {
      title: "Rename",
      headline: `${changed} item(s) renamed, ${unchanged} unchanged`,
      counts: { total: plan.items.length, changed, unchanged },
      warnings: changed === 0 ? ["No names would change with current options."] : [],
      estimatedMs: Math.max(50, changed * 15),
      levels: ["A", "B"],
      levelCNote: "Level C (sequence copy trial) is unavailable for project-panel rename in WP1.",
      changes: plan.items.map((item) => ({
        id: item.id,
        label: item.before,
        before: item.before,
        after: item.changed ? item.after : item.before,
        meta: item.changed ? "change" : "same",
      })),
    };
  },

  render(plan): PreviewVisual {
    return {
      kind: "rename-flip",
      payload: { items: plan.items },
    };
  },

  async apply(plan): Promise<ApplyReport> {
    assertPlanReady(plan, this.label);
    const applied = await clipRenameService.applyProjectItemRenames(plan.items);
    return {
      ok: true,
      message: `Renamed ${applied} item(s).`,
      affected: applied,
    };
  },

  async verify(plan): Promise<VerifyReport> {
    assertPlanReady(plan, this.label);
    const project = await projectService.requireActiveProject();
    const selected = await timelineService.listSelectedProjectItems(project);
    const expected = new Set(plan.items.filter((i) => i.changed).map((i) => i.after));
    const mismatches: string[] = [];
    for (const item of plan.items) {
      if (!item.changed) {
        continue;
      }
      const found = selected.some((s) => s.name === item.after);
      if (!found && expected.has(item.after)) {
        // Selection order/names may have shifted; soft check: at least count
        mismatches.push(`Expected name “${item.after}” not found in current selection.`);
      }
    }
    // Soft verify: if all renamed targets appear among selection names, OK
    const selectionNames = new Set(selected.map((s) => s.name));
    const missing = plan.items
      .filter((i) => i.changed && !selectionNames.has(i.after))
      .map((i) => i.after);
    if (missing.length > 0 && selected.length > 0) {
      return {
        ok: false,
        message: `Verify incomplete: ${missing.length} expected name(s) missing from selection.`,
        mismatches: missing,
      };
    }
    return {
      ok: true,
      message: "Verify: selection names match the rename plan (or selection was cleared).",
      mismatches: mismatches.length > 0 ? mismatches : undefined,
    };
  },
};
