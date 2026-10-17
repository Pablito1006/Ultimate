import { describe, expect, it } from "vitest";
import { buildCaptionCues } from "../../src/features/transcript/captionReadingRules";
import { parsePremiereTranscriptJson } from "../../src/features/transcript/parsePremiereTranscript";
import { cuesToSrt, cuesToTxt, cuesToVtt, exportCaptions } from "../../src/features/transcript/subtitleExport";
import { importSrt, importTranscriptAuto, importVtt } from "../../src/features/transcript/subtitleImport";

const SAMPLE_SRT = `1
00:00:01,000 --> 00:00:03,500
Hello world

2
00:00:04,000 --> 00:00:06,000
Second line here
`;

const SAMPLE_VTT = `WEBVTT

00:00:01.000 --> 00:00:02.500
Bonjour

00:00:03.000 --> 00:00:05.000
le monde
`;

describe("subtitle import/export", () => {
  it("imports SRT with timing", () => {
    const t = importSrt(SAMPLE_SRT);
    expect(t.source).toBe("srt");
    expect(t.segments).toHaveLength(2);
    expect(t.segments[0].start).toBeCloseTo(1, 2);
    expect(t.segments[0].text).toContain("Hello");
  });

  it("imports VTT", () => {
    const t = importVtt(SAMPLE_VTT);
    expect(t.source).toBe("vtt");
    expect(t.segments.length).toBeGreaterThanOrEqual(2);
  });

  it("auto-detects JSON SRT VTT and plain text", () => {
    expect(importTranscriptAuto('{"language":"en-us","speakers":[{"id":"a","name":"A"}],"segments":[{"start":0,"duration":1,"speaker":"a","language":"en-us","words":[{"text":"Hi","start":0,"duration":1,"confidence":1,"eos":true,"tags":[],"type":"word"}]}]}').segments).toHaveLength(1);
    expect(importTranscriptAuto(SAMPLE_SRT).source).toBe("srt");
    expect(importTranscriptAuto(SAMPLE_VTT).source).toBe("vtt");
    expect(importTranscriptAuto("Just plain words here.").source).toBe("plain-text");
  });

  it("exports SRT conforming to reading cues", () => {
    const t = importSrt(SAMPLE_SRT);
    const cues = buildCaptionCues(t);
    const srt = cuesToSrt(cues);
    expect(srt).toMatch(/\d+\n\d{2}:\d{2}:\d{2},\d{3} --> /);
    expect(cuesToVtt(cues).startsWith("WEBVTT")).toBe(true);
    expect(cuesToTxt(cues).length).toBeGreaterThan(0);
    expect(exportCaptions("json", cues, t)).toContain("segments");
  });

  it("round-trips SRT → cues → SRT", () => {
    const t = importSrt(SAMPLE_SRT);
    const cues = buildCaptionCues(t);
    const again = importSrt(cuesToSrt(cues));
    expect(again.segments.length).toBe(cues.length);
  });

  it("parses numbers in plain import", () => {
    const t = importTranscriptAuto("Order 42 items at 3.5 euros.");
    expect(t.segments[0].words.some((w) => w.text === "42")).toBe(true);
  });
});

describe("caption styles count", () => {
  it("ships at least 12 styles", async () => {
    const { CAPTION_STYLE_PRESETS } = await import("../../src/features/subtitles/captionStyles");
    expect(CAPTION_STYLE_PRESETS.length).toBeGreaterThanOrEqual(12);
  });
});

describe("planCaptionsPure still works", () => {
  it("builds srt from mock text", async () => {
    const { planCaptionsPure } = await import("../../src/features/subtitles/captionsPreviewable");
    const plan = await planCaptionsPure({
      text: "One. Two. Three numbered 7 items.",
      styleId: "minimal",
      durationSeconds: 6,
      reading: { removeFillers: true },
    });
    expect(plan.cues.length).toBeGreaterThan(0);
    expect(plan.srt).toContain("-->");
  });
});

describe("premiere json edge cases", () => {
  it("accepts punctuation type words", () => {
    const t = parsePremiereTranscriptJson({
      language: "en-us",
      speakers: [{ id: "1", name: "A" }],
      segments: [
        {
          start: 0,
          duration: 1,
          speaker: "1",
          language: "en-us",
          words: [
            { text: "Wow", start: 0, duration: 0.4, confidence: 1, eos: false, tags: [], type: "word" },
            { text: "!", start: 0.4, duration: 0.1, confidence: 1, eos: true, tags: [], type: "punctuation" },
          ],
        },
      ],
    });
    expect(t.segments[0].text).toContain("Wow");
  });
});
