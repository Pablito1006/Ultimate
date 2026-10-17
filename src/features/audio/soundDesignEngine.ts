export type TimelineEventType =
  | "cut"
  | "clip-start"
  | "clip-end"
  | "marker"
  | "transition"
  | "template-insert";

export interface TimelineEvent {
  id: string;
  type: TimelineEventType;
  time: number;
  label?: string;
  trackIndex?: number;
}

export interface SfxCatalogItem {
  id: string;
  name: string;
  tags: string[];
  suggestedFor: TimelineEventType[];
}

export interface SoundSuggestion {
  eventId: string;
  eventType: TimelineEventType;
  time: number;
  sfxId: string;
  sfxName: string;
  score: number;
  reason: string;
}

export const DEFAULT_SFX_CATALOG: SfxCatalogItem[] = [
  { id: "whoosh-soft", name: "Soft Whoosh", tags: ["transition", "cut"], suggestedFor: ["cut", "transition", "clip-start"] },
  { id: "whoosh-hard", name: "Hard Whoosh", tags: ["transition"], suggestedFor: ["cut", "transition"] },
  { id: "impact-low", name: "Low Impact", tags: ["impact"], suggestedFor: ["clip-start", "template-insert", "marker"] },
  { id: "click-ui", name: "UI Click", tags: ["ui"], suggestedFor: ["marker", "template-insert"] },
  { id: "riser-short", name: "Short Riser", tags: ["riser"], suggestedFor: ["clip-end", "transition"] },
  { id: "sub-drop", name: "Sub Drop", tags: ["bass"], suggestedFor: ["clip-start", "template-insert"] },
];

export function scoreSoundSuggestion(
  event: TimelineEvent,
  sfx: SfxCatalogItem
): { score: number; reason: string } {
  let score = 0;
  const reasons: string[] = [];

  if (sfx.suggestedFor.indexOf(event.type) >= 0) {
    score += 0.6;
    reasons.push(`matches ${event.type}`);
  }
  if (event.type === "cut" && sfx.tags.indexOf("transition") >= 0) {
    score += 0.25;
    reasons.push("transition tag");
  }
  if (event.type === "marker" && sfx.tags.indexOf("ui") >= 0) {
    score += 0.2;
    reasons.push("marker/ui");
  }
  if (event.label && sfx.name.toLowerCase().indexOf("impact") >= 0) {
    score += 0.1;
    reasons.push("label boost");
  }

  return {
    score: Math.min(1, Number(score.toFixed(3))),
    reason: reasons.join(", ") || "low match",
  };
}

export function suggestSoundEffects(
  events: TimelineEvent[],
  catalog: SfxCatalogItem[] = DEFAULT_SFX_CATALOG,
  minScore = 0.5
): SoundSuggestion[] {
  const suggestions: SoundSuggestion[] = [];

  for (let ei = 0; ei < events.length; ei += 1) {
    const event = events[ei];
    let best: SoundSuggestion | null = null;
    for (let si = 0; si < catalog.length; si += 1) {
      const sfx = catalog[si];
      const scored = scoreSoundSuggestion(event, sfx);
      if (scored.score < minScore) {
        continue;
      }
      const candidate: SoundSuggestion = {
        eventId: event.id,
        eventType: event.type,
        time: event.time,
        sfxId: sfx.id,
        sfxName: sfx.name,
        score: scored.score,
        reason: scored.reason,
      };
      if (!best || candidate.score > best.score) {
        best = candidate;
      }
    }
    if (best) {
      suggestions.push(best);
    }
  }

  return suggestions.sort((a, b) => a.time - b.time || b.score - a.score);
}

/**
 * Derive timeline events from clip boundaries (cuts ≈ consecutive ends/starts).
 */
export function eventsFromClipBounds(
  clips: Array<{ id: string; start: number; end: number; trackIndex: number; name: string }>
): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  for (let i = 0; i < clips.length; i += 1) {
    const clip = clips[i];
    events.push({
      id: `${clip.id}_start`,
      type: "clip-start",
      time: clip.start,
      label: clip.name,
      trackIndex: clip.trackIndex,
    });
    events.push({
      id: `${clip.id}_end`,
      type: "clip-end",
      time: clip.end,
      label: clip.name,
      trackIndex: clip.trackIndex,
    });
  }

  const sorted = clips.slice().sort((a, b) => a.start - b.start || a.trackIndex - b.trackIndex);
  for (let i = 1; i < sorted.length; i += 1) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    if (Math.abs(curr.start - prev.end) < 0.05 && curr.trackIndex === prev.trackIndex) {
      events.push({
        id: `cut_${prev.id}_${curr.id}`,
        type: "cut",
        time: curr.start,
        label: `${prev.name} → ${curr.name}`,
        trackIndex: curr.trackIndex,
      });
    }
  }

  return events.sort((a, b) => a.time - b.time);
}
