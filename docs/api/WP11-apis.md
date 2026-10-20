# WP11 — APIs Macros v2, palette, événements

| Besoin | Classe.méthode | Since | Typée | Page Adobe | Risque |
| --- | --- | --- | --- | --- | --- |
| Écouter projet | `EventManager.addEventListener(project, ProjectEvent.*, handler)` | 25.6 | oui | [eventmanager](https://developer.adobe.com/premiere-pro/uxp/ppro-reference/classes/eventmanager/) | Target = Project instance |
| Écouter séquence | `addEventListener(sequence, SequenceEvent.*, handler)` | 25.6 | oui | idem | `SELECTION_CHANGED`, `ACTIVATED`, `CLOSED` |
| Écoute globale | `addGlobalEventListener` / `removeGlobalEventListener` | 25.6 | oui | idem | Utile si pas de target |
| Retirer listener | `removeEventListener` | 25.6 | oui | idem | Même référence de handler |
| Encoder events | `EncoderManager` + `EVENT_RENDER_*` | 25.6 | oui | encodermanager | File AME (WP10) |
| Palette / raccourcis | — (UXP panel DOM) | — | — | UXP keyboard | Pas d’API Premiere — UI panel |
| Macros moteur | — (MasterMotion pur) | — | — | — | Variables / if / loop / stopOnError |

## Constantes utiles

| Enum | Valeurs | Usage macros |
| --- | --- | --- |
| `Constants.ProjectEvent` | OPENED, CLOSED, DIRTY, ACTIVATED, PROJECT_ITEM_SELECTION_CHANGED | Déclencheurs (opt-in) |
| `Constants.SequenceEvent` | ACTIVATED, CLOSED, SELECTION_CHANGED | Déclencheurs (opt-in) |

## Règles MasterMotion

- Déclencheurs **désactivés par défaut** ; jamais d’auto-apply sans consentement settings.
- Échec d’étape : **arrêt** par défaut ; étapes déjà appliquées **non annulées** (Undo Premiere) sauf option future explicite.
- Schéma macro `schemaVersion: 2` validé à l’import ; v1 migré.
