# Architecture overview

## Couches

```text
src/ui              React panels & hooks (no premierepro import)
src/features        Feature engines (planned)
src/services        Cross-cutting services (compat, AI later)
src/premiere        Premiere adapters & domain services
src/core            Errors, logging, validation, types
src/main            Boot / lifecycle
```

## Flux lecture (MVP)

```text
DashboardPanel
  → useHostContext
    → ApplicationService.refreshContext
      → HostCompatibilityService.check  (ppro.version)
      → ProjectService.getActiveProject  (Project.getActiveProject)
      → SequenceService.getActiveSequence / listSequences
```

## Flux mutation (préparé, non exposé UI)

```text
FeatureService
  → TransactionService.execute / runLocked
    → Project.executeTransaction / Project.lockedAccess
```

## APIs Adobe utilisées (documentées)

| Usage | API | Min version |
| --- | --- | --- |
| Module Premiere | `require("premierepro")` | 25.6 |
| Version host | `require("uxp").host.version` | UXP (doc fundamentals) |
| Projet actif | `Project.getActiveProject()` | 25.6 |
| Séquence active | `Project.getActiveSequence()` | 25.6 |
| Liste séquences | `Project.getSequences()` | 25.6 |
| Transaction | `Project.executeTransaction(cb)` | 25.6 |
| Lock lecture | `Project.lockedAccess(cb)` | 25.6 |

Limitation typage : `Application.version` est documenté côté Adobe DOM, mais absent des typings publiés `@adobe/premierepro` (`Application = {}`). MasterMotion utilise donc `uxp.host.version` comme source de vérité runtime.

Sources :

- https://developer.adobe.com/premiere-pro/uxp/resources/fundamentals/apis/
- https://developer.adobe.com/premiere-pro/uxp/ppro_reference/
- https://developer.adobe.com/premiere-pro/uxp/ppro_reference/classes/project/
