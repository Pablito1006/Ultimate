# WP10 — APIs Ingestion, organisation, livraison

| Besoin | Classe.méthode | Since | Typée | Page Adobe | Risque |
| --- | --- | --- | --- | --- | --- |
| Export séquence (file AME / immédiat) | `EncoderManager.getManager` + `exportSequence` | 25.6 | oui | [encodermanager](https://developer.adobe.com/premiere-pro/uxp/ppro-reference/classes/encodermanager/) | Sans `outputFile`/`presetFile` → réglages export appliqués ; `launchEncoder` / XMP = 26.3+ |
| Extension fichier depuis preset | `EncoderManager.getExportFileExtension` | 25.6 | oui | idem | Chemin preset `.epr` utilisateur requis |
| Encode clip / fichier | `encodeProjectItem` / `encodeFile` | 25.6 | oui | idem | Proxys / media file |
| Frame still | `Exporter.exportSequenceFrame` | 25.6 | oui | [exporter](https://developer.adobe.com/premiere-pro/uxp/ppro-reference/classes/exporter/) | Formats bmp/dpx/gif/jpg/exr/png/tga/tif |
| Offline / relink | `ClipProjectItem.isOffline` / `canChangeMediaPath` / `changeMediaFilePath` | 25.6 | oui | [clipprojectitem](https://developer.adobe.com/premiere-pro/uxp/ppro-reference/classes/clipprojectitem/) | **Not undoable** — confirmation UI |
| Proxys | `canProxy` / `attachProxy` / `hasProxy` / `getProxyPath` | 25.6 | oui | idem | **Not undoable** |
| Set offline | `createSetOfflineAction` | 25.6 | oui | idem | Via transaction |
| Créer chutier | `FolderItem.createBinAction` | 25.6 | oui | [folderitem](https://developer.adobe.com/premiere-pro/uxp/ppro-reference/classes/folderitem/) | Root via `Project.getRootItem` |
| Déplacer item | `createMoveItemAction` | 25.6 | oui | idem | — |
| Import médias | `Project.importFiles` | 25.6 | oui | [project](https://developer.adobe.com/premiere-pro/uxp/ppro-reference/classes/project/) | Paths locaux ; suppressUI |
| Créer séquence | `createSequence` / `createSequenceWithPresetPath` / `createSequenceFromMedia` | 25.6 | oui | idem | Preset path optionnel |
| Interchange FCP XML | `ProjectConverter.exportAsFinalCutProXML` | **26.2** | oui | [projectconverter](https://developer.adobe.com/premiere-pro/uxp/ppro-reference/classes/projectconverter/) | DaVinci / AE via XML |
| Interchange OTIO | `exportAsOpenTimelineIO` | **26.2** | oui | idem | — |
| Interchange AAF | `exportAAF` | **26.3** | oui | idem | Options AAF |
| Interchange EDL | — | — | non | — | **unavailable** — File → Export → EDL manuel |
| Productions | `PRProduction.getActiveProduction` | 25.6? | oui (minimal) | — | Lecture scratch seulement ; pas de création Production |
| Images noires / gelées | — | — | non | — | **unavailable** — pas d’accès pixels UXP |
| Métadonnées colonnes | `Metadata.getProjectMetadata` / `createSetXMPMetadataAction` | 25.6 | oui | metadata | Appliquer avec parcimonie |

## Types d’export (`Constants.ExportType`)

| Constante | Usage MasterMotion |
| --- | --- |
| `QUEUE_TO_AME` | Défaut livraison multi-plateformes |
| `QUEUE_TO_APP` | File d’export Premiere |
| `IMMEDIATELY` | Export immédiat (bloquant côté host) |

## Algorithmes MasterMotion (purs)

- **Nommage** : `{project}_{sequence}_{platform}_{yyyyMMdd}.{ext}` + sanitization.
- **QC** : offline, disabled, durée vs plateforme, safe-area aspect, captions hors règles (si cues fournis) ; volume = score si LUFS saisi.
- **Bins** : modèle `MM:01_Media` / `02_Sequences` / `03_Graphics` / `04_Audio` / `05_Exports`.
