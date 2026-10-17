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
| Transcript `transcribeClipProjectItem` | 🧪 | 🧪 | 🧪 | 🧪 |
| Transcript `hasTranscript` / `querySupportedLanguages` | ❌ | ❌ | ⚠️ 26.3+ | 🧪 |
| Captions Studio (parse / reading rules / export) | ✅ | ✅ | ✅ | ✅ |
| Captions 12 styles (presets markers) | ✅ | ✅ | ✅ | ✅ |
| Transcript re-import verify + SRT fallback | 🧪 | 🧪 | 🧪 | 🧪 |
| ComponentParam lecture | 🧪 | 🧪 | 🧪 | 🧪 |
| ComponentParam écriture | 🧪 | 🧪 | 🧪 | 🧪 |
| Keyframes | 🧪 | 🧪 | 🧪 | 🧪 |
| CaptionTrack écriture items | ⚠️ limité | ⚠️ | ⚠️ | 🧪 |
| EncoderManager / Exporter | 🧪 | 🧪 | 🧪 | 🧪 |
| EventManager | 🧪 | 🧪 | 🧪 | 🧪 |
| SourceMonitor | 🧪 | 🧪 | 🧪 | 🧪 |
| ClipProjectItem proxys | 🧪 | 🧪 | 🧪 | 🧪 |
| IA réseau | ❌ défaut off | ❌ | ❌ | ❌ (consentement WP12) |

| Cadre d’aperçu A (Rename/Split/Captions/Sound/Macros) | ✅ | ✅ | ✅ | ✅ |
| Aperçu B Rename (flip) / Split (grille SVG) | ✅ | ✅ | ✅ | ✅ |
| Aperçu B Captions karaoke | ✅ | ✅ | ✅ | ✅ |
| Aperçu C (copie séquence) | ❌ WP1 | ❌ | ❌ | ❌ |

Mise à jour : WP1 (2026-10-17). Actualiser à chaque chantier.
