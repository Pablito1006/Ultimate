# WP3 — APIs Motion Graphics Templates (MOGRT)

Références :

- [SequenceEditor](https://developer.adobe.com/premiere-pro/uxp/ppro-reference/classes/sequenceeditor/)
- [ComponentParam](https://developer.adobe.com/premiere-pro/uxp/ppro-reference/classes/componentparam/)
- [MogrtText](https://developer.adobe.com/premiere-pro/uxp/ppro_reference/) (typé dans `@adobe/premierepro`)
- Fabrication AE : [Creating Motion Graphics templates](https://helpx.adobe.com/after-effects/desktop/motion-graphics/work-with-motion-graphics-templates/creating-motion-graphics-templates.html)

| Besoin | Classe.méthode | Since | Typée | Page Adobe | Risque |
| --- | --- | --- | --- | --- | --- |
| Insérer `.mogrt` | `SequenceEditor.insertMogrtFromPath` | 25.6 | oui | [sequenceeditor](https://developer.adobe.com/premiere-pro/uxp/ppro-reference/classes/sequenceeditor/) | Chemin absolu ; retourne track items |
| MOGRT bibliothèque Adobe | `SequenceEditor.insertMogrtFromLibrary` | 25.6 | oui | idem | Non utilisé (chemins locaux) |
| Dossier MOGRT installés | `SequenceEditor.getInstalledMogrtPath` | 25.6 | oui | idem | Info / diag |
| Éditeur de séquence | `SequenceEditor.getEditor` | 25.6 | oui | idem | — |
| Chaîne composants clip | `VideoClipTrackItem.getComponentChain` | 25.6 | oui | typings | — |
| Composant / param | `Component.getParam` / `displayName` | 25.6 | oui | typings | Index découvert runtime |
| Écrire valeur | `ComponentParam.createSetValueAction` + `createKeyframe` | 25.6 | oui | [componentparam](https://developer.adobe.com/premiere-pro/uxp/ppro-reference/classes/componentparam/) | Texte MOGRT parfois illisible/non writable (forums) → relecture + repli manuel |
| Texte MOGRT | `MogrtText.setText` / `getText` | 25.6+ | oui | typings | Vérifier après écriture |
| Couleur | `Color` + `createKeyframe` | 25.6 | oui | typings | Format couleur à valider live |
| Transaction | `Project.executeTransaction` / `lockedAccess` | 25.6 | oui | project | Relecture obligatoire (D9) |

## Structure `.mogrt` (fixture inspectée)

Un `.mogrt` est une archive ZIP. Le fixture `tests/fixtures/mogrt/sample-mm-title.mogrt` contient au minimum `definition.json` listant les propriétés maîtres exposées (`masterProperties[].name`). Voir `docs/templates/MOGRT_STRUCTURE.md`.

## Limites honnêtes

- Le plug-in **ne fabrique pas** de binaire `.mogrt` ; il charge, valide, paramètre, prévisualise et insère.
- Si l’écriture d’un paramètre échoue ou n’est pas relue : message explicite + édition manuelle dans Graphiques essentiels / Properties.
- Sans fichier `.mogrt` : statut `missing-mogrt` — jamais un succès « mogrt ».
