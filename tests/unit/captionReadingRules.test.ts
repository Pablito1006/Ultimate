import { describe, expect, it } from "vitest";
import {
  buildCaptionCues,
  wrapLines,
} from "../../src/features/transcript/captionReadingRules";
import { parsePremiereTranscriptJson } from "../../src/features/transcript/parsePremiereTranscript";
import type { MmTranscript } from "../../src/features/transcript/transcriptModel";
import {
  correctWord,
  mergeSegments,
  replaceAllWords,
  splitSegment,
} from "../../src/features/transcript/editTranscript";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const fixtures = join(dirname(fileURLToPath(import.meta.url)), "../fixtures/transcript");

function longTranscript(): MmTranscript {
  const words = Array.from({ length: 40 }, (_, i) => ({
    text: i % 7 === 0 ? "umbrella" : `word${i}`,
    start: i * 0.3,
    duration: 0.28,
    confidence: 0.9,
    eos: i % 8 === 7,
    tags: i === 3 ? ["filler"] : [],
    type: "word" as const,
  }));
  return parsePremiereTranscriptJson({
    language: "en-us",
    speakers: [{ id: "s", name: "S" }],
    segments: [
      {
        start: 0,
        duration: 12,
        speaker: "s",
        language: "en-us",
        words: words.concat([
          {
            text: "um",
            start: 12,
            duration: 0.2,
            confidence: 1,
            eos: false,
            tags: ["filler"],
            type: "word",
          },
        ]),
      },
    ],
  });
}

describe("caption reading rules", () => {
  it("wraps lines at 42 chars / 2 lines", () => {
    const lines = wrapLines(
      "This is a fairly long caption line that should wrap before forty two characters easily",
      42,
      2
    );
    expect(lines.length).toBeLessThanOrEqual(2);
    expect(lines[0].length).toBeLessThanOrEqual(42);
  });

  it("builds cues with cps and min duration", () => {
    const t = parsePremiereTranscriptJson(
      readFileSync(join(fixtures, "adobe-en-us-sample.json"), "utf8")
    );
    const cues = buildCaptionCues(t, { removeFillers: true });
    expect(cues.length).toBeGreaterThan(0);
    for (const cue of cues) {
      expect(cue.lines.length).toBeLessThanOrEqual(2);
      expect(cue.end).toBeGreaterThan(cue.start);
      const chars = cue.lines.join("").replace(/\s/g, "").length;
      const dur = cue.end - cue.start;
      expect(dur + 1e-6).toBeGreaterThanOrEqual(Math.min(chars / 17, 7) - 0.05);
    }
    expect(cues.some((c) => c.text.includes("um"))).toBe(false);
  });

  it("handles numbers and accents from FR fixture", () => {
    const t = parsePremiereTranscriptJson(
      readFileSync(join(fixtures, "fr-accents-variant.json"), "utf8")
    );
    const cues = buildCaptionCues(t);
    const joined = cues.map((c) => c.text).join(" ");
    expect(joined).toMatch(/Café|hotel|hôtel/i);
    expect(joined).toContain("12");
  });

  it("handles RTL words without crashing", () => {
    const t = parsePremiereTranscriptJson(
      readFileSync(join(fixtures, "rtl-arabic-lite.json"), "utf8")
    );
    const cues = buildCaptionCues(t);
    expect(cues[0].text).toContain("مرحبا");
  });

  it("splits long speech into multiple cues", () => {
    const cues = buildCaptionCues(longTranscript(), { removeFillers: true });
    expect(cues.length).toBeGreaterThan(2);
  });
});

describe("editTranscript", () => {
  it("corrects replace merges and splits", () => {
    const base = parsePremiereTranscriptJson(
      readFileSync(join(fixtures, "adobe-en-us-sample.json"), "utf8")
    );
    const corrected = correctWord(base, 0, 0, "Hi");
    expect(corrected.segments[0].words[0].text).toBe("Hi");
    const replaced = replaceAllWords(corrected, "world.", "everyone.");
    expect(replaced.segments[0].words.some((w) => w.text === "everyone.")).toBe(true);
    const split = splitSegment(replaced, 0, 2);
    expect(split.segments.length).toBe(2);
    const merged = mergeSegments(split, 0);
    expect(merged.segments.length).toBe(1);
  });
});
