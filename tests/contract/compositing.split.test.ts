import { afterEach, describe, expect, it } from "vitest";
import { planSplitPure, splitPreviewable } from "../../src/features/split-screen/splitPreviewable";
import { pipPreviewable, planPipPure } from "../../src/features/compositing/pipPreviewable";
import { opacityPreviewable } from "../../src/features/compositing/opacityPreviewable";
import { getMasksStatus } from "../../src/features/compositing/masksAndStabilize";
import { installFakePremiere, makeProject, type InstalledFakePremiere } from "../../src/testing/fakePremiere";
import { timelineService } from "../../src/premiere/timeline/TimelineService";
import { componentService } from "../../src/premiere/components/ComponentService";
import { withinPx } from "../../src/features/compositing/geometryTransform";

describe("WP5 compositing / split contract", () => {
  let fake: InstalledFakePremiere;

  afterEach(() => {
    fake?.uninstall();
  });

  it("applies 2x2 split: position/scale re-read within ±1 px", async () => {
    fake = installFakePremiere({
      project: makeProject({ sequences: [{ clips: 4, tracks: 4, clipDurationSeconds: 3 }] }),
    });
    const analysis = await timelineService.analyzeActive({ bypassCache: true });
    const video = analysis.clips.filter((c) => c.trackKind === "video").slice(0, 4);
    expect(video.length).toBe(4);

    const pure = planSplitPure(
      "2x2",
      { width: analysis.frameWidth, height: analysis.frameHeight },
      video.map((c) => ({
        id: c.id,
        name: c.name,
        trackIndex: c.trackIndex,
        start: c.start,
      })),
      { gap: 0, fitMode: "fit-width" }
    );

    const plan = {
      ...pure,
      playheadSeconds: analysis.playerPosition,
      alignStarts: false,
    };

    const apply = await splitPreviewable.apply(plan);
    expect(apply.ok).toBe(true);
    expect(apply.affected).toBe(4);

    const verify = await splitPreviewable.verify(plan);
    expect(verify.ok).toBe(true);

    // Direct check first binding
    const b = plan.bindings[0];
    const item = await timelineService.getVideoClipTrackItem(b.trackIndex, b.clipName, b.start);
    expect(item).toBeTruthy();
    const map = await componentService.mapClipComponents(item!);
    const pt = await componentService.readPoint(map.params.position!);
    const scale = await componentService.readNumeric(map.params.scale!);
    expect(pt).toBeTruthy();
    expect(withinPx(pt![0], b.transform.positionX)).toBe(true);
    expect(withinPx(pt![1], b.transform.positionY)).toBe(true);
    expect(scale).not.toBeNull();
    expect(withinPx(scale!, b.transform.scale)).toBe(true);
  });

  it("PiP plan/apply/verify", async () => {
    fake = installFakePremiere();
    const analysis = await timelineService.analyzeActive({ bypassCache: true });
    const video = analysis.clips.filter((c) => c.trackKind === "video");
    const clip = video[video.length - 1];
    const plan = planPipPure(
      { width: analysis.frameWidth, height: analysis.frameHeight },
      { id: clip.id, name: clip.name, trackIndex: clip.trackIndex, start: clip.start },
      { anchor: "bottom-right", sizePercent: 30 }
    );
    const apply = await pipPreviewable.apply(plan);
    expect(apply.ok).toBe(true);
    const verify = await pipPreviewable.verify(plan);
    expect(verify.ok).toBe(true);
  });

  it("opacity apply verifies", async () => {
    fake = installFakePremiere();
    const plan = await opacityPreviewable.plan({ opacity: 55, maxClips: 2 });
    const apply = await opacityPreviewable.apply(plan);
    expect(apply.ok).toBe(true);
    const verify = await opacityPreviewable.verify(plan);
    expect(verify.ok).toBe(true);
  });

  it("masks are honestly unavailable", () => {
    const m = getMasksStatus();
    expect(m.available).toBe(false);
    expect(m.message.toLowerCase()).toContain("mask");
  });
});
