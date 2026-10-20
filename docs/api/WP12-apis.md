# WP12 — APIs IA facultative

L’IA n’utilise **aucune** classe Premiere pour l’inférence. Les appels réseau passent par `fetch` UXP, uniquement après consentement.

| Besoin | API | Since | Typée | Page | Risque |
| --- | --- | --- | --- | --- | --- |
| HTTP sortant | `fetch` (UXP global) | UXP | oui (DOM) | [fetch](https://developer.adobe.com/premiere-pro/uxp/uxp-api/reference-js/global-members/data-transfers/fetch) | Domaines déclarés dans le manifeste sinon blocage |
| Permission réseau | `requiredPermissions.network.domains` | Manifest v5 | — | [network recipe](https://developer.adobe.com/premiere-pro/uxp/resources/recipes/network/) | Liste stricte ; pas de wildcards TLD |
| Clé API locale | `localStorage` / UXP storage | — | — | — | Jamais dans le `.prproj`, jamais dans les logs |
| Transcription host | `Transcript.*` (WP2) | 25.6+ | oui | ppro-reference | Hors IA cloud — offline Premiere |

## Domaines déclarés (manifeste)

| Domaine | Fournisseur | Usage |
| --- | --- | --- |
| `https://api.openai.com` | OpenAI-compatible (opt-in) | Chat completions |
| _(aucun)_ | `mock` (défaut) | Zéro réseau |

## Règles MasterMotion

1. IA **désactivée par défaut** (`ai.enabled = false`).
2. **Un seul** fournisseur actif à la fois (`mock` | `openai`).
3. Consentement explicite + aperçu du payload avant chaque envoi.
4. Toute sortie = **proposition** (`AiProposal`) à valider — jamais apply silencieux sur la timeline.
5. Échec réseau = message clair, panneau non bloqué.
6. Tests : sans consentement → 0 appel `fetch` ; fournisseur simulé obligatoire en CI.
