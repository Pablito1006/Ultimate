# WP8 — APIs Audio

| Besoin | Classe.méthode | Since | Typée | Page Adobe | Risque |
| --- | --- | --- | --- | --- | --- |
| Effet Volume | `AudioFilterFactory.createComponentByDisplayName("Volume", trackItem)` | 25.6 | oui | [audiofilterfactory](https://developer.adobe.com/premiere-pro/uxp/ppro-reference/classes/audiofilterfactory/) | Display name localisé ? Essayer Volume / Niveau |
| Liste effets audio | `AudioFilterFactory.getDisplayNames` | 25.6 | oui | idem | — |
| Chaîne composants | `AudioClipTrackItem.getComponentChain` | 25.6 | oui | [audiocliptrackitem](https://developer.adobe.com/premiere-pro/uxp/ppro-reference/classes/audiocliptrackitem/) | — |
| Keyframes volume | `ComponentParam.createAddKeyframeAction` / `createSetTimeVaryingAction` | 25.6 | oui | [componentparam](https://developer.adobe.com/premiere-pro/uxp/ppro-reference/classes/componentparam/) | Relecture obligatoire |
| Mute piste | Track mute (existant SoundDesignService) | 25.6 | partiel | — | Déjà utilisé WP0/WP1 |
| Loudness mesurée | — | — | non | — | **unavailable** — saisie manuelle LUFS + gain calculé |
| Insertion média SFX | Import/insert clip | ? | partiel | — | **Jamais auto** — marqueurs d’approbation seulement |
| Denoise / DeEsser | `createComponentByDisplayName` | 25.6 | partiel | idem | Si displayName présent ; sinon unavailable |

## MasterMotion

- **Gain / normalisation** : `gainDb = targetLufs − measuredLufs` (mesure externe saisie).
- **Ducking** : segments parole → keyframes volume musique (entrée/sortie ramp).
- **Fondus** : keyframes début/fin clip.
- **SFX ≥100** : catalogue local JSON + LICENSE ; suggestions → marqueurs `SFX:` uniquement.
- Aperçu B : courbe de volume SVG déterministe.
