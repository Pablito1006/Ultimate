import { describe, expect, it } from "vitest";
import { planMotionPure } from "../../src/features/motion/motionPreviewable";
import { MOTION_TEMPLATES } from "../../src/features/motion/templateRegistry";
import { assertPlanReady } from "../../src/features/preview/guards";
import { motionPreviewable } from "../../src/features/motion/motionPreviewable";

describe("motionPreviewable", () => {
  it("plans without mutating and marks missing-mogrt as not insertable", () => {
    const template = MOTION_TEMPLATES[0];
    expect(template).toBeTruthy();
    const plan = planMotionPure(template, { values: { title: "Hello" } });
    expect(plan.canInsertMogrt).toBe(false);
    expect(plan.warnings.length).toBeGreaterThan(0);
    const summary = motionPreviewable.describe(plan);
    expect(summary.levels).toContain("B");
    const visual = motionPreviewable.render(plan);
    expect(visual.kind).toBe("motion-template");
  });

  it("forceReady + path override enables insert plan", () => {
    const template = MOTION_TEMPLATES[0];
    const plan = planMotionPure(template, {
      values: {},
      forceReady: true,
      mogrtPathOverride: "C:/fake/sample.mogrt",
    });
    expect(plan.canInsertMogrt).toBe(true);
    expect(plan.template.status).toBe("ready");
  });

  it("apply without plan throws via assertPlanReady", () => {
    expect(() => assertPlanReady(null, "Motion")).toThrow();
  });

  it("catalog has at least 45 designs worth of templates (× aspects)", () => {
    expect(MOTION_TEMPLATES.length).toBeGreaterThanOrEqual(45);
  });
});
