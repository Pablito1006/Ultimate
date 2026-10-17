import type { TimelineAnalysis } from "./TimelineService";

interface CacheEntry {
  key: string;
  analysis: TimelineAnalysis;
  storedAt: number;
}

/**
 * In-memory timeline analysis cache (D6).
 * Invalidate explicitly after mutations or via invalidateAll / invalidateSequence.
 */
export class TimelineCache {
  private entry: CacheEntry | null = null;
  private readonly ttlMs: number;

  constructor(ttlMs = 2000) {
    this.ttlMs = ttlMs;
  }

  buildKey(sequenceGuid: string, sequenceName: string): string {
    return `${sequenceGuid}::${sequenceName}`;
  }

  get(key: string, now = Date.now()): TimelineAnalysis | null {
    if (!this.entry || this.entry.key !== key) {
      return null;
    }
    if (now - this.entry.storedAt > this.ttlMs) {
      this.entry = null;
      return null;
    }
    return this.entry.analysis;
  }

  set(key: string, analysis: TimelineAnalysis, now = Date.now()): void {
    this.entry = { key, analysis, storedAt: now };
  }

  invalidateSequence(sequenceGuid: string): void {
    if (this.entry && this.entry.key.startsWith(`${sequenceGuid}::`)) {
      this.entry = null;
    }
  }

  invalidateAll(): void {
    this.entry = null;
  }
}

export const timelineCache = new TimelineCache();
