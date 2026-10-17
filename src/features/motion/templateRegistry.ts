import type { MotionCategory, MotionTemplateDefinition } from "./templateTypes";
import { GENERATED_TEMPLATES } from "./templates/generatedCatalog";
import { hydrateTemplate } from "./templates/builtinCatalog";

/**
 * Synchronous registry facade over the embedded WP3 catalog.
 * Prefer TemplateLibrary for favorites / async search in UI.
 */

export const MOTION_TEMPLATES: MotionTemplateDefinition[] = GENERATED_TEMPLATES.map((t) =>
  hydrateTemplate(t)
);

export function listMotionCategories(): MotionCategory[] {
  const set = new Set<MotionCategory>();
  for (const t of MOTION_TEMPLATES) {
    set.add(t.category);
  }
  return Array.from(set).sort();
}

export function searchTemplates(
  query: string,
  category?: MotionCategory | "all"
): MotionTemplateDefinition[] {
  const q = query.trim().toLowerCase();
  return MOTION_TEMPLATES.filter((t) => {
    if (category && category !== "all" && t.category !== category) {
      return false;
    }
    if (!q) {
      return true;
    }
    const hay = `${t.name} ${t.category} ${t.tags.join(" ")} ${t.description}`.toLowerCase();
    return hay.indexOf(q) >= 0;
  });
}

export function getTemplateById(id: string): MotionTemplateDefinition | undefined {
  return MOTION_TEMPLATES.find((t) => t.id === id);
}

export function countTemplatesByStatus(): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const t of MOTION_TEMPLATES) {
    counts[t.status] = (counts[t.status] || 0) + 1;
  }
  return counts;
}
