/**
 * Honest capability matrix for WP6 speed / time features.
 * Write paths are unavailable until Adobe exposes setSpeed / time-remap actions.
 */

export type SpeedFeatureId =
  | "speed.read"
  | "speed.reverseRead"
  | "speed.writeConstant"
  | "speed.writeReverse"
  | "speed.rampWrite"
  | "speed.timeRemapDetect"
  | "speed.preserveAudioPitch"
  | "speed.durationMath"
  | "speed.previewCurve";

export interface SpeedFeatureStatus {
  id: SpeedFeatureId;
  status: "available" | "partial" | "unavailable";
  reason: string;
}

/**
 * Static honesty matrix. Optional runtime hint: whether getSpeed exists on a sample item.
 */
export function getSpeedFeatureStatus(hints?: {
  hasGetSpeed?: boolean;
  hasIsSpeedReversed?: boolean;
  hasSetSpeedAction?: boolean;
}): SpeedFeatureStatus[] {
  const canRead = hints?.hasGetSpeed !== false;
  const canReadReverse = hints?.hasIsSpeedReversed !== false;
  const canWrite = Boolean(hints?.hasSetSpeedAction);

  return [
    {
      id: "speed.read",
      status: canRead ? "available" : "unavailable",
      reason: canRead
        ? "VideoClipTrackItem.getSpeed / AudioClipTrackItem.getSpeed (Since 25.6)"
        : "getSpeed not present on track item",
    },
    {
      id: "speed.reverseRead",
      status: canReadReverse ? "available" : "unavailable",
      reason: canReadReverse
        ? "isSpeedReversed (Since 25.6)"
        : "isSpeedReversed not present",
    },
    {
      id: "speed.writeConstant",
      status: canWrite ? "partial" : "unavailable",
      reason: canWrite
        ? "Experimental setSpeed action detected — verify after write"
        : "No createSetSpeedAction / setSpeed in UXP reference or @adobe/premierepro — repli Speed/Duration manuel",
    },
    {
      id: "speed.writeReverse",
      status: "unavailable",
      reason: "No API to toggle reverse — Clip → Speed/Duration in Premiere",
    },
    {
      id: "speed.rampWrite",
      status: "unavailable",
      reason: "Time Remapping / speed keyframes not exposed in UXP",
    },
    {
      id: "speed.timeRemapDetect",
      status: "partial",
      reason:
        "API returns a single scalar getSpeed — non-1.0 / reversed flagged; true variable curves not distinguishable",
    },
    {
      id: "speed.preserveAudioPitch",
      status: "unavailable",
      reason: "Maintain Audio Pitch not exposed in UXP",
    },
    {
      id: "speed.durationMath",
      status: "available",
      reason: "Pure MasterMotion math (exact durations / means)",
    },
    {
      id: "speed.previewCurve",
      status: "available",
      reason: "Aperçu B SVG déterministe (mêmes samples que le plan)",
    },
  ];
}

/** Whether apply() may mutate Premiere for this plan mode. */
export function canApplySpeedWrite(): boolean {
  return getSpeedFeatureStatus().some(
    (f) => f.id === "speed.writeConstant" && f.status !== "unavailable"
  );
}
