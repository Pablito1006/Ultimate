export type NavId =
  | "dashboard"
  | "motion"
  | "presets"
  | "captions"
  | "sound"
  | "audio"
  | "timeline"
  | "split"
  | "compositing"
  | "speed"
  | "color"
  | "assembly"
  | "delivery"
  | "rename"
  | "macros"
  | "ai"
  | "templates"
  | "settings";

import type { MessageKey } from "../i18n/locales/en";

export interface NavDefinition {
  id: NavId;
  /** i18n key for label */
  labelKey: MessageKey;
  hint?: string;
  enabled: boolean;
}

export const NAV_ITEMS: NavDefinition[] = [
  { id: "dashboard", labelKey: "nav.dashboard", hint: "Hub", enabled: true },
  { id: "motion", labelKey: "nav.motion", hint: "Templates", enabled: true },
  { id: "presets", labelKey: "nav.presets", hint: "Keyframes", enabled: true },
  { id: "captions", labelKey: "nav.captions", hint: "STT", enabled: true },
  { id: "sound", labelKey: "nav.sound", hint: "SFX", enabled: true },
  { id: "audio", labelKey: "nav.audio", hint: "Duck / Gain", enabled: true },
  { id: "timeline", labelKey: "nav.timeline", hint: "Analyze", enabled: true },
  { id: "split", labelKey: "nav.split", hint: "Layout", enabled: true },
  { id: "compositing", labelKey: "nav.compositing", hint: "PiP / Key", enabled: true },
  { id: "speed", labelKey: "nav.speed", hint: "Ramps", enabled: true },
  { id: "color", labelKey: "nav.color", hint: "Looks", enabled: true },
  { id: "assembly", labelKey: "nav.assembly", hint: "Silences", enabled: true },
  { id: "delivery", labelKey: "nav.delivery", hint: "Export / QC", enabled: true },
  { id: "rename", labelKey: "nav.rename", hint: "Batch", enabled: true },
  { id: "macros", labelKey: "nav.macros", hint: "Automate", enabled: true },
  { id: "ai", labelKey: "nav.ai", hint: "Optional", enabled: true },
  { id: "templates", labelKey: "nav.templates", hint: "Library", enabled: true },
  { id: "settings", labelKey: "nav.settings", hint: "Prefs", enabled: true },
];
