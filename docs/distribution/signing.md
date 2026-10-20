# Signature et distribution Adobe

## Objectif

Livrer un `.ccx` **signé** via le flux Adobe (Developer Distribution / Creative Cloud), plutôt que le sideload External.

## Préparation locale (ce dépôt)

1. `npm run verify` — typecheck, lint, tests+coverage, build, manifest, versions, templates.
2. `npm run package` — ZIP reproductible de `dist/` → `release/MasterMotion_premierepro.ccx` (+ nom versionné).
3. Vérifier `release/VERSION.txt` et que `manifest.json` dans le `.ccx` a la bonne `version`.

Le packaging utilise **fflate** (Node) : même résultat sur Windows / macOS / Linux (pas de dépendance à `Compress-Archive`).

## Signature (hors CI locale)

La signature Adobe (certificat développeur, portail Developer Distribution) **n’est pas** exécutée dans ce dépôt. Étapes typiques :

1. Compte Adobe Developer + produit UXP déclaré.
2. Uploader le `.ccx` produit par `npm run package` sur le portail.
3. Suivre le workflow de signature / soumission Marketplace ou distribution privée.
4. Les utilisateurs installent via Creative Cloud (UPIA) — pas besoin d’`Installer.ps1`.

Documenter l’ID plugin : `com.mastermotion.toolkit` (`public/manifest.json`).

## Sideload External (secours)

| OS | Script | Avertissement |
| --- | --- | --- |
| Windows | `release/Installer.bat` / `Installer.ps1` | **Non officiel** — copie External + `PluginsInfo` |
| macOS | `release/install-macos.sh` | **Non officiel** — copie External |

Ces scripts affichent un avertissement explicite. Ils ne remplacent pas une distribution signée.

## Checklist pré-release

- [ ] `VERSION` / `package.json` / `public/manifest.json` / `src/core/constants/version.ts` alignés
- [ ] `CHANGELOG.md` à jour
- [ ] `docs/compat.md` à jour
- [ ] `npm run verify` vert
- [ ] `npm run package` produit le `.ccx`
- [ ] Sideload testé une fois (Windows et/ou macOS) **ou** upload portail signé
