export type AudioFeatureId =
  | "audio.volumeReadWrite"
  | "audio.ducking"
  | "audio.fades"
  | "audio.gainFromLufs"
  | "audio.loudnessMeter"
  | "audio.cleanupFilters"
  | "audio.sfxCatalog"
  | "audio.sfxAutoInsert"
  | "audio.previewCurve";

export interface AudioFeatureStatus {
  id: AudioFeatureId;
  status: "available" | "partial" | "unavailable";
  reason: string;
}

export function getAudioFeatureStatus(hints?: {
  hasAudioFilterFactory?: boolean;
  hasVolumeFilter?: boolean;
  cleanupNames?: string[];
}): AudioFeatureStatus[] {
  const factory = hints?.hasAudioFilterFactory !== false;
  const volume = hints?.hasVolumeFilter !== false;
  const cleanup = hints?.cleanupNames ?? [];

  return [
    {
      id: "audio.volumeReadWrite",
      status: factory && volume ? "available" : "partial",
      reason:
        "AudioFilterFactory.createComponentByDisplayName(Volume) + ComponentParam keyframes (Since 25.6)",
    },
    {
      id: "audio.ducking",
      status: "available",
      reason: "Keyframes volume calculés depuis segments de parole (transcription ou saisie)",
    },
    {
      id: "audio.fades",
      status: "available",
      reason: "Keyframes entrée/sortie sur clips audio",
    },
    {
      id: "audio.gainFromLufs",
      status: "available",
      reason: "Gain = cible − mesure saisie (pas de DSP inventé)",
    },
    {
      id: "audio.loudnessMeter",
      status: "unavailable",
      reason: "Pas d’API loudness/LUFS UXP — mesure externe obligatoire",
    },
    {
      id: "audio.cleanupFilters",
      status: cleanup.length > 0 ? "partial" : "partial",
      reason:
        cleanup.length > 0
          ? `Filtres host: ${cleanup.slice(0, 4).join(", ")}`
          : "Tentera DeNoise/DeEsser si listés par AudioFilterFactory.getDisplayNames",
    },
    {
      id: "audio.sfxCatalog",
      status: "available",
      reason: "Catalogue local ≥100 (métadonnées) + LICENSE assets/sfx",
    },
    {
      id: "audio.sfxAutoInsert",
      status: "unavailable",
      reason: "Insertion média jamais automatique — marqueurs SFX: d’approbation seulement",
    },
    {
      id: "audio.previewCurve",
      status: "available",
      reason: "Aperçu B courbe volume SVG déterministe",
    },
  ];
}
