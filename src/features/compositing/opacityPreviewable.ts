import { componentService } from "../../premiere/components/ComponentService";
import { projectService } from "../../premiere/project/ProjectService";
import { timelineService } from "../../premiere/timeline/TimelineService";
import { getCompositingFeatureStatus } from "./compositingCapabilities";
import { assertPlanReady } from "../preview/guards";
import type { ApplyReport, PreviewablePlan, PreviewSummary, PreviewVisual, VerifyReport } from "../preview/types";

export interface OpacityPlanInput {
  opacity: number;
  /** Requested blend mode label — applied only if writable param exists. */
  blendMode?: string;
  maxClips?: number;
}

export interface OpacityPlan {
  opacity: number;
  blendMode?: string;
  clipIds: string[];
  clipNames: string[];
  trackIndexes: number[];
  starts: number[];
  blendStatus: string;
  warnings: string[];
}

export const opacityPreviewable: PreviewablePlan<OpacityPlanInput, OpacityPlan> = {
  id: "opacity-blend",
  label: "Opacity / blend",

  async plan(input) {
    const analysis = await timelineService.analyzeActive({ bypassCache: true });
    const video = analysis.clips
      .filter((c) => c.trackKind === "video")
      .slice(0, input.maxClips ?? 20);
    const features = getCompositingFeatureStatus({ hasOpacityParam: true, hasBlendParam: false });
    const blend = features.find((f) => f.id === "blendMode");
    return {
      opacity: Math.max(0, Math.min(100, input.opacity)),
      blendMode: input.blendMode,
      clipIds: video.map((c) => c.id),
      clipNames: video.map((c) => c.name),
      trackIndexes: video.map((c) => c.trackIndex),
      starts: video.map((c) => c.start),
      blendStatus: blend?.status ?? "unavailable",
      warnings: [
        blend?.reason || "Blend mode unavailable",
        "Overlays: apply opacity on upper tracks; no invented blend simulation.",
      ],
    };
  },

  describe(plan): PreviewSummary {
    return {
      title: "Opacity",
      headline: `Set opacity=${plan.opacity} on ${plan.clipNames.length} clip(s)`,
      counts: { clips: plan.clipNames.length },
      warnings: plan.warnings,
      estimatedMs: 80,
      levels: ["A", "B"],
      changes: plan.clipNames.map((name, i) => ({
        id: plan.clipIds[i],
        label: name,
        after: `opacity ${plan.opacity}`,
        meta: plan.blendMode ? `blend request: ${plan.blendMode} (${plan.blendStatus})` : undefined,
      })),
    };
  },

  render(plan): PreviewVisual {
    return {
      kind: "list",
      payload: { opacity: plan.opacity, clips: plan.clipNames },
    };
  },

  async apply(plan): Promise<ApplyReport> {
    assertPlanReady(plan, this.label);
    const project = await projectService.requireActiveProject();
    let n = 0;
    const failures: string[] = [];
    for (let i = 0; i < plan.clipIds.length; i += 1) {
      const item = await timelineService.getVideoClipTrackItem(
        plan.trackIndexes[i],
        plan.clipNames[i],
        plan.starts[i]
      );
      if (!item) {
        failures.push(plan.clipNames[i]);
        continue;
      }
      const map = await componentService.mapClipComponents(item);
      if (!map.params.opacity) {
        failures.push(`${plan.clipNames[i]}: no Opacity`);
        continue;
      }
      await componentService.setStaticValue(
        project,
        map.params.opacity,
        plan.opacity,
        "MasterMotion: Set opacity"
      );
      n += 1;
    }
    if (plan.blendMode && plan.blendStatus === "unavailable") {
      failures.push(`Blend “${plan.blendMode}” not applied (unavailable)`);
    }
    return {
      ok: n > 0,
      message: `Opacity set on ${n} clip(s).${failures.length ? ` Notes: ${failures.join("; ")}` : ""}`,
      affected: n,
      details: { failures },
    };
  },

  async verify(plan): Promise<VerifyReport> {
    const mismatches: string[] = [];
    for (let i = 0; i < plan.clipIds.length; i += 1) {
      const item = await timelineService.getVideoClipTrackItem(
        plan.trackIndexes[i],
        plan.clipNames[i],
        plan.starts[i]
      );
      if (!item) {
        continue;
      }
      const map = await componentService.mapClipComponents(item);
      if (!map.params.opacity) {
        continue;
      }
      const v = await componentService.readNumeric(map.params.opacity);
      if (v !== null && Math.abs(v - plan.opacity) > 1) {
        mismatches.push(`${plan.clipNames[i]}: opacity ${v}`);
      }
    }
    return {
      ok: mismatches.length === 0,
      message: mismatches.length === 0 ? "Opacity verify OK." : "Opacity mismatch",
      mismatches: mismatches.length ? mismatches : undefined,
    };
  },
};
