import type { TimeRange } from "./silenceMath";

export interface JumpCutHit {
  time: number;
  gap: number;
  prevClipId: string;
  nextClipId: string;
  trackIndex: number;
  label: string;
}

/**
 * Detect jump cuts: consecutive clips on same track with small positive gap.
 */
export function detectJumpCuts(
  clips: Array<{ id: string; name: string; start: number; end: number; trackIndex: number }>,
  maxGapSeconds = 0.25
): JumpCutHit[] {
  const byTrack = new Map<number, typeof clips>();
  for (const c of clips) {
    const list = byTrack.get(c.trackIndex) ?? [];
    list.push(c);
    byTrack.set(c.trackIndex, list);
  }
  const hits: JumpCutHit[] = [];
  for (const [, list] of byTrack) {
    const sorted = list.slice().sort((a, b) => a.start - b.start);
    for (let i = 1; i < sorted.length; i += 1) {
      const prev = sorted[i - 1];
      const next = sorted[i];
      const gap = next.start - prev.end;
      if (gap > 1e-4 && gap <= maxGapSeconds) {
        hits.push({
          time: next.start,
          gap,
          prevClipId: prev.id,
          nextClipId: next.id,
          trackIndex: next.trackIndex,
          label: `${prev.name} → ${next.name}`,
        });
      }
    }
  }
  return hits.sort((a, b) => a.time - b.time);
}

export function jumpCutsToRanges(hits: JumpCutHit[]): TimeRange[] {
  return hits.map((h) => ({
    start: h.time,
    end: h.time + Math.max(0.05, h.gap),
    kind: "jump" as const,
    label: h.label,
  }));
}
