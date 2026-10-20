/**
 * Pure audio planning math for WP8 (gain, ducking, fades).
 * Volume values are in dB (0 = unity), matching typical Premiere Volume Level params.
 */

export interface SpeechSegment {
  start: number;
  end: number;
}

export interface VolumeKeyframe {
  timeSeconds: number;
  /** dB */
  valueDb: number;
}

export type LoudnessPlatform = "youtube" | "podcast" | "broadcast" | "custom";

/** Common delivery targets (LUFS integrated). Measurement itself is unavailable in UXP. */
export const PLATFORM_LUFS_TARGETS: Record<Exclude<LoudnessPlatform, "custom">, number> = {
  youtube: -14,
  podcast: -16,
  broadcast: -23,
};

/**
 * Gain to apply when user provides an external loudness measurement.
 * gainDb = targetLufs − measuredLufs
 */
export function gainDbFromLufs(measuredLufs: number, targetLufs: number): number {
  return targetLufs - measuredLufs;
}

export function resolveTargetLufs(
  platform: LoudnessPlatform,
  customTarget?: number
): number {
  if (platform === "custom") {
    return customTarget ?? -14;
  }
  return PLATFORM_LUFS_TARGETS[platform];
}

/**
 * Build ducking keyframes for a music clip over speech segments.
 * Times are absolute sequence seconds; clipped to [clipStart, clipEnd].
 */
export function buildDuckingKeyframes(
  clipStart: number,
  clipEnd: number,
  speech: SpeechSegment[],
  opts?: {
    baseDb?: number;
    duckDb?: number;
    attack?: number;
    release?: number;
  }
): VolumeKeyframe[] {
  const baseDb = opts?.baseDb ?? 0;
  const duckDb = opts?.duckDb ?? -12;
  const attack = Math.max(0.01, opts?.attack ?? 0.15);
  const release = Math.max(0.01, opts?.release ?? 0.3);
  const duration = clipEnd - clipStart;
  if (!(duration > 0)) {
    return [];
  }

  const overlapping = speech
    .map((s) => ({
      start: Math.max(clipStart, s.start),
      end: Math.min(clipEnd, s.end),
    }))
    .filter((s) => s.end - s.start > 0.02)
    .sort((a, b) => a.start - b.start);

  const keys: VolumeKeyframe[] = [{ timeSeconds: clipStart, valueDb: baseDb }];

  for (const seg of overlapping) {
    const downAt = Math.max(clipStart, seg.start - attack);
    const flatStart = seg.start;
    const flatEnd = seg.end;
    const upAt = Math.min(clipEnd, seg.end + release);

    keys.push({ timeSeconds: downAt, valueDb: baseDb });
    keys.push({ timeSeconds: flatStart, valueDb: duckDb });
    keys.push({ timeSeconds: flatEnd, valueDb: duckDb });
    keys.push({ timeSeconds: upAt, valueDb: baseDb });
  }

  keys.push({ timeSeconds: clipEnd, valueDb: baseDb });
  return dedupeSortKeyframes(keys);
}

/**
 * Fade in/out keyframes relative to clip bounds.
 */
export function buildFadeKeyframes(
  clipStart: number,
  clipEnd: number,
  fadeInSeconds: number,
  fadeOutSeconds: number,
  floorDb = -60,
  peakDb = 0
): VolumeKeyframe[] {
  const dur = clipEnd - clipStart;
  if (!(dur > 0)) {
    return [];
  }
  const fi = Math.max(0, Math.min(fadeInSeconds, dur / 2));
  const fo = Math.max(0, Math.min(fadeOutSeconds, dur / 2));
  const keys: VolumeKeyframe[] = [];

  if (fi > 0) {
    keys.push({ timeSeconds: clipStart, valueDb: floorDb });
    keys.push({ timeSeconds: clipStart + fi, valueDb: peakDb });
  } else {
    keys.push({ timeSeconds: clipStart, valueDb: peakDb });
  }

  if (fo > 0) {
    keys.push({ timeSeconds: clipEnd - fo, valueDb: peakDb });
    keys.push({ timeSeconds: clipEnd, valueDb: floorDb });
  } else {
    keys.push({ timeSeconds: clipEnd, valueDb: peakDb });
  }

  return dedupeSortKeyframes(keys);
}

export function dedupeSortKeyframes(keys: VolumeKeyframe[], epsilon = 1e-4): VolumeKeyframe[] {
  const sorted = keys.slice().sort((a, b) => a.timeSeconds - b.timeSeconds);
  const out: VolumeKeyframe[] = [];
  for (const k of sorted) {
    const last = out[out.length - 1];
    if (last && Math.abs(last.timeSeconds - k.timeSeconds) <= epsilon) {
      last.valueDb = k.valueDb;
    } else {
      out.push({ ...k });
    }
  }
  return out;
}

/** Sample curve for preview B (t normalized 0–1 over clip). */
export function sampleVolumeCurve(
  keys: VolumeKeyframe[],
  clipStart: number,
  clipEnd: number,
  sampleCount = 33
): Array<{ t: number; value: number }> {
  const dur = Math.max(1e-6, clipEnd - clipStart);
  const samples: Array<{ t: number; value: number }> = [];
  for (let i = 0; i < sampleCount; i += 1) {
    const t = i / (sampleCount - 1);
    const time = clipStart + t * dur;
    samples.push({ t, value: interpolateDb(keys, time) });
  }
  return samples;
}

function interpolateDb(keys: VolumeKeyframe[], time: number): number {
  if (keys.length === 0) {
    return 0;
  }
  if (time <= keys[0].timeSeconds) {
    return keys[0].valueDb;
  }
  const last = keys[keys.length - 1];
  if (time >= last.timeSeconds) {
    return last.valueDb;
  }
  for (let i = 0; i < keys.length - 1; i += 1) {
    const a = keys[i];
    const b = keys[i + 1];
    if (time >= a.timeSeconds && time <= b.timeSeconds) {
      const u = (time - a.timeSeconds) / Math.max(1e-9, b.timeSeconds - a.timeSeconds);
      return a.valueDb + (b.valueDb - a.valueDb) * u;
    }
  }
  return last.valueDb;
}
