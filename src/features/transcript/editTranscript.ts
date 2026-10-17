import type { MmSegment, MmTranscript, MmWord } from "./transcriptModel";

function cloneTranscript(t: MmTranscript): MmTranscript {
  return JSON.parse(JSON.stringify(t)) as MmTranscript;
}

function rebuildSegmentText(seg: MmSegment): void {
  let out = "";
  for (let i = 0; i < seg.words.length; i += 1) {
    const w = seg.words[i];
    if (w.type === "punctuation" || /^[.,!?;:…]/.test(w.text)) {
      out += w.text;
    } else if (!out) {
      out = w.text;
    } else {
      out += ` ${w.text}`;
    }
  }
  seg.text = out.trim();
  if (seg.words.length > 0) {
    seg.start = seg.words[0].start;
    seg.end = seg.words[seg.words.length - 1].end;
  }
}

/** Correct a single word by segment/word index. */
export function correctWord(
  transcript: MmTranscript,
  segmentIndex: number,
  wordIndex: number,
  newText: string
): MmTranscript {
  const next = cloneTranscript(transcript);
  const seg = next.segments[segmentIndex];
  if (!seg || !seg.words[wordIndex]) {
    return next;
  }
  seg.words[wordIndex].text = newText;
  rebuildSegmentText(seg);
  return next;
}

/** Global find/replace on word text (case-insensitive whole word). */
export function replaceAllWords(
  transcript: MmTranscript,
  find: string,
  replace: string
): MmTranscript {
  if (!find) {
    return cloneTranscript(transcript);
  }
  const next = cloneTranscript(transcript);
  const re = new RegExp(`^${find.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");
  for (let s = 0; s < next.segments.length; s += 1) {
    const seg = next.segments[s];
    for (let w = 0; w < seg.words.length; w += 1) {
      if (re.test(seg.words[w].text)) {
        seg.words[w].text = replace;
      }
    }
    rebuildSegmentText(seg);
  }
  return next;
}

/** Merge segment i with i+1. */
export function mergeSegments(transcript: MmTranscript, segmentIndex: number): MmTranscript {
  const next = cloneTranscript(transcript);
  if (segmentIndex < 0 || segmentIndex >= next.segments.length - 1) {
    return next;
  }
  const a = next.segments[segmentIndex];
  const b = next.segments[segmentIndex + 1];
  a.words = a.words.concat(b.words);
  rebuildSegmentText(a);
  next.segments.splice(segmentIndex + 1, 1);
  return next;
}

/** Split segment at word index (word becomes start of new segment). */
export function splitSegment(
  transcript: MmTranscript,
  segmentIndex: number,
  wordIndex: number
): MmTranscript {
  const next = cloneTranscript(transcript);
  const seg = next.segments[segmentIndex];
  if (!seg || wordIndex <= 0 || wordIndex >= seg.words.length) {
    return next;
  }
  const leftWords = seg.words.slice(0, wordIndex);
  const rightWords = seg.words.slice(wordIndex);
  const left: MmSegment = { ...seg, id: `${seg.id}_a`, words: leftWords, text: "" };
  const right: MmSegment = {
    ...seg,
    id: `${seg.id}_b`,
    words: rightWords,
    text: "",
    speakerId: rightWords[0]?.speakerId ?? seg.speakerId,
  };
  rebuildSegmentText(left);
  rebuildSegmentText(right);
  next.segments.splice(segmentIndex, 1, left, right);
  return next;
}

/** Apply custom vocabulary map once. */
export function applyVocabulary(
  transcript: MmTranscript,
  vocab: Record<string, string>
): MmTranscript {
  const keys = Object.keys(vocab);
  let next = cloneTranscript(transcript);
  for (let i = 0; i < keys.length; i += 1) {
    next = replaceAllWords(next, keys[i], vocab[keys[i]]);
  }
  return next;
}

export function setWordConfidence(
  transcript: MmTranscript,
  segmentIndex: number,
  wordIndex: number,
  confidence: number
): MmTranscript {
  const next = cloneTranscript(transcript);
  const word: MmWord | undefined = next.segments[segmentIndex]?.words[wordIndex];
  if (word) {
    word.confidence = Math.max(0, Math.min(1, confidence));
  }
  return next;
}
