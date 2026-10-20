import { assertPlanReady } from "../../preview/guards";
import type {
  ApplyReport,
  PreviewablePlan,
  PreviewSummary,
  PreviewVisual,
  VerifyReport,
} from "../../preview/types";
import { componentService } from "../../../premiere/components/ComponentService";
import { keyframeService } from "../../../premiere/keyframes/KeyframeService";
import { projectService } from "../../../premiere/project/ProjectService";
import { timelineService } from "../../../premiere/timeline/TimelineService";
import { getPresetById } from "./presetCatalog";
import type { PresetChannelPlan, PresetDefinition } from "./presetTypes";
import { bool } from "./presetTypes";

export interface PresetPlanInput {
  presetId: string;
  values: Record<string, string | number | boolean>;
  /** Clip ids from timeline analysis; empty → selected / all video clips. */
  clipIds?: string[];
  /** Apply to first N video clips if no selection ids. */
  maxClips?: number;
}

export interface PresetClipPlan {
  clipId: string;
  clipName: string;
  trackIndex: number;
  start: number;
  duration: number;
  channels: PresetChannelPlan[];
  missingRoles: string[];
  absoluteChannels: PresetChannelPlan[];
}

export interface PresetPlan {
  preset: PresetDefinition;
  values: Record<string, string | number | boolean>;
  clips: PresetClipPlan[];
  overwriteExisting: boolean;
  warnings: string[];
}

export function planPresetPure(
  preset: PresetDefinition,
  values: Record<string, string | number | boolean>,
  clips: Array<{ id: string; name: string; trackIndex: number; start: number; duration: number }>
): PresetPlan {
  const overwriteExisting = bool(values, "overwriteExisting", false);
  const warnings: string[] = [];
  const planned: PresetClipPlan[] = [];

  for (const clip of clips) {
    const ctx = {
      clipDuration: Math.max(0.1, clip.duration),
      base: {
        scale: 100,
        opacity: 100,
        rotation: 0,
        position: [0.5, 0.5] as [number, number],
        blur: 0,
      },
    };
    const channels = preset.planChannels(values, ctx);
    const missingRoles = preset.requiredRoles.filter(
      (role) => !channels.some((c) => c.role === role)
    );
    // requiredRoles check against what we'll need at apply — plan assumes roles exist
    const absoluteChannels = channels.map((ch) => ({
      ...ch,
      keyframes: ch.keyframes.map((kf) => ({
        ...kf,
        timeSeconds: clip.start + Number(kf.timeSeconds),
      })),
      rangeStart: clip.start + ch.rangeStart,
      rangeEnd: clip.start + ch.rangeEnd,
    }));
    planned.push({
      clipId: clip.id,
      clipName: clip.name,
      trackIndex: clip.trackIndex,
      start: clip.start,
      duration: clip.duration,
      channels,
      missingRoles,
      absoluteChannels,
    });
  }

  if (planned.length === 0) {
    warnings.push("No video clips to apply. Select clips or open a sequence with video.");
  }
  if (!overwriteExisting) {
    warnings.push("Existing keyframes will not be overwritten unless the option is enabled.");
  }

  return { preset, values, clips: planned, overwriteExisting, warnings };
}

export const presetPreviewable: PreviewablePlan<PresetPlanInput, PresetPlan> = {
  id: "native-presets",
  label: "Native keyframe presets",

  async plan(input) {
    const preset = getPresetById(input.presetId);
    if (!preset) {
      throw new Error(`Unknown preset: ${input.presetId}`);
    }
    const analysis = await timelineService.analyzeActive({ bypassCache: true });
    let clips = analysis.clips.filter((c) => c.trackKind === "video");
    if (input.clipIds && input.clipIds.length > 0) {
      const set = new Set(input.clipIds);
      clips = clips.filter((c) => set.has(c.id));
    }
    const max = input.maxClips ?? 50;
    clips = clips.slice(0, max);
    return planPresetPure(
      preset,
      input.values,
      clips.map((c) => ({
        id: c.id,
        name: c.name,
        trackIndex: c.trackIndex,
        start: c.start,
        duration: c.duration,
      }))
    );
  },

  describe(plan): PreviewSummary {
    const kfCount = plan.clips.reduce(
      (n, c) => n + c.absoluteChannels.reduce((m, ch) => m + ch.keyframes.length, 0),
      0
    );
    return {
      title: plan.preset.name,
      headline: `${plan.clips.length} clip(s), ${kfCount} keyframe(s) planned`,
      counts: {
        clips: plan.clips.length,
        keyframes: kfCount,
        channels: plan.clips.reduce((n, c) => n + c.channels.length, 0),
      },
      warnings: plan.warnings.slice(),
      estimatedMs: Math.max(80, plan.clips.length * 40 + kfCount * 2),
      levels: ["A", "B"],
      levelCNote: "Level C (sequence copy) unavailable for WP4 presets.",
      changes: plan.clips.map((c) => ({
        id: c.clipId,
        label: c.clipName,
        before: `V${c.trackIndex + 1}`,
        after: `${c.channels.map((ch) => ch.role).join(", ")}`,
        meta: `${c.channels.reduce((n, ch) => n + ch.keyframes.length, 0)} kf`,
      })),
    };
  },

  render(plan): PreviewVisual {
    const first = plan.clips[0];
    const channel = first?.channels[0];
    const samples =
      channel?.keyframes.map((kf) => ({
        t: channel.rangeEnd > channel.rangeStart
          ? (Number(kf.timeSeconds) - channel.rangeStart) /
            (channel.rangeEnd - channel.rangeStart)
          : 0,
        value: Array.isArray(kf.value) ? Number(kf.value[0]) : Number(kf.value),
      })) ?? [];
    return {
      kind: "preset-curve",
      payload: {
        presetId: plan.preset.id,
        name: plan.preset.name,
        samples,
        role: channel?.role ?? "scale",
      },
    };
  },

  async apply(plan): Promise<ApplyReport> {
    assertPlanReady(plan, this.label);
    if (plan.clips.length === 0) {
      return { ok: false, message: "No clips in plan.", affected: 0 };
    }

    const project = await projectService.requireActiveProject();
    const analysis = await timelineService.analyzeActive({ bypassCache: true });
    let written = 0;
    let skipped = 0;
    const failures: string[] = [];

    // Resolve live track items by name+start heuristic via fake/real analysis ids
    for (const clipPlan of plan.clips) {
      const info = analysis.clips.find((c) => c.id === clipPlan.clipId);
      if (!info) {
        failures.push(`${clipPlan.clipName}: clip not found on re-read`);
        continue;
      }
      try {
        const trackItem = await timelineService.getVideoClipTrackItem(info.trackIndex, info.name, info.start);
        if (!trackItem) {
          failures.push(`${clipPlan.clipName}: track item unavailable`);
          continue;
        }
        const map = await componentService.mapClipComponents(trackItem);
        for (const role of plan.preset.requiredRoles) {
          if (!map.params[role]) {
            failures.push(`${clipPlan.clipName}: missing param role ${role}`);
          }
        }
        for (const ch of clipPlan.absoluteChannels) {
          const resolved = map.params[ch.role];
          if (!resolved) {
            // optional channel (e.g. blur) — skip quietly if optional
            if (plan.preset.requiredRoles.indexOf(ch.role) >= 0) {
              failures.push(`${clipPlan.clipName}: cannot write ${ch.role}`);
            }
            continue;
          }
          const result = await keyframeService.applySeries(project, resolved, ch.keyframes, {
            label: `MasterMotion: Preset ${plan.preset.id} / ${ch.role}`,
            overwriteExisting: plan.overwriteExisting,
          });
          if (result.skipped) {
            skipped += 1;
            if (result.reason) {
              failures.push(`${clipPlan.clipName}/${ch.role}: ${result.reason}`);
            }
          } else {
            written += result.written;
          }
        }
      } catch (cause) {
        failures.push(`${clipPlan.clipName}: ${String(cause)}`);
      }
    }

    return {
      ok: written > 0,
      message:
        written > 0
          ? `Wrote ${written} keyframe(s) on ${plan.clips.length} clip(s)${skipped ? `, skipped ${skipped}` : ""}.`
          : `No keyframes written. ${failures[0] || ""}`,
      affected: written,
      details: { failures, skipped },
    };
  },

  async verify(plan): Promise<VerifyReport> {
    const analysis = await timelineService.analyzeActive({ bypassCache: true });
    const mismatches: string[] = [];
    for (const clipPlan of plan.clips) {
      const info = analysis.clips.find((c) => c.id === clipPlan.clipId);
      if (!info) {
        mismatches.push(`${clipPlan.clipName}: missing after apply`);
        continue;
      }
      try {
        const trackItem = await timelineService.getVideoClipTrackItem(info.trackIndex, info.name, info.start);
        if (!trackItem) {
          mismatches.push(`${clipPlan.clipName}: no track item`);
          continue;
        }
        const map = await componentService.mapClipComponents(trackItem);
        for (const ch of clipPlan.absoluteChannels) {
          const resolved = map.params[ch.role];
          if (!resolved) {
            continue;
          }
          const count = await keyframeService.countKeyframes(resolved.param);
          if (count === 0 && ch.keyframes.length > 0 && plan.overwriteExisting !== false) {
            // may have been skipped due to overwrite flag
            const mid = ch.keyframes[Math.floor(ch.keyframes.length / 2)];
            const read = await keyframeService.readValueAt(resolved, Number(mid.timeSeconds));
            if (read === undefined || read === null) {
              mismatches.push(`${clipPlan.clipName}/${ch.role}: no keyframes readable`);
            }
          }
        }
      } catch (cause) {
        mismatches.push(`${clipPlan.clipName}: ${String(cause)}`);
      }
    }
    return {
      ok: mismatches.length === 0,
      message:
        mismatches.length === 0
          ? "Verify OK (keyframes present or values readable)."
          : `Verify issues: ${mismatches.length}`,
      mismatches: mismatches.length ? mismatches : undefined,
    };
  },
};

/** Remove preset keyframes in planned ranges (clean removal). */
export async function removePresetKeyframes(plan: PresetPlan): Promise<ApplyReport> {
  assertPlanReady(plan, "Remove preset");
  const project = await projectService.requireActiveProject();
  const analysis = await timelineService.analyzeActive({ bypassCache: true });
  let cleared = 0;
  for (const clipPlan of plan.clips) {
    const info = analysis.clips.find((c) => c.id === clipPlan.clipId);
    if (!info) {
      continue;
    }
    const trackItem = await timelineService.getVideoClipTrackItem(info.trackIndex, info.name, info.start);
    if (!trackItem) {
      continue;
    }
    const map = await componentService.mapClipComponents(trackItem);
    for (const ch of clipPlan.absoluteChannels) {
      const resolved = map.params[ch.role];
      if (!resolved) {
        continue;
      }
      const ok = await keyframeService.clearRange(
        project,
        resolved,
        ch.rangeStart,
        ch.rangeEnd,
        `MasterMotion: Remove preset ${plan.preset.id} / ${ch.role}`
      );
      if (ok) {
        cleared += 1;
      }
    }
  }
  return {
    ok: cleared > 0,
    message: `Cleared ${cleared} channel range(s).`,
    affected: cleared,
  };
}
