import { emptyTranscript, type MmSegment, type MmTranscript, type MmWord } from "./transcriptModel";
import { parsePremiereTranscriptJson } from "./parsePremiereTranscript";

function parseTimestamp(raw: string): number {
  const normalized = raw.trim().replace(",", ".");
  const parts = normalized.split(":");
  if (parts.length === 3) {
    const h = Number(parts[0]);
    const m = Number(parts[1]);
    const s = Number(parts[2]);
    return h * 3600 + m * 60 + s;
  }
  if (parts.length === 2) {
    return Number(parts[0]) * 60 + Number(parts[1]);
  }
  return Number(normalized) || 0;
}

function cueToSegment(id: string, start: number, end: number, text: string): MmSegment {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const flat = lines.join(" ");
  const tokens = flat.split(/\s+/).filter(Boolean);
  const span = Math.max(0.2, end - start);
  const step = span / Math.max(tokens.length, 1);
  const words: MmWord[] = tokens.map((t, i) => ({
    text: t,
    start: start + i * step,
    end: start + (i + 1) * step,
    confidence: null,
    eos: i === tokens.length - 1,
    type: "word",
    tags: [],
    speakerId: null,
  }));
  return {
    id,
    start,
    end,
    language: null,
    speakerId: null,
    text: flat,
    words,
  };
}

export function importSrt(raw: string): MmTranscript {
  const blocks = raw
    .replace(/^\uFEFF/, "")
    .trim()
    .split(/\r?\n\r?\n+/);
  const segments: MmSegment[] = [];
  for (let i = 0; i < blocks.length; i += 1) {
    const lines = blocks[i].split(/\r?\n/).filter((l) => l.trim() !== "");
    if (lines.length < 2) {
      continue;
    }
    let idx = 0;
    if (/^\d+$/.test(lines[0].trim())) {
      idx = 1;
    }
    const timing = lines[idx] || "";
    const match = timing.match(/([\d:,.]+)\s*-->\s*([\d:,.]+)/);
    if (!match) {
      continue;
    }
    const start = parseTimestamp(match[1]);
    const end = parseTimestamp(match[2]);
    const text = lines.slice(idx + 1).join("\n");
    segments.push(cueToSegment(`srt_${segments.length + 1}`, start, end, text));
  }
  return {
    language: "??-??",
    speakers: [],
    segments,
    source: "srt",
    warnings: segments.length === 0 ? ["No SRT cues parsed."] : [],
  };
}

export function importVtt(raw: string): MmTranscript {
  const withoutHeader = raw.replace(/^\uFEFF?WEBVTT[^\n]*\n+/i, "");
  // Reuse SRT-like block parsing (VTT allows similar --> timing)
  const asSrt = importSrt(withoutHeader);
  asSrt.source = "vtt";
  return asSrt;
}

export function importTranscriptAuto(raw: string): MmTranscript {
  const trimmed = raw.trim();
  if (!trimmed) {
    return emptyTranscript("plain-text");
  }
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    return parsePremiereTranscriptJson(trimmed);
  }
  if (/^WEBVTT/i.test(trimmed)) {
    return importVtt(trimmed);
  }
  if (/-->/.test(trimmed)) {
    return importSrt(trimmed);
  }
  // Plain text → single synthetic segment
  const words = trimmed.split(/\s+/).filter(Boolean);
  const duration = Math.max(4, words.length * 0.4);
  const step = duration / Math.max(words.length, 1);
  const mmWords: MmWord[] = words.map((t, i) => ({
    text: t,
    start: i * step,
    end: (i + 1) * step,
    confidence: null,
    eos: /[.!?]$/.test(t),
    type: "word",
    tags: [],
    speakerId: null,
  }));
  return {
    language: "??-??",
    speakers: [],
    segments: [
      {
        id: "plain_1",
        start: 0,
        end: duration,
        language: null,
        speakerId: null,
        text: trimmed,
        words: mmWords,
      },
    ],
    source: "plain-text",
    warnings: ["Imported as plain text (estimated timings)."],
  };
}
