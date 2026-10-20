import type { SfxCatalogItem, TimelineEventType } from "./soundDesignEngine";
import { DEFAULT_SFX_CATALOG } from "./soundDesignEngine";

/**
 * Build ≥100 local SFX catalog entries (metadata only — no binary audio in repo).
 * License: see assets/sfx/LICENSE.md (CC0 placeholders / user library path).
 */
const FAMILIES: Array<{
  prefix: string;
  name: string;
  tags: string[];
  suggestedFor: TimelineEventType[];
  count: number;
}> = [
  {
    prefix: "whoosh",
    name: "Whoosh",
    tags: ["transition", "cut"],
    suggestedFor: ["cut", "transition", "clip-start"],
    count: 18,
  },
  {
    prefix: "impact",
    name: "Impact",
    tags: ["impact", "bass"],
    suggestedFor: ["clip-start", "template-insert", "marker"],
    count: 16,
  },
  {
    prefix: "click",
    name: "Click UI",
    tags: ["ui"],
    suggestedFor: ["marker", "template-insert"],
    count: 12,
  },
  {
    prefix: "riser",
    name: "Riser",
    tags: ["riser", "transition"],
    suggestedFor: ["clip-end", "transition"],
    count: 14,
  },
  {
    prefix: "sub",
    name: "Sub Drop",
    tags: ["bass"],
    suggestedFor: ["clip-start", "template-insert"],
    count: 10,
  },
  {
    prefix: "swish",
    name: "Swish",
    tags: ["transition"],
    suggestedFor: ["cut", "transition"],
    count: 12,
  },
  {
    prefix: "hit",
    name: "Hit Soft",
    tags: ["impact"],
    suggestedFor: ["marker", "clip-start"],
    count: 10,
  },
  {
    prefix: "ambient",
    name: "Ambient Bed",
    tags: ["ambient"],
    suggestedFor: ["marker"],
    count: 8,
  },
];

function buildGeneratedCatalog(): SfxCatalogItem[] {
  const items: SfxCatalogItem[] = [];
  for (const fam of FAMILIES) {
    for (let i = 1; i <= fam.count; i += 1) {
      const id = `${fam.prefix}-${String(i).padStart(2, "0")}`;
      items.push({
        id,
        name: `${fam.name} ${i}`,
        tags: fam.tags.slice(),
        suggestedFor: fam.suggestedFor.slice(),
      });
    }
  }
  return items;
}

/** Merged catalog: legacy defaults + generated (≥100 total unique ids). */
export const SFX_CATALOG: SfxCatalogItem[] = (() => {
  const map = new Map<string, SfxCatalogItem>();
  for (const item of DEFAULT_SFX_CATALOG) {
    map.set(item.id, item);
  }
  for (const item of buildGeneratedCatalog()) {
    if (!map.has(item.id)) {
      map.set(item.id, item);
    }
  }
  return Array.from(map.values());
})();

export function getSfxCatalog(): SfxCatalogItem[] {
  return SFX_CATALOG;
}

export function sfxCatalogCount(): number {
  return SFX_CATALOG.length;
}
