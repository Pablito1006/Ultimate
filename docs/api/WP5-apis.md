# WP5 — APIs Compositing / Split / Keying

| Besoin | Classe.méthode | Since | Typée | Page Adobe | Risque |
| --- | --- | --- | --- | --- | --- |
| Position / Scale / Crop | `Component` Motion + `ComponentParam` | 25.6 | oui | componentparam | Noms FR via alias WP4 |
| Écrire valeur | `createSetValueAction` / keyframe | 25.6 | oui | idem | Relecture obligatoire |
| Aligner clips | `TrackItem.createMoveAction` | 25.6 | oui | typings | — |
| Ajouter effet | `VideoFilterFactory.createComponent` | 25.6 | oui | typings | matchName variable |
| Keying | Ultra Key / Color Key via factory | 25.6 | partiel | — | Params writable ? sinon defaults + message |
| Modes de fusion | Param Opacity / Blend | 25.6 | partiel | — | Souvent lecture seule → `unavailable` / partial |
| Masques | API masque track item | ? | non fiable | — | **`unavailable`** si non exposé |
| Stabilisation | Warp Stabilizer matchName | ? | partiel | — | Souvent AE-only → `unavailable` |

## Géométrie MasterMotion

`cellToTransform(cell, frame)` (pur) :

- `position` = centre cellule en pixels séquence `(x + w/2, y + h/2)`
- `scale` = `(cell.width / frame.width) * 100` (fit largeur ; hauteur proportionnelle)
- `crop*` = marges en % du cadre pour forcer la fenêtre cellule (mode `crop-frame`)

Vérification acceptation : position et taille résultante ±1 px.
