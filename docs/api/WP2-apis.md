# WP2 — APIs Transcription / Captions

Référence : [Transcript](https://developer.adobe.com/premiere-pro/uxp/ppro_reference/classes/transcript/).  
Format JSON officiel (Adobe samples) : `transcript_format_spec.json` — documenté et échantillonné dans `tests/fixtures/transcript/`.

| Besoin | Classe.méthode | Since | Typée | Page Adobe | Risque |
| --- | --- | --- | --- | --- | --- |
| Transcrire clip | `Transcript.transcribeClipProjectItem` | 25.6 | oui | [transcript](https://developer.adobe.com/premiere-pro/uxp/ppro_reference/classes/transcript/) | Pack langue / auto-detect |
| Présence transcript | `Transcript.hasTranscript` | **26.3** | oui | idem | Absent &lt; 26.3 → probe |
| Langues | `Transcript.querySupportedLanguages` | **26.3** | oui | idem | Probe |
| Pack langue | `Transcript.isLanguagePackAvailable` | 25.6 | oui | idem | — |
| Export JSON | `Transcript.exportToJSON` | 25.6 | oui | idem | Format documenté Adobe |
| Import JSON → TextSegments | `Transcript.importFromJSON` | 25.6 | oui | idem | — |
| Appliquer import | `Transcript.createImportTextSegmentsAction` | 25.6 | oui | idem | **Bug connu** : transaction peut « réussir » sans commit → relecture `hasTranscript` / `exportToJSON` + repli SRT/VTT/JSON |
| Clip → ProjectItem | `TrackItem.getProjectItem` + `ClipProjectItem.cast` | 25.6 | oui | typings | — |

## Format JSON (résumé)

Racine : `{ language, speakers[], segments[] }`.  
Segment : `{ start, duration, language, speaker, words[] }`.  
Word : `{ text, start, duration, confidence, eos, tags[], type: "word"|"punctuation" }`.

Le parseur MasterMotion est **tolérant** (casse, champs manquants, alias) et ne suppose pas un export parfait.
