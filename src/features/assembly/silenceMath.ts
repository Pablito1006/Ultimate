/**
 * Pure silence / keep-range math from speech segments (WP9).
 * Synthetic datasets tested in unit tests — no Premiere dependency.
 */

export interface TimeRange {
  start: number;
  end: number;
  kind?: "silence" | "hesitation" | "keep" | "jump";
  label?: string;
}

export interface SilenceDetectOptions {
  /** Minimum gap duration to count as silence (seconds). Default 0.35 */
  minSilenceSeconds?: number;
  /** Timeline start (default 0). */
  timelineStart?: number;
  /** Timeline end — if set, trailing silence after last speech is included. */
  timelineEnd?: number;
  /** Ignore silences shorter than this even if above min (alias). */
  maxKeepGap?: number;
}

/**
 * Detect silence gaps between sorted speech segments.
 * speech: non-overlapping preferred; overlapping merged first.
 */
export function detectSilences(
  speech: Array<{ start: number; end: number }>,
  options: SilenceDetectOptions = {}
): TimeRange[] {
  const minSil = options.minSilenceSeconds ?? 0.35;
  const t0 = options.timelineStart ?? 0;
  const t1 = options.timelineEnd;
  const merged = mergeRanges(speech.map((s) => ({ start: s.start, end: s.end })));
  const silences: TimeRange[] = [];

  let cursor = t0;
  for (const seg of merged) {
    if (seg.start - cursor >= minSil) {
      silences.push({
        start: cursor,
        end: seg.start,
        kind: "silence",
        label: `silence ${(seg.start - cursor).toFixed(2)}s`,
      });
    }
    cursor = Math.max(cursor, seg.end);
  }
  if (t1 !== undefined && t1 - cursor >= minSil) {
    silences.push({
      start: cursor,
      end: t1,
      kind: "silence",
      label: `silence ${(t1 - cursor).toFixed(2)}s`,
    });
  }
  return silences;
}

/** Invert silences → keep ranges (speech + short gaps). */
export function keepRangesFromSpeech(
  speech: Array<{ start: number; end: number }>,
  timelineStart = 0,
  timelineEnd?: number
): TimeRange[] {
  const merged = mergeRanges(speech.map((s) => ({ start: s.start, end: s.end })));
  return merged
    .filter((s) => s.end > timelineStart && (timelineEnd === undefined || s.start < timelineEnd))
    .map((s) => ({
      start: Math.max(timelineStart, s.start),
      end: timelineEnd !== undefined ? Math.min(timelineEnd, s.end) : s.end,
      kind: "keep" as const,
      label: "keep",
    }));
}

export function mergeRanges(ranges: Array<{ start: number; end: number }>): Array<{ start: number; end: number }> {
  const sorted = ranges
    .filter((r) => r.end > r.start)
    .slice()
    .sort((a, b) => a.start - b.start || a.end - b.end);
  if (sorted.length === 0) {
    return [];
  }
  const out: Array<{ start: number; end: number }> = [{ ...sorted[0] }];
  for (let i = 1; i < sorted.length; i += 1) {
    const last = out[out.length - 1];
    const cur = sorted[i];
    if (cur.start <= last.end + 1e-6) {
      last.end = Math.max(last.end, cur.end);
    } else {
      out.push({ ...cur });
    }
  }
  return out;
}

/** Total silence duration. */
export function totalDuration(ranges: TimeRange[]): number {
  return ranges.reduce((s, r) => s + Math.max(0, r.end - r.start), 0);
}

/** Clips entirely contained in any silence range (candidates for ripple remove). */
export function clipsFullyInRanges(
  clips: Array<{ id: string; start: number; end: number; name: string; trackIndex: number }>,
  ranges: TimeRange[]
): typeof clips {
  return clips.filter((c) =>
    ranges.some((r) => c.start >= r.start - 1e-3 && c.end <= r.end + 1e-3)
  );
}
