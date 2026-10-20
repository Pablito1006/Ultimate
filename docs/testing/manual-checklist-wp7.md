# Checklist manuelle WP7 — Étalonnage / Looks

## Hors Premiere

- [ ] `npm run verify` vert
- [ ] Catalogue ≥ 20 looks ; intensité 0 = neutre, 1 = cibles
- [ ] Contract apply → verify params relus ; remove → neutres
- [ ] Sans « écraser », refuse si grade déjà présent
- [ ] Aperçu B affiche disclaimer approximatif

## Dans Premiere

- [ ] Color panel : choisir look + intensité → Aperçu → Appliquer
- [ ] Lumetri Color apparaît (ou message si matchName absent)
- [ ] Valeurs Temperature/Contrast/… cohérentes dans Effect Controls
- [ ] Harmoniser sur plusieurs clips = mêmes valeurs
- [ ] Copier look 1er clip → coller → aperçu/apply
- [ ] Retirer → neutres (ou proches)
- [ ] LUT : message unavailable ; import manuel Creative → LUT avec `assets/luts/*.cube`
- [ ] Aucun match auto proposé comme opérationnel
- [ ] Undo `MasterMotion: Look …`
