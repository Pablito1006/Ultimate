import type { TranscriptSegment, TranscriptWord } from "./transcriptionTypes";

/**
 * Split plain text into timed segments (estimate when no STT timestamps).
 */
export function parseTranscript(
  text: string,
  durationSeconds: number,
  maxChars = 42
): TranscriptSegment[] {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) {
    return [];
  }

  const words = cleaned.split(" ").filter(Boolean);
  const chunks: string[] = [];
  let current = "";

  for (let i = 0; i < words.length; i += 1) {
    const next = current ? `${current} ${words[i]}` : words[i];
    if (next.length > maxChars && current) {
      chunks.push(current);
      current = words[i];
    } else {
      current = next;
    }
  }
  if (current) {
    chunks.push(current);
  }

  const totalChars = chunks.reduce((sum, c) => sum + c.length, 0) || 1;
  const safeDuration = Math.max(durationSeconds, chunks.length * 1.2);
  let cursor = 0;
  const segments: TranscriptSegment[] = [];

  for (let i = 0; i < chunks.length; i += 1) {
    const chunk = chunks[i];
    const share = chunk.length / totalChars;
    const span = Math.max(1.0, share * safeDuration);
    const start = cursor;
    const end = i === chunks.length - 1 ? safeDuration : cursor + span;
    const wordTokens = chunk.split(" ");
    const wordSpan = (end - start) / Math.max(wordTokens.length, 1);
    const wordsTimed: TranscriptWord[] = wordTokens.map((w, wi) => ({
      text: w,
      start: start + wi * wordSpan,
      end: start + (wi + 1) * wordSpan,
    }));

    segments.push({
      id: `seg_${i + 1}`,
      text: chunk,
      start: Number(start.toFixed(3)),
      end: Number(end.toFixed(3)),
      words: wordsTimed,
    });
    cursor = end;
  }

  return segments;
}

export function buildCaptionTimeline(segments: TranscriptSegment[]): TranscriptSegment[] {
  return segments
    .slice()
    .sort((a, b) => a.start - b.start)
    .map((seg, index) => ({
      ...seg,
      id: seg.id || `cap_${index + 1}`,
    }));
}

export function segmentsToSrt(segments: TranscriptSegment[]): string {
  function tc(seconds: number): string {
    const ms = Math.round(seconds * 1000);
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    const milli = ms % 1000;
    const pad = (n: number, w = 2) => String(n).padStart(w, "0");
    return `${pad(h)}:${pad(m)}:${pad(s)},${pad(milli, 3)}`;
  }

  return segments
    .map((seg, i) => `${i + 1}\n${tc(seg.start)} --> ${tc(seg.end)}\n${seg.text}\n`)
    .join("\n");
}
