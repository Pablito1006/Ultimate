# WP4 — APIs Presets natifs / keyframes

Références :

- [ComponentParam](https://developer.adobe.com/premiere-pro/uxp/ppro-reference/classes/componentparam/)
- [Keyframe](https://developer.adobe.com/premiere-pro/uxp/ppro-reference/) (typings `@adobe/premierepro`)
- [VideoFilterFactory](https://developer.adobe.com/premiere-pro/uxp/ppro-reference/)

| Besoin | Classe.méthode | Since | Typée | Page Adobe | Risque |
| --- | --- | --- | --- | --- | --- |
| Chaîne composants | `VideoClipTrackItem.getComponentChain` | 25.6 | oui | typings | — |
| Match name composant | `Component.getMatchName` / `getDisplayName` | 25.6 | oui | typings | Noms réels découverts runtime |
| Paramètre | `Component.getParam` / `displayName` | 25.6 | oui | typings | Index ≠ stable entre hosts |
| Keyframes supportés | `ComponentParam.areKeyframesSupported` | 25.6 | oui | componentparam | Certains params statiques |
| Créer KF | `ComponentParam.createKeyframe` | 25.6 | oui | idem | Type de valeur strict |
| Ajouter KF | `createAddKeyframeAction` | 25.6 | oui | idem | Transaction + lockedAccess |
| Valeur fixe | `createSetValueAction` | 25.6 | oui | idem | — |
| Time-varying | `createSetTimeVaryingAction` | 25.6 | oui | idem | Requis avant multi-KF |
| Lister KF | `getKeyframeListAsTickTimes` | 25.6 | oui | idem | — |
| Lire KF | `getKeyframePtr` / `getValueAtTime` | 25.6 | oui | idem | — |
| Supprimer plage | `createRemoveKeyframeRangeAction` | 25.6 | oui | idem | Retrait propre `MM:` |
| Interpolation | `createSetInterpolationAtKeyframeAction` / `Keyframe.INTERPOLATION_MODE_*` | 25.6 | oui | typings | Bézier native limitée → échantillonnage |
| Ajouter effet | `VideoFilterFactory.createComponent` + append | 25.6 | oui | typings | matchName doit exister |
| Liste effets | `VideoFilterFactory.getMatchNames` | 25.6 | oui | typings | Probe |

## Convention MasterMotion

- Keyframes / effets posés par le plug-in : préfixe métadonnée / nom `MM:` quand un marqueur ou label est stocké ; retrait via plage de temps du preset appliqué.
- Noms de paramètres : table d’alias (`Position`, `Scale`, …) + découverte runtime — jamais un seul matchName codé en dur sans fallback.
