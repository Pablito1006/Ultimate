# Checklist manuelle WP6 — Vitesse et temps

## Hors Premiere

- [ ] `npm run verify` vert
- [ ] Tests numériques durée (constant / cible / ramp mean) verts
- [ ] Aperçu B courbe SVG (constant, héros, montée-descente)
- [ ] Apply retourne unavailable avec message de repli Speed/Duration

## Dans Premiere

- [ ] Panneau Speed : analyse clips → vitesses lues (getSpeed) cohérentes avec Effect Controls / Speed
- [ ] Clips à 200 % / reversed détectés comme non-default
- [ ] Plan A liste avant → après (durée résultante exacte calculée)
- [ ] Appliquer : message clair « écriture unavailable » (pas de faux succès)
- [ ] Repli : appliquer manuellement Clip → Speed/Duration avec les % du plan
- [ ] Diagnostic : `trackItem.speed.read` available, `trackItem.speed.write` unavailable
