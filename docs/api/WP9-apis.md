# WP9 — APIs Assemblage et nettoyage

| Besoin | Classe.méthode | Since | Typée | Page Adobe | Risque |
| --- | --- | --- | --- | --- | --- |
| Retirer clips (ripple) | `SequenceEditor.createRemoveItemsAction` | 25.6 | oui | [sequenceeditor](https://developer.adobe.com/premiere-pro/uxp/ppro-reference/classes/sequenceeditor/) | Sélection via `TrackItemSelection.createEmptySelection` (callback sync) |
| Sélection | `TrackItemSelection.addItem` / `Sequence.setSelection` | 25.6 | oui | [trackitemselection](https://developer.adobe.com/premiere-pro/uxp/ppro-reference/classes/trackitemselection/) | Lifetime du callback |
| Désactiver clip | `createSetDisabledAction` | 25.6 | oui | videocliptrackitem | — |
| Déplacer / aligner | `createMoveAction` | 25.6 | oui | idem | — |
| Renommer | `createSetNameAction` | 25.6 | oui | idem | Multicam |
| Marqueurs | `Markers.createAddMarkerAction` | 25.6 | oui | — | Mode « marqueurs d’abord » |
| Coupe mid-clip / razor | — | — | non fiable | — | **partial/unavailable** — silences mid-clip → marqueurs |
| Decode audio / beats WASM | — | — | non | — | **unavailable** — import liste de temps |
| Supprimer piste vide | — | — | non | — | **unavailable** — rapport seulement |

## Algorithmes MasterMotion (purs)

- **Silences** : gaps entre segments de parole ≥ `minSilenceSeconds` → plages `[start,end]`.
- **Hésitations** : fillers (`um`, `uh`, `euh`, `hmm`…) dans le transcript → plages mots.
- **Jump cuts** : clips adjacents même piste avec gap ∈ `(0, maxGap]`.
- **Montage texte** : plages « keep » sélectionnées → marqueurs `MM:Keep` (rebuild séquence non inventé).
- **Beats** : JSON/CSV de temps → marqueurs `MM:Beat`.
