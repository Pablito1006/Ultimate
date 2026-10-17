# MasterMotion & AI Toolkit Pro

Plugin UXP pour **Adobe Premiere Pro 25.6+**.

---

## Pour les utilisateurs (aucune commande)

1. Ouvrez le dossier **`release`**
2. Double-cliquez sur **`Installer.bat`** (installe même **sans** Creative Cloud)
3. Fermez puis rouvrez Premiere Pro
4. **Preferences → Plugins → Enable developer mode**, redémarrez encore
5. Menu **Fenêtre → UXP Plugins → MasterMotion**  
   (pas « Extensions »)

Lisez `release/LISEZMOI.txt`.

Désinstallation : double-clic sur `release/Desinstaller.bat`.

---

## Pour les développeurs

```bash
npm install
npm run build          # compile vers dist/
npm run package        # build + crée release/*.ccx
npm test
```

Chargement debug (UDT) : pointer vers `dist/manifest.json`.

### Contenu distribuable

Après `npm run package`, envoyez uniquement le dossier **`release/`** :

```text
release/
  Installer.bat
  Desinstaller.bat
  LISEZMOI.txt
  MasterMotion_premierepro.ccx
  MasterMotion_premierepro_vX.Y.Z.ccx
  VERSION.txt
```

---

## Fonctionnalités (0.2.0)

Motion, Captions, Timeline, Sound, Split, Rename, Macros, Templates, Settings.

Limitations documentées : `docs/features/overview.md`.

## Licence

Propriétaire.
