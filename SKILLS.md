# SKILLS — MasterMotion

## Avant de coder

1. Lire l’architecture existante
2. Vérifier la doc Adobe UXP Premiere (source de vérité)
3. Planifier de petits incréments testables
4. Documenter les limitations API

## Patterns à réutiliser

| Besoin | Emplacement |
| --- | --- |
| Erreurs typées | `src/core/errors/AppError.ts` |
| Logging | `src/core/logging/Logger.ts` |
| Semver host | `src/core/validation/semver.ts` |
| Compat host | `src/services/HostCompatibilityService.ts` |
| Projet / séquence | `src/premiere/project`, `src/premiere/sequence` |
| Mutations | `src/premiere/transactions/TransactionService.ts` |
| Contexte UI | `src/ui/hooks/useHostContext.ts` |

## Ajout d’une feature

1. Types purs + tests Node
2. Service feature
3. Appel Premiere encapsulé
4. Panel UI + états loading / empty / error
5. Capability flag dans `HostCompatibilityService`
6. Doc `docs/features/*` + entrée `CHANGELOG.md`

## Références Adobe

- https://developer.adobe.com/premiere-pro/uxp/plugins/
- https://developer.adobe.com/premiere-pro/uxp/ppro_reference/
- https://github.com/AdobeDocs/uxp-premiere-pro-samples
