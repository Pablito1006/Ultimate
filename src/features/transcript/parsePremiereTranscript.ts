import { emptyTranscript, type MmSegment, type MmSpeaker, type MmTranscript, type MmWord } from "./transcriptModel";

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asString(value: unknown, fallback = ""): string {
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return fallback;
}

function asNumber(value: unknown, fallback: number | null = null): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    if (Number.isFinite(n)) {
      return n;
    }
  }
  return fallback;
}

function normalizeLang(raw: string): string {
  const t = raw.trim();
  if (!t) {
    return "??-??";
  }
  return t.toLowerCase();
}

function parseWord(raw: unknown, speakerId: string | null, warnings: string[]): MmWord | null {
  const obj = asRecord(raw);
  if (!obj) {
    return null;
  }
  const text = asString(obj.text ?? obj.word ?? obj.content).trim();
  if (!text) {
    return null;
  }
  const start = asNumber(obj.start, 0) ?? 0;
  const duration = asNumber(obj.duration, null);
  const endFromField = asNumber(obj.end, null);
  const end =
    endFromField !== null
      ? endFromField
      : duration !== null
        ? start + duration
        : start + 0.2;
  if (end < start) {
    warnings.push(`Word “${text}” has end < start; clamped.`);
  }
  const conf = asNumber(obj.confidence, null);
  const typeRaw = asString(obj.type, "word").toLowerCase();
  const type: MmWord["type"] =
    typeRaw === "punctuation" ? "punctuation" : typeRaw === "word" ? "word" : "unknown";
  const tags = asArray(obj.tags)
    .map((t) => asString(t).toLowerCase())
    .filter(Boolean);
  return {
    text,
    start,
    end: Math.max(end, start),
    confidence: conf,
    eos: Boolean(obj.eos),
    type,
    tags,
    speakerId,
  };
}

function wordsToText(words: MmWord[]): string {
  let out = "";
  for (let i = 0; i < words.length; i += 1) {
    const w = words[i];
    if (w.type === "punctuation" || /^[.,!?;:…]/.test(w.text)) {
      out += w.text;
    } else if (out.length === 0) {
      out = w.text;
    } else {
      out += ` ${w.text}`;
    }
  }
  return out.trim();
}

/**
 * Tolerant parser for Premiere transcript JSON (Adobe schema + variants).
 * Never throws on shape quirks — returns warnings instead.
 */
export function parsePremiereTranscriptJson(raw: string | unknown): MmTranscript {
  const warnings: string[] = [];
  let data: unknown = raw;
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) {
      const empty = emptyTranscript("premiere-json");
      empty.warnings.push("Empty transcript JSON.");
      return empty;
    }
    try {
      data = JSON.parse(trimmed) as unknown;
    } catch {
      const empty = emptyTranscript("premiere-json");
      empty.warnings.push("JSON parse failed — not valid JSON.");
      return empty;
    }
  }

  const root = asRecord(data);
  if (!root) {
    const empty = emptyTranscript("premiere-json");
    empty.warnings.push("Root value is not an object.");
    return empty;
  }

  // Some exports wrap under { transcript: {...} }
  const payload = asRecord(root.transcript) ?? root;

  const language = normalizeLang(asString(payload.language ?? payload.Language, "??-??"));
  const speakersRaw = asArray(payload.speakers ?? payload.Speakers);
  const speakers: MmSpeaker[] = [];
  for (let i = 0; i < speakersRaw.length; i += 1) {
    const sp = asRecord(speakersRaw[i]);
    if (!sp) {
      continue;
    }
    const id = asString(sp.id ?? sp.uuid, `speaker_${i + 1}`);
    const name = asString(sp.name ?? sp.label, `Speaker ${i + 1}`);
    speakers.push({ id, name });
  }

  const segmentsRaw = asArray(payload.segments ?? payload.Segments);
  const segments: MmSegment[] = [];

  for (let i = 0; i < segmentsRaw.length; i += 1) {
    const seg = asRecord(segmentsRaw[i]);
    if (!seg) {
      warnings.push(`Segment ${i} skipped (not an object).`);
      continue;
    }
    const speakerId = asString(seg.speaker ?? seg.speakerId, "") || null;
    const start = asNumber(seg.start, 0) ?? 0;
    const duration = asNumber(seg.duration, null);
    const endField = asNumber(seg.end, null);
    let end =
      endField !== null ? endField : duration !== null ? start + duration : start;

    const wordsRaw = asArray(seg.words ?? seg.Words);
    const words: MmWord[] = [];
    for (let w = 0; w < wordsRaw.length; w += 1) {
      const parsed = parseWord(wordsRaw[w], speakerId, warnings);
      if (parsed) {
        words.push(parsed);
      }
    }

    let text = asString(seg.text ?? seg.content).trim();
    if (!text && words.length > 0) {
      text = wordsToText(words);
    }
    if (!text && words.length === 0) {
      warnings.push(`Segment ${i} has no text/words; skipped.`);
      continue;
    }

    if (words.length === 0 && text) {
      // Synthesize a single word spanning the segment
      if (end <= start) {
        end = start + Math.max(1, text.split(/\s+/).length * 0.35);
      }
      words.push({
        text,
        start,
        end,
        confidence: null,
        eos: true,
        type: "word",
        tags: [],
        speakerId,
      });
    }

    if (words.length > 0) {
      const last = words[words.length - 1];
      end = Math.max(end, last.end);
    }

    segments.push({
      id: asString(seg.id, `seg_${i + 1}`),
      start,
      end,
      language: normalizeLang(asString(seg.language, language)),
      speakerId,
      text,
      words,
    });
  }

  if (segments.length === 0) {
    warnings.push("No usable segments found.");
  }

  return {
    language,
    speakers,
    segments,
    source: "premiere-json",
    warnings,
  };
}

/** Serialize internal model back to Adobe-compatible JSON for re-import. */
export function serializePremiereTranscriptJson(transcript: MmTranscript): string {
  const payload = {
    language: transcript.language || "??-??",
    speakers:
      transcript.speakers.length > 0
        ? transcript.speakers.map((s) => ({ id: s.id, name: s.name }))
        : [{ id: "00000000-0000-4000-8000-000000000001", name: "Speaker 1" }],
    segments: transcript.segments.map((seg) => ({
      start: seg.start,
      duration: Math.max(0, seg.end - seg.start),
      language: seg.language || transcript.language || "??-??",
      speaker: seg.speakerId || payloadSpeakerFallback(transcript),
      words: seg.words.map((w) => ({
        text: w.text,
        start: w.start,
        duration: Math.max(0, w.end - w.start),
        confidence: w.confidence ?? 1,
        eos: w.eos,
        tags: w.tags.filter((t) => t === "filler" || t === "profanity"),
        type: w.type === "punctuation" ? "punctuation" : "word",
      })),
    })),
  };
  return JSON.stringify(payload, null, 2);
}

function payloadSpeakerFallback(transcript: MmTranscript): string {
  if (transcript.speakers[0]) {
    return transcript.speakers[0].id;
  }
  return "00000000-0000-4000-8000-000000000001";
}
