/** Internal MasterMotion transcript model (normalized from Premiere JSON). */

export interface MmSpeaker {
  id: string;
  name: string;
}

export interface MmWord {
  text: string;
  start: number;
  end: number;
  confidence: number | null;
  eos: boolean;
  type: "word" | "punctuation" | "unknown";
  tags: string[];
  speakerId: string | null;
}

export interface MmSegment {
  id: string;
  start: number;
  end: number;
  language: string | null;
  speakerId: string | null;
  text: string;
  words: MmWord[];
}

export interface MmTranscript {
  language: string;
  speakers: MmSpeaker[];
  segments: MmSegment[];
  /** Provenance for honesty in UI. */
  source: "premiere-json" | "srt" | "vtt" | "plain-text" | "mock";
  warnings: string[];
}

export function emptyTranscript(source: MmTranscript["source"] = "plain-text"): MmTranscript {
  return {
    language: "??-??",
    speakers: [],
    segments: [],
    source,
    warnings: [],
  };
}

export function flattenWords(transcript: MmTranscript): MmWord[] {
  const out: MmWord[] = [];
  for (let s = 0; s < transcript.segments.length; s += 1) {
    const words = transcript.segments[s].words;
    for (let w = 0; w < words.length; w += 1) {
      out.push(words[w]);
    }
  }
  return out;
}
