import type { LayoutType } from "./layoutEngine";
import { splitPreviewable, type SplitPlan } from "./splitPreviewable";

export type { SplitPlan as SplitScreenPlan } from "./splitPreviewable";

/**
 * Facade kept for callers; implementation is PreviewablePlan (WP1).
 */
export class SplitScreenService {
  async plan(layout: LayoutType, gap = 8): Promise<SplitPlan> {
    return splitPreviewable.plan({ layout, gap });
  }

  async alignClipsToPlayhead(clipCount: number): Promise<number> {
    const report = await splitPreviewable.apply({
      cells: Array.from({ length: clipCount }, (_, index) => ({
        index,
        x: 0,
        y: 0,
        width: 0,
        height: 0,
      })),
      config: {
        layout: "2x2",
        gap: 8,
        border: 0,
        padding: 0,
        margin: 0,
        width: 1920,
        height: 1080,
        clipCount,
      },
      clipNames: [],
      clipIds: [],
      playheadSeconds: 0,
      limitation: "",
    });
    return report.affected;
  }
}

export const splitScreenService = new SplitScreenService();
