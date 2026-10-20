import { afterEach, describe, expect, it } from "vitest";
import { audioPreviewable } from "../../src/features/audio/audioPreviewable";
import { soundPreviewable } from "../../src/features/audio/soundPreviewable";
import { componentService } from "../../src/premiere/components/ComponentService";
import { keyframeService } from "../../src/premiere/keyframes/KeyframeService";
import { timelineService } from "../../src/premiere/timeline/TimelineService";
import { installFakePremiere, makeProject, type InstalledFakePremiere } from "../../src/testing/fakePremiere";

describe("WP8 audio ducking / gain contract", () => {
  let fake: InstalledFakePremiere | undefined;

  afterEach(() => {
    fake?.uninstall();
    fake = undefined;
  });

  it("plan → apply → verify ducking keyframes on music clip", async () => {
    fake = installFakePremiere({
      project: makeProject({
        sequences: [{ clips: 2, tracks: 1, audioTracks: 1, clipDurationSeconds: 8 }],
      }),
    });

    const plan = await audioPreviewable.plan({
      mode: "ducking",
      musicTrackIndex: 0,
      speechSegments: [
        { start: 1, end: 3 },
        { start: 5, end: 6.5 },
      ],
      duckDb: -12,
      overwriteExisting: true,
    });
    expect(plan.bindings.length).toBeGreaterThanOrEqual(1);
    expect(plan.bindings[0].keyframes.length).toBeGreaterThanOrEqual(4);

    const visual = audioPreviewable.render(plan);
    expect(visual.kind).toBe("volume-curve");

    const apply = await audioPreviewable.apply(plan);
    expect(apply.ok).toBe(true);
    expect(apply.affected).toBeGreaterThan(0);

    const verify = await audioPreviewable.verify(plan);
    expect(verify.ok).toBe(true);

    const b = plan.bindings[0];
    const item = await timelineService.getAudioClipTrackItem(b.trackIndex, b.clipName, b.start);
    expect(item).toBeTruthy();
    const map = await componentService.mapClipComponents(
      item as unknown as import("@adobe/premierepro").VideoClipTrackItem
    );
    expect(map.params.volume).toBeTruthy();
    const count = await keyframeService.countKeyframes(map.params.volume!.param);
    expect(count).toBeGreaterThanOrEqual(2);
  });

  it("applies gain from measured LUFS", async () => {
    fake = installFakePremiere({
      project: makeProject({ sequences: [{ clips: 1, tracks: 1, audioTracks: 1 }] }),
    });
    const plan = await audioPreviewable.plan({
      mode: "gain",
      measuredLufs: -18,
      platform: "youtube",
      overwriteExisting: true,
    });
    expect(plan.bindings[0].gainDb).toBe(4);
    const apply = await audioPreviewable.apply(plan);
    expect(apply.ok).toBe(true);
    const verify = await audioPreviewable.verify(plan);
    expect(verify.ok).toBe(true);
  });

  it("SFX apply places markers only — never claims media insert", async () => {
    fake = installFakePremiere();
    const plan = await soundPreviewable.plan({});
    const apply = await soundPreviewable.apply(plan);
    expect(apply.ok).toBe(true);
    expect(apply.message.toLowerCase()).toMatch(/marker/);
    const verify = await soundPreviewable.verify(plan);
    expect(verify.ok).toBe(true);
  });
});
