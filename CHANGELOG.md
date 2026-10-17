# Changelog

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
