# Matrice de compatibilité MasterMotion

**Host minimum** : Premiere Pro **25.6.0** (`public/manifest.json` → `host.minVersion`).  
**Types npm** : `@adobe/premierepro` (voir `package.json` / script `verify:versions`).  
Les types Adobe sont versionnés indépendamment du numéro de build Premiere (ex. package `27.x-beta` documente des APIs « Since 25.6 / 26.3 / … »).  
MasterMotion **ne remonte pas** `minVersion` au numéro du package de types.

Légende : ✅ disponible · ⚠️ partiel / version supérieure · ❌ indisponible ou non testé · 🧪 probe runtime (`CapabilityService`)

| Fonction | 25.6 | 26.0 | 26.3 | Courante (probe) |
| --- | --- | --- | --- | --- |
| Projet / séquence (lecture) | ✅ | ✅ | ✅ | 🧪 |
| Transactions `executeTransaction` | ✅ | ✅ | ✅ | 🧪 |
| Timeline analyse (clips / marqueurs) | ✅ | ✅ | ✅ | 🧪 |
| Marqueurs (ajout) | ✅ | ✅ | ✅ | 🧪 |
| Rename batch | ✅ | ✅ | ✅ | 🧪 |
| Motion MOGRT `insertMogrtFromPath` | 🧪 | 🧪 | 🧪 | 🧪 |
| Motion template library + validate:templates | ✅ | ✅ | ✅ | ✅ |
| Motion param write (ComponentParam / MogrtText) | 🧪 | 🧪 | 🧪 | 🧪 partial |
| Motion aperçu B (SVG previewSpec) | ✅ | ✅ | ✅ | ✅ |
| Transcript `transcribeClipProjectItem` | 🧪 | 🧪 | 🧪 | 🧪 |
| Transcript `hasTranscript` / `querySupportedLanguages` | ❌ | ❌ | ⚠️ 26.3+ | 🧪 |
| Captions Studio (parse / reading rules / export) | ✅ | ✅ | ✅ | ✅ |
| Captions 12 styles (presets markers) | ✅ | ✅ | ✅ | ✅ |
| Transcript re-import verify + SRT fallback | 🧪 | 🧪 | 🧪 | 🧪 |
| ComponentParam lecture | 🧪 | 🧪 | 🧪 | 🧪 |
| ComponentParam écriture | 🧪 | 🧪 | 🧪 | 🧪 |
| Keyframes | 🧪 | 🧪 | 🧪 | 🧪 |
| Native presets (≥30) plan/apply/verify | ✅ fake | ✅ | ✅ | 🧪 live |
| Split réel position/scale/crop (±1 px) | ✅ fake | ✅ | ✅ | 🧪 live |
| PiP / Opacity | ✅ fake | ✅ | ✅ | 🧪 live |
| Keying (filter append) | 🧪 partial | 🧪 | 🧪 | 🧪 |
| Masques | ❌ | ❌ | ❌ | ❌ unavailable |
| Stabilisation native | ❌/🧪 | ❌/🧪 | ❌/🧪 | probe filters |
| Speed read `getSpeed` / `isSpeedReversed` | ✅ | ✅ | ✅ | 🧪 |
| Speed write / reverse write | ❌ | ❌ | ❌ | ❌ unavailable |
| Speed ramps / time remap write | ❌ | ❌ | ❌ | ❌ unavailable |
| Speed duration math + aperçu B courbe | ✅ | ✅ | ✅ | ✅ |
| Preserve audio pitch (API) | ❌ | ❌ | ❌ | ❌ unavailable |
| Looks Lumetri params (≥20) apply/verify | ✅ fake | ✅ | ✅ | 🧪 live |
| Look intensité / harmonisation / copier-coller | ✅ | ✅ | ✅ | ✅ |
| Aperçu B look (approximatif) | ✅ | ✅ | ✅ | ✅ |
| LUT fichier `.cube` via GUID | ❌ | ❌ | ❌ | ❌ unavailable |
| Match colorimétrique auto / pixels | ❌ | ❌ | ❌ | ❌ unavailable |
| Audio Volume keyframes (duck/fade/gain) | ✅ fake | ✅ | ✅ | 🧪 live |
| AudioFilterFactory cleanup filters | 🧪 | 🧪 | 🧪 | 🧪 |
| Loudness meter LUFS | ❌ | ❌ | ❌ | ❌ unavailable |
| SFX catalogue ≥100 + marqueurs approbation | ✅ | ✅ | ✅ | ✅ |
| SFX auto-insert média | ❌ | ❌ | ❌ | ❌ never |
| Aperçu B courbe volume | ✅ | ✅ | ✅ | ✅ |
| Silence detect + marqueurs MM:Silence | ✅ | ✅ | ✅ | ✅ |
| Silence ripple remove (clips entiers) | 🧪 partial | 🧪 | 🧪 | 🧪 |
| Mid-clip cut / razor | ❌ | ❌ | ❌ | ❌ unavailable |
| Montage texte (MM:Keep) | ✅ partial | ✅ | ✅ | ✅ |
| Jump cuts / hésitations | ✅ | ✅ | ✅ | ✅ |
| Beats import liste | ✅ | ✅ | ✅ | ✅ |
| Beat analysis audio | ❌ | ❌ | ❌ | ❌ unavailable |
| Multicam rename / align | ✅ fake | ✅ | ✅ | 🧪 live |
| Cleanup pistes vides | ❌ report | ❌ | ❌ | ❌ delete track |
| Easing sampling (pure) | ✅ | ✅ | ✅ | ✅ |
| VideoFilterFactory append (optional) | 🧪 | 🧪 | 🧪 | 🧪 |
| CaptionTrack écriture items | ⚠️ limité | ⚠️ | ⚠️ | 🧪 |
| EncoderManager / Exporter | 🧪 | 🧪 | 🧪 | 🧪 |
| EventManager | 🧪 | 🧪 | 🧪 | 🧪 |
| SourceMonitor | 🧪 | 🧪 | 🧪 | 🧪 |
| ClipProjectItem proxys | 🧪 | 🧪 | 🧪 | 🧪 |
| Delivery bins `FolderItem.createBinAction` | ✅ fake | ✅ | ✅ | 🧪 live |
| Delivery export plan + AME queue | ✅ fake | ✅ | ✅ | 🧪 live |
| Delivery QC JSON/texte | ✅ | ✅ | ✅ | ✅ |
| ProjectConverter FCP XML / OTIO | ❌ | ❌ | ⚠️ 26.2+ | 🧪 |
| ProjectConverter AAF | ❌ | ❌ | ⚠️ 26.3+ | 🧪 |
| Interchange EDL | ❌ | ❌ | ❌ | ❌ unavailable |
| Black / freeze frame detect | ❌ | ❌ | ❌ | ❌ unavailable |
| PRProduction create | ❌ | ❌ | ❌ | ❌ / lecture only |
| Macros v2 (variables / if / loop / preview) | ✅ | ✅ | ✅ | ✅ |
| Macros stopOnError / continueOnError | ✅ | ✅ | ✅ | ✅ |
| Command palette Ctrl/Cmd+K | ✅ | ✅ | ✅ | ✅ |
| EventManager macro triggers (opt-in) | 🧪 | 🧪 | 🧪 | 🧪 |
| Macro schema import validation v2 | ✅ | ✅ | ✅ | ✅ |
| IA mock (offline) | ✅ | ✅ | ✅ | ✅ |
| IA OpenAI (fetch) | ❌ défaut off | ❌ | ❌ | 🧪 consentement + domaine manifeste |
| IA sans consentement → 0 fetch | ✅ | ✅ | ✅ | ✅ |
| IA réseau | ❌ défaut off | ❌ | ❌ | ❌ sans consentement (WP12) |
| Package `.ccx` reproductible (`npm run package`) | ✅ | ✅ | ✅ | ✅ |
| Sideload External Windows / macOS | ✅ non officiel | ✅ | ✅ | 🧪 |
| Signature Adobe / Marketplace | ⚠️ hors CI | ⚠️ | ⚠️ | ⚠️ docs only |
| i18n FR/EN (Settings) | ✅ | ✅ | ✅ | ✅ |
| Docs LIMITS / LICENSES / getting-started | ✅ | ✅ | ✅ | ✅ |
| Checklist manuelle maître | ✅ | ✅ | ✅ | ✅ |

| Cadre d’aperçu A (Rename/Split/Captions/Sound/Macros) | ✅ | ✅ | ✅ | ✅ |
| Aperçu B Rename (flip) / Split (grille SVG) | ✅ | ✅ | ✅ | ✅ |
| Aperçu B Captions karaoke | ✅ | ✅ | ✅ | ✅ |
| Aperçu C (copie séquence) | ❌ WP1 | ❌ | ❌ | ❌ |

Mise à jour : WP13 (2026-10-19). Actualiser à chaque chantier.
