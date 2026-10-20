import { describe, expect, it } from "vitest";
import {
  meanSpeedFromSamples,
  mediaSecondsFromDuration,
  resultingDurationConstant,
  resultingDurationRamp,
  speedForTargetDuration,
  speedToPercent,
} from "../../src/features/speed/speedMath";
import { buildRampSamples } from "../../src/features/speed/speedRamps";

describe("speedMath (WP6)", () => {
  it("computes media span and constant speed duration exactly", () => {
    // 4s @ 100% → media 4s; @ 200% → 2s sequence
    expect(mediaSecondsFromDuration(4, 1)).toBe(4);
    const r = resultingDurationConstant(4, 1, 2);
    expect(r.resultingDuration).toBe(2);
    expect(r.durationDelta).toBe(-2);
    expect(r.mediaSeconds).toBe(4);
  });

  it("handles slow-mo 50% from 100%", () => {
    const r = resultingDurationConstant(2, 1, 0.5);
    expect(r.resultingDuration).toBe(4);
    expect(speedToPercent(0.5)).toBe(50);
  });

  it("derives speed for target duration", () => {
    // 10s @ 1× → media 10; target 5s → speed 2
    const t = speedForTargetDuration(10, 1, 5);
    expect(t.resultingSpeed).toBe(2);
    expect(t.mediaSeconds).toBe(10);
  });

  it("accounts for current non-1 speed when retargeting", () => {
    // Already at 2× for 2s seq → media 4; target 4s → speed 1
    const t = speedForTargetDuration(2, 2, 4);
    expect(t.resultingSpeed).toBe(1);
    const back = resultingDurationConstant(2, 2, 1);
    expect(back.resultingDuration).toBe(4);
  });

  it("mean speed trapezoid for constant samples is exact", () => {
    const samples = [
      { u: 0, speed: 2 },
      { u: 0.5, speed: 2 },
      { u: 1, speed: 2 },
    ];
    expect(meanSpeedFromSamples(samples)).toBe(2);
    const ramp = resultingDurationRamp(4, 1, samples);
    expect(ramp.resultingDuration).toBe(2);
  });

  it("ramp duration = media / mean(speed)", () => {
    const samples = buildRampSamples({
      preset: "rise-fall",
      startSpeed: 1,
      endSpeed: 1,
      peakSpeed: 3,
      sampleCount: 65,
    });
    const mean = meanSpeedFromSamples(samples);
    expect(mean).toBeGreaterThan(1);
    expect(mean).toBeLessThan(3);
    const r = resultingDurationRamp(10, 1, samples);
    expect(r.resultingDuration).toBeCloseTo(10 / mean, 10);
  });
});
