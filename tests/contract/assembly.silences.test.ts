import { afterEach, describe, expect, it } from "vitest";
import { assemblyPreviewable } from "../../src/features/assembly/assemblyPreviewable";
import { timelineService } from "../../src/premiere/timeline/TimelineService";
import { installFakePremiere, makeProject, type InstalledFakePremiere } from "../../src/testing/fakePremiere";

describe("WP9 assembly contract", () => {
  let fake: InstalledFakePremiere | undefined;

  afterEach(() => {
    fake?.uninstall();
    fake = undefined;
  });

  it("silence markers-first: plan → apply → verify", async () => {
    fake = installFakePremiere({
      project: makeProject({ sequences: [{ clips: 3, tracks: 1, clipDurationSeconds: 2 }] }),
    });

    const plan = await assemblyPreviewable.plan({
      mode: "silences",
      applyMode: "markers",
      speechSegments: [
        { start: 0, end: 1.5 },
        { start: 3, end: 4.5 },
      ],
      minSilenceSeconds: 0.4,
    });
    expect(plan.markersToAdd.length).toBeGreaterThan(0);
    expect(assemblyPreviewable.render(plan).kind).toBe("assembly-ranges");

    const apply = await assemblyPreviewable.apply(plan);
    expect(apply.ok).toBe(true);
    expect(apply.affected).toBeGreaterThan(0);

    const verify = await assemblyPreviewable.verify(plan);
    expect(verify.ok).toBe(true);

    const analysis = await timelineService.analyzeActive({ bypassCache: true });
    expect(analysis.markers.some((m) => m.name === "MM:Silence")).toBe(true);
  });

  it("multicam rename apply → verify", async () => {
    fake = installFakePremiere({
      project: makeProject({ sequences: [{ clips: 2, tracks: 2, clipDurationSeconds: 2 }] }),
    });
    const plan = await assemblyPreviewable.plan({
      mode: "multicam-rename",
      multicamPrefix: "Cam",
    });
    expect(plan.renameRows.length).toBeGreaterThan(0);
    const apply = await assemblyPreviewable.apply(plan);
    expect(apply.ok).toBe(true);
    const verify = await assemblyPreviewable.verify(plan);
    expect(verify.ok).toBe(true);
  });

  it("beat import places MM:Beat markers", async () => {
    fake = installFakePremiere();
    const plan = await assemblyPreviewable.plan({
      mode: "beats",
      beatTimesRaw: "1, 2, 3",
    });
    expect(plan.markersToAdd).toHaveLength(3);
    const apply = await assemblyPreviewable.apply(plan);
    expect(apply.ok).toBe(true);
    const analysis = await timelineService.analyzeActive({ bypassCache: true });
    expect(analysis.markers.filter((m) => m.name === "MM:Beat").length).toBeGreaterThanOrEqual(3);
  });

  it("cleanup reports empty tracks without claiming delete", async () => {
    fake = installFakePremiere({
      project: makeProject({ sequences: [{ clips: 1, tracks: 3, audioTracks: 2 }] }),
    });
    const plan = await assemblyPreviewable.plan({ mode: "cleanup" });
    expect(plan.cleanupRows.some((r) => r.kind === "empty-track" && !r.actionable)).toBe(true);
  });
});
