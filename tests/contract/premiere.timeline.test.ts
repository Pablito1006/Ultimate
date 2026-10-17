import { afterEach, describe, expect, it } from "vitest";
import { timelineService } from "../../src/premiere/timeline/TimelineService";
import { timelineCache } from "../../src/premiere/timeline/TimelineCache";
import {
  installFakePremiere,
  makeProject,
  type InstalledFakePremiere,
} from "../../src/testing/fakePremiere";

describe("TimelineService contract", () => {
  let fake: InstalledFakePremiere;

  afterEach(() => {
    fake?.uninstall();
    timelineCache.invalidateAll();
  });

  it("analyzes clips with stable ids and batches reads", async () => {
    fake = installFakePremiere({
      project: makeProject({
        sequences: [{ name: "TL", clips: 8, tracks: 2, audioTracks: 2 }],
      }),
    });
    const analysis = await timelineService.analyzeActive({ bypassCache: true });
    expect(analysis.clips.length).toBeGreaterThan(0);
    expect(analysis.sequenceGuid.length).toBeGreaterThan(0);
    expect(analysis.fromCache).toBe(false);
    const ids = new Set(analysis.clips.map((c) => c.id));
    expect(ids.size).toBe(analysis.clips.length);
    expect(analysis.clips.every((c) => c.id.startsWith("h:") || c.id.startsWith("guid:"))).toBe(
      true
    );
  });

  it("serves second analyze from cache", async () => {
    fake = installFakePremiere();
    const first = await timelineService.analyzeActive({ bypassCache: true });
    const second = await timelineService.analyzeActive();
    expect(second.fromCache).toBe(true);
    expect(second.clips.length).toBe(first.clips.length);
  });

  it("analyzes 1000 simulated clips under 1.5s", async () => {
    fake = installFakePremiere({
      project: makeProject({
        sequences: [{ name: "Heavy", clips: 1000, tracks: 6, audioTracks: 2 }],
      }),
    });
    const started = Date.now();
    const analysis = await timelineService.analyzeActive({ bypassCache: true });
    const elapsed = Date.now() - started;
    expect(analysis.clips.length).toBeGreaterThanOrEqual(1000);
    expect(elapsed).toBeLessThan(1500);
  });
});
