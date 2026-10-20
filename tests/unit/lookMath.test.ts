import { describe, expect, it } from "vitest";
import { LOOK_CATALOG } from "../../src/features/color/lookCatalog";
import {
  approximatePreviewRgb,
  blendLook,
  clamp01,
  valuesEqual,
} from "../../src/features/color/lookMath";
import { LOOK_NEUTRALS } from "../../src/features/color/lookTypes";
import { planColorPure } from "../../src/features/color/colorPreviewable";
import { getColorFeatureStatus } from "../../src/features/color/colorCapabilities";

describe("lookMath / catalog (WP7)", () => {
  it("ships at least 20 looks", () => {
    expect(LOOK_CATALOG.length).toBeGreaterThanOrEqual(20);
  });

  it("blends intensity 0 → neutrals, 1 → look targets", () => {
    const look = LOOK_CATALOG.find((l) => l.id === "warm-sun")!;
    const zero = blendLook(look, 0);
    expect(valuesEqual(zero, LOOK_NEUTRALS)).toBe(true);
    const full = blendLook(look, 1);
    expect(full.temperature).toBe(look.params.temperature);
    expect(full.saturation).toBe(look.params.saturation);
    const half = blendLook(look, 0.5);
    expect(half.temperature).toBeCloseTo((look.params.temperature ?? 0) * 0.5, 5);
  });

  it("clamp01 bounds", () => {
    expect(clamp01(-1)).toBe(0);
    expect(clamp01(2)).toBe(1);
  });

  it("approximate preview returns rgb (disclaimer path)", () => {
    const look = LOOK_CATALOG.find((l) => l.id === "cine-teal-orange")!;
    const v = blendLook(look, 1);
    const rgb = approximatePreviewRgb(v);
    expect(rgb.css).toMatch(/^rgb\(\d+,\d+,\d+\)$/);
  });

  it("refuses overwrite without flag in pure plan", () => {
    const plan = planColorPure(
      [
        {
          id: "c1",
          name: "A",
          trackIndex: 0,
          start: 0,
          before: { temperature: 40, contrast: 20 },
        },
      ],
      { lookId: "cool-steel", intensity: 1, overwriteExisting: false }
    );
    expect(plan.bindings[0].warnings.some((w) => /écraser/i.test(w))).toBe(true);
  });

  it("marks LUT file apply and auto-match unavailable", () => {
    const status = getColorFeatureStatus();
    expect(status.find((s) => s.id === "lut.fileApply")?.status).toBe("unavailable");
    expect(status.find((s) => s.id === "color.autoMatch")?.status).toBe("unavailable");
    expect(status.find((s) => s.id === "look.library")?.status).toBe("available");
  });
});
