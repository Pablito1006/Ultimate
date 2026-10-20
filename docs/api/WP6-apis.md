# WP6 — APIs Vitesse et temps

| Besoin | Classe.méthode | Since | Typée | Page Adobe | Risque |
| --- | --- | --- | --- | --- | --- |
| Lire vitesse | `VideoClipTrackItem.getSpeed` / `AudioClipTrackItem.getSpeed` | 25.6 | oui | [videocliptrackitem](https://developer.adobe.com/premiere-pro/uxp/ppro-reference/classes/videocliptrackitem/) | Ratio (1 = 100 %) — confirmé fake + typings |
| Lire inversion | `…isSpeedReversed` | 25.6 | oui | idem | Retourne `number` (0/1), pas `boolean` |
| Écrire vitesse constante | `createSetSpeedAction` / `setSpeed` | — | **non** | — | **Absent** de la référence UXP et de `@adobe/premierepro` → `unavailable` |
| Inverser (écriture) | — | — | non | — | **`unavailable`** — repli manuel Clip → Speed/Duration |
| Rampes / time remap | — | — | non | — | **`unavailable`** — aucune API keyframe de vitesse exposée |
| Préserver hauteur audio | — | — | non | — | **`unavailable`** — option Premiere non exposée |
| Durée / in-out | `getDuration`, `getInPoint`, `getOutPoint`, `createSetEndAction`… | 25.6 | oui | idem | Trim ≠ vitesse ; ne pas simuler un change de speed via in/out |

## Calculs MasterMotion (purs, hors API)

- Médiaspan à vitesse constante : `mediaSeconds = sequenceDuration * speed`
- Nouvelle durée : `newDuration = mediaSeconds / targetSpeed = sequenceDuration * (currentSpeed / targetSpeed)`
- Vitesse pour durée cible : `targetSpeed = mediaSeconds / targetDuration`
- Rampe (courbe `speed(u)`, `u ∈ [0,1]`) : `newDuration = mediaSeconds / mean(speed)` où `mean = ∫₀¹ speed(u) du`

## Repli documenté (écriture)

Tant que Premiere n’expose pas d’action d’écriture :

1. Panneau MasterMotion calcule plan + aperçu B + durées exactes.
2. Appliquer refuse avec message clair (`unavailable`).
3. Monteur : Clip → **Speed / Duration** (ou Time Remapping) dans Premiere, en s’appuyant sur les valeurs du plan.
