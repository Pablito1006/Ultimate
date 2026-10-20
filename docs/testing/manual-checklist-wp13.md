# Checklist manuelle WP13 — Distribution, docs, i18n

## Hors Premiere

- [ ] `npm run verify` vert
- [ ] `npm run package` → `release/MasterMotion_premierepro.ccx` + nom versionné
- [ ] `release/VERSION.txt` / `README.txt` / `LISEZMOI.txt` cohérents
- [ ] Docs : `getting-started.md` + `.fr.md`, `LIMITS.md`, `LICENSES.md`, `install/README.md`, `distribution/signing.md`
- [ ] `docs/testing/manual-checklist.md` (maître) présent
- [ ] Tests unitaires i18n (clés FR = EN)

## Installation

- [ ] Windows Installer.ps1 : bandeau **NON OFFICIEL** visible
- [ ] macOS install-macos.sh : avertissement sideload (si Mac)
- [ ] Après sideload : panneau visible sous Plugins UXP

## Dans Premiere

- [ ] Settings → Language EN → nav EN
- [ ] Settings → Language FR → nav FR + titres Dashboard FR
- [ ] Carte limites Dashboard lisible
- [ ] Diagnostic Settings toujours OK
