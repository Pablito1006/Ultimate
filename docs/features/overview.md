# Features overview (PROMPT_MASTER §2)

| # | Feature | Status | Apply path |
| --- | --- | --- | --- |
| 1 | Créer / personnaliser animations | Opérationnel (aperçu A/B) | Motion MOGRT + Presets keyframes (WP4) |
| 2 | Templates motion design | Opérationnel (catalogue) | 118 `template.json` ; `.mogrt` manquant = « à fabriquer » ; `validate:templates` |
| 3 | Sous-titres auto | Opérationnel (native + mock) | `TranscriptService` + Captions Studio ; mock offline fallback |
| 4 | Styles captions animés | Opérationnel (presets) | 12 styles ; apply = markers + metadata ; MOGRT WP3 |
| 5 | Analyser timeline | Opérationnel | `TimelineService.analyzeActive` |
| 6 | Suggérer / déclencher SFX | Opérationnel (suggestions) | Scoring + markers d’approbation |
| 7 | Automatiser audio | Opérationnel (WP8) | Ducking/fades/gain LUFS saisi ; SFX ≥100 marqueurs ; loudness meter unavailable |
| 8 | Split screens | Opérationnel (réel WP5) | Géométrie → Position/Scale/Crop ±1 px + align optionnel |
| 8b | Vitesse / rampes | Partiel (WP6) | Lecture getSpeed + maths exactes + aperçu B ; **écriture unavailable** (repli Speed/Duration) |
| 8c | Étalonnage / looks | Opérationnel (WP7) | ≥20 looks Lumetri-params + intensité ; LUT fichier = manuel ; aperçu B ≈ |
| 9 | Renommer clips en masse | Opérationnel | Preview + `createSetNameAction` |
| 9b | Assemblage / silences | Opérationnel (WP9) | Marqueurs d’abord ; remove clips entiers partial ; mid-clip unavailable |
| 9c | Livraison / QC / ingestion | Opérationnel (WP10) | Export AME planifié ; QC JSON/texte ; bins MM: ; relink/proxy confirmés Not undoable ; EDL unavailable |
| 10 | Macros / workflows | Opérationnel (WP11 v2) | Variables/if/loop/preview ; recettes ; palette Ctrl/Cmd+K ; EventManager opt-in |
| 11 | Centraliser outils | Opérationnel | Navigation + Dashboard hub |
| 12 | Distribution / i18n / docs | Opérationnel (WP13) | `.ccx` fflate ; install macOS + Windows non officiel ; FR/EN ; LIMITS/LICENSES |

Cloud STT / AI providers : panneau AI (WP12) — mock offline par défaut ; OpenAI opt-in + consentement ; propositions uniquement.

Distribution : préférer `.ccx` signé Adobe ; sideload External = secours documenté (`docs/install/README.md`).
