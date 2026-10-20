# Checklist manuelle WP11 — Macros v2 / palette / événements

## Hors Premiere

- [ ] `npm run verify` vert
- [ ] Macro 10 étapes : plan → apply → verify
- [ ] Échec milieu : étapes suivantes non exécutées ; précédentes OK non rollback
- [ ] Import JSON invalide refusé ; export `schemaVersion: 2`
- [ ] `filterCommands` trouve Delivery / Macros

## Dans Premiere

- [ ] Ctrl/Cmd+K ouvre la palette ; Entrée navigue vers un panneau
- [ ] Macros → « Préparer un short vertical » : aperçu expansé → Apply
- [ ] Case « Continuer après erreur » off par défaut
- [ ] Déclencheur SELECTION_CHANGED ajouté **désactivé** ; activation explicite lance la macro
- [ ] Settings : modifier raccourci palette ; persiste au reload
- [ ] Undo Premiere après étapes mutantes (marqueurs / rename)
