import { transactionService } from "../../premiere/transactions/TransactionService";
import { getPremiereModule } from "../../premiere/adapters/premiereModule";
import { projectService } from "../../premiere/project/ProjectService";
import { sequenceService } from "../../premiere/sequence/SequenceService";
import { timelineService } from "../../premiere/timeline/TimelineService";
import type { VideoClipTrackItem } from "@adobe/premierepro";
import { PremiereError } from "../../core/errors/AppError";
import { Logger } from "../../core/logging/Logger";
import { assertPlanReady } from "../preview/guards";
import type { ApplyReport, PreviewablePlan, PreviewSummary, PreviewVisual, VerifyReport } from "../preview/types";
import {
  calculateGridLayout,
  type LayoutCell,
  type LayoutType,
  type SplitScreenConfig,
} from "./layoutEngine";

export interface SplitPlanInput {
  layout: LayoutType;
  gap?: number;
}

export interface SplitPlan {
  cells: LayoutCell[];
  config: SplitScreenConfig;
  clipNames: string[];
  clipIds: string[];
  playheadSeconds: number;
  limitation: string;
}

/** Pure geometry plan from frame size + clip count (unit-testable). */
export function planSplitPure(
  layout: LayoutType,
  frame: { width: number; height: number },
  clipNames: string[],
  gap = 8
): Pick<SplitPlan, "cells" | "config" | "clipNames" | "limitation"> {
  const clipCount = Math.max(1, Math.min(clipNames.length || 2, 9));
  const config: SplitScreenConfig = {
    layout,
    gap,
    border: 0,
    padding: 0,
    margin: 0,
    width: frame.width || 1920,
    height: frame.height || 1080,
    clipCount,
  };
  const cells = calculateGridLayout(config);
  return {
    cells,
    config,
    clipNames: clipNames.slice(0, cells.length),
    limitation:
      "Layout geometry is calculated. Aligning clip starts across tracks is applied when possible. " +
      "Per-clip crop/scale requires Motion effect parameters or a MOGRT — not simulated (WP5).",
  };
}

export const splitPreviewable: PreviewablePlan<SplitPlanInput, SplitPlan> = {
  id: "split",
  label: "Split screen",

  async plan(input) {
    const analysis = await timelineService.analyzeActive();
    const videoClips = analysis.clips.filter((c) => c.trackKind === "video");
    const pure = planSplitPure(
      input.layout,
      { width: analysis.frameWidth, height: analysis.frameHeight },
      videoClips.map((c) => c.name),
      input.gap ?? 8
    );
    return {
      ...pure,
      clipIds: videoClips.slice(0, pure.cells.length).map((c) => c.id),
      playheadSeconds: analysis.playerPosition,
    };
  },

  describe(plan): PreviewSummary {
    return {
      title: "Split screen",
      headline: `${plan.cells.length} cell(s) · ${plan.config.layout} · ${plan.config.width}×${plan.config.height}`,
      counts: {
        cells: plan.cells.length,
        clips: plan.clipNames.length,
      },
      warnings: [plan.limitation],
      estimatedMs: Math.max(80, plan.cells.length * 40),
      levels: ["A", "B"],
      levelCNote:
        "Level C trial on a sequence copy is not wired in WP1 (createSubsequence exists but cleanup policy pending).",
      changes: plan.cells.map((cell) => ({
        id: `cell_${cell.index}`,
        label: `#${cell.index + 1} ${plan.clipNames[cell.index] || "—"}`,
        before: "full frame",
        after: `${cell.x},${cell.y} ${cell.width}×${cell.height}`,
      })),
    };
  },

  render(plan): PreviewVisual {
    return {
      kind: "split-grid",
      payload: {
        width: plan.config.width,
        height: plan.config.height,
        cells: plan.cells.map((cell) => ({
          ...cell,
          label: plan.clipNames[cell.index],
        })),
      },
    };
  },

  async apply(plan): Promise<ApplyReport> {
    assertPlanReady(plan, this.label);
    const count = await alignClipsToPlayhead(plan.cells.length);
    return {
      ok: true,
      message: `Aligned ${count} clip(s) to playhead (geometry preview only — no crop/scale).`,
      affected: count,
      details: { layout: plan.config.layout },
    };
  },

  async verify(plan): Promise<VerifyReport> {
    assertPlanReady(plan, this.label);
    const analysis = await timelineService.analyzeActive({ bypassCache: true });
    const video = analysis.clips.filter((c) => c.trackKind === "video").slice(0, plan.cells.length);
    if (video.length === 0) {
      return { ok: false, message: "Verify failed: no video clips after apply." };
    }
    const target = plan.playheadSeconds;
    const mismatches: string[] = [];
    // After align, first clips on tracks should be near playhead; allow 1 frame ~0.05s slack
    for (let i = 0; i < Math.min(video.length, plan.cells.length); i += 1) {
      if (Math.abs(video[i].start - target) > 0.05) {
        // Not all tracks may have been moved if plan used clip count from earlier analysis
        mismatches.push(
          `Clip “${video[i].name}” start ${video[i].start.toFixed(3)}s ≠ playhead ${target.toFixed(3)}s`
        );
      }
    }
    // Soft: if at least one clip matches playhead, treat as partial success for honest reporting
    const matched = video.filter((c) => Math.abs(c.start - target) <= 0.05).length;
    if (matched === 0 && mismatches.length > 0) {
      return {
        ok: false,
        message: "Verify: no aligned clip found near playhead.",
        mismatches,
      };
    }
    return {
      ok: true,
      message: `Verify: ${matched} clip(s) near playhead (±0.05s). Crop/scale not applied.`,
      mismatches: mismatches.length > 0 ? mismatches : undefined,
    };
  },
};

async function alignClipsToPlayhead(clipCount: number): Promise<number> {
  const project = await projectService.requireActiveProject();
  const sequence = await sequenceService.requireActiveSequence(project);
  const ppro = getPremiereModule();

  try {
    const playhead = await sequence.getPlayerPosition();
    const videoCount = await sequence.getVideoTrackCount();
    const moves: Array<{ item: VideoClipTrackItem; deltaSeconds: number }> = [];
    let used = 0;

    for (let t = 0; t < videoCount && used < clipCount; t += 1) {
      const track = await sequence.getVideoTrack(t);
      const items = track.getTrackItems(ppro.Constants.TrackItemType.CLIP, false);
      if (items.length === 0) {
        continue;
      }
      const item = items[0];
      const start = await item.getStartTime();
      moves.push({ item, deltaSeconds: playhead.seconds - start.seconds });
      used += 1;
    }

    if (moves.length === 0) {
      throw new PremiereError("No video clips found to align for split screen.");
    }

    const label = "MasterMotion: Align split-screen clips";
    project.lockedAccess(() => {
      const committed = project.executeTransaction((ca) => {
        for (let i = 0; i < moves.length; i += 1) {
          ca.addAction(
            moves[i].item.createMoveAction(ppro.TickTime.createWithSeconds(moves[i].deltaSeconds))
          );
        }
      }, label);
      transactionService.assertCommitted(committed, label);
    });

    timelineService.invalidateCache();
    return moves.length;
  } catch (cause) {
    Logger.error("Split screen align failed", { cause: String(cause) });
    if (cause instanceof PremiereError) {
      throw cause;
    }
    throw new PremiereError("Unable to align clips for split screen.", { cause });
  }
}
