# RULES — MasterMotion

## Stack

- Adobe Premiere Pro **UXP** (pas CEP comme backend principal)
- TypeScript strict
- React 18
- Vite (bundle CJS pour UXP)
- `@adobe/premierepro` types + ESLint Premiere

## Compatibilité

- Minimum host : **Premiere Pro 25.6.0**
- Toute feature nécessitant une version supérieure doit être isolée et messagée clairement

## Architecture

1. UI React → services → couche `src/premiere/*` → `require("premierepro")`
2. Ne jamais muter le projet depuis un composant React
3. Mutations via `TransactionService` (`executeTransaction` / `lockedAccess`)
4. Ne jamais inventer une API Premiere

## Qualité

- `npm run typecheck`, `lint`, `test` doivent rester verts
- Une feature est réelle ou explicitement « not available » — pas de faux succès
- Pas de secrets / clés API dans le repo
- Logs : jamais de tokens, clés, secrets

## Produit

- Offline-first pour les outils locaux
- IA optionnelle et désactivée par défaut
- MVP d’abord (boot → UI → host → project/sequence → …)
