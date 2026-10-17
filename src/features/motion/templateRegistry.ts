import type { MotionCategory, MotionTemplateDefinition } from "./templateTypes";

const CATEGORIES: MotionCategory[] = [
  "Kinetic Typography",
  "Lower Thirds",
  "Social Media",
  "HUD",
  "Progress Bars",
  "Photo Grids",
  "Split Screens",
  "Titles",
  "Callouts",
  "Captions",
  "Transitions",
  "Alerts",
];

function baseParams(): MotionTemplateDefinition["parameters"] {
  return [
    { id: "text", label: "Text", type: "string", defaultValue: "MasterMotion" },
    { id: "color", label: "Color", type: "color", defaultValue: "#5C9CE6" },
    { id: "duration", label: "Duration (s)", type: "number", defaultValue: 3, min: 0.5, max: 30 },
  ];
}

function makeTemplate(
  id: string,
  name: string,
  category: MotionCategory,
  tags: string[],
  description: string
): MotionTemplateDefinition {
  return {
    id,
    name,
    category,
    version: "1.0.0",
    tags,
    description,
    parameters: baseParams(),
  };
}

export const MOTION_TEMPLATES: MotionTemplateDefinition[] = [
  makeTemplate("kt-slide", "Kinetic Slide", "Kinetic Typography", ["text", "kinetic"], "Sliding kinetic title."),
  makeTemplate("lt-left", "Lower Third Left", "Lower Thirds", ["lower-third"], "Classic left lower third."),
  makeTemplate("social-stamp", "Social Stamp", "Social Media", ["social"], "Centered social stamp."),
  makeTemplate("hud-frame", "HUD Frame", "HUD", ["hud"], "Sci-fi HUD frame overlay."),
  makeTemplate("progress-bar", "Progress Bar", "Progress Bars", ["progress"], "Animated progress bar."),
  makeTemplate("photo-grid-2x2", "Photo Grid 2x2", "Photo Grids", ["grid"], "2x2 photo grid placeholder."),
  makeTemplate("split-dual", "Dual Split", "Split Screens", ["split"], "Dual pane split overlay."),
  makeTemplate("title-hero", "Hero Title", "Titles", ["title"], "Large hero title card."),
  makeTemplate("callout-arrow", "Callout Arrow", "Callouts", ["callout"], "Arrow callout annotation."),
  makeTemplate("caption-pop", "Caption Pop", "Captions", ["caption"], "Pop-in caption graphic."),
  makeTemplate("transition-whip", "Whip Transition", "Transitions", ["transition"], "Whip transition marker."),
  makeTemplate("alert-pulse", "Alert Pulse", "Alerts", ["alert"], "Attention alert pulse."),
];

export function listMotionCategories(): MotionCategory[] {
  return CATEGORIES.slice();
}

export function searchTemplates(query: string, category?: MotionCategory | "all"): MotionTemplateDefinition[] {
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
