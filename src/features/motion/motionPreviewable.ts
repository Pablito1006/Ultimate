import { assertPlanReady } from "../preview/guards";
import type {
  ApplyReport,
  PreviewablePlan,
  PreviewSummary,
  PreviewVisual,
  VerifyReport,
} from "../preview/types";
import { templateInjectionService } from "./TemplateInjectionService";
import { getTemplateById } from "./templateRegistry";
import type { MotionTemplateDefinition, TemplateContext, TemplateResult } from "./templateTypes";
import { labelText } from "./templateTypes";

export interface MotionPlanInput {
  templateId: string;
  values: Record<string, string | number | boolean>;
  videoTrackIndex?: number;
  audioTrackIndex?: number;
  allowMarkerFallback?: boolean;
  /** Override path for tests / absolute user mogrt */
  mogrtPathOverride?: string;
  forceReady?: boolean;
}

export interface MotionPlan {
  template: MotionTemplateDefinition;
  values: Record<string, string | number | boolean>;
  videoTrackIndex: number;
  audioTrackIndex: number;
  allowMarkerFallback: boolean;
  canInsertMogrt: boolean;
  warnings: string[];
  lastResult?: TemplateResult;
}

export function planMotionPure(
  template: MotionTemplateDefinition,
  input: Omit<MotionPlanInput, "templateId">
): MotionPlan {
  const values: Record<string, string | number | boolean> = {};
  for (const p of template.parameters) {
    values[p.id] = input.values[p.id] ?? p.defaultValue;
  }
  const warnings: string[] = [];
  let templateForPlan = template;
  if (input.mogrtPathOverride || input.forceReady) {
    templateForPlan = {
      ...template,
      status: "ready",
      mogrtPath: input.mogrtPathOverride || template.mogrtPath || template.mogrt,
      mogrt: input.mogrtPathOverride || template.mogrt,
    };
  }
  const canInsertMogrt =
    templateForPlan.status === "ready" &&
    Boolean(templateForPlan.mogrtPath || templateForPlan.mogrt);

  if (!canInsertMogrt) {
    warnings.push(
      `Fichier .mogrt manquant (status=${template.status}) — insertion bloquée sauf marqueur explicite.`
    );
  }
  if (template.status === "missing-mogrt") {
    warnings.push("Modèle « à fabriquer » — aperçu procédural uniquement.");
  }

  return {
    template: templateForPlan,
    values,
    videoTrackIndex: input.videoTrackIndex ?? 0,
    audioTrackIndex: input.audioTrackIndex ?? 0,
    allowMarkerFallback: Boolean(input.allowMarkerFallback),
    canInsertMogrt,
    warnings,
  };
}

export const motionPreviewable: PreviewablePlan<MotionPlanInput, MotionPlan> = {
  id: "motion-template",
  label: "Motion template",

  async plan(input) {
    const template = getTemplateById(input.templateId);
    if (!template) {
      throw new Error(`Unknown template: ${input.templateId}`);
    }
    return planMotionPure(template, input);
  },

  describe(plan): PreviewSummary {
    const changes = plan.template.parameters.map((p) => ({
      id: p.id,
      label: labelText(p.label),
      before: String(p.defaultValue),
      after: String(plan.values[p.id] ?? p.defaultValue),
      meta: p.masterPropertyName,
    }));
    const headline = plan.canInsertMogrt
      ? `Insert MOGRT “${plan.template.name}” on V${plan.videoTrackIndex + 1}`
      : `Blocked — no .mogrt for “${plan.template.name}”`;
    return {
      title: "Motion template",
      headline,
      counts: {
        parameters: plan.template.parameters.length,
        warnings: plan.warnings.length,
        canInsert: plan.canInsertMogrt ? 1 : 0,
      },
      warnings: plan.warnings.slice(),
      estimatedMs: 400,
      levels: ["A", "B"],
      levelCNote: "Level C (sequence copy trial) unavailable for MOGRT insert in WP3.",
      changes,
    };
  },

  render(plan): PreviewVisual {
    return {
      kind: "motion-template",
      payload: {
        templateId: plan.template.id,
        name: plan.template.name,
        aspect: plan.template.aspect,
        previewSpec: plan.template.previewSpec,
        values: plan.values,
        status: plan.template.status,
        canInsertMogrt: plan.canInsertMogrt,
      },
    };
  },

  async apply(plan): Promise<ApplyReport> {
    assertPlanReady(plan, this.label);
    if (!plan.canInsertMogrt && !plan.allowMarkerFallback) {
      return {
        ok: false,
        message: plan.warnings[0] || "Cannot insert — .mogrt missing.",
        affected: 0,
      };
    }
    const context: TemplateContext = {
      values: plan.values,
      videoTrackIndex: plan.videoTrackIndex,
      audioTrackIndex: plan.audioTrackIndex,
      allowMarkerFallback: plan.allowMarkerFallback,
    };
    const result = await templateInjectionService.injectDefinition(plan.template, context);
    plan.lastResult = result;
    return {
      ok: result.ok,
      message: result.message,
      affected: result.insertedClipNames?.length ?? (result.mode === "marker-fallback" ? 1 : 0),
      details: {
        mode: result.mode,
        paramWriteFailures: result.paramWriteFailures,
      },
    };
  },

  async verify(plan): Promise<VerifyReport> {
    const result = plan.lastResult;
    if (!result) {
      return { ok: false, message: "Nothing applied to verify." };
    }
    if (!result.ok) {
      return { ok: false, message: result.message };
    }
    if (result.mode === "mogrt") {
      const mismatches =
        result.paramWriteFailures?.map(
          (f) => `${f.masterPropertyName}: ${f.reason}`
        ) ?? [];
      // Insertion itself succeeded; param mismatches are warnings not hard fail if clips exist
      if (result.insertedClipNames && result.insertedClipNames.length > 0) {
        return {
          ok: mismatches.length === 0,
          message:
            mismatches.length === 0
              ? `Verified ${result.insertedClipNames.length} inserted item(s).`
              : `Inserted but ${mismatches.length} param verify issue(s).`,
          mismatches: mismatches.length ? mismatches : undefined,
        };
      }
      return { ok: false, message: "MOGRT mode but no clip names recorded." };
    }
    if (result.mode === "marker-fallback") {
      return { ok: true, message: "Marker placeholder verified (mogrt missing path)." };
    }
    return { ok: false, message: result.message };
  },
};

export type MotionPreviewPayload = {
  templateId: string;
  name: string;
  aspect: string;
  previewSpec: MotionTemplateDefinition["previewSpec"];
  values: Record<string, string | number | boolean>;
  status: string;
  canInsertMogrt: boolean;
};
