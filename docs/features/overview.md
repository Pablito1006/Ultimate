# Features overview (PROMPT_MASTER §2)

| # | Feature | Status | Apply path |
| --- | --- | --- | --- |
| 1 | Créer / personnaliser animations | Opérationnel | Motion panel → template params → inject |
| 2 | Templates motion design | Opérationnel | Registry + MOGRT `insertMogrtFromPath` ou marker fallback |
| 3 | Sous-titres auto | Opérationnel (native + mock) | `TranscriptService` + Captions Studio ; mock offline fallback |
| 4 | Styles captions animés | Opérationnel (presets) | 12 styles ; apply = markers + metadata ; MOGRT WP3 |
| 5 | Analyser timeline | Opérationnel | `TimelineService.analyzeActive` |
| 6 | Suggérer / déclencher SFX | Opérationnel (suggestions) | Scoring + markers d’approbation |
| 7 | Automatiser audio | Partiel | Mute/unmute track ; pas de DSP inventé |
| 8 | Split screens | Opérationnel (layout + align) | `calculateGridLayout` + `createMoveAction` |
| 9 | Renommer clips en masse | Opérationnel | Preview + `createSetNameAction` |
| 10 | Macros / workflows | Opérationnel | `MacroRunner` + persist settings |
| 11 | Centraliser outils | Opérationnel | Navigation + Dashboard hub |

Cloud STT / AI providers : abstraction prête, non activée par défaut (offline-first).
