import type { AudioClipTrackItem, VideoClipTrackItem } from "@adobe/premierepro";
import { getPremiereModule } from "../../premiere/adapters/premiereModule";
import { markerService } from "../../premiere/markers/MarkerService";
import { projectService } from "../../premiere/project/ProjectService";
import { sequenceService } from "../../premiere/sequence/SequenceService";
import { timelineService } from "../../premiere/timeline/TimelineService";
import { transactionService } from "../../premiere/transactions/TransactionService";
import { assertPlanReady } from "../preview/guards";
import type {
  ApplyReport,
  PreviewablePlan,
  PreviewSummary,
  PreviewVisual,
  VerifyReport,
} from "../preview/types";
import { getAssemblyFeatureStatus } from "./assemblyCapabilities";
import { parseBeatTimes } from "./beatImport";
import { planSequenceCleanup, type CleanupPlanRow } from "./cleanupMath";
import { detectHesitations } from "./hesitationMath";
import { detectJumpCuts } from "./jumpCutMath";
import { planAlignToMarker, planMulticamRename, type MulticamRenameRow } from "./multicamMath";
import {
  clipsFullyInRanges,
  detectSilences,
  keepRangesFromSpeech,
  totalDuration,
  type TimeRange,
} from "./silenceMath";

export type AssemblyMode =
  | "silences"
  | "text-keep"
  | "jump-cuts"
  | "hesitations"
  | "beats"
  | "multicam-rename"
  | "multicam-align"
  | "cleanup";

export interface AssemblyPlanInput {
  mode: AssemblyMode;
  /** Speech segments for silence / keep (from transcript). */
  speechSegments?: Array<{ start: number; end: number }>;
  /** Words for hesitation detection. */
  words?: Array<{ text: string; start: number; end: number }>;
  /** Selected keep ranges for text-edit mode. */
  keepSelection?: Array<{ start: number; end: number }>;
  minSilenceSeconds?: number;
  /** markers-first (default) vs try-remove whole clips in silence. */
  applyMode?: "markers" | "remove-clips";
  detectHesitations?: boolean;
  maxJumpGap?: number;
  beatTimesRaw?: string;
  alignMarkerTime?: number;
  multicamPrefix?: string;
  timelineEnd?: number;
}

export interface AssemblyPlan {
  mode: AssemblyMode;
  applyMode: "markers" | "remove-clips";
  ranges: TimeRange[];
  markersToAdd: Array<{ name: string; start: number; duration: number; comments?: string }>;
  clipsToRemove: Array<{
    id: string;
    name: string;
    trackIndex: number;
    start: number;
    trackKind: "video" | "audio";
  }>;
  renameRows: MulticamRenameRow[];
  alignRows: Array<{
    clipId: string;
    clipName: string;
    trackIndex: number;
    start: number;
    deltaSeconds: number;
  }>;
  cleanupRows: CleanupPlanRow[];
  warnings: string[];
  stats: Record<string, number>;
}

export function planAssemblyPure(
  input: AssemblyPlanInput,
  ctx: {
    clips: Array<{
      id: string;
      name: string;
      trackIndex: number;
      trackKind: "video" | "audio";
      start: number;
      end: number;
      disabled?: boolean;
    }>;
    videoTrackCount: number;
    audioTrackCount: number;
    timelineEnd: number;
  }
): AssemblyPlan {
  const applyMode = input.applyMode ?? "markers";
  const warnings = getAssemblyFeatureStatus()
    .filter((f) => f.status === "unavailable")
    .map((f) => `${f.id}: ${f.reason}`);
  const ranges: TimeRange[] = [];
  const markersToAdd: AssemblyPlan["markersToAdd"] = [];
  let clipsToRemove: AssemblyPlan["clipsToRemove"] = [];
  let renameRows: MulticamRenameRow[] = [];
  let alignRows: AssemblyPlan["alignRows"] = [];
  let cleanupRows: CleanupPlanRow[] = [];
  const stats: Record<string, number> = {};

  const speech = input.speechSegments ?? [];
  const video = ctx.clips.filter((c) => c.trackKind === "video");

  if (input.mode === "silences") {
    const sil = detectSilences(speech, {
      minSilenceSeconds: input.minSilenceSeconds,
      timelineStart: 0,
      timelineEnd: input.timelineEnd ?? ctx.timelineEnd,
    });
    ranges.push(...sil);
    stats.silences = sil.length;
    stats.silenceSeconds = Number(totalDuration(sil).toFixed(3));
    if (applyMode === "markers") {
      for (const r of sil) {
        markersToAdd.push({
          name: "MM:Silence",
          start: r.start,
          duration: Math.max(0.05, r.end - r.start),
          comments: r.label,
        });
      }
    } else {
      warnings.push(
        "remove-clips: seuls les clips entièrement dans un silence sont retirés ; mid-clip = marqueurs."
      );
      const fully = clipsFullyInRanges(video, sil);
      clipsToRemove = fully.map((c) => ({
        id: c.id,
        name: c.name,
        trackIndex: c.trackIndex,
        start: c.start,
        trackKind: "video" as const,
      }));
      for (const r of sil) {
        markersToAdd.push({
          name: "MM:Silence",
          start: r.start,
          duration: Math.max(0.05, r.end - r.start),
          comments: `also-marked; ${r.label}`,
        });
      }
    }
  } else if (input.mode === "text-keep") {
    const keep =
      input.keepSelection && input.keepSelection.length > 0
        ? input.keepSelection.map((k) => ({
            start: k.start,
            end: k.end,
            kind: "keep" as const,
            label: "keep",
          }))
        : keepRangesFromSpeech(speech, 0, input.timelineEnd ?? ctx.timelineEnd);
    ranges.push(...keep);
    stats.keep = keep.length;
    for (const r of keep) {
      markersToAdd.push({
        name: "MM:Keep",
        start: r.start,
        duration: Math.max(0.05, r.end - r.start),
        comments: "Text-based keep range — rebuild sequence manually if needed",
      });
    }
    warnings.push(
      "Montage par le texte: marqueurs MM:Keep — pas de nouvelle séquence auto (API limitée)."
    );
  } else if (input.mode === "jump-cuts") {
    const hits = detectJumpCuts(video, input.maxJumpGap ?? 0.25);
    stats.jumpCuts = hits.length;
    for (const h of hits) {
      ranges.push({
        start: h.time,
        end: h.time + Math.max(0.05, h.gap),
        kind: "jump",
        label: h.label,
      });
      markersToAdd.push({
        name: "MM:JumpCut",
        start: h.time,
        duration: 0.1,
        comments: `${h.label} gap=${h.gap.toFixed(3)}s`,
      });
    }
  } else if (input.mode === "hesitations") {
    const hes = detectHesitations(input.words ?? [], undefined, input.detectHesitations !== false);
    ranges.push(...hes);
    stats.hesitations = hes.length;
    for (const r of hes) {
      markersToAdd.push({
        name: "MM:Hesitation",
        start: r.start,
        duration: Math.max(0.05, r.end - r.start),
        comments: r.label,
      });
    }
  } else if (input.mode === "beats") {
    const parsed = parseBeatTimes(input.beatTimesRaw ?? "");
    warnings.push(...parsed.warnings);
    stats.beats = parsed.times.length;
    for (const t of parsed.times) {
      markersToAdd.push({ name: "MM:Beat", start: t, duration: 0.05, comments: "imported" });
      ranges.push({ start: t, end: t + 0.05, kind: "keep", label: "beat" });
    }
  } else if (input.mode === "multicam-rename") {
    renameRows = planMulticamRename(video, { prefix: input.multicamPrefix ?? "Cam" });
    stats.rename = renameRows.length;
  } else if (input.mode === "multicam-align") {
    const markerTime = input.alignMarkerTime ?? 0;
    alignRows = planAlignToMarker(video, markerTime);
    stats.align = alignRows.length;
  } else if (input.mode === "cleanup") {
    cleanupRows = planSequenceCleanup({
      videoTrackCount: ctx.videoTrackCount,
      audioTrackCount: ctx.audioTrackCount,
      clips: ctx.clips,
    });
    stats.cleanup = cleanupRows.filter((r) => r.actionable).length;
    clipsToRemove = cleanupRows
      .filter((r) => r.actionable && r.action === "remove" && r.clipName !== undefined)
      .map((r) => ({
        id: r.id,
        name: r.clipName!,
        trackIndex: r.trackIndex ?? 0,
        start: r.start ?? 0,
        trackKind: (r.trackKind ?? "video") as "video" | "audio",
      }));
  }

  return {
    mode: input.mode,
    applyMode,
    ranges,
    markersToAdd,
    clipsToRemove,
    renameRows,
    alignRows,
    cleanupRows,
    warnings,
    stats,
  };
}

export const assemblyPreviewable: PreviewablePlan<AssemblyPlanInput, AssemblyPlan> = {
  id: "assembly",
  label: "Assemblage",

  async plan(input) {
    const analysis = await timelineService.analyzeActive({ bypassCache: true });
    return planAssemblyPure(input, {
      clips: analysis.clips.map((c) => ({
        id: c.id,
        name: c.name,
        trackIndex: c.trackIndex,
        trackKind: c.trackKind,
        start: c.start,
        end: c.end,
        disabled: c.disabled,
      })),
      videoTrackCount: analysis.videoTrackCount,
      audioTrackCount: analysis.audioTrackCount,
      timelineEnd: analysis.endTime,
    });
  },

  describe(plan): PreviewSummary {
    return {
      title: `Assemblage — ${plan.mode}`,
      headline: `${plan.markersToAdd.length} marqueur(s) · ${plan.clipsToRemove.length} retrait(s) · ${plan.renameRows.length} rename · ${plan.alignRows.length} align`,
      counts: { ...plan.stats, markers: plan.markersToAdd.length },
      warnings: plan.warnings,
      estimatedMs: 80 + plan.markersToAdd.length * 15 + plan.clipsToRemove.length * 40,
      levels: ["A", "B"],
      levelCNote: "Level C unavailable (WP9).",
      changes: [
        ...plan.markersToAdd.slice(0, 40).map((m, i) => ({
          id: `m${i}`,
          label: m.name,
          after: `${m.start.toFixed(2)}s (${m.duration.toFixed(2)}s)`,
          meta: m.comments,
        })),
        ...plan.clipsToRemove.map((c) => ({
          id: c.id,
          label: c.name,
          after: "remove (ripple if API)",
        })),
        ...plan.renameRows.map((r) => ({
          id: r.clipId,
          label: r.before,
          after: r.after,
        })),
        ...plan.alignRows.map((r) => ({
          id: r.clipId,
          label: r.clipName,
          after: `Δ ${r.deltaSeconds.toFixed(3)}s`,
        })),
        ...plan.cleanupRows
          .filter((r) => !r.actionable)
          .map((r) => ({
            id: r.id,
            label: r.label,
            after: "report only",
          })),
      ],
    };
  },

  render(plan): PreviewVisual {
    return {
      kind: "assembly-ranges",
      payload: {
        mode: plan.mode,
        ranges: plan.ranges,
        markers: plan.markersToAdd.map((m) => ({ time: m.start, label: m.name })),
        stats: plan.stats,
      },
    };
  },

  async apply(plan): Promise<ApplyReport> {
    assertPlanReady(plan, this.label);
    const project = await projectService.requireActiveProject();
    const sequence = await sequenceService.requireActiveSequence(project);
    let affected = 0;
    const failures: string[] = [];

    // Single undo batch for markers when possible
    if (plan.markersToAdd.length > 0) {
      try {
        await markerService.addMarkersBatch(
          project,
          sequence,
          plan.markersToAdd.map((m) => ({
            name: m.name,
            comments: m.comments,
            start: m.start,
            duration: m.duration,
          }))
        );
        affected += plan.markersToAdd.length;
      } catch (cause) {
        failures.push(`markers: ${String(cause)}`);
      }
    }

    if (plan.clipsToRemove.length > 0) {
      const removed = await tryRemoveClips(project, sequence, plan.clipsToRemove);
      affected += removed.ok;
      failures.push(...removed.failures);
    }

    if (plan.renameRows.length > 0) {
      for (const row of plan.renameRows) {
        const item = await timelineService.getVideoClipTrackItem(
          row.trackIndex,
          row.clipName,
          row.start
        );
        if (!item) {
          failures.push(`rename missing ${row.clipName}`);
          continue;
        }
        try {
          const label = `MasterMotion: Multicam rename ${row.after}`;
          project.lockedAccess(() => {
            const committed = project.executeTransaction((ca) => {
              ca.addAction(item.createSetNameAction(row.after));
            }, label);
            transactionService.assertCommitted(committed, label);
          });
          affected += 1;
        } catch (cause) {
          failures.push(`rename ${row.clipName}: ${String(cause)}`);
        }
      }
    }

    if (plan.alignRows.length > 0) {
      const ppro = getPremiereModule();
      for (const row of plan.alignRows) {
        if (Math.abs(row.deltaSeconds) < 1e-4) {
          continue;
        }
        const item = await timelineService.getVideoClipTrackItem(
          row.trackIndex,
          row.clipName,
          row.start
        );
        if (!item) {
          failures.push(`align missing ${row.clipName}`);
          continue;
        }
        try {
          const label = `MasterMotion: Multicam align ${row.clipName}`;
          const tick = ppro.TickTime.createWithSeconds(row.deltaSeconds);
          project.lockedAccess(() => {
            const committed = project.executeTransaction((ca) => {
              ca.addAction(item.createMoveAction(tick));
            }, label);
            transactionService.assertCommitted(committed, label);
          });
          affected += 1;
        } catch (cause) {
          failures.push(`align ${row.clipName}: ${String(cause)}`);
        }
      }
    }

    timelineService.invalidateCache();
    return {
      ok: affected > 0 || (plan.mode === "cleanup" && plan.cleanupRows.every((r) => !r.actionable)),
      message:
        affected > 0
          ? `Assembly ${plan.mode}: ${affected} change(s).${failures.length ? ` Issues: ${failures.length}` : ""}`
          : failures.length
            ? `Assembly failed. ${failures.slice(0, 2).join("; ")}`
            : `Assembly ${plan.mode}: nothing to apply (report-only).`,
      affected,
      details: { failures },
    };
  },

  async verify(plan): Promise<VerifyReport> {
    assertPlanReady(plan, this.label);
    const analysis = await timelineService.analyzeActive({ bypassCache: true });
    const mismatches: string[] = [];

    if (plan.markersToAdd.length > 0) {
      const names = new Set(plan.markersToAdd.map((m) => m.name));
      const found = analysis.markers.filter((m) => names.has(m.name));
      if (found.length < plan.markersToAdd.length) {
        mismatches.push(
          `markers: found ${found.length}, expected ≥ ${plan.markersToAdd.length}`
        );
      }
    }

    if (plan.renameRows.length > 0) {
      for (const row of plan.renameRows) {
        const live = analysis.clips.find(
          (c) =>
            c.trackKind === "video" &&
            c.trackIndex === row.trackIndex &&
            Math.abs(c.start - row.start) < 0.05
        );
        // After rename, name changes — match by track+start
        if (live && live.name !== row.after) {
          // id may change with name in fake — check after name exists
          const byName = analysis.clips.some((c) => c.name === row.after);
          if (!byName) {
            mismatches.push(`rename ${row.after} not found`);
          }
        }
      }
    }

    return {
      ok: mismatches.length === 0,
      message: mismatches.length === 0 ? "Assembly verify OK" : `Verify: ${mismatches.length}`,
      mismatches: mismatches.length ? mismatches : undefined,
    };
  },
};

async function tryRemoveClips(
  project: import("@adobe/premierepro").Project,
  sequence: import("@adobe/premierepro").Sequence,
  clips: AssemblyPlan["clipsToRemove"]
): Promise<{ ok: number; failures: string[] }> {
  const ppro = getPremiereModule();
  const failures: string[] = [];
  let ok = 0;
  const editor = ppro.SequenceEditor?.getEditor?.(sequence);
  if (!editor?.createRemoveItemsAction || !ppro.TrackItemSelection?.createEmptySelection) {
    return {
      ok: 0,
      failures: [
        "SequenceEditor.createRemoveItemsAction / TrackItemSelection unavailable — use markers mode",
      ],
    };
  }

  for (const c of clips) {
    const item =
      c.trackKind === "audio"
        ? await timelineService.getAudioClipTrackItem(c.trackIndex, c.name, c.start)
        : await timelineService.getVideoClipTrackItem(c.trackIndex, c.name, c.start);
    if (!item) {
      failures.push(`remove missing ${c.name}`);
      continue;
    }
    try {
      const label = `MasterMotion: Remove ${c.name}`;
      const mediaType =
        c.trackKind === "audio"
          ? ppro.Constants.MediaType.AUDIO
          : ppro.Constants.MediaType.VIDEO;
      project.lockedAccess(() => {
        const committed = project.executeTransaction((ca) => {
          // Selection must be used only inside createEmptySelection callback (Adobe ESLint).
          ppro.TrackItemSelection.createEmptySelection((sel) => {
            sel.addItem(item as VideoClipTrackItem | AudioClipTrackItem);
            ca.addAction(editor.createRemoveItemsAction(sel, true, mediaType, false));
          });
        }, label);
        transactionService.assertCommitted(committed, label);
      });
      ok += 1;
    } catch (cause) {
      failures.push(`remove ${c.name}: ${String(cause)}`);
    }
  }
  return { ok, failures };
}
