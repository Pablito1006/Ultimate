# Installation MasterMotion

## Méthode recommandée — `.ccx` signé

1. Obtenir le paquet signé (Adobe Developer Distribution / Creative Cloud).
2. Installer via Creative Cloud / UPIA (double-clic `.ccx` si le système le propose).
3. Redémarrer Premiere Pro 25.6+.
4. **Fenêtre → Plugins UXP → MasterMotion**.

Voir [../distribution/signing.md](../distribution/signing.md).

## Secours — sideload External (non officiel)

> **Avertissement** : copie manuelle dans le dossier External UXP. Ce n’est **pas** une installation Adobe signée. Réservé au développement, tests internes, ou secours sans Creative Cloud.

### Windows

1. `npm run package` (ou récupérer `release/MasterMotion_premierepro.ccx`).
2. Double-cliquer `release/Installer.bat` (appelle `Installer.ps1`).
3. Lire l’avertissement « NON OFFICIEL » dans la console.
4. Fermer / rouvrir Premiere ; activer le mode développeur Plugins si demandé.
5. **Fenêtre → Plugins UXP → MasterMotion**.

Cible : `%APPDATA%\Adobe\UXP\Plugins\External\com.mastermotion.toolkit_<version>\`

### macOS

1. `npm run package`.
2. `chmod +x release/install-macos.sh && ./release/install-macos.sh`
3. Lire l’avertissement sideload.
4. Redémarrer Premiere → **Fenêtre → Plugins UXP → MasterMotion**.

Cible : `~/Library/Application Support/Adobe/UXP/Plugins/External/com.mastermotion.toolkit_<version>/`

### Désinstallation Windows

`release/Desinstaller.bat` / `Desinstaller.ps1` — retire l’entrée External + PluginsInfo.

### Développement (UDT)

Pointer UXP Developer Tool vers `dist/manifest.json` (après `npm run build`). Voir [../troubleshooting/loading.md](../troubleshooting/loading.md).

## Vérifications post-install

- [ ] Version affichée = `CHANGELOG` / Settings
- [ ] Dashboard : host compatible 25.6+
- [ ] Language switch FR/EN in Settings
- [ ] Aucune erreur « runtime not detected » **dans** Premiere
