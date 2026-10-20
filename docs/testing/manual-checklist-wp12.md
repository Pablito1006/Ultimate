# Checklist manuelle WP12 — IA facultative

## Hors Premiere

- [ ] `npm run verify` vert
- [ ] Sans consentement : 0 appel fetch (tests)
- [ ] Mock : proposition générée offline
- [ ] OpenAI simulé : échec réseau → message clair, pas de throw non géré
- [ ] Clé absente des settings JSON / logs (`[REDACTED]`)

## Dans Premiere

- [ ] Panneau AI : IA off par défaut
- [ ] Activer + consentement + mock → aperçu payload → Générer → Accepter/Rejeter
- [ ] OpenAI : domaines manifeste ; clé locale ; refus sans consentement
- [ ] Déconnexion réseau + OpenAI → message non bloquant
- [ ] Captions : pointe vers AI pour traduction (pas d’auto-apply)
