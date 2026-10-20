# WP7 — APIs Étalonnage / Looks

| Besoin | Classe.méthode | Since | Typée | Page Adobe | Risque |
| --- | --- | --- | --- | --- | --- |
| Ajouter Lumetri | `VideoFilterFactory.createComponent(matchName)` | 25.6 | oui | [videofilterfactory](https://developer.adobe.com/premiere-pro/uxp/ppro-reference/classes/videofilterfactory/) | matchName variable (`PR.ADBE Lumetri` / `AE.ADBE Lumetri`…) — découverte runtime |
| Liste filtres | `VideoFilterFactory.getMatchNames` | 25.6 | oui | idem | — |
| Append sur clip | `VideoComponentChain.createAppendComponentAction` | 25.6 | oui | component chain | — |
| Lire / écrire params | `Component` / `ComponentParam.createSetValueAction` | 25.6 | oui | [componentparam](https://developer.adobe.com/premiere-pro/uxp/ppro-reference/classes/componentparam/) | Noms FR/EN via aliases ; relecture obligatoire |
| LUT média (GUID) | `ClipProjectItem.createSetInputLUTIDAction` / `getInputLUTID` | 25.6 | oui | [clipprojectitem](https://developer.adobe.com/premiere-pro/uxp/ppro-reference/classes/clipprojectitem/) | GUID Premiere, **pas** un chemin `.cube` → application fichier LUT plugins = **unavailable** / manuel |
| Pixels / analyse image | — | — | non | — | **unavailable** — pas de match colorimétrique auto |

## Looks MasterMotion

- ≥ 20 looks = jeux de paramètres Basic Correction style Lumetri (Temperature, Tint, Exposure, Contrast, Highlights, Shadows, Whites, Blacks, Saturation, Vibrance).
- Intensité `t ∈ [0,1]` : `value = neutral + (look − neutral) × t`.
- Fichiers `assets/luts/*.cube` : référence / import manuel dans Premiere ; pas d’écriture GUID inventée.
- Aperçu B : simulation **approximative** (matrice/teinte) signalée comme telle.

## Repli

Si Lumetri absent ou params non writables : message clair + édition manuelle Effect Controls ; LUT → Creative → Look / Input LUT manuel.
