# WP0 — APIs Premiere concernées

Référence : [Adobe Premiere Pro UXP ppro_reference](https://developer.adobe.com/premiere-pro/uxp/ppro_reference/).  
Types : `@adobe/premierepro` (package npm, version documentée dans `docs/compat.md`).  
Règle : aucune API inventée ; absente ou incertaine → `unavailable` dans `CapabilityService`.

| Besoin | Classe.méthode | Since | Typée | Page Adobe | Risque connu |
| --- | --- | --- | --- | --- | --- |
| Module host | `require("premierepro")` | 25.6 | oui | [ppro_reference](https://developer.adobe.com/premiere-pro/uxp/ppro_reference/) | Indisponible hors Premiere |
| Version host | `uxp.host.version` | UXP | oui (`cc-ext-uxp-types`) | [fundamentals/apis](https://developer.adobe.com/premiere-pro/uxp/resources/fundamentals/apis/) | `Application.version` non typé → UXP |
| Projet actif | `Project.getActiveProject` | 25.6 | oui | [project](https://developer.adobe.com/premiere-pro/uxp/ppro_reference/classes/project/) | Null si aucun projet |
| GUID projet | `Project.guid` | 25.6 | oui | idem | — |
| Séquence active | `Project.getActiveSequence` | 25.6 | oui | idem | Null si aucune |
| Liste séquences | `Project.getSequences` | 25.6 | oui | idem | — |
| GUID séquence | `Sequence.guid` | 25.6 | oui | [sequence](https://developer.adobe.com/premiere-pro/uxp/ppro_reference/classes/sequence/) | — |
| Transaction | `Project.executeTransaction` | 25.6 | oui (`boolean`) | [project](https://developer.adobe.com/premiere-pro/uxp/ppro_reference/classes/project/) | Peut renvoyer `true` sans effet (relecture obligatoire) |
| Verrou lecture | `Project.lockedAccess` | 25.6 | oui | idem | Callback synchrone uniquement |
| Pistes / clips | `Sequence.getVideoTrack` / `getAudioTrack` / `getTrackItems` | 25.6 | oui | [sequence](https://developer.adobe.com/premiere-pro/uxp/ppro_reference/classes/sequence/) | Lectures séquentielles lentes → batch + cache |
| Temps clip | `TrackItem.getStartTime` / `getEndTime` / `getDuration` / `getName` | 25.6 | oui | [videocliptrackitem](https://developer.adobe.com/premiere-pro/uxp/ppro_reference/classes/videocliptrackitem/) | **Pas de GUID clip exposé** → hash stable (D5) |
| Marqueurs | `Markers.getMarkers` / `createAddMarkerAction` | 25.6 | oui | [markers](https://developer.adobe.com/premiere-pro/uxp/ppro_reference/classes/markers/) | — |
| TickTime | `TickTime.createWithSeconds` | 25.6 | oui | [ticktime](https://developer.adobe.com/premiere-pro/uxp/ppro_reference/classes/ticktime/) | — |
| Sélection projet | `ProjectUtils.getSelection` | 25.6 | oui | [projectutils](https://developer.adobe.com/premiere-pro/uxp/ppro_reference/classes/projectutils/) | — |
| Rename | `ProjectItem.createSetNameAction` / `TrackItem.createSetNameAction` | 25.6 | oui | typings | — |
| Transcript | `Transcript.transcribeClipProjectItem` etc. | 25.6 / 26.3 | oui | [transcript](https://developer.adobe.com/premiere-pro/uxp/ppro_reference/classes/transcript/) | Probe runtime (WP2) |
| MOGRT | `SequenceEditor.insertMogrtFromPath` | 25.6 | oui | [sequenceeditor](https://developer.adobe.com/premiere-pro/uxp/ppro_reference/classes/sequenceeditor/) | Probe (WP3) |
| Effets / params | `VideoFilterFactory` / `Component` / `ComponentParam` | 25.6 | oui | [componentparam](https://developer.adobe.com/premiere-pro/uxp/ppro_reference/classes/componentparam/) | Écriture parfois illisible (probe) |
| Keyframes | `Keyframe` / `ComponentParam.createAddKeyframeAction` | 25.6 | oui | [keyframe](https://developer.adobe.com/premiere-pro/uxp/ppro_reference/classes/keyframe/) | Probe (WP4) |
| Captions | `CaptionTrack` | 25.6 | oui | [captiontrack](https://developer.adobe.com/premiere-pro/uxp/ppro_reference/classes/captiontrack/) | Écriture d’items limitée |
| Export | `EncoderManager` / `Exporter` | 25.6 | oui | [encodermanager](https://developer.adobe.com/premiere-pro/uxp/ppro_reference/classes/encodermanager/) | Probe (WP10) |
| Events | `EventManager` | 25.6 | oui | typings | Probe (WP11) |
| Source monitor | `SourceMonitor` | 25.6 | oui | typings | Probe |
| Proxys | `ClipProjectItem` | 25.6 | oui | [clipprojectitem](https://developer.adobe.com/premiere-pro/uxp/ppro_reference/classes/clipprojectitem/) | Probe (WP10) |

## Corrections WP0 liées

| Défaut | Correction |
| --- | --- |
| D5 IDs collision | Hash stable `trackKind + trackIndex + start + end + name + projectGuid` (pas de GUID clip API) |
| D6 lectures 1×1 | `Promise.all` par piste + cache invalidable |
| D7 types vs minVersion | Matrice `docs/compat.md` + contrôle de versions (`npm run verify`) |
| D9 transaction | `executeTransaction` → boolean vérifié ; appelants doivent relire |
| D10 tests | `src/testing/fakePremiere` + tests de contrat |
