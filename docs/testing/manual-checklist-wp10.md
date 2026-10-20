# Checklist manuelle WP10 — Ingestion / livraison

## Hors Premiere

- [ ] `npm run verify` vert
- [ ] Tests naming / QC / ingestionMath
- [ ] Contract : bins apply→verify, export job fake, QC sans mutation, relink confirm, EDL unavailable
- [ ] Capacités Diagnostic : encoderManager / clipProjectItem / projectConverter / folderItem

## Dans Premiere

- [ ] Delivery → ingest-bins : aperçu noms `MM:01_…` → Appliquer → chutiers visibles ; Undo
- [ ] project-template : bins + séquence `MM:…` créée
- [ ] offline-relink : item hors ligne → nouveau chemin avec case Not undoable ; relecture `isOffline=false`
- [ ] proxy-attach : `attachProxy` + confirm ; `hasProxy` true
- [ ] export : plateforme + dossier + `.epr` → file AME ; progression AME (événements)
- [ ] QC : rapport texte/JSON ; durée Shorts si > 60 s = erreur ; black/freeze = info unavailable
- [ ] interchange FCP XML / OTIO sur 26.2+ ; AAF sur 26.3+ ; EDL message manuel
- [ ] Aucun faux succès si AME absent (`isAMEInstalled=false`)
