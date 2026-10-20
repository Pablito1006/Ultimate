import { describe, expect, it } from "vitest";
import { buildRampSamples, SPEED_RAMP_PRESETS } from "../../src/features/speed/speedRamps";

describe("speedRamps (WP6)", () => {
  it("exposes hero and rise-fall presets", () => {
    const ids = SPEED_RAMP_PRESETS.map((p) => p.id);
    expect(ids).toContain("hero");
    expect(ids).toContain("rise-fall");
    expect(ids).toContain("ease");
  });

  it("constant ramp is flat", () => {
    const samples = buildRampSamples({ preset: "constant", startSpeed: 1.5, sampleCount: 9 });
    expect(samples).toHaveLength(9);
    for (const s of samples) {
      expect(s.speed).toBe(1.5);
    }
  });

  it("ease goes from start to end", () => {
    const samples = buildRampSamples({
      preset: "ease",
      startSpeed: 0.5,
      endSpeed: 2,
      sampleCount: 17,
    });
    expect(samples[0].speed).toBeCloseTo(0.5, 5);
    expect(samples[samples.length - 1].speed).toBeCloseTo(2, 5);
  });

  it("hero peaks above start", () => {
    const samples = buildRampSamples({
      preset: "hero",
      startSpeed: 0.5,
      endSpeed: 1,
      peakSpeed: 3,
      sampleCount: 33,
    });
    const max = Math.max(...samples.map((s) => s.speed));
    expect(max).toBeGreaterThan(2);
  });

  it("rise-fall returns to end near 1", () => {
    const samples = buildRampSamples({
      preset: "rise-fall",
      startSpeed: 1,
      endSpeed: 1,
      peakSpeed: 4,
      sampleCount: 41,
    });
    expect(samples[0].speed).toBeCloseTo(1, 5);
    expect(samples[samples.length - 1].speed).toBeCloseTo(1, 5);
    expect(Math.max(...samples.map((s) => s.speed))).toBeGreaterThan(3);
  });
});
