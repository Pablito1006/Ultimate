import { afterEach, describe, expect, it } from "vitest";
import { colorPreviewable } from "../../src/features/color/colorPreviewable";
import { blendLook } from "../../src/features/color/lookMath";
import { getLookById } from "../../src/features/color/lookCatalog";
import { componentService } from "../../src/premiere/components/ComponentService";
import { timelineService } from "../../src/premiere/timeline/TimelineService";
import { installFakePremiere, makeProject, type InstalledFakePremiere } from "../../src/testing/fakePremiere";

describe("WP7 color looks contract", () => {
  let fake: InstalledFakePremiere | undefined;

  afterEach(() => {
    fake?.uninstall();
    fake = undefined;
  });

  it("plan → apply → verify warm look on fake clips", async () => {
    fake = installFakePremiere({
      project: makeProject({ sequences: [{ clips: 2, tracks: 1, clipDurationSeconds: 3 }] }),
    });

    const plan = await colorPreviewable.plan({
      lookId: "warm-sun",
      intensity: 1,
      action: "apply",
      overwriteExisting: true,
    });
    expect(plan.bindings.length).toBeGreaterThanOrEqual(1);
    expect(plan.lutApplyUnavailable).toBe(true);

    const visual = colorPreviewable.render(plan);
    expect(visual.kind).toBe("look-grade");
    expect((visual.payload as { approximate: boolean }).approximate).toBe(true);

    const apply = await colorPreviewable.apply(plan);
    expect(apply.ok).toBe(true);
    expect(apply.affected).toBeGreaterThan(0);

    const verify = await colorPreviewable.verify(plan);
    expect(verify.ok).toBe(true);

    const b = plan.bindings[0];
    const item = await timelineService.getVideoClipTrackItem(b.trackIndex, b.clipName, b.start);
    expect(item).toBeTruthy();
    const map = await componentService.mapClipComponents(item!);
    const temp = await componentService.readNumeric(map.params.temperature!);
    const expected = blendLook(getLookById("warm-sun")!, 1).temperature;
    expect(temp).toBeCloseTo(expected, 1);
  });

  it("remove restores neutrals", async () => {
    fake = installFakePremiere({
      project: makeProject({ sequences: [{ clips: 1, tracks: 1 }] }),
    });
    const applyPlan = await colorPreviewable.plan({
      lookId: "punch-contrast",
      intensity: 1,
      overwriteExisting: true,
    });
    await colorPreviewable.apply(applyPlan);

    const removePlan = await colorPreviewable.plan({
      lookId: "neutral-reset",
      action: "remove",
      overwriteExisting: true,
    });
    const rem = await colorPreviewable.apply(removePlan);
    expect(rem.ok).toBe(true);
    const verify = await colorPreviewable.verify(removePlan);
    expect(verify.ok).toBe(true);
  });

  it("harmonize applies same values to multiple clips", async () => {
    fake = installFakePremiere({
      project: makeProject({ sequences: [{ clips: 3, tracks: 1 }] }),
    });
    const plan = await colorPreviewable.plan({
      lookId: "social-pop",
      intensity: 0.8,
      action: "harmonize",
      overwriteExisting: true,
      maxClips: 3,
    });
    expect(plan.bindings).toHaveLength(3);
    const apply = await colorPreviewable.apply(plan);
    expect(apply.ok).toBe(true);
    expect(apply.affected).toBe(3);
  });

  it("skips existing grade without overwrite", async () => {
    fake = installFakePremiere({
      project: makeProject({ sequences: [{ clips: 1, tracks: 1 }] }),
    });
    await colorPreviewable.apply(
      await colorPreviewable.plan({
        lookId: "amber-glow",
        intensity: 1,
        overwriteExisting: true,
      })
    );
    const plan = await colorPreviewable.plan({
      lookId: "cool-steel",
      intensity: 1,
      overwriteExisting: false,
    });
    const apply = await colorPreviewable.apply(plan);
    expect(apply.ok).toBe(false);
    expect(String(apply.details?.failures)).toMatch(/skipped|existing/i);
  });
});
