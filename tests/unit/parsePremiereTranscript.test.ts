import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  parsePremiereTranscriptJson,
  serializePremiereTranscriptJson,
} from "../../src/features/transcript/parsePremiereTranscript";

const fixtures = join(dirname(fileURLToPath(import.meta.url)), "../fixtures/transcript");

describe("parsePremiereTranscriptJson", () => {
  it("parses Adobe official sample", () => {
    const raw = readFileSync(join(fixtures, "adobe-en-us-sample.json"), "utf8");
    const t = parsePremiereTranscriptJson(raw);
    expect(t.language).toBe("en-us");
    expect(t.speakers[0].name).toBe("Jane Doe");
    expect(t.segments).toHaveLength(1);
    expect(t.segments[0].words.length).toBeGreaterThanOrEqual(3);
    expect(t.segments[0].words.some((w) => w.tags.includes("filler"))).toBe(true);
    expect(t.segments[0].words[0].confidence).toBe(1);
  });

  it("parses French accents variant with end instead of duration", () => {
    const raw = readFileSync(join(fixtures, "fr-accents-variant.json"), "utf8");
    const t = parsePremiereTranscriptJson(raw);
    expect(t.language).toBe("fr-fr");
    expect(t.segments[0].text).toContain("Café");
    expect(t.segments[0].words.some((w) => w.text === "12")).toBe(true);
  });

  it("parses RTL arabic lite sample", () => {
    const raw = readFileSync(join(fixtures, "rtl-arabic-lite.json"), "utf8");
    const t = parsePremiereTranscriptJson(raw);
    expect(t.segments[0].words[0].text).toBe("مرحبا");
    expect(t.segments[0].words).toHaveLength(2);
  });

  it("tolerates empty / invalid JSON without throwing", () => {
    expect(parsePremiereTranscriptJson("").warnings.length).toBeGreaterThan(0);
    expect(parsePremiereTranscriptJson("not-json").warnings[0]).toMatch(/JSON parse failed/);
    expect(parsePremiereTranscriptJson("[]").warnings.length).toBeGreaterThan(0);
  });

  it("tolerates wrapped { transcript: ... } and missing words", () => {
    const t = parsePremiereTranscriptJson({
      transcript: {
        language: "en-US",
        speakers: [],
        segments: [{ start: 0, end: 2, text: "Hello there." }],
      },
    });
    expect(t.segments).toHaveLength(1);
    expect(t.segments[0].words[0].text).toContain("Hello");
  });

  it("round-trips serialize → parse", () => {
    const raw = readFileSync(join(fixtures, "adobe-en-us-sample.json"), "utf8");
    const once = parsePremiereTranscriptJson(raw);
    const json = serializePremiereTranscriptJson(once);
    const twice = parsePremiereTranscriptJson(json);
    expect(twice.segments[0].words.map((w) => w.text)).toEqual(
      once.segments[0].words.map((w) => w.text)
    );
  });
});
