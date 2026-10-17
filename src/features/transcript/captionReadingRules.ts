import type { MmSegment, MmTranscript, MmWord } from "./transcriptModel";

export interface CaptionReadingOptions {
  maxCharsPerLine?: number;
  maxLines?: number;
  maxCharsPerSecond?: number;
  minDurationSec?: number;
  maxDurationSec?: number;
  removeFillers?: boolean;
  capitalizeSentences?: boolean;
  customVocabulary?: Record<string, string>;
}

export interface CaptionCue {
  id: string;
  start: number;
  end: number;
  lines: string[];
  text: string;
  words: MmWord[];
}

export const DEFAULT_READING_OPTIONS: Required<CaptionReadingOptions> = {
  maxCharsPerLine: 42,
  maxLines: 2,
  maxCharsPerSecond: 17,
  minDurationSec: 0.8,
  maxDurationSec: 7,
  removeFillers: false,
  capitalizeSentences: true,
  customVocabulary: {},
};

const DEFAULT_FILLERS = new Set([
  "um",
  "uh",
  "uhm",
  "ah",
  "er",
  "eh",
  "hmm",
  "euh",
  "ben",
  "bah",
]);

function applyVocabulary(text: string, vocab: Record<string, string>): string {
  const keys = Object.keys(vocab);
  let out = text;
  for (let i = 0; i < keys.length; i += 1) {
    const from = keys[i];
    if (!from) {
      continue;
    }
    const to = vocab[from];
    // Case-insensitive whole-word-ish replace
    const re = new RegExp(`\\b${escapeRegExp(from)}\\b`, "gi");
    out = out.replace(re, to);
  }
  return out;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function capitalizeText(text: string): string {
  if (!text) {
    return text;
  }
  return text.replace(/(^\s*[a-zà-öø-ÿ])|([.!?…]\s+[a-zà-öø-ÿ])/g, (m) => m.toUpperCase());
}

function filterWords(words: MmWord[], removeFillers: boolean): MmWord[] {
  if (!removeFillers) {
    return words.slice();
  }
  return words.filter((w) => {
    if (w.tags.includes("filler")) {
      return false;
    }
    const bare = w.text.replace(/[^a-zA-ZÀ-öø-ÿ0-9']/gi, "").toLowerCase();
    return !DEFAULT_FILLERS.has(bare);
  });
}

function joinWords(words: MmWord[]): string {
  let out = "";
  for (let i = 0; i < words.length; i += 1) {
    const w = words[i];
    if (w.type === "punctuation" || /^[.,!?;:…]/.test(w.text)) {
      out += w.text;
    } else if (!out) {
      out = w.text;
    } else {
      out += ` ${w.text}`;
    }
  }
  return out.trim();
}

/**
 * Split a word list into ≤ maxLines lines of ≤ maxChars each (greedy, prefers spaces).
 */
export function wrapLines(text: string, maxChars: number, maxLines: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return [];
  }
  const lines: string[] = [];
  let current = "";
  for (let i = 0; i < words.length; i += 1) {
    const next = current ? `${current} ${words[i]}` : words[i];
    if (next.length > maxChars && current) {
      lines.push(current);
      current = words[i];
      if (lines.length >= maxLines) {
        // Overflow: append remaining to last line (honest — caller may warn)
        const rest = [current].concat(words.slice(i + 1)).join(" ");
        lines[lines.length - 1] = `${lines[lines.length - 1]} ${rest}`.trim();
        return lines.slice(0, maxLines);
      }
    } else {
      current = next;
    }
  }
  if (current) {
    if (lines.length >= maxLines) {
      lines[lines.length - 1] = `${lines[lines.length - 1]} ${current}`.trim();
    } else {
      lines.push(current);
    }
  }
  return lines.slice(0, maxLines);
}

function enforceDuration(
  start: number,
  end: number,
  charCount: number,
  opts: Required<CaptionReadingOptions>
): { start: number; end: number } {
  const s = start;
  let e = end;
  let dur = Math.max(0, e - s);
  const minByRate = charCount > 0 ? charCount / opts.maxCharsPerSecond : opts.minDurationSec;
  const targetMin = Math.max(opts.minDurationSec, minByRate);
  if (dur < targetMin) {
    e = s + targetMin;
    dur = targetMin;
  }
  if (dur > opts.maxDurationSec) {
    e = s + opts.maxDurationSec;
  }
  return { start: s, end: e };
}

/**
 * Build caption cues from a transcript using broadcast-ish reading rules.
 */
export function buildCaptionCues(
  transcript: MmTranscript,
  options: CaptionReadingOptions = {}
): CaptionCue[] {
  const opts: Required<CaptionReadingOptions> = {
    ...DEFAULT_READING_OPTIONS,
    ...options,
    customVocabulary: {
      ...DEFAULT_READING_OPTIONS.customVocabulary,
      ...(options.customVocabulary ?? {}),
    },
  };

  const cues: CaptionCue[] = [];
  let cueIndex = 0;

  for (let si = 0; si < transcript.segments.length; si += 1) {
    const seg = transcript.segments[si];
    const words = filterWords(seg.words, opts.removeFillers);
    if (words.length === 0) {
      continue;
    }

    // Chunk by max capacity (chars * lines) while respecting word timings
    const capacity = opts.maxCharsPerLine * opts.maxLines;
    let bucket: MmWord[] = [];
    let bucketChars = 0;

    const flush = (): void => {
      if (bucket.length === 0) {
        return;
      }
      let text = joinWords(bucket);
      text = applyVocabulary(text, opts.customVocabulary);
      if (opts.capitalizeSentences) {
        text = capitalizeText(text);
      }
      const lines = wrapLines(text, opts.maxCharsPerLine, opts.maxLines);
      const start = bucket[0].start;
      const end = bucket[bucket.length - 1].end;
      const timed = enforceDuration(start, end, text.replace(/\s/g, "").length, opts);
      cueIndex += 1;
      cues.push({
        id: `cue_${cueIndex}`,
        start: Number(timed.start.toFixed(3)),
        end: Number(timed.end.toFixed(3)),
        lines,
        text: lines.join("\n"),
        words: bucket.slice(),
      });
      bucket = [];
      bucketChars = 0;
    };

    for (let wi = 0; wi < words.length; wi += 1) {
      const w = words[wi];
      const addLen = w.text.length + (bucketChars > 0 ? 1 : 0);
      const wouldExceed = bucketChars + addLen > capacity && bucket.length > 0;
      const eosBreak = w.eos && bucket.length > 0;
      if (wouldExceed || (eosBreak && bucketChars > opts.maxCharsPerLine * 0.5)) {
        flush();
      }
      bucket.push(w);
      bucketChars += addLen;
      if (w.eos) {
        flush();
      }
    }
    flush();
  }

  // Ensure non-overlapping chronological order
  cues.sort((a, b) => a.start - b.start || a.end - b.end);
  for (let i = 1; i < cues.length; i += 1) {
    if (cues[i].start < cues[i - 1].end) {
      cues[i].start = cues[i - 1].end;
      if (cues[i].end <= cues[i].start) {
        cues[i].end = cues[i].start + opts.minDurationSec;
      }
    }
  }

  return cues;
}

/** Convert cues back to simple MmSegments for marker apply / SRT. */
export function cuesToSegments(cues: CaptionCue[]): MmSegment[] {
  return cues.map((cue) => ({
    id: cue.id,
    start: cue.start,
    end: cue.end,
    language: null,
    speakerId: cue.words[0]?.speakerId ?? null,
    text: cue.lines.join(" "),
    words: cue.words,
  }));
}
