export type AssemblyFeatureId =
  | "assembly.silenceDetect"
  | "assembly.silenceMarkers"
  | "assembly.silenceRippleRemove"
  | "assembly.midClipCut"
  | "assembly.textKeep"
  | "assembly.jumpCuts"
  | "assembly.hesitations"
  | "assembly.beatImport"
  | "assembly.beatAnalysis"
  | "assembly.multicamRename"
  | "assembly.multicamAlign"
  | "assembly.cleanupDisabled"
  | "assembly.deleteEmptyTrack";

export interface AssemblyFeatureStatus {
  id: AssemblyFeatureId;
  status: "available" | "partial" | "unavailable";
  reason: string;
}

export function getAssemblyFeatureStatus(hints?: {
  hasSequenceEditorRemove?: boolean;
}): AssemblyFeatureStatus[] {
  const canRemove = hints?.hasSequenceEditorRemove !== false;
  return [
    {
      id: "assembly.silenceDetect",
      status: "available",
      reason: "Algorithme pur sur segments de parole (seuils configurables)",
    },
    {
      id: "assembly.silenceMarkers",
      status: "available",
      reason: "Mode marqueurs d’abord — MM:Silence via MarkerService",
    },
    {
      id: "assembly.silenceRippleRemove",
      status: canRemove ? "partial" : "unavailable",
      reason: canRemove
        ? "createRemoveItemsAction pour clips entièrement dans un silence — mid-clip non couvert"
        : "SequenceEditor.remove unavailable",
    },
    {
      id: "assembly.midClipCut",
      status: "unavailable",
      reason: "Pas d’API razor/mid-clip cut fiable — silences mid-clip = marqueurs",
    },
    {
      id: "assembly.textKeep",
      status: "partial",
      reason: "Marqueurs MM:Keep sur passages sélectionnés — rebuild séquence non inventé",
    },
    {
      id: "assembly.jumpCuts",
      status: "available",
      reason: "Détection gaps ; apply = marqueurs MM:JumpCut",
    },
    {
      id: "assembly.hesitations",
      status: "available",
      reason: "Fillers dans transcript → plages / marqueurs",
    },
    {
      id: "assembly.beatImport",
      status: "available",
      reason: "Import liste de temps → MM:Beat",
    },
    {
      id: "assembly.beatAnalysis",
      status: "unavailable",
      reason: "Decode audio / onset detection non exposé en UXP",
    },
    {
      id: "assembly.multicamRename",
      status: "available",
      reason: "createSetNameAction CamA_/CamB_",
    },
    {
      id: "assembly.multicamAlign",
      status: "available",
      reason: "createMoveAction vers temps marqueur",
    },
    {
      id: "assembly.cleanupDisabled",
      status: "partial",
      reason: "Retrait clips disabled via remove si exposé ; sinon rapport",
    },
    {
      id: "assembly.deleteEmptyTrack",
      status: "unavailable",
      reason: "Pas d’API delete track — rapport pistes vides seulement",
    },
  ];
}
