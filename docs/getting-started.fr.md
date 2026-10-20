# Démarrage — MasterMotion

**Langue** : Français · [English](./getting-started.md)

## Prérequis

- Adobe Premiere Pro **25.6.0** ou plus récent
- Node.js 20+ (build / packaging uniquement)
- Mode développeur UXP activé dans Premiere (pour le sideload)

## Démarrage rapide (développeurs)

```bash
npm install
npm run verify
npm run package
```

`npm run package` construit `dist/` et produit un `.ccx` reproductible dans `release/` (`fflate`, multi-OS).

## Installation dans Premiere

| Méthode | Statut | Comment |
| --- | --- | --- |
| `.ccx` signé (Adobe Developer Distribution / Creative Cloud) | **Recommandé** | Voir [distribution/signing.md](./distribution/signing.md) |
| Windows `Installer.bat` / `Installer.ps1` | Sideload **non officiel** | Copie dans `%APPDATA%\Adobe\UXP\Plugins\External\` |
| macOS `install-macos.sh` | Sideload **non officiel** | Copie dans `~/Library/Application Support/Adobe/UXP/Plugins/External/` |
| UDT (UXP Developer Tool) | Dev uniquement | Pointer vers `dist/manifest.json` |

Détails : [install/README.md](./install/README.md).

## Premier lancement

1. Redémarrer Premiere complètement après installation.
2. **Fenêtre → Plugins UXP → MasterMotion** (pas le menu Extensions CEP).
3. Ouvrir **Paramètres** → langue FR/EN, thème, diagnostic.
4. Ouvrir **Tableau de bord** → host / projet / séquence ; lire la carte des limites.

## Flux de travail (chaque fonction)

1. **Aperçu** du plan (PreviewablePlan / Preview B).
2. Vérifier ce qui change (nombre de clips, annulation).
3. **Appliquer** seulement après validation.
4. Utiliser **Annuler** Premiere pour les actions transactionnelles ; confirmer « Not undoable » si demandé.

## Carte documentation

| Sujet | Chemin |
| --- | --- |
| Vue des fonctions | [features/overview.md](./features/overview.md) |
| Matrice de compatibilité | [compat.md](./compat.md) |
| Ce que nous ne faisons pas | [LIMITS.md](./LIMITS.md) |
| Licences des ressources | [LICENSES.md](./LICENSES.md) |
| Checklist manuelle | [testing/manual-checklist.md](./testing/manual-checklist.md) |
| Chargement / UDT | [troubleshooting/loading.md](./troubleshooting/loading.md) |
| Notes API par chantier | [api/](./api/) |

## Diagnostic

Paramètres → **Run diagnostic** → copier le JSON (sans chemins projet / secrets). À joindre au ticket avec la version du `CHANGELOG.md`.
