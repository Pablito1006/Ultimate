export interface CleanupPlanRow {
  id: string;
  kind: "disabled-clip" | "empty-track" | "note";
  label: string;
  trackIndex?: number;
  trackKind?: "video" | "audio";
  clipName?: string;
  start?: number;
  /** Can we mutate via API? */
  actionable: boolean;
  action: "remove" | "report" | "enable";
}

/**
 * Build cleanup candidates from timeline analysis fields.
 * Empty track deletion is not exposed → report only.
 */
export function planSequenceCleanup(input: {
  videoTrackCount: number;
  audioTrackCount: number;
  clips: Array<{
    id: string;
    name: string;
    trackIndex: number;
    trackKind: "video" | "audio";
    start: number;
    end: number;
    disabled?: boolean;
  }>;
}): CleanupPlanRow[] {
  const rows: CleanupPlanRow[] = [];
  const videoUsed = new Set(
    input.clips.filter((c) => c.trackKind === "video").map((c) => c.trackIndex)
  );
  const audioUsed = new Set(
    input.clips.filter((c) => c.trackKind === "audio").map((c) => c.trackIndex)
  );

  for (let v = 0; v < input.videoTrackCount; v += 1) {
    if (!videoUsed.has(v)) {
      rows.push({
        id: `empty-v-${v}`,
        kind: "empty-track",
        label: `Video track ${v} empty`,
        trackIndex: v,
        trackKind: "video",
        actionable: false,
        action: "report",
      });
    }
  }
  for (let a = 0; a < input.audioTrackCount; a += 1) {
    if (!audioUsed.has(a)) {
      rows.push({
        id: `empty-a-${a}`,
        kind: "empty-track",
        label: `Audio track ${a} empty`,
        trackIndex: a,
        trackKind: "audio",
        actionable: false,
        action: "report",
      });
    }
  }

  for (const c of input.clips) {
    if (c.disabled) {
      rows.push({
        id: c.id,
        kind: "disabled-clip",
        label: `Disabled: ${c.name}`,
        trackIndex: c.trackIndex,
        trackKind: c.trackKind,
        clipName: c.name,
        start: c.start,
        actionable: true,
        action: "remove",
      });
    }
  }

  if (rows.length === 0) {
    rows.push({
      id: "clean",
      kind: "note",
      label: "Nothing to clean",
      actionable: false,
      action: "report",
    });
  }
  return rows;
}
