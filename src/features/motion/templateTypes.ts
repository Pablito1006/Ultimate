/**
 * WP3 motion template schema (template.json + runtime).
 */

export type MotionCategory =
  | "Cinema Titles"
  | "Lower Thirds"
  | "Kinetic Typography"
  | "Transitions"
  | "Intro Outro"
  | "Social Media"
  | "Infographics"
  | "Overlays"
  | "Captions"
  | "Kinetic Typography Legacy"
  | "HUD"
  | "Progress Bars"
  | "Photo Grids"
  | "Split Screens"
  | "Titles"
  | "Callouts"
  | "Alerts";

export type TemplateAspect = "16:9" | "9:16" | "1:1" | "4:5";

export type TemplateParameterType =
  | "text"
  | "color"
  | "number"
  | "slider"
  | "checkbox"
  | "dropdown"
  | "font"
  | "media-placeholder"
  /** @deprecated WP0 aliases — mapped at load */
  | "string"
  | "boolean"
  | "enum";

export type TemplateStatus = "ready" | "missing-mogrt" | "invalid";

export interface LocalizedLabel {
  en: string;
  fr: string;
}

export interface TemplateParameter {
  id: string;
  label: string | LocalizedLabel;
  type: TemplateParameterType;
  masterPropertyName: string;
  defaultValue: string | number | boolean;
  options?: string[];
  min?: number;
  max?: number;
  step?: number;
}

export interface TemplateAnimationSpec {
  inDuration: number;
  outDuration: number;
  loop: boolean;
}

export type PreviewSpecKind =
  | "title-reveal"
  | "lower-third"
  | "kinetic"
  | "transition"
  | "intro"
  | "social"
  | "infographic"
  | "overlay"
  | "caption";

export interface TemplatePreviewSpec {
  kind: PreviewSpecKind;
  /** Deterministic seed for procedural SVG. */
  seed: number;
  primaryColor?: string;
  secondaryColor?: string;
  sampleText?: string;
}

export interface MotionTemplateDefinition {
  id: string;
  name: string;
  category: MotionCategory;
  version: string;
  tags: string[];
  description: string;
  minPremiere: string;
  /** Relative path to .mogrt from template folder (or absolute when imported). */
  mogrt?: string;
  /** @deprecated use mogrt */
  mogrtPath?: string;
  durationDefault: number;
  aspect: TemplateAspect;
  fps: number;
  parameters: TemplateParameter[];
  animation: TemplateAnimationSpec;
  previewSpec: TemplatePreviewSpec;
  license: string;
  author: string;
  status: TemplateStatus;
  /** Fabrication notes for motion designer. */
  fabNotes?: string;
  previewStatic?: string;
  previewAnim?: string;
}

export interface TemplateContext {
  text?: string;
  color?: string;
  durationSeconds?: number;
  videoTrackIndex?: number;
  audioTrackIndex?: number;
  values?: Record<string, string | number | boolean>;
  /** When true and mogrt missing, place a comment marker placeholder (explicit). */
  allowMarkerFallback?: boolean;
}

export interface ParamWriteFailure {
  parameterId: string;
  masterPropertyName: string;
  reason: string;
}

export interface TemplateResult {
  ok: boolean;
  templateId: string;
  mode: "mogrt" | "marker-fallback" | "blocked";
  message: string;
  insertedClipNames?: string[];
  paramWriteFailures?: ParamWriteFailure[];
}

export function labelText(label: string | LocalizedLabel, lang: "en" | "fr" = "en"): string {
  if (typeof label === "string") {
    return label;
  }
  return label[lang] || label.en;
}

export function normalizeParameterType(type: TemplateParameterType): TemplateParameterType {
  if (type === "string") {
    return "text";
  }
  if (type === "boolean") {
    return "checkbox";
  }
  if (type === "enum") {
    return "dropdown";
  }
  return type;
}
