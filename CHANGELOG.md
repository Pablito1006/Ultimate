# Changelog

## 0.2.5 — 2026-10-17

### Added (WP3)

- Real motion template system: `template.json` schema, ≥45 designs × 16:9/9:16 (118 entries), status `missing-mogrt` until designer delivers `.mogrt`
- `npm run templates:generate` / `previews` / `validate:templates` / `fixture:mogrt`
- Template library (search, favorites, recents, user library path), MOGRT inspector + assisted draft
- Insertion via `SequenceEditor.insertMogrtFromPath` + ComponentParam / MogrtText writes with re-read; blocked when file missing (no fake success)
- PreviewablePlan motion + aperçu B SVG (`motion-template`)
- Docs: `docs/api/WP3-apis.md`, `docs/templates/AUTHORING.md`, `MOGRT_STRUCTURE.md`
- Tests: schema, mogrt fixture ZIP, motion preview plan, contract insert/verify on fakePremiere

### Notes

- Built-in catalog ships without binary `.mogrt` (honest « à fabriquer »)
- Param text write may fail on live Premiere (known UXP limits) → message + manual Essential Graphics edit

## 0.2.4 — 2026-10-17

### Added (WP2)

- `TranscriptService` — native Premiere Transcript API (transcribe, hasTranscript, languages, export/import) with capability probes
- Tolerant Premiere transcript JSON parser + Adobe format docs (`docs/transcript/FORMAT.md`, fixtures)
- Captions Studio: edit words, merge/split, vocabulary replace, re-import with verify + SRT/VTT/JSON fallback
- Reading-rules engine (≤42 chars/line, ≤2 lines, ≤17 cps, min/max duration, fillers)
- 12 caption style presets (MOGRT pending marked honestly for mask-reveal)
- Import/export SRT, VTT, JSON, TXT
- Tests: parser, reading rules, import/export, TranscriptService contract (≥20 cases)

### Notes

- No network / no AI translation (WP12)
- CaptionTrack item writing still via CAP markers
- Known Premiere import-commit quirk: verified by re-read; otherwise export fallback

## 0.2.3 — 2026-10-17

### Added (WP1)

- `src/features/preview/` — `PreviewablePlan`, `assertPlanReady`, `usePreviewSession`
- UI: `PreviewBar`, `PlanList`, `AnimatedPreview`, `TimelineMiniMap`
- Preview adapters: Rename, Split, Captions, Sound, Macros (`plan/describe/render/apply/verify`)
- Level B: rename flip animation, split SVG grid, captions karaoke
- Unit tests for pure `plan()` helpers and apply-without-plan guard
- `docs/api/WP1-apis.md`

### Changed

- Rename / Split / Captions / Sound / Macros panels: Apply disabled until Preview
- SplitScreenService delegates to `splitPreviewable`

### Notes

- Level C (trial on sequence copy) explicitly unavailable in WP1
- Split apply still aligns starts only (crop/scale → WP5)

## 0.2.2 — 2026-10-17

### Added (WP0)

- `src/testing/fakePremiere/` — in-memory `premierepro` for Node contract tests + scenario factories
- Contract tests for Project, Sequence, Transactions, Timeline, Markers, Rename, CapabilityService
- `CapabilityService` runtime probe + Settings → Diagnostic (export JSON)
- Stable clip IDs (`clipIdentity`) and batched timeline reads + cache (D5/D6)
- `TransactionService` checks `executeTransaction` boolean return (D9)
- `npm run verify` (typecheck + lint + test + build + manifest + versions)
- `docs/api/WP0-apis.md`, `docs/compat.md`, `VERSION`, manual checklist WP0

### Changed

- MarkerService / ClipRenameService route mutations through `TransactionService`
- Adapter injection hooks for tests (`setPremiereModuleForTests` / `setUxpModuleForTests`)

### Notes

- Types package `@adobe/premierepro` remains independent of host `minVersion` 25.6 — see `docs/compat.md`
- Live Premiere probes (MOGRT, ComponentParam write, Transcript) still marked partial until WP2+

## 0.2.1 — 2026-10-16

### Added

- Distribution utilisateur sans terminal : `release/Installer.bat` + `.ccx`
- `npm run package` pour générer le package Creative Cloud
- `release/LISEZMOI.txt` et désinstalleur double-clic

## 0.2.0 — 2026-10-15

### Added

- Timeline analysis (tracks, clips, markers, playhead, frame size)
- Motion template registry (12 categories) + injection (MOGRT path or marker fallback)
- Templates library panel (search, categories, favorites)
- Captions pipeline: mock STT → segmentation → kinetic styles → markers / SRT
- Sound design: event detection, SFX scoring, suggestion markers, audio mute helpers
- Split screen layout engine + clip align-to-playhead
- Batch rename with preview (find/replace, regex, numbering, case, prefix/suffix)
- Macro engine (run / duplicate / import / export) + built-in macros
- Settings persistence (theme, language, caption style, logging, macros)
- Dashboard tool hub linking all modules
- Unit tests for rename, layout, segmentation, sound scoring, macros

### Notes / limitations (honest)

- CaptionTrack item writing is limited in current Adobe typings → markers + SRT
- Split crop/scale needs Motion effect params or MOGRT (not invented)
- SFX never auto-inserts media without user approval
- AI layer remains disabled by default

## 0.1.0 — 2026-10-15

### Added

- Scaffold plugin UXP (manifest 5, Premiere 25.6+)
- Build Vite → bundle CJS `dist/index.js`
- Core : erreurs typées, logger, semver, Result
- `HostCompatibilityService` + détection version host
- `ProjectService` / `SequenceService` / `TransactionService` / `ApplicationService`
- UI React : shell navigation, Dashboard host/projet/séquence
- Tests unitaires (semver, errors, logger)
- Documentation README / RULES / SKILLS / architecture
