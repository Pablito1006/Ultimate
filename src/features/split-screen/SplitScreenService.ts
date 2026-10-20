import type { LayoutType } from "./layoutEngine";
import { splitPreviewable, type SplitPlan } from "./splitPreviewable";

export type { SplitPlan as SplitScreenPlan } from "./splitPreviewable";

/**
 * Facade kept for callers; implementation is PreviewablePlan (WP1/WP5).
 */
export class SplitScreenService {
  async plan(layout: LayoutType, gap = 8): Promise<SplitPlan> {
    return splitPreviewable.plan({ layout, gap });
  }

  async applyLayout(layout: LayoutType, gap = 8): Promise<number> {
    const plan = await this.plan(layout, gap);
    const report = await splitPreviewable.apply(plan);
    return report.affected;
  }
}

export const splitScreenService = new SplitScreenService();
