/**
 * Runtime catalog mirror of assets/templates (generated designs).
 * Loaded as embedded data so UXP does not need filesystem for the built-in library.
 * Regenerate via: npm run templates:generate (assets) — keep this file in sync by
 * importing the index at build time is not available in UXP; we ship a compact loader
 * that reads from the indexed JSON import when bundled, with a fallback list.
 */
import type { MotionCategory, MotionTemplateDefinition } from "../templateTypes";

/** Minimal embedded entries — full library hydrated from index when available. */
export const BUILTIN_TEMPLATE_SEED: Array<Partial<MotionTemplateDefinition> & { id: string; name: string; category: MotionCategory }> = [];

/**
 * Build a full MotionTemplateDefinition from a compact catalog row
 * (same shape as scripts/template-factory output).
 */
export function hydrateTemplate(raw: MotionTemplateDefinition): MotionTemplateDefinition {
  return {
    ...raw,
    tags: raw.tags.slice(),
    parameters: raw.parameters.map((p) => ({ ...p })),
    animation: { ...raw.animation },
    previewSpec: { ...raw.previewSpec },
    status: raw.status || (raw.mogrt || raw.mogrtPath ? "ready" : "missing-mogrt"),
  };
}
