import { describe, expect, it } from "vitest";
import {
  buildCaptionTimeline,
  parseTranscript,
  segmentsToSrt,
} from "../../src/features/subtitles/segmentation";

describe("parseTranscript / captions", () => {
  it("segments text with timestamps", () => {
    const segments = parseTranscript("Hello world from MasterMotion captions engine", 8, 20);
    expect(segments.length).toBeGreaterThan(0);
    expect(segments[0].start).toBe(0);
    expect(segments[segments.length - 1].end).toBe(8);
  });

  it("builds SRT", () => {
    const srt = segmentsToSrt(
      buildCaptionTimeline([{ id: "1", text: "Hi", start: 0, end: 1.5, words: [] }])
    );
    expect(srt).toContain("Hi");
    expect(srt).toContain("-->");
  });
});
