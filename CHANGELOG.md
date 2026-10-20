# Changelog

## 0.2.15 — 2026-10-19

### Added (WP13)

- Reproducible `.ccx` packaging via `fflate` (`npm run package`, cross-OS)
- macOS sideload script `release/install-macos.sh` + Windows installer **unofficial** warning
- i18n FR/EN (`src/i18n/`) — nav, Dashboard, Settings language switch
- Docs: getting-started (EN/FR), `LIMITS.md`, `LICENSES.md`, install + signing, master `manual-checklist.md`
- Dashboard card « Ce que MasterMotion ne fait pas »
- `docs/api/WP13-apis.md`, checklist WP13

### Notes

- Preferred distribution remains signed `.ccx` via Adobe Developer Distribution
- Sideload External is documented as non-official only

## 0.2.14 — 2026-10-19

### Added (WP12)

- Optional AI panel: `AiProvider` (mock + OpenAI-compatible), one provider at a time
- Explicit consent + payload preview before any send; disabled by default
- API key in local `AiKeyStore` only (never settings export / never logs)
- Use cases: translate, titles/hashtags, summary, highlights, B-roll suggestions — all as **proposals**
- Manifest `network.domains`: `https://api.openai.com` only
- Tests: no fetch without consent; mock offline; network/HTTP failure non-blocking
- `docs/api/WP12-apis.md`, manual checklist WP12

### Notes

- Mock is default for CI / honesty offline
- Outputs never auto-apply to timeline — accept+copy only

## 0.2.13 — 2026-10-19

### Added (WP11)

- Macros v2: `schemaVersion: 2` with variables, `if` / `loop` / `preview` / `setVar`, stop-on-error (default) + optional continueOnError
- Recipe library: « Préparer un short vertical », « Livraison YouTube », « Habillage interview » (+ builtins)
- Command palette Ctrl/Cmd+K (searchable nav + macros); configurable shortcut in Settings
- EventManager triggers opt-in (SequenceEvent / ProjectEvent) — never auto-enabled
- Versioned import/export with schema validation; Preview B macro-flow SVG
- `docs/api/WP11-apis.md`, manual checklist WP11
- Tests: expand/plan 10-step, stop-on-error preserves previous, EventService subscribe

### Notes

- Failed step does not roll back previous successes (use Premiere Undo); continueOnError is explicit
- Auto-run macros on host events require enabled trigger checkbox

## 0.2.12 — 2026-10-19

### Added (WP10)

- Delivery panel: bin template ingestion (`MM:01_Media`…), project template + sequence create, offline detect / guided relink, proxy attach
- Multi-platform export plan (YouTube, Shorts, Reels, TikTok, Instagram, archive, client preview) via `EncoderManager.exportSequence` (AME queue default)
- Pre-delivery QC report (JSON + text): offline, disabled clips, duration/aspect vs platform, caption reading rules, LUFS saisi ; black/freeze = unavailable
- Interchange: FCP XML / OTIO / AAF via `ProjectConverter` (26.2/26.3) ; EDL marked unavailable with manual Premiere path
- `ExportService`, `InterchangeService`, `BinService`, `ClipProjectItemService` ; fakePremiere export/bins/offline/proxy
- `docs/api/WP10-apis.md`, manual checklist WP10 ; honest Not undoable confirm for relink/proxy

### Notes

- Preset `.epr` path is user-supplied (no bundled AME presets)
- Productions: `PRProduction` read-only probe only
- Nested bins created as root-level named folders (parent FolderItem lookup limited)

## 0.2.11 — 2026-10-19

### Added (WP9)

- Assembly panel: silence detection (seuils + marqueurs d’abord), text-keep markers, jump cuts, hesitations, beat time import, multicam rename/align, sequence cleanup report
- Pure silence/hesitation/jump algorithms + synthetic unit tests
- Partial ripple remove for clips fully inside silence (`SequenceEditor.createRemoveItemsAction`)
- Honest unavailable: mid-clip razor cut, audio beat analysis, delete empty track
- `docs/api/WP9-apis.md`, manual checklist WP9
- Timeline reads `disabled` for cleanup; fakePremiere TrackItemSelection + remove

### Notes

- Default silence apply = markers `MM:Silence` (non-destructive)
- Text-based edit = `MM:Keep` markers (no invented sequence rebuild)

## 0.2.10 — 2026-10-19

### Added (WP8)

- Audio panel: ducking (speech segments → volume keyframes), auto fades, gain from external LUFS + platform targets
- Cleanup: append DeNoise/DeEsser when listed by `AudioFilterFactory.getDisplayNames`
- SFX catalog ≥100 (metadata) + `assets/sfx/LICENSE.md`; suggestions still approval-markers only
- Preview B volume curve SVG; `AudioFilterFactory.createComponentByDisplayName` path + Volume Level aliases
- Honest unavailable: loudness meter, SFX auto-insert media
- `docs/api/WP8-apis.md`, manual checklist WP8
- Tests: audioMath, sfx count, ducking/gain contract on fakePremiere

### Notes

- No UXP loudness API — user enters measured LUFS
- SFX binaries not shipped; never auto-insert media

## 0.2.9 — 2026-10-19

### Added (WP7)

- Color looks library (≥20 Lumetri-style Basic Correction presets) with intensity blend
- Apply / remove / harmonize on video clips via VideoFilterFactory + ComponentParam (re-read verify)
- Copy/paste look values in Color panel; overwrite-opt-in (no silent grade overwrite)
- Preview B before/after **approximate** (disclaimer) — not a true Lumetri render
- `assets/luts/` reference `.cube` + LICENSE (CC0); file LUT GUID apply marked **unavailable**
- Honest unavailable: auto color-match / pixel analysis
- `docs/api/WP7-apis.md`, manual checklist WP7
- Tests: lookMath/catalog, contract apply/verify/remove/harmonize on fakePremiere

### Notes

- Lumetri matchName discovered at runtime; if params missing → message + Effect Controls
- LUT files are for manual import only (ClipProjectItem expects Premiere LUT GUIDs)

## 0.2.8 — 2026-10-17

### Added (WP6)

- Speed panel: constant % / target duration / ramp presets (héros, montée-descente, ease)
- Pure duration math (exact) + PreviewablePlan A/B (`speed-curve`)
- Timeline reads `getSpeed` / `isSpeedReversed`; detects non-default / reversed clips
- Honest `unavailable`: speed write, reverse write, time-remap write, preserve audio pitch
- Documented fallback: Premiere Clip → Speed/Duration using plan values
- `docs/api/WP6-apis.md`, manual checklist WP6
- Tests: speedMath, speedRamps, contract read/detect/apply unavailable

### Notes

- Adobe UXP exposes read-only speed APIs (Since 25.6); no `createSetSpeedAction` in reference or typings
- Apply never fakes a speed change — re-read verify confirms snapshot only when write unavailable

## 0.2.7 — 2026-10-17

### Added (WP5)

- Real split screen: position + scale + crop via Motion component params; layouts 2/3/4/6/9 + asymmetric; verify ±1 px
- PiP (anchors, size, opacity); Opacity/blend panel (blend marked unavailable if not writable)
- Keying: append Ultra Key / Color Key when VideoFilterFactory allows — params may need manual Effect Controls
- Honest `unavailable`: masks, rounded corners; stabilize partial/unavailable by filter discovery
- Compositing panel + `docs/api/WP5-apis.md`
- Tests: geometry transform, split 4-cell contract, PiP/opacity, masks honesty

### Changed

- Split panel apply no longer “align only” — applies real transforms (WP5 acceptance)

## 0.2.6 — 2026-10-17

### Added (WP4)

- Native keyframe presets (≥30): punch-in, push-in, shake, whip pans, slides, bounce, Ken Burns, PiP, crop reveal, fades, blink, pulse, glitch nudge, etc.
- `src/features/motion/easing/` — pure curves (Penner, spring, cubic-bezier) + adaptive sampling
- `src/premiere/components/` — runtime param discovery by displayName aliases
- `src/premiere/keyframes/` — apply / verify / clear keyframe series via ComponentParam
- Presets panel: PreviewablePlan A/B, overwrite-opt-in, clean removal
- Tests: easing regression, catalog plan purity, contract apply/verify on fakePremiere
- `docs/api/WP4-apis.md`

### Notes

- Does not overwrite existing keyframes unless explicitly enabled
- Optional filters (blur) only when VideoFilterFactory / params exist — otherwise channel skipped honestly

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
