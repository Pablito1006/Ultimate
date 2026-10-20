import { describe, expect, it } from "vitest";
import {
  cubicBezier,
  easeInCubic,
  easeOutBounce,
  easeOutCubic,
  getEasing,
  linear,
  sampleCurve,
  spring,
} from "../../src/features/motion/easing/easing";

describe("easing curves", () => {
  it("bounds linear / cubic at endpoints", () => {
    expect(linear(0)).toBe(0);
    expect(linear(1)).toBe(1);
    expect(easeInCubic(0)).toBe(0);
    expect(easeInCubic(1)).toBe(1);
    expect(easeOutCubic(0)).toBe(0);
    expect(easeOutCubic(1)).toBe(1);
  });

  it("easeOutBounce ends at 1", () => {
    expect(easeOutBounce(1)).toBeCloseTo(1, 5);
  });

  it("spring is deterministic and near 1 at t=1", () => {
    const a = spring(0.5);
    const b = spring(0.5);
    expect(a).toBe(b);
    expect(spring(1)).toBeCloseTo(1, 1);
  });

  it("cubicBezier samples are stable", () => {
    const opts = { x1: 0.42, y1: 0, x2: 0.58, y2: 1 };
    expect(cubicBezier(0, opts)).toBeCloseTo(0, 2);
    expect(cubicBezier(1, opts)).toBeCloseTo(1, 2);
    expect(cubicBezier(0.5, opts)).toBeGreaterThan(0);
  });

  it("sampleCurve produces sorted unique samples", () => {
    const samples = sampleCurve(100, 150, 1, getEasing("easeInOut"), {
      minSamples: 8,
      maxSamples: 24,
    });
    expect(samples.length).toBeGreaterThanOrEqual(8);
    expect(samples[0].t).toBe(0);
    expect(samples[samples.length - 1].t).toBe(1);
    expect(samples[0].value).toBeCloseTo(100, 5);
    expect(samples[samples.length - 1].value).toBeCloseTo(150, 5);
    for (let i = 1; i < samples.length; i += 1) {
      expect(samples[i].t).toBeGreaterThanOrEqual(samples[i - 1].t);
    }
  });

  it("regression: easeInOut mid ≈ 0.5", () => {
    expect(getEasing("easeInOut")(0.5)).toBeCloseTo(0.5, 5);
  });
});
