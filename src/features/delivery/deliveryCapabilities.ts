export type DeliveryFeatureId =
  | "delivery.bins"
  | "delivery.importFiles"
  | "delivery.offlineDetect"
  | "delivery.relink"
  | "delivery.proxy"
  | "delivery.exportSequence"
  | "delivery.exportFrame"
  | "delivery.qc"
  | "delivery.interchangeXml"
  | "delivery.interchangeOtio"
  | "delivery.interchangeAaf"
  | "delivery.interchangeEdl"
  | "delivery.blackFreezeDetect"
  | "delivery.productions"
  | "delivery.sequenceCreate";

export interface DeliveryFeatureStatus {
  id: DeliveryFeatureId;
  status: "available" | "partial" | "unavailable";
  reason: string;
}

export function getDeliveryFeatureStatus(hints?: {
  hasEncoderManager?: boolean;
  hasExporter?: boolean;
  hasClipProjectItem?: boolean;
  hasFolderItem?: boolean;
  hasProjectConverter?: boolean;
  hasPrProduction?: boolean;
  hostSupportsXml?: boolean;
  hostSupportsOtio?: boolean;
  hostSupportsAaf?: boolean;
}): DeliveryFeatureStatus[] {
  const enc = hints?.hasEncoderManager !== false;
  const exp = hints?.hasExporter !== false;
  const clip = hints?.hasClipProjectItem !== false;
  const folder = hints?.hasFolderItem !== false;
  const conv = hints?.hasProjectConverter !== false;
  const xml = hints?.hostSupportsXml !== false;
  const otio = hints?.hostSupportsOtio !== false;
  const aaf = hints?.hostSupportsAaf === true;

  return [
    {
      id: "delivery.bins",
      status: folder ? "available" : "unavailable",
      reason: "FolderItem.createBinAction + Project.getRootItem (Since 25.6)",
    },
    {
      id: "delivery.importFiles",
      status: "available",
      reason: "Project.importFiles — chemins locaux, pas de réseau",
    },
    {
      id: "delivery.offlineDetect",
      status: clip ? "available" : "unavailable",
      reason: "ClipProjectItem.isOffline",
    },
    {
      id: "delivery.relink",
      status: clip ? "partial" : "unavailable",
      reason: clip
        ? "changeMediaFilePath — Not undoable ; confirmation requise"
        : "ClipProjectItem unavailable",
    },
    {
      id: "delivery.proxy",
      status: clip ? "partial" : "unavailable",
      reason: clip
        ? "attachProxy / hasProxy — Not undoable ; confirmation requise"
        : "ClipProjectItem unavailable",
    },
    {
      id: "delivery.exportSequence",
      status: enc ? "available" : "unavailable",
      reason: "EncoderManager.exportSequence (QUEUE_TO_AME défaut) Since 25.6",
    },
    {
      id: "delivery.exportFrame",
      status: exp ? "partial" : "unavailable",
      reason: "Exporter.exportSequenceFrame — stills seulement",
    },
    {
      id: "delivery.qc",
      status: "available",
      reason: "Rapport JSON/texte pur ; black/freeze = unavailable",
    },
    {
      id: "delivery.interchangeXml",
      status: conv && xml ? "partial" : "unavailable",
      reason: conv
        ? "ProjectConverter.exportAsFinalCutProXML (Since 26.2) — probe runtime"
        : "ProjectConverter absent",
    },
    {
      id: "delivery.interchangeOtio",
      status: conv && otio ? "partial" : "unavailable",
      reason: "exportAsOpenTimelineIO Since 26.2",
    },
    {
      id: "delivery.interchangeAaf",
      status: conv && aaf ? "partial" : "unavailable",
      reason: aaf
        ? "exportAAF Since 26.3"
        : "AAF Since 26.3 — marqué unavailable tant que probe négative",
    },
    {
      id: "delivery.interchangeEdl",
      status: "unavailable",
      reason: "Pas d’API EDL UXP — File → Export → EDL manuel dans Premiere",
    },
    {
      id: "delivery.blackFreezeDetect",
      status: "unavailable",
      reason: "Pas d’accès pixels / analyse frame UXP",
    },
    {
      id: "delivery.productions",
      status: hints?.hasPrProduction ? "partial" : "unavailable",
      reason: hints?.hasPrProduction
        ? "PRProduction.getActiveProduction — lecture scratch seulement"
        : "PRProduction non exposé ou inactif",
    },
    {
      id: "delivery.sequenceCreate",
      status: "available",
      reason: "Project.createSequence / createSequenceWithPresetPath",
    },
  ];
}
