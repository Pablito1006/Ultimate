export type MacroActionType =
  | "refreshContext"
  | "addMarkerAtPlayhead"
  | "renameSelectedPrefix"
  | "muteAudioTrack"
  | "unmuteAudioTrack"
  | "analyzeTimeline";

export interface MacroAction {
  id: string;
  type: MacroActionType;
  params?: Record<string, string | number | boolean>;
}

export interface Macro {
  id: string;
  name: string;
  description?: string;
  actions: MacroAction[];
}

export interface MacroRunResult {
  macroId: string;
  ok: boolean;
  steps: Array<{ actionId: string; ok: boolean; message: string }>;
}
