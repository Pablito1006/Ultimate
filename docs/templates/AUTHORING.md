# Guide de fabrication des templates Motion (MOGRT)

Public : motion designer After Effects / Graphiques essentiels Premiere.

MasterMotion **ne crée pas** de binaire `.mogrt`. Vous livrez le fichier à côté de `template.json` dans `assets/templates/<id>/`.

## Convention de nommage

- Préfixe des propriétés exposées : **`MM_`** (ex. `MM_Title`, `MM_ColorPrimary`).
- Chaque propriété déclarée dans `template.json` → `parameters[].masterPropertyName` doit exister dans `definition.json` du `.mogrt`.
- IDs de templates : `mm-<slug>-16x9` / `mm-<slug>-9x16`.

## Compatibilité Premiere (liste officielle Adobe)

Source : [Creating Motion Graphics templates (After Effects)](https://helpx.adobe.com/after-effects/desktop/motion-graphics/work-with-motion-graphics-templates/creating-motion-graphics-templates.html).

Pour qu’un MOGRT **ne nécessite pas** After Effects installé chez le monteur :

- Renderer de composition : **Classic 3D uniquement** (pas Cinema 4D, pas Ray-traced 3D).
- Effets After Effects inclus : supportés **sauf** Camera-Shake Deblur, Synthetic Aperture Color Finesse, Maxon CINEWARE, Puppet, Warp Stabilizer.
- **Pas** de footage Dynamic Link (séquences Premiere, scènes Character Animator).
- **Pas** de footage FLV.
- **Pas** de plug-ins tiers.
- N’exposer dans Essential Graphics / Properties que les contrôles utiles (texte, couleurs, curseurs).

Éviter également : caméras 3D complexes, expressions non prises en charge, rendus lourds.

## Polices

- Préférer **Adobe Fonts** ou polices libres avec licence documentée dans `template.json` → `license`.
- Prévoir un remplacement si la police est absente (message dans FABRICATION.md).

## Responsive / formats

- Livrer **16:9 et 9:16** (entrées séparées dans le catalogue).
- Zones de sécurité titre / action respectées.
- Durées d’entrée / sortie exposées (`MM_InDuration` ou équivalent).
- Boucles : uniquement si le design le demande (overlays / social).

## Livraison

1. Exporter le `.mogrt` depuis AE ou Premiere.
2. Placer `mm-….mogrt` dans `assets/templates/<id>/` (nom = champ `mogrt` du JSON).
3. Passer `status` de `missing-mogrt` à `ready` dans `template.json`.
4. Lancer `npm run validate:templates` (doit rester vert).
5. Régénérer les aperçus si `previewSpec` change : `npm run previews`.

## Tests de rendu

- Insérer dans une séquence 1080p 30 fps et 1080×1920.
- Modifier chaque propriété maître depuis le panneau Properties.
- Vérifier que le rendu ne demande pas After Effects.

Voir aussi `docs/templates/MOGRT_STRUCTURE.md` et `docs/api/WP3-apis.md`.
