import { componentService } from "../../premiere/components/ComponentService";
import { projectService } from "../../premiere/project/ProjectService";
import { timelineService } from "../../premiere/timeline/TimelineService";
import { cellToTransform } from "./geometryTransform";
import { assertPlanReady } from "../preview/guards";
import type { ApplyReport, PreviewablePlan, PreviewSummary, PreviewVisual, VerifyReport } from "../preview/types";
import type { LayoutCell } from "../split-screen/layoutEngine";

export type PipAnchor = "top-left" | "top-right" | "bottom-left" | "bottom-right";

export interface PipPlanInput {
  anchor?: PipAnchor;
  sizePercent?: number;
  margin?: number;
  opacity?: number;
  /** Animate scale/opacity in over durationSeconds at clip start. */
  animateIn?: boolean;
  durationSeconds?: number;
}

export interface PipPlan {
  frame: { width: number; height: number };
  cell: LayoutCell;
  clipId: string;
  clipName: string;
  trackIndex: number;
  start: number;
  opacity: number;
  animateIn: boolean;
  durationSeconds: number;
  transform: ReturnType<typeof cellToTransform>;
  warnings: string[];
}

export function pipCell(
  frame: { width: number; height: number },
  anchor: PipAnchor,
  sizePercent: number,
  margin: number
): LayoutCell {
  const w = Math.round(frame.width * (sizePercent / 100));
  const h = Math.round(frame.height * (sizePercent / 100));
  let x = margin;
  let y = margin;
  if (anchor === "top-right" || anchor === "bottom-right") {
    x = frame.width - w - margin;
  }
  if (anchor === "bottom-left" || anchor === "bottom-right") {
    y = frame.height - h - margin;
  }
  return { index: 0, x, y, width: w, height: h };
}

export function planPipPure(
  frame: { width: number; height: number },
  clip: { id: string; name: string; trackIndex: number; start: number },
  input: PipPlanInput
): PipPlan {
  const anchor = input.anchor ?? "bottom-right";
  const sizePercent = input.sizePercent ?? 28;
  const margin = input.margin ?? 24;
  const cell = pipCell(frame, anchor, sizePercent, margin);
  const transform = cellToTransform(cell, frame, "fit-width");
  const warnings: string[] = [];
  warnings.push("Ombre portée / coins arrondis: unavailable (pas d’API writable confirmée).");
  return {
    frame,
    cell,
    clipId: clip.id,
    clipName: clip.name,
    trackIndex: clip.trackIndex,
    start: clip.start,
    opacity: input.opacity ?? 100,
    animateIn: Boolean(input.animateIn),
    durationSeconds: input.durationSeconds ?? 0.4,
    transform,
    warnings,
  };
}

export const pipPreviewable: PreviewablePlan<PipPlanInput, PipPlan> = {
  id: "pip",
  label: "Picture-in-picture",

  async plan(input) {
    const analysis = await timelineService.analyzeActive({ bypassCache: true });
    const video = analysis.clips.filter((c) => c.trackKind === "video");
    if (video.length === 0) {
      throw new Error("No video clip for PiP.");
    }
    // Prefer highest track (top) as PiP subject
    const clip = video[video.length - 1];
    return planPipPure(
      { width: analysis.frameWidth, height: analysis.frameHeight },
      { id: clip.id, name: clip.name, trackIndex: clip.trackIndex, start: clip.start },
      input
    );
  },

  describe(plan): PreviewSummary {
    return {
      title: "Picture-in-picture",
      headline: `PiP “${plan.clipName}” → ${Math.round(plan.cell.width)}×${Math.round(plan.cell.height)} @ ${Math.round(plan.cell.x)},${Math.round(plan.cell.y)}`,
      counts: { clips: 1 },
      warnings: plan.warnings,
      estimatedMs: 120,
      levels: ["A", "B"],
      levelCNote: "Level C unavailable (WP5).",
      changes: [
        {
          id: plan.clipId,
          label: plan.clipName,
          before: "full",
          after: `scale ${plan.transform.scale.toFixed(1)}% · opacity ${plan.opacity}`,
        },
      ],
    };
  },

  render(plan): PreviewVisual {
    return {
      kind: "split-grid",
      payload: {
        width: plan.frame.width,
        height: plan.frame.height,
        cells: [
          {
            index: 0,
            x: 0,
            y: 0,
            width: plan.frame.width,
            height: plan.frame.height,
            label: "Main",
          },
          { ...plan.cell, label: "PiP" },
        ],
      },
    };
  },

  async apply(plan): Promise<ApplyReport> {
    assertPlanReady(plan, this.label);
    const project = await projectService.requireActiveProject();
    const item = await timelineService.getVideoClipTrackItem(
      plan.trackIndex,
      plan.clipName,
      plan.start
    );
    if (!item) {
      return { ok: false, message: "PiP clip not found.", affected: 0 };
    }
    const map = await componentService.mapClipComponents(item);
    const t = plan.transform;
    if (map.params.position) {
      await componentService.setStaticValue(
        project,
        map.params.position,
        [t.positionX, t.positionY],
        "MasterMotion: PiP position"
      );
    }
    if (map.params.scale) {
      await componentService.setStaticValue(project, map.params.scale, t.scale, "MasterMotion: PiP scale");
    }
    if (map.params.opacity) {
      await componentService.setStaticValue(
        project,
        map.params.opacity,
        plan.opacity,
        "MasterMotion: PiP opacity"
      );
    }
    // animateIn: best-effort via keyframes would need KeyframeService — optional hint only
    timelineService.invalidateCache();
    return {
      ok: true,
      message: plan.animateIn
        ? "PiP applied (static). Animated in/out: use Presets panel for keyframed opacity/scale if needed."
        : "PiP applied (position + scale + opacity).",
      affected: 1,
    };
  },

  async verify(plan): Promise<VerifyReport> {
    const item = await timelineService.getVideoClipTrackItem(
      plan.trackIndex,
      plan.clipName,
      plan.start
    );
    if (!item) {
      return { ok: false, message: "PiP clip missing on verify." };
    }
    const map = await componentService.mapClipComponents(item);
    const mismatches: string[] = [];
    if (map.params.scale) {
      const s = await componentService.readNumeric(map.params.scale);
      if (s !== null && Math.abs(s - plan.transform.scale) > 1) {
        mismatches.push(`scale ${s} ≠ ${plan.transform.scale}`);
      }
    }
    return {
      ok: mismatches.length === 0,
      message: mismatches.length === 0 ? "PiP verify OK (±1)." : "PiP verify mismatch",
      mismatches: mismatches.length ? mismatches : undefined,
    };
  },
};
