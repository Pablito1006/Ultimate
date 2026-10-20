import { describe, expect, it } from "vitest";
import { PRESET_CATALOG, getPresetById, searchPresets } from "../../src/features/motion/presets/presetCatalog";
import { planPresetPure } from "../../src/features/motion/presets/presetPreviewable";
import { assertPlanReady } from "../../src/features/preview/guards";

describe("preset catalog", () => {
  it("ships at least 30 presets", () => {
    expect(PRESET_CATALOG.length).toBeGreaterThanOrEqual(30);
  });

  it("each preset plans at least one channel", () => {
    for (const preset of PRESET_CATALOG) {
      const values: Record<string, string | number | boolean> = {};
      for (const p of preset.parameters) {
        values[p.id] = p.defaultValue;
      }
      const channels = preset.planChannels(values, {
        clipDuration: 4,
        base: { scale: 100, opacity: 100, rotation: 0, position: [0.5, 0.5] },
      });
      expect(channels.length).toBeGreaterThan(0);
      expect(channels[0].keyframes.length).toBeGreaterThan(0);
    }
  });

  it("planPresetPure builds absolute times", () => {
    const preset = getPresetById("zoom-punch-in");
    expect(preset).toBeTruthy();
    const plan = planPresetPure(preset!, { intensity: 50, duration: 1, easing: "easeInOut" }, [
      { id: "c1", name: "Clip_001", trackIndex: 0, start: 2, duration: 4 },
    ]);
    expect(plan.clips[0].absoluteChannels[0].keyframes[0].timeSeconds).toBeGreaterThanOrEqual(2);
  });

  it("search filters by category", () => {
    expect(searchPresets("", "Zoom").length).toBeGreaterThan(0);
  });

  it("apply without plan is guarded", () => {
    expect(() => assertPlanReady(null, "Presets")).toThrow();
  });
});
