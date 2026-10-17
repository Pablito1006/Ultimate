export type NavId =
  | "dashboard"
  | "motion"
  | "captions"
  | "sound"
  | "timeline"
  | "split"
  | "rename"
  | "macros"
  | "templates"
  | "settings";

export interface NavDefinition {
  id: NavId;
  label: string;
  hint?: string;
  enabled: boolean;
}

export const NAV_ITEMS: NavDefinition[] = [
  { id: "dashboard", label: "Dashboard", hint: "Hub", enabled: true },
  { id: "motion", label: "Motion", hint: "Templates", enabled: true },
  { id: "captions", label: "Captions", hint: "STT", enabled: true },
  { id: "sound", label: "Sound", hint: "SFX", enabled: true },
  { id: "timeline", label: "Timeline", hint: "Analyze", enabled: true },
  { id: "split", label: "Split", hint: "Layout", enabled: true },
  { id: "rename", label: "Rename", hint: "Batch", enabled: true },
  { id: "macros", label: "Macros", hint: "Automate", enabled: true },
  { id: "templates", label: "Templates", hint: "Library", enabled: true },
  { id: "settings", label: "Settings", hint: "Prefs", enabled: true },
];
