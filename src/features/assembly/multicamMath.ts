export interface MulticamRenameRow {
  clipId: string;
  clipName: string;
  trackIndex: number;
  start: number;
  before: string;
  after: string;
}

/**
 * Rename clips by camera/track: CamA, CamB, … or custom prefix.
 */
export function planMulticamRename(
  clips: Array<{ id: string; name: string; trackIndex: number; start: number }>,
  opts?: { prefix?: string; trackKindFilter?: "video" | "all" }
): MulticamRenameRow[] {
  const prefix = opts?.prefix ?? "Cam";
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  return clips.map((c) => {
    const cam =
      c.trackIndex < letters.length ? letters[c.trackIndex] : String(c.trackIndex + 1);
    const after = `${prefix}${cam}_${c.name.replace(/^Cam[A-Z]_/, "")}`;
    return {
      clipId: c.id,
      clipName: c.name,
      trackIndex: c.trackIndex,
      start: c.start,
      before: c.name,
      after,
    };
  });
}

export interface AlignToMarkerPlan {
  clipId: string;
  clipName: string;
  trackIndex: number;
  start: number;
  markerTime: number;
  /** Delta to apply via createMoveAction (seconds). */
  deltaSeconds: number;
}

/**
 * Align clip starts to a marker time (same absolute start).
 */
export function planAlignToMarker(
  clips: Array<{ id: string; name: string; trackIndex: number; start: number }>,
  markerTime: number
): AlignToMarkerPlan[] {
  return clips.map((c) => ({
    clipId: c.id,
    clipName: c.name,
    trackIndex: c.trackIndex,
    start: c.start,
    markerTime,
    deltaSeconds: markerTime - c.start,
  }));
}
