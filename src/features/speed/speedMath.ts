/**
 * Pure speed / duration math for WP6.
 * Speed is a playback ratio: 1 = 100 %, 2 = 200 %, 0.5 = 50 %.
 * Matches VideoClipTrackItem.getSpeed() convention (Adobe typings + fakePremiere).
 */

export interface ConstantSpeedResult {
  mediaSeconds: number;
  currentSpeed: number;
  targetSpeed: number;
  currentDuration: number;
  resultingDuration: number;
  durationDelta: number;
}

export interface TargetDurationResult {
  mediaSeconds: number;
  currentSpeed: number;
  currentDuration: number;
  targetDuration: number;
  resultingSpeed: number;
}

/**
 * Media span covered by a clip at constant speed.
 * mediaSeconds = sequenceDuration * speed
 */
export function mediaSecondsFromDuration(sequenceDuration: number, speed: number): number {
  if (!(sequenceDuration > 0) || !(speed > 0)) {
    return 0;
  }
  return sequenceDuration * speed;
}

/**
 * Resulting sequence duration after a constant speed change (same media in/out).
 * newDuration = currentDuration * (currentSpeed / targetSpeed)
 */
export function resultingDurationConstant(
  currentDuration: number,
  currentSpeed: number,
  targetSpeed: number
): ConstantSpeedResult {
  const safeCurrent = currentSpeed > 0 ? currentSpeed : 1;
  const safeTarget = targetSpeed > 0 ? targetSpeed : 1;
  const mediaSeconds = mediaSecondsFromDuration(currentDuration, safeCurrent);
  const resultingDuration = mediaSeconds / safeTarget;
  return {
    mediaSeconds,
    currentSpeed: safeCurrent,
    targetSpeed: safeTarget,
    currentDuration,
    resultingDuration,
    durationDelta: resultingDuration - currentDuration,
  };
}

/**
 * Speed required to fit the same media into a target sequence duration.
 */
export function speedForTargetDuration(
  currentDuration: number,
  currentSpeed: number,
  targetDuration: number
): TargetDurationResult {
  const safeCurrent = currentSpeed > 0 ? currentSpeed : 1;
  const mediaSeconds = mediaSecondsFromDuration(currentDuration, safeCurrent);
  const safeTargetDur = targetDuration > 0 ? targetDuration : currentDuration;
  const resultingSpeed = mediaSeconds / safeTargetDur;
  return {
    mediaSeconds,
    currentSpeed: safeCurrent,
    currentDuration,
    targetDuration: safeTargetDur,
    resultingSpeed,
  };
}

/**
 * Mean of a speed curve sampled on [0, 1] (trapezoidal rule).
 * samples: pairs { u, speed } with u sorted ascending in [0, 1].
 */
export function meanSpeedFromSamples(samples: Array<{ u: number; speed: number }>): number {
  if (samples.length === 0) {
    return 1;
  }
  if (samples.length === 1) {
    return samples[0].speed > 0 ? samples[0].speed : 1;
  }
  let area = 0;
  for (let i = 0; i < samples.length - 1; i += 1) {
    const a = samples[i];
    const b = samples[i + 1];
    const du = b.u - a.u;
    if (du <= 0) {
      continue;
    }
    area += ((a.speed + b.speed) / 2) * du;
  }
  const span = samples[samples.length - 1].u - samples[0].u;
  if (span <= 0) {
    return samples[0].speed > 0 ? samples[0].speed : 1;
  }
  const mean = area / span;
  return mean > 0 ? mean : 1;
}

/**
 * Resulting duration for a variable-speed ramp over the same media span.
 * newDuration = mediaSeconds / mean(speed)
 */
export function resultingDurationRamp(
  currentDuration: number,
  currentSpeed: number,
  samples: Array<{ u: number; speed: number }>
): ConstantSpeedResult {
  const safeCurrent = currentSpeed > 0 ? currentSpeed : 1;
  const mediaSeconds = mediaSecondsFromDuration(currentDuration, safeCurrent);
  const mean = meanSpeedFromSamples(samples);
  const resultingDuration = mediaSeconds / mean;
  return {
    mediaSeconds,
    currentSpeed: safeCurrent,
    targetSpeed: mean,
    currentDuration,
    resultingDuration,
    durationDelta: resultingDuration - currentDuration,
  };
}

/** Percent display helper (1 → 100). */
export function speedToPercent(speed: number): number {
  return Math.round(speed * 10000) / 100;
}

export function percentToSpeed(percent: number): number {
  return percent / 100;
}
