# Checklist manuelle maître — MasterMotion

Checklist de validation **dans Premiere Pro 25.6+** couvrant chaque fonction. Les checklists détaillées par chantier restent sous `manual-checklist-wp*.md`.

**Version cible** : voir `VERSION` / `CHANGELOG.md`.  
**Prérequis hors Premiere** : `npm run verify` + `npm run package` verts.

## 0. Distribution / i18n (WP13)

- [ ] `release/MasterMotion_premierepro.ccx` présent après `npm run package`
- [ ] Windows : installer non officiel affiche l’avertissement sideload
- [ ] macOS : `install-macos.sh` installe sous External (si machine dispo)
- [ ] Settings → Language FR/EN : navigation + Dashboard se mettent à jour
- [ ] Dashboard : carte « Ce que MasterMotion ne fait pas » / limits visible

## 1. Hub / host

- [ ] Dashboard : host, projet, séquence, capabilities probe
- [ ] Refresh sans crash hors projet
- [ ] Settings : diagnostic JSON copiable (sans secrets)

## 2. Motion / templates / presets (WP3–4)

- [ ] Motion : catalogue templates ; statut « à fabriquer » si pas de `.mogrt`
- [ ] Injection MOGRT (si fichier présent) + aperçu B
- [ ] Presets (≥30) : plan → apply → verify keyframes
- [ ] Templates panel : validate library

## 3. Captions (WP2)

- [ ] Transcription native ou mock offline
- [ ] Styles (12) : markers / metadata
- [ ] Export / import SRT ; règles de lecture

## 4. Timeline / rename

- [ ] Timeline analyze active
- [ ] Rename batch : preview → apply

## 5. Split / compositing / speed / color (WP5–7)

- [ ] Split : layout → position/scale/crop ±1 px
- [ ] Compositing : PiP / opacity ; keying partial ; masks unavailable honnête
- [ ] Speed : lecture + aperçu courbe ; écriture = unavailable / message clair
- [ ] Color : look Lumetri apply/verify ; LUT fichier = manuel

## 6. Audio / SFX (WP8)

- [ ] Ducking / fades / gain : keyframes relus
- [ ] SFX : suggestions + marqueurs uniquement (pas d’insert média auto)
- [ ] Aperçu B courbe volume

## 7. Assemblage (WP9)

- [ ] Silences : marqueurs d’abord ; apply remove clips entiers
- [ ] Jump cuts / hésitations / beats import
- [ ] Multicam rename/align ; cleanup report

## 8. Livraison (WP10)

- [ ] Bins MM: ; export plan multi-plateformes
- [ ] QC JSON + texte
- [ ] Relink / proxy : confirm Not undoable
- [ ] Interchange : FCP/OTIO/AAF selon version ; EDL unavailable documenté

## 9. Macros / palette (WP11)

- [ ] Macro ≥10 étapes : plan → apply → verify
- [ ] Échec d’étape : stop-on-error (précédentes intactes côté logique)
- [ ] Palette Ctrl/Cmd+K : navigation + macros
- [ ] Event triggers : off par défaut ; opt-in seulement

## 10. IA (WP12)

- [ ] Off par défaut ; 0 réseau sans consentement
- [ ] Mock offline → proposition à accepter/rejeter
- [ ] OpenAI (si testé) : domaine manifeste ; clé locale ; échec réseau non bloquant

## Dépannage rapide

Voir [../troubleshooting/loading.md](../troubleshooting/loading.md) et [../install/README.md](../install/README.md).

## Checklists par WP

| WP | Fichier |
| --- | --- |
| 0 | [manual-checklist-wp0.md](./manual-checklist-wp0.md) |
| 3 | [manual-checklist-wp3.md](./manual-checklist-wp3.md) |
| 4 | [manual-checklist-wp4.md](./manual-checklist-wp4.md) |
| 5 | [manual-checklist-wp5.md](./manual-checklist-wp5.md) |
| 6 | [manual-checklist-wp6.md](./manual-checklist-wp6.md) |
| 7 | [manual-checklist-wp7.md](./manual-checklist-wp7.md) |
| 8 | [manual-checklist-wp8.md](./manual-checklist-wp8.md) |
| 9 | [manual-checklist-wp9.md](./manual-checklist-wp9.md) |
| 10 | [manual-checklist-wp10.md](./manual-checklist-wp10.md) |
| 11 | [manual-checklist-wp11.md](./manual-checklist-wp11.md) |
| 12 | [manual-checklist-wp12.md](./manual-checklist-wp12.md) |
