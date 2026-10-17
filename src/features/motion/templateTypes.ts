export type MotionCategory =
  | "Kinetic Typography"
  | "Lower Thirds"
  | "Social Media"
  | "HUD"
  | "Progress Bars"
  | "Photo Grids"
  | "Split Screens"
  | "Titles"
  | "Callouts"
  | "Captions"
  | "Transitions"
  | "Alerts";

export type TemplateParameterType = "string" | "number" | "color" | "boolean" | "enum";

export interface TemplateParameter {
  id: string;
  label: string;
  type: TemplateParameterType;
  defaultValue: string | number | boolean;
  options?: string[];
  min?: number;
  max?: number;
}

export interface MotionTemplateDefinition {
  id: string;
  name: string;
  category: MotionCategory;
  version: string;
  tags: string[];
  description: string;
  /** Optional path to a .mogrt — when set, injection uses SequenceEditor.insertMogrtFromPath */
  mogrtPath?: string;
  parameters: TemplateParameter[];
}

export interface TemplateContext {
  text?: string;
  color?: string;
  durationSeconds?: number;
  videoTrackIndex?: number;
  audioTrackIndex?: number;
  values?: Record<string, string | number | boolean>;
}

export interface TemplateResult {
  ok: boolean;
  templateId: string;
  mode: "mogrt" | "marker-fallback";
  message: string;
}
