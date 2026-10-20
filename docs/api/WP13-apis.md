# WP13 — Distribution, documentation, internationalisation

Aucune nouvelle API Premiere. Livrables hors host :

| Besoin | Mécanisme | Note |
| --- | --- | --- |
| Paquet `.ccx` | ZIP du dossier `dist/` (manifest + bundle) | Reproductible via `npm run package` (fflate, cross-OS) |
| Signature / Marketplace | Adobe Developer Distribution / certificat | Préparation documentée — signature hors CI locale |
| Install Windows | `release/Installer.ps1` / `.bat` | Secours **non officiel** (copie External) |
| Install macOS | Copie vers `~/Library/Application Support/Adobe/UXP/Plugins/External/` | Documenté + script `install-macos.sh` |
| i18n FR/EN | `src/i18n/` + Settings language | Chaînes UI panneau |
| Licences ressources | `docs/LICENSES.md` + `assets/*/LICENSE.md` | LUT, SFX, templates |

## Chemins External (UXP sideload)

| OS | Dossier External |
| --- | --- |
| Windows | `%APPDATA%\Adobe\UXP\Plugins\External\` |
| macOS | `~/Library/Application Support/Adobe/UXP/Plugins/External/` |

Le sideload External n’est **pas** une distribution Adobe signée. Pour production : paquet `.ccx` + portail Developer Distribution.
