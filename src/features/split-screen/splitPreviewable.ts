import type { VideoClipTrackItem } from "@adobe/premierepro";
import { PremiereError } from "../../core/errors/AppError";
import { Logger } from "../../core/logging/Logger";
import { getPremiereModule } from "../../premiere/adapters/premiereModule";
import { componentService } from "../../premiere/components/ComponentService";
import { projectService } from "../../premiere/project/ProjectService";
import { sequenceService } from "../../premiere/sequence/SequenceService";
import { timelineService } from "../../premiere/timeline/TimelineService";
import { transactionService } from "../../premiere/transactions/TransactionService";
import {
  cellToTransform,
  transformsMatch,
  type CellTransform,
  type FitMode,
} from "../compositing/geometryTransform";
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
  border?: number;
  margin?: number;
  fitMode?: FitMode;
  alignStarts?: boolean;
}

export interface SplitClipBinding {
  clipId: string;
  clipName: string;
  trackIndex: number;
  start: number;
  cellIndex: number;
  transform: CellTransform;
}

export interface SplitPlan {
  cells: LayoutCell[];
  config: SplitScreenConfig;
  clipNames: string[];
  clipIds: string[];
  bindings: SplitClipBinding[];
  playheadSeconds: number;
  fitMode: FitMode;
  alignStarts: boolean;
  limitation: string;
}

/** Pure geometry plan from frame size + clip count (unit-testable). */
export function planSplitPure(
  layout: LayoutType,
  frame: { width: number; height: number },
  clips: Array<{ id: string; name: string; trackIndex: number; start: number }>,
  options: { gap?: number; border?: number; margin?: number; fitMode?: FitMode } = {}
): Pick<SplitPlan, "cells" | "config" | "clipNames" | "clipIds" | "bindings" | "fitMode" | "limitation"> {
  const gap = options.gap ?? 8;
  const border = options.border ?? 0;
  const margin = options.margin ?? 0;
  const fitMode = options.fitMode ?? "fit-width";
  const clipCount = Math.max(1, Math.min(clips.length || 2, 9));
  const config: SplitScreenConfig = {
    layout,
    gap,
    border,
    padding: 0,
    margin,
    width: frame.width || 1920,
    height: frame.height || 1080,
    clipCount,
  };
  const cells = calculateGridLayout(config);
  const used = clips.slice(0, cells.length);
  const bindings: SplitClipBinding[] = used.map((clip, i) => ({
    clipId: clip.id,
    clipName: clip.name,
    trackIndex: clip.trackIndex,
    start: clip.start,
    cellIndex: i,
    transform: cellToTransform(cells[i], { width: config.width, height: config.height }, fitMode),
  }));

  return {
    cells,
    config,
    clipNames: used.map((c) => c.name),
    clipIds: used.map((c) => c.id),
    bindings,
    fitMode,
    limitation:
      "WP5: position + scale + crop applied via Motion/Opacity component params when available. " +
      "Rounded corners / drop shadow: unavailable unless a writable filter exposes them.",
  };
}

export const splitPreviewable: PreviewablePlan<SplitPlanInput, SplitPlan> = {
  id: "split",
  label: "Split screen",

  async plan(input) {
    const analysis = await timelineService.analyzeActive({ bypassCache: true });
    const videoClips = analysis.clips.filter((c) => c.trackKind === "video");
    const pure = planSplitPure(
      input.layout,
      { width: analysis.frameWidth, height: analysis.frameHeight },
      videoClips.map((c) => ({
        id: c.id,
        name: c.name,
        trackIndex: c.trackIndex,
        start: c.start,
      })),
      {
        gap: input.gap ?? 8,
        border: input.border ?? 0,
        margin: input.margin ?? 0,
        fitMode: input.fitMode ?? "fit-width",
      }
    );
    return {
      ...pure,
      playheadSeconds: analysis.playerPosition,
      alignStarts: input.alignStarts !== false,
    };
  },

  describe(plan): PreviewSummary {
    return {
      title: "Split screen (réel)",
      headline: `${plan.cells.length} cellule(s) · ${plan.config.layout} · ${plan.config.width}×${plan.config.height} · ${plan.fitMode}`,
      counts: {
        cells: plan.cells.length,
        clips: plan.bindings.length,
      },
      warnings: [plan.limitation],
      estimatedMs: Math.max(100, plan.bindings.length * 60),
      levels: ["A", "B"],
      levelCNote: "Level C (copie séquence) non disponible en WP5.",
      changes: plan.bindings.map((b) => ({
        id: b.clipId,
        label: `#${b.cellIndex + 1} ${b.clipName}`,
        before: "plein cadre",
        after: `pos ${Math.round(b.transform.positionX)},${Math.round(b.transform.positionY)} · scale ${b.transform.scale.toFixed(1)}% · ${Math.round(b.transform.resultWidth)}×${Math.round(b.transform.resultHeight)}`,
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
    let aligned = 0;
    if (plan.alignStarts) {
      aligned = await alignClipsToPlayhead(plan.bindings.length);
    }

    const project = await projectService.requireActiveProject();
    let transformed = 0;
    const failures: string[] = [];

    for (const binding of plan.bindings) {
      try {
        const item = await timelineService.getVideoClipTrackItem(
          binding.trackIndex,
          binding.clipName,
          plan.alignStarts ? plan.playheadSeconds : binding.start
        );
        // After align, start may equal playhead — try both
        const trackItem =
          item ||
          (await timelineService.getVideoClipTrackItem(
            binding.trackIndex,
            binding.clipName,
            binding.start
          ));
        if (!trackItem) {
          failures.push(`${binding.clipName}: track item not found`);
          continue;
        }
        const map = await componentService.mapClipComponents(trackItem);
        const t = binding.transform;
        const label = `MasterMotion: Split cell ${binding.cellIndex + 1}`;

        if (map.params.position) {
          await componentService.setStaticValue(
            project,
            map.params.position,
            [t.positionX, t.positionY],
            `${label} position`
          );
        } else {
          failures.push(`${binding.clipName}: Position unavailable`);
        }

        if (map.params.scale) {
          await componentService.setStaticValue(project, map.params.scale, t.scale, `${label} scale`);
        } else {
          failures.push(`${binding.clipName}: Scale unavailable`);
        }

        if (map.params.cropLeft) {
          await componentService.setStaticValue(
            project,
            map.params.cropLeft,
            t.cropLeft,
            `${label} cropL`
          );
        }
        if (map.params.cropRight) {
          await componentService.setStaticValue(
            project,
            map.params.cropRight,
            t.cropRight,
            `${label} cropR`
          );
        }
        if (map.params.cropTop) {
          await componentService.setStaticValue(
            project,
            map.params.cropTop,
            t.cropTop,
            `${label} cropT`
          );
        }
        if (map.params.cropBottom) {
          await componentService.setStaticValue(
            project,
            map.params.cropBottom,
            t.cropBottom,
            `${label} cropB`
          );
        }

        transformed += 1;
      } catch (cause) {
        failures.push(`${binding.clipName}: ${String(cause)}`);
      }
    }

    timelineService.invalidateCache();
    return {
      ok: transformed > 0,
      message:
        `Split réel: ${transformed} clip(s) transformé(s)` +
        (aligned ? `, ${aligned} aligné(s)` : "") +
        (failures.length ? `. ${failures.length} avertissement(s).` : "."),
      affected: transformed,
      details: { failures, aligned },
    };
  },

  async verify(plan): Promise<VerifyReport> {
    assertPlanReady(plan, this.label);
    const mismatches: string[] = [];
    const analysis = await timelineService.analyzeActive({ bypassCache: true });

    for (const binding of plan.bindings) {
      const info = analysis.clips.find((c) => c.id === binding.clipId) ||
        analysis.clips.find(
          (c) => c.trackKind === "video" && c.name === binding.clipName && c.trackIndex === binding.trackIndex
        );
      if (!info) {
        mismatches.push(`${binding.clipName}: missing after apply`);
        continue;
      }
      const trackItem = await timelineService.getVideoClipTrackItem(
        info.trackIndex,
        info.name,
        info.start
      );
      if (!trackItem) {
        mismatches.push(`${binding.clipName}: no track item`);
        continue;
      }
      const map = await componentService.mapClipComponents(trackItem);
      const actual: { positionX?: number; positionY?: number; scale?: number; resultWidth?: number } =
        {};
      if (map.params.position) {
        const pt = await componentService.readPoint(map.params.position);
        if (pt) {
          actual.positionX = pt[0];
          actual.positionY = pt[1];
        }
      }
      if (map.params.scale) {
        const s = await componentService.readNumeric(map.params.scale);
        if (s !== null) {
          actual.scale = s;
          actual.resultWidth = (s / 100) * plan.config.width;
        }
      }
      const check = transformsMatch(binding.transform, actual, 1);
      if (!check.ok) {
        mismatches.push(`${binding.clipName}: ${check.mismatches.join("; ")}`);
      }
    }

    return {
      ok: mismatches.length === 0,
      message:
        mismatches.length === 0
          ? `Verify OK — position/échelle/crop conformes (±1 px) sur ${plan.bindings.length} clip(s).`
          : `Verify: ${mismatches.length} écart(s)`,
      mismatches: mismatches.length ? mismatches : undefined,
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
      const item = items[0] as VideoClipTrackItem;
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
