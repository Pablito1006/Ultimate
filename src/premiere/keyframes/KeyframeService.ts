import type { Action, Project, TickTime } from "@adobe/premierepro";
import { Logger } from "../../core/logging/Logger";
import { getPremiereModule } from "../adapters/premiereModule";
import type { ResolvedParam } from "../components/ComponentService";
import { transactionService } from "../transactions/TransactionService";

export interface PlannedKeyframe {
  /** Absolute time in seconds (sequence / clip local as decided by caller). */
  timeSeconds: number;
  value: number | string | boolean | [number, number];
}

export interface ApplyKeyframeSeriesOptions {
  label: string;
  /** If false, abort when keyframes already exist on the param. Default false (safe). */
  overwriteExisting?: boolean;
}

/**
 * Apply / read / clear keyframe series on ComponentParam handles.
 * Callers must re-read after write (verify).
 */
export class KeyframeService {
  async countKeyframes(param: ResolvedParam["param"]): Promise<number> {
    try {
      const list = param.getKeyframeListAsTickTimes?.() ?? [];
      return list.length;
    } catch {
      return 0;
    }
  }

  async applySeries(
    project: Project,
    param: ResolvedParam,
    series: PlannedKeyframe[],
    options: ApplyKeyframeSeriesOptions
  ): Promise<{ written: number; skipped: boolean; reason?: string }> {
    if (series.length === 0) {
      return { written: 0, skipped: true, reason: "Empty series" };
    }

    const existing = await this.countKeyframes(param.param);
    if (existing > 0 && !options.overwriteExisting) {
      return {
        written: 0,
        skipped: true,
        reason: `Param “${param.displayName}” already has ${existing} keyframe(s). Enable overwrite to replace.`,
      };
    }

    const ppro = getPremiereModule();
    const label = options.label;
    const times = series.map((k) => k.timeSeconds).sort((a, b) => a - b);
    const inT = this.toTick(ppro, times[0] - 0.001);
    const outT = this.toTick(ppro, times[times.length - 1] + 0.001);

    // Adobe ESLint requires executeTransaction / action creation visible in this file.
    project.lockedAccess(() => {
      const committed = project.executeTransaction((compoundAction) => {
        if (typeof param.param.createSetTimeVaryingAction === "function") {
          compoundAction.addAction(param.param.createSetTimeVaryingAction(true) as Action);
        }

        if (existing > 0 && options.overwriteExisting && param.param.createRemoveKeyframeRangeAction) {
          compoundAction.addAction(
            param.param.createRemoveKeyframeRangeAction(inT, outT, true) as Action
          );
        }

        for (const kf of series) {
          const tick = this.toTick(ppro, kf.timeSeconds);
          const created = param.param.createKeyframe(this.coerceValue(kf.value)) as {
            position?: TickTime;
          };
          if (created && "position" in created) {
            created.position = tick;
          }
          if (param.param.createAddKeyframeAction) {
            compoundAction.addAction(param.param.createAddKeyframeAction(created) as Action);
          } else {
            compoundAction.addAction(param.param.createSetValueAction(created, true) as Action);
          }
        }
      }, label);
      transactionService.assertCommitted(committed, label);
    });

    Logger.info("Keyframe series written", {
      param: param.displayName,
      count: series.length,
      label,
    });
    return { written: series.length, skipped: false };
  }

  /**
   * Remove keyframes in [start, end] seconds on a resolved param (clean MM preset removal).
   */
  async clearRange(
    project: Project,
    param: ResolvedParam,
    startSeconds: number,
    endSeconds: number,
    label: string
  ): Promise<boolean> {
    const ppro = getPremiereModule();
    if (!param.param.createRemoveKeyframeRangeAction) {
      return false;
    }
    project.lockedAccess(() => {
      const committed = project.executeTransaction((compoundAction) => {
        compoundAction.addAction(
          param.param.createRemoveKeyframeRangeAction(
            this.toTick(ppro, startSeconds),
            this.toTick(ppro, endSeconds),
            true
          ) as Action
        );
      }, label);
      transactionService.assertCommitted(committed, label);
    });
    return true;
  }

  async readValueAt(param: ResolvedParam, timeSeconds: number): Promise<unknown> {
    const ppro = getPremiereModule();
    try {
      const wrapped = await param.param.getValueAtTime(this.toTick(ppro, timeSeconds));
      return wrapped?.value;
    } catch {
      const start = await param.param.getStartValue();
      if (start && typeof start === "object" && start !== null && "value" in start) {
        return (start as { value: unknown }).value;
      }
      return start;
    }
  }

  private toTick(ppro: ReturnType<typeof getPremiereModule>, seconds: number): TickTime {
    const TickTime = ppro.TickTime as {
      createWithSeconds?: (s: number) => TickTime;
    };
    if (typeof TickTime?.createWithSeconds === "function") {
      return TickTime.createWithSeconds(seconds);
    }
    return { seconds, ticks: String(Math.round(seconds * 254016000000)) } as unknown as TickTime;
  }

  private coerceValue(value: PlannedKeyframe["value"]): unknown {
    if (Array.isArray(value)) {
      return value;
    }
    return value;
  }
}

export const keyframeService = new KeyframeService();
