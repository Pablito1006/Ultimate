export type ColorFeatureId =
  | "look.library"
  | "look.applyLumetri"
  | "look.intensity"
  | "look.copyPaste"
  | "look.harmonize"
  | "look.remove"
  | "look.previewApprox"
  | "lut.fileApply"
  | "color.autoMatch"
  | "color.pixelAnalysis";

export interface ColorFeatureStatus {
  id: ColorFeatureId;
  status: "available" | "partial" | "unavailable";
  reason: string;
}

export function getColorFeatureStatus(hints?: {
  hasLumetriMatch?: boolean;
  hasWritableColorParams?: boolean;
}): ColorFeatureStatus[] {
  const hasLumetri = hints?.hasLumetriMatch !== false;
  const writable = hints?.hasWritableColorParams !== false;

  return [
    {
      id: "look.library",
      status: "available",
      reason: "≥20 looks MasterMotion (params Lumetri-style)",
    },
    {
      id: "look.applyLumetri",
      status: hasLumetri && writable ? "available" : hasLumetri ? "partial" : "partial",
      reason: hasLumetri
        ? writable
          ? "VideoFilterFactory + ComponentParam (relecture)"
          : "Lumetri présent — écriture params à vérifier à l’apply"
        : "Tentera PR.ADBE Lumetri / AE.ADBE Lumetri ; sinon message + Effect Controls",
    },
    {
      id: "look.intensity",
      status: "available",
      reason: "Blend pur neutral → look × intensity",
    },
    {
      id: "look.copyPaste",
      status: "available",
      reason: "Presse-papiers look en mémoire panneau (mêmes params)",
    },
    {
      id: "look.harmonize",
      status: "available",
      reason: "Mêmes valeurs sur N clips vidéo de la séquence",
    },
    {
      id: "look.remove",
      status: "available",
      reason: "Restaure neutres (ou snapshot avant si capturé) — option explicite",
    },
    {
      id: "look.previewApprox",
      status: "available",
      reason: "Aperçu B approximatif (matrice/teinte) — signalé comme tel",
    },
    {
      id: "lut.fileApply",
      status: "unavailable",
      reason:
        "ClipProjectItem LUT = GUID Premiere, pas chemin .cube plugin — import manuel Creative → LUT",
    },
    {
      id: "color.autoMatch",
      status: "unavailable",
      reason: "Pas d’accès pixels UXP — pas de correspondance colorimétrique auto",
    },
    {
      id: "color.pixelAnalysis",
      status: "unavailable",
      reason: "Pas d’API pixels / histogramme exposée",
    },
  ];
}
