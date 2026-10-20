import { describe, expect, it } from "vitest";
import {
  buildDuckingKeyframes,
  buildFadeKeyframes,
  gainDbFromLufs,
  resolveTargetLufs,
  sampleVolumeCurve,
} from "../../src/features/audio/audioMath";
import { sfxCatalogCount } from "../../src/features/audio/sfxCatalog";
import { planAudioPure } from "../../src/features/audio/audioPreviewable";
import { getAudioFeatureStatus } from "../../src/features/audio/audioCapabilities";

describe("audioMath / sfx (WP8)", () => {
  it("computes gain from LUFS measurement", () => {
    expect(gainDbFromLufs(-18, -14)).toBe(4);
    expect(resolveTargetLufs("youtube")).toBe(-14);
    expect(resolveTargetLufs("podcast")).toBe(-16);
  });

  it("builds ducking keyframes under speech", () => {
    const keys = buildDuckingKeyframes(0, 10, [{ start: 2, end: 4 }], {
      baseDb: 0,
      duckDb: -12,
      attack: 0.2,
      release: 0.3,
    });
    expect(keys.length).toBeGreaterThanOrEqual(4);
    const mid = keys.find((k) => k.timeSeconds >= 2 && k.timeSeconds <= 4 && k.valueDb === -12);
    expect(mid).toBeTruthy();
    const samples = sampleVolumeCurve(keys, 0, 10, 21);
    expect(samples).toHaveLength(21);
    expect(samples[0].t).toBe(0);
  });

  it("builds fade in/out keyframes", () => {
    const keys = buildFadeKeyframes(0, 4, 0.5, 0.5);
    expect(keys[0].valueDb).toBe(-60);
    expect(keys.some((k) => k.valueDb === 0)).toBe(true);
    expect(keys[keys.length - 1].valueDb).toBe(-60);
  });

  it("ships at least 100 SFX catalog entries", () => {
    expect(sfxCatalogCount()).toBeGreaterThanOrEqual(100);
  });

  it("plans ducking purely without Premiere", () => {
    const plan = planAudioPure(
      [
        {
          id: "a1",
          name: "Music",
          trackIndex: 0,
          start: 0,
          end: 8,
          trackKind: "audio",
        },
      ],
      {
        mode: "ducking",
        speechSegments: [{ start: 1, end: 3 }],
        duckDb: -10,
      }
    );
    expect(plan.bindings).toHaveLength(1);
    expect(plan.bindings[0].keyframes.length).toBeGreaterThan(2);
    expect(plan.samples.length).toBeGreaterThan(10);
  });

  it("marks loudness meter and auto-insert unavailable", () => {
    const s = getAudioFeatureStatus();
    expect(s.find((x) => x.id === "audio.loudnessMeter")?.status).toBe("unavailable");
    expect(s.find((x) => x.id === "audio.sfxAutoInsert")?.status).toBe("unavailable");
    expect(s.find((x) => x.id === "audio.ducking")?.status).toBe("available");
  });
});
