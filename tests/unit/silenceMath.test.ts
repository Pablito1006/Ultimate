import { describe, expect, it } from "vitest";
import {
  clipsFullyInRanges,
  detectSilences,
  keepRangesFromSpeech,
  mergeRanges,
  totalDuration,
} from "../../src/features/assembly/silenceMath";
import { detectHesitations } from "../../src/features/assembly/hesitationMath";
import { detectJumpCuts } from "../../src/features/assembly/jumpCutMath";
import { parseBeatTimes } from "../../src/features/assembly/beatImport";
import { planAssemblyPure } from "../../src/features/assembly/assemblyPreviewable";
import { getAssemblyFeatureStatus } from "../../src/features/assembly/assemblyCapabilities";

describe("silenceMath synthetic datasets (WP9)", () => {
  it("detects gaps between speech segments", () => {
    const sil = detectSilences(
      [
        { start: 0, end: 2 },
        { start: 3.5, end: 5 },
        { start: 8, end: 10 },
      ],
      { minSilenceSeconds: 0.4, timelineStart: 0, timelineEnd: 12 }
    );
    expect(sil.length).toBe(3);
    expect(sil[0].start).toBe(2);
    expect(sil[0].end).toBe(3.5);
    expect(totalDuration(sil)).toBeCloseTo(1.5 + 3 + 2, 5);
  });

  it("ignores short gaps below threshold", () => {
    const sil = detectSilences(
      [
        { start: 0, end: 1 },
        { start: 1.2, end: 2 },
      ],
      { minSilenceSeconds: 0.5 }
    );
    expect(sil).toHaveLength(0);
  });

  it("merges overlapping speech before silence detection", () => {
    const merged = mergeRanges([
      { start: 0, end: 2 },
      { start: 1.5, end: 3 },
      { start: 5, end: 6 },
    ]);
    expect(merged).toEqual([
      { start: 0, end: 3 },
      { start: 5, end: 6 },
    ]);
  });

  it("keep ranges from speech", () => {
    const keep = keepRangesFromSpeech([
      { start: 1, end: 2 },
      { start: 4, end: 5 },
    ]);
    expect(keep).toHaveLength(2);
    expect(keep[0].kind).toBe("keep");
  });

  it("finds clips fully inside silence", () => {
    const clips = [
      { id: "a", name: "A", start: 2.1, end: 3.0, trackIndex: 0 },
      { id: "b", name: "B", start: 0, end: 5, trackIndex: 0 },
    ];
    const sil = [{ start: 2, end: 3.5, kind: "silence" as const }];
    const fully = clipsFullyInRanges(clips, sil);
    expect(fully.map((c) => c.id)).toEqual(["a"]);
  });

  it("detects hesitations from fillers", () => {
    const h = detectHesitations([
      { text: "Hello", start: 0, end: 0.3 },
      { text: "um", start: 0.4, end: 0.6 },
      { text: "euh", start: 1, end: 1.2 },
    ]);
    expect(h).toHaveLength(2);
  });

  it("detects jump cuts on small gaps", () => {
    const hits = detectJumpCuts(
      [
        { id: "1", name: "A", start: 0, end: 2, trackIndex: 0 },
        { id: "2", name: "B", start: 2.1, end: 4, trackIndex: 0 },
      ],
      0.25
    );
    expect(hits).toHaveLength(1);
    expect(hits[0].gap).toBeCloseTo(0.1, 5);
  });

  it("parses beat times and warns about missing analysis", () => {
    const r = parseBeatTimes("[0.5, 1, 1.5]");
    expect(r.times).toEqual([0.5, 1, 1.5]);
    expect(r.warnings.some((w) => /unavailable/i.test(w))).toBe(true);
  });

  it("plans silences markers-first purely", () => {
    const plan = planAssemblyPure(
      {
        mode: "silences",
        applyMode: "markers",
        speechSegments: [
          { start: 0, end: 1 },
          { start: 3, end: 4 },
        ],
        minSilenceSeconds: 0.5,
        timelineEnd: 5,
      },
      {
        clips: [],
        videoTrackCount: 1,
        audioTrackCount: 1,
        timelineEnd: 5,
      }
    );
    expect(plan.markersToAdd.length).toBeGreaterThanOrEqual(2);
    expect(plan.markersToAdd.every((m) => m.name === "MM:Silence")).toBe(true);
  });

  it("marks mid-clip cut and beat analysis unavailable", () => {
    const s = getAssemblyFeatureStatus();
    expect(s.find((x) => x.id === "assembly.midClipCut")?.status).toBe("unavailable");
    expect(s.find((x) => x.id === "assembly.beatAnalysis")?.status).toBe("unavailable");
    expect(s.find((x) => x.id === "assembly.silenceMarkers")?.status).toBe("available");
  });
});
