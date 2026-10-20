# Troubleshooting — chargement UDT

Voir aussi : [getting-started](../getting-started.md) · [install](../install/README.md) · [LIMITS](../LIMITS.md)

## Le panneau ne s’affiche pas

1. Vérifier **Developer Mode** dans Premiere, puis redémarrer
2. Pointer UDT vers `dist/manifest.json` (pas `public/`)
3. Relancer `npm run build` après modification du code
4. Après changement de `manifest.json` : **Unload → Load** (pas seulement Reload)

## « Premiere Pro UXP runtime not detected »

Normal hors Premiere (tests Node, preview navigateur). Charger le plugin dans Premiere via UDT.

## Version incompatible

MasterMotion exige **25.6.0+**. Mettre à jour Premiere ou isoler la feature.

## Build cassé

```bash
npm run clean
npm install
npm run build
npm run typecheck
npm run test
```
