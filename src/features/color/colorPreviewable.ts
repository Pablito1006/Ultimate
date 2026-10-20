import {
  COLOR_PARAM_ROLES,
  LUMETRI_MATCH_CANDIDATES,
  type ParamRole,
} from "../../premiere/components/paramAliases";
import { componentService } from "../../premiere/components/ComponentService";
import { projectService } from "../../premiere/project/ProjectService";
import { timelineService } from "../../premiere/timeline/TimelineService";
import { assertPlanReady } from "../preview/guards";
import type {
  ApplyReport,
  PreviewablePlan,
  PreviewSummary,
  PreviewVisual,
  VerifyReport,
} from "../preview/types";
import { getLookById } from "./lookCatalog";
import { getColorFeatureStatus } from "./colorCapabilities";
import {
  approximatePreviewRgb,
  blendLook,
  describeLookDelta,
  snapshotFromPartial,
  valuesEqual,
} from "./lookMath";
import {
  LOOK_NEUTRALS,
  type AppliedLookValues,
  type LookParamKey,
  type LookParams,
} from "./lookTypes";

export type ColorAction = "apply" | "remove" | "harmonize";

export interface ColorPlanInput {
  lookId: string;
  /** 0–1 */
  intensity?: number;
  action?: ColorAction;
  /** When false, refuse if color params already differ from neutrals. */
  overwriteExisting?: boolean;
  /** Limit clips (harmonize / apply batch). Default all video. */
  maxClips?: number;
  /** Optional pasted look values (copy/paste) — overrides catalog blend when set. */
  pastedValues?: AppliedLookValues;
}

export interface ColorClipBinding {
  clipId: string;
  clipName: string;
  trackIndex: number;
  start: number;
  before: LookParams;
  after: AppliedLookValues;
  warnings: string[];
}

export interface ColorPlan {
  lookId: string;
  lookName: string;
  intensity: number;
  action: ColorAction;
  overwriteExisting: boolean;
  targetValues: AppliedLookValues;
  bindings: ColorClipBinding[];
  lutFile?: string;
  lutApplyUnavailable: boolean;
  warnings: string[];
}

async function readColorSnapshot(
  item: Parameters<typeof componentService.mapClipComponents>[0]
): Promise<{ map: Awaited<ReturnType<typeof componentService.mapClipComponents>>; before: LookParams }> {
  const map = await componentService.mapClipComponents(item);
  const before: LookParams = {};
  for (const role of COLOR_PARAM_ROLES) {
    const p = map.params[role];
    if (!p) {
      continue;
    }
    const n = await componentService.readNumeric(p);
    if (n !== null) {
      before[role as LookParamKey] = n;
    }
  }
  return { map, before };
}

function hasNonNeutral(before: LookParams): boolean {
  const snap = snapshotFromPartial(before);
  return !valuesEqual(snap, LOOK_NEUTRALS, 0.5);
}

export function planColorPure(
  clips: Array<{ id: string; name: string; trackIndex: number; start: number; before?: LookParams }>,
  input: ColorPlanInput
): ColorPlan {
  const look = getLookById(input.lookId);
  if (!look) {
    throw new Error(`Look inconnu: ${input.lookId}`);
  }
  const intensity = Math.max(0, Math.min(1, input.intensity ?? 1));
  const action = input.action ?? "apply";
  const overwriteExisting = Boolean(input.overwriteExisting);
  const targetValues =
    action === "remove"
      ? { ...LOOK_NEUTRALS }
      : input.pastedValues
        ? { ...input.pastedValues }
        : blendLook(look, intensity);

  const warnings: string[] = [
    "Aperçu B approximatif — ne reproduit pas le rendu Lumetri exact.",
    "Pas d’analyse d’image ni de match colorimétrique auto (API pixels unavailable).",
  ];
  if (look.lutFile) {
    warnings.push(
      `LUT fichier ${look.lutFile}: apply GUID unavailable — import manuel Creative → LUT ; params équivalents appliqués.`
    );
  }
  const caps = getColorFeatureStatus();
  const lutCap = caps.find((c) => c.id === "lut.fileApply");
  if (lutCap?.status === "unavailable") {
    warnings.push(lutCap.reason);
  }

  const bindings: ColorClipBinding[] = clips.map((c) => {
    const before = c.before ?? {};
    const rowWarnings: string[] = [];
    if (!overwriteExisting && action !== "remove" && hasNonNeutral(before)) {
      rowWarnings.push("Réglages couleur existants — activer « écraser » pour appliquer.");
    }
    return {
      clipId: c.id,
      clipName: c.name,
      trackIndex: c.trackIndex,
      start: c.start,
      before,
      after: targetValues,
      warnings: rowWarnings,
    };
  });

  return {
    lookId: look.id,
    lookName: look.name,
    intensity,
    action,
    overwriteExisting,
    targetValues,
    bindings,
    lutFile: look.lutFile,
    lutApplyUnavailable: true,
    warnings,
  };
}

export const colorPreviewable: PreviewablePlan<ColorPlanInput, ColorPlan> = {
  id: "color-looks",
  label: "Looks couleur",

  async plan(input) {
    const look = getLookById(input.lookId);
    if (!look) {
      throw new Error(`Look inconnu: ${input.lookId}`);
    }
    const analysis = await timelineService.analyzeActive({ bypassCache: true });
    const video = analysis.clips
      .filter((c) => c.trackKind === "video")
      .slice(0, input.maxClips ?? 200);
    if (video.length === 0) {
      throw new Error("Aucun clip vidéo.");
    }

    const clips: Array<{
      id: string;
      name: string;
      trackIndex: number;
      start: number;
      before?: LookParams;
    }> = [];

    for (const c of video) {
      const item = await timelineService.getVideoClipTrackItem(c.trackIndex, c.name, c.start);
      let before: LookParams = {};
      if (item) {
        const snap = await readColorSnapshot(item);
        before = snap.before;
      }
      clips.push({
        id: c.id,
        name: c.name,
        trackIndex: c.trackIndex,
        start: c.start,
        before,
      });
    }

    return planColorPure(clips, input);
  },

  describe(plan): PreviewSummary {
    const blocked = plan.bindings.filter(
      (b) => b.warnings.some((w) => /écraser/i.test(w)) && !plan.overwriteExisting && plan.action !== "remove"
    );
    const deltas = describeLookDelta({}, plan.targetValues).slice(0, 6);
    return {
      title: "Étalonnage — looks",
      headline: `${plan.action} « ${plan.lookName} » ×${plan.bindings.length} clip(s) · intensité ${(plan.intensity * 100).toFixed(0)}%`,
      counts: {
        clips: plan.bindings.length,
        blocked: blocked.length,
      },
      warnings: [
        ...plan.warnings,
        ...plan.bindings.flatMap((b) => b.warnings),
        ...(blocked.length && !plan.overwriteExisting
          ? [`${blocked.length} clip(s) bloqués sans option écraser`]
          : []),
      ],
      estimatedMs: 100 * plan.bindings.length,
      levels: ["A", "B"],
      levelCNote: "Level C unavailable (WP7).",
      changes: plan.bindings.map((b) => ({
        id: b.clipId,
        label: b.clipName,
        before: describeLookDelta({}, snapshotFromPartial(b.before)).slice(0, 2).join(", ") || "neutre≈",
        after: deltas.join(", ") || plan.lookName,
        meta: plan.action,
      })),
    };
  },

  render(plan): PreviewVisual {
    const beforeRgb = approximatePreviewRgb(snapshotFromPartial(plan.bindings[0]?.before ?? {}));
    const afterRgb = approximatePreviewRgb(plan.targetValues);
    return {
      kind: "look-grade",
      payload: {
        lookName: plan.lookName,
        intensity: plan.intensity,
        approximate: true,
        disclaimer: "Simulation approximative — pas le rendu Lumetri réel",
        beforeCss: beforeRgb.css,
        afterCss: afterRgb.css,
        values: plan.targetValues,
      },
    };
  },

  async apply(plan): Promise<ApplyReport> {
    assertPlanReady(plan, this.label);
    const project = await projectService.requireActiveProject();
    let affected = 0;
    const failures: string[] = [];

    for (const b of plan.bindings) {
      if (
        !plan.overwriteExisting &&
        plan.action !== "remove" &&
        b.warnings.some((w) => /écraser/i.test(w))
      ) {
        failures.push(`${b.clipName}: skipped (existing grade)`);
        continue;
      }
      const item = await timelineService.getVideoClipTrackItem(b.trackIndex, b.clipName, b.start);
      if (!item) {
        failures.push(`${b.clipName}: track item not found`);
        continue;
      }

      let map = await componentService.mapClipComponents(item);
      const hasColor = COLOR_PARAM_ROLES.some((r) => map.params[r]);
      if (!hasColor) {
        const appended = await componentService.tryAppendVideoFilter(
          project,
          item,
          LUMETRI_MATCH_CANDIDATES,
          `MasterMotion: Append Lumetri for look ${plan.lookId}`
        );
        if (!appended) {
          failures.push(`${b.clipName}: Lumetri append failed`);
          continue;
        }
        map = await componentService.mapClipComponents(item);
      }

      let wrote = 0;
      for (const role of COLOR_PARAM_ROLES) {
        const param = map.params[role];
        if (!param) {
          continue;
        }
        const value = plan.targetValues[role as LookParamKey];
        try {
          await componentService.setStaticValue(
            project,
            param,
            value,
            `MasterMotion: Look ${plan.lookId} / ${role}`
          );
          wrote += 1;
        } catch (cause) {
          failures.push(`${b.clipName}/${role}: ${String(cause)}`);
        }
      }
      if (wrote === 0) {
        failures.push(
          `${b.clipName}: no writable color params — edit Lumetri manually in Effect Controls`
        );
      } else {
        affected += 1;
      }
    }

    timelineService.invalidateCache();
    const ok = affected > 0;
    return {
      ok,
      message: ok
        ? `Look ${plan.action} on ${affected} clip(s).${failures.length ? ` Issues: ${failures.length}` : ""}`
        : `Look apply failed. ${failures.slice(0, 3).join("; ")}`,
      affected,
      details: { failures, lutApplyUnavailable: plan.lutApplyUnavailable },
    };
  },

  async verify(plan): Promise<VerifyReport> {
    assertPlanReady(plan, this.label);
    const mismatches: string[] = [];
    for (const b of plan.bindings) {
      if (
        !plan.overwriteExisting &&
        plan.action !== "remove" &&
        b.warnings.some((w) => /écraser/i.test(w))
      ) {
        continue;
      }
      const item = await timelineService.getVideoClipTrackItem(b.trackIndex, b.clipName, b.start);
      if (!item) {
        mismatches.push(`${b.clipName}: missing`);
        continue;
      }
      const { before: live } = await readColorSnapshot(item);
      const liveSnap = snapshotFromPartial(live);
      // Only compare roles that exist on the clip
      for (const role of Object.keys(live) as LookParamKey[]) {
        const expected = plan.targetValues[role];
        const got = liveSnap[role];
        if (Math.abs(got - expected) > 0.15) {
          mismatches.push(`${b.clipName}/${role}: ${got} ≠ ${expected}`);
        }
      }
      if (Object.keys(live).length === 0) {
        mismatches.push(`${b.clipName}: no color params to verify`);
      }
    }
    return {
      ok: mismatches.length === 0,
      message:
        mismatches.length === 0
          ? "Color params re-read OK"
          : `Verify mismatches: ${mismatches.length}`,
      mismatches: mismatches.length ? mismatches : undefined,
    };
  },
};

/** Read current look-ish values from first video clip (for copy). */
export async function readLookFromFirstClip(): Promise<AppliedLookValues | null> {
  const analysis = await timelineService.analyzeActive({ bypassCache: true });
  const video = analysis.clips.filter((c) => c.trackKind === "video");
  if (video.length === 0) {
    return null;
  }
  const c = video[0];
  const item = await timelineService.getVideoClipTrackItem(c.trackIndex, c.name, c.start);
  if (!item) {
    return null;
  }
  const { before } = await readColorSnapshot(item);
  return snapshotFromPartial(before);
}

export function rolesMissingMessage(roles: ParamRole[]): string {
  return `Missing roles: ${roles.join(", ")}`;
}
