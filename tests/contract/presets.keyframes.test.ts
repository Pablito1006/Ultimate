import { afterEach, describe, expect, it } from "vitest";
import { presetPreviewable, planPresetPure, removePresetKeyframes } from "../../src/features/motion/presets/presetPreviewable";
import { getPresetById } from "../../src/features/motion/presets/presetCatalog";
import { installFakePremiere, type InstalledFakePremiere } from "../../src/testing/fakePremiere";
import { timelineService } from "../../src/premiere/timeline/TimelineService";
import { componentService } from "../../src/premiere/components/ComponentService";
import { keyframeService } from "../../src/premiere/keyframes/KeyframeService";

describe("Native presets keyframes contract", () => {
  let fake: InstalledFakePremiere;

  afterEach(() => {
    fake?.uninstall();
  });

  it("plan → apply → verify punch-in on fake clips", async () => {
    fake = installFakePremiere();
    const analysis = await timelineService.analyzeActive({ bypassCache: true });
    const video = analysis.clips.filter((c) => c.trackKind === "video").slice(0, 2);
    expect(video.length).toBeGreaterThan(0);

    const preset = getPresetById("zoom-punch-in")!;
    const plan = planPresetPure(
      preset,
      { intensity: 60, duration: 1, easing: "easeOut", overwriteExisting: true },
      video.map((c) => ({
        id: c.id,
        name: c.name,
        trackIndex: c.trackIndex,
        start: c.start,
        duration: c.duration,
      }))
    );

    const apply = await presetPreviewable.apply(plan);
    expect(apply.ok).toBe(true);
    expect(apply.affected).toBeGreaterThan(0);

    const verify = await presetPreviewable.verify(plan);
    expect(verify.ok).toBe(true);

    const item = await timelineService.getVideoClipTrackItem(
      video[0].trackIndex,
      video[0].name,
      video[0].start
    );
    expect(item).toBeTruthy();
    const map = await componentService.mapClipComponents(item!);
    expect(map.params.scale).toBeTruthy();
    const count = await keyframeService.countKeyframes(map.params.scale!.param);
    expect(count).toBeGreaterThan(0);
  });

  it("refuses overwrite when keyframes exist and flag is false", async () => {
    fake = installFakePremiere();
    const analysis = await timelineService.analyzeActive({ bypassCache: true });
    const video = analysis.clips.filter((c) => c.trackKind === "video").slice(0, 1);
    const preset = getPresetById("fade-in")!;
    const plan1 = planPresetPure(
      preset,
      { intensity: 50, duration: 0.5, easing: "linear", overwriteExisting: true },
      video.map((c) => ({
        id: c.id,
        name: c.name,
        trackIndex: c.trackIndex,
        start: c.start,
        duration: c.duration,
      }))
    );
    await presetPreviewable.apply(plan1);

    const plan2 = planPresetPure(
      preset,
      { intensity: 50, duration: 0.5, easing: "linear", overwriteExisting: false },
      video.map((c) => ({
        id: c.id,
        name: c.name,
        trackIndex: c.trackIndex,
        start: c.start,
        duration: c.duration,
      }))
    );
    const apply2 = await presetPreviewable.apply(plan2);
    expect(apply2.details?.skipped).toBeGreaterThan(0);
  });

  it("removePresetKeyframes clears ranges", async () => {
    fake = installFakePremiere();
    const analysis = await timelineService.analyzeActive({ bypassCache: true });
    const video = analysis.clips.filter((c) => c.trackKind === "video").slice(0, 1);
    const preset = getPresetById("fade-out")!;
    const plan = planPresetPure(
      preset,
      { intensity: 50, duration: 0.8, easing: "easeIn", overwriteExisting: true },
      video.map((c) => ({
        id: c.id,
        name: c.name,
        trackIndex: c.trackIndex,
        start: c.start,
        duration: c.duration,
      }))
    );
    await presetPreviewable.apply(plan);
    const removed = await removePresetKeyframes(plan);
    expect(removed.ok).toBe(true);
  });
});
