# WP1 — APIs concernées (cadre d’aperçu)

Le cadre d’aperçu est **pur côté plan** : aucune mutation Premiere dans `plan()` / `describe()` / `render()`.  
Les mutations restent dans `apply()` via `Project.executeTransaction` (Since 25.6).

| Besoin | Classe.méthode | Since | Typée | Page Adobe | Risque |
| --- | --- | --- | --- | --- | --- |
| Lecture sélection (Rename plan) | `ProjectUtils.getSelection` | 25.6 | oui | [projectutils](https://developer.adobe.com/premiere-pro/uxp/ppro_reference/classes/projectutils/) | Sélection vide |
| Analyse timeline (Split/Sound/Captions) | Sequence tracks / clips | 25.6 | oui | [sequence](https://developer.adobe.com/premiere-pro/uxp/ppro_reference/classes/sequence/) | Cache WP0 |
| Alignement split | `TrackItem.createMoveAction` | 25.6 | oui | [videocliptrackitem](https://developer.adobe.com/premiere-pro/uxp/ppro_reference/classes/videocliptrackitem/) | Pas de crop/scale (WP5) |
| Marqueurs captions/SFX | `Markers.createAddMarkerAction` | 25.6 | oui | [markers](https://developer.adobe.com/premiere-pro/uxp/ppro_reference/classes/markers/) | Relecture obligatoire |
| Rename | `createSetNameAction` | 25.6 | oui | typings | — |
| Essai C (copie séquence) | `Sequence.createSubsequence` | 25.6 | oui | [sequence](https://developer.adobe.com/premiere-pro/uxp/ppro_reference/classes/sequence/) | **Niveau C non branché WP1** — signalé `unavailable` |

## Contrat

`PreviewablePlan<TInput, TPlan>` dans `src/features/preview/types.ts`.  
UI : `PreviewBar` désactive **Appliquer** tant qu’aucun plan n’est prêt ; `assertPlanReady` refuse `apply` sans plan.
