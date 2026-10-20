import { afterEach, describe, expect, it } from "vitest";
import { planSpeedPure, speedPreviewable } from "../../src/features/speed/speedPreviewable";
import { getSpeedFeatureStatus } from "../../src/features/speed/speedCapabilities";
import { timelineService } from "../../src/premiere/timeline/TimelineService";
import { installFakePremiere, makeProject, type InstalledFakePremiere } from "../../src/testing/fakePremiere";

describe("WP6 speed / timeline contract", () => {
  let fake: InstalledFakePremiere | undefined;

  afterEach(() => {
    fake?.uninstall();
    fake = undefined;
  });

  it("reads getSpeed / isSpeedReversed into timeline analysis", async () => {
    const project = makeProject({
      sequences: [{ clips: 2, tracks: 1, clipDurationSeconds: 4 }],
    });
    project.sequences[0].videoTracks[0].clips[0].speed = 2;
    project.sequences[0].videoTracks[0].clips[0].reversed = true;
    project.sequences[0].videoTracks[0].clips[1].speed = 0.5;
    fake = installFakePremiere({ hostVersion: "25.6.0", project });

    const analysis = await timelineService.analyzeActive({ bypassCache: true });
    const video = analysis.clips.filter((c) => c.trackKind === "video");
    expect(video.length).toBeGreaterThanOrEqual(2);
    expect(video[0].speed).toBe(2);
    expect(video[0].reversed).toBe(true);
    expect(video[1].speed).toBe(0.5);
    expect(video[1].reversed).toBe(false);
  });

  it("detects non-default speeds and plans exact durations", async () => {
    const project = makeProject({
      sequences: [{ clips: 1, tracks: 1, clipDurationSeconds: 4 }],
    });
    project.sequences[0].videoTracks[0].clips[0].speed = 1;
    fake = installFakePremiere({ hostVersion: "25.6.0", project });

    const plan = await speedPreviewable.plan({
      mode: "constant",
      targetPercent: 200,
      videoOnly: true,
    });
    expect(plan.rows).toHaveLength(1);
    expect(plan.rows[0].resultingDuration).toBe(2);
    expect(plan.writeAvailable).toBe(false);

    const summary = speedPreviewable.describe(plan);
    expect(summary.levels).toContain("B");
    const visual = speedPreviewable.render(plan);
    expect(visual.kind).toBe("speed-curve");

    const apply = await speedPreviewable.apply(plan);
    expect(apply.ok).toBe(false);
    expect(apply.message.toLowerCase()).toContain("unavailable");

    const verify = await speedPreviewable.verify(plan);
    expect(verify.ok).toBe(true);
  });

  it("flags clips already at non-default speed", () => {
    const plan = planSpeedPure(
      [
        {
          id: "a",
          name: "Fast",
          trackIndex: 0,
          trackKind: "video",
          start: 0,
          end: 2,
          duration: 2,
          speed: 2,
          reversed: false,
          nonDefaultSpeed: true,
        },
      ],
      { mode: "constant", targetPercent: 100 }
    );
    expect(plan.detectedNonDefault).toHaveLength(1);
    expect(plan.rows[0].warnings.some((w) => /non standard/i.test(w))).toBe(true);
    // 2s @ 2× → media 4; target 100% → 4s
    expect(plan.rows[0].resultingDuration).toBe(4);
  });

  it("marks write features unavailable honestly", () => {
    const status = getSpeedFeatureStatus();
    const write = status.find((s) => s.id === "speed.writeConstant");
    const ramp = status.find((s) => s.id === "speed.rampWrite");
    const pitch = status.find((s) => s.id === "speed.preserveAudioPitch");
    expect(write?.status).toBe("unavailable");
    expect(ramp?.status).toBe("unavailable");
    expect(pitch?.status).toBe("unavailable");
    expect(status.find((s) => s.id === "speed.durationMath")?.status).toBe("available");
  });
});
