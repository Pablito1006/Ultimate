import { describe, expect, it } from "vitest";
import { ValidationError } from "../../src/core/errors/AppError";
import { planSoundPure } from "../../src/features/audio/soundPreviewable";
import {
  planRenamePure,
  renamePreviewable,
} from "../../src/features/batch-renaming/renamePreviewable";
import { planMacroPure } from "../../src/features/macros/macroPreviewable";
import { assertPlanReady } from "../../src/features/preview/guards";
import { planSplitPure } from "../../src/features/split-screen/splitPreviewable";
import {
  captionsPreviewable,
  planCaptionsPure,
} from "../../src/features/subtitles/captionsPreviewable";

describe("preview plan() pure helpers", () => {
  it("rename plan is deterministic and previewable", () => {
    const plan = planRenamePure(
      [
        { id: "1", name: "Clip_A" },
        { id: "2", name: "Clip_B" },
      ],
      { prefix: "MM_" }
    );
    expect(plan.items.every((i) => i.after.startsWith("MM_"))).toBe(true);
    const summary = renamePreviewable.describe(plan);
    expect(summary.counts.changed).toBe(2);
    expect(summary.levels).toContain("A");
    expect(summary.levels).toContain("B");
    const visual = renamePreviewable.render(plan);
    expect(visual.kind).toBe("rename-flip");
  });

  it("split plan geometry matches layout engine", () => {
    const plan = planSplitPure(
      "2x2",
      { width: 1920, height: 1080 },
      [
        { id: "1", name: "A", trackIndex: 0, start: 0 },
        { id: "2", name: "B", trackIndex: 1, start: 0 },
        { id: "3", name: "C", trackIndex: 2, start: 0 },
        { id: "4", name: "D", trackIndex: 3, start: 0 },
      ]
    );
    expect(plan.cells).toHaveLength(4);
    expect(plan.bindings).toHaveLength(4);
    expect(plan.cells[0].x).toBeGreaterThanOrEqual(0);
    expect(plan.cells[3].width).toBeGreaterThan(0);
    expect(plan.bindings[0].transform.scale).toBeGreaterThan(0);
  });

  it("captions plan builds segments offline", async () => {
    const plan = await planCaptionsPure({
      text: "Hello world. Second sentence.",
      styleId: "minimal",
      durationSeconds: 8,
    });
    expect(plan.segments.length).toBeGreaterThan(0);
    expect(plan.srt).toContain("-->");
    const visual = captionsPreviewable.render(plan);
    expect(visual.kind).toBe("caption-karaoke");
  });

  it("sound plan scores suggestions without Premiere", () => {
    const plan = planSoundPure([
      { id: "c1", start: 0, end: 2, trackIndex: 0, name: "A" },
      { id: "c2", start: 2, end: 4, trackIndex: 0, name: "B" },
    ]);
    expect(plan.events.length).toBeGreaterThan(0);
  });

  it("macro plan describes actions without running", () => {
    const plan = planMacroPure({
      id: "m1",
      name: "Test",
      description: "",
      actions: [
        { id: "a1", type: "analyzeTimeline" },
        { id: "a2", type: "addMarkerAtPlayhead", params: { name: "X" } },
      ],
    });
    expect(plan.steps).toHaveLength(2);
    expect(plan.steps[1].description).toContain("X");
  });
});

describe("assertPlanReady", () => {
  it("blocks apply without plan", () => {
    expect(() => assertPlanReady(null, "Rename")).toThrow(ValidationError);
    expect(() => assertPlanReady(undefined, "Rename")).toThrow(ValidationError);
    expect(() => assertPlanReady({ ok: true }, "Rename")).not.toThrow();
  });

  it("rename apply throws without plan", async () => {
    await expect(renamePreviewable.apply(null as unknown as never)).rejects.toBeInstanceOf(
      ValidationError
    );
  });
});
