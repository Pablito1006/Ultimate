# 0. RÔLE ET MISSION

Tu es un ingénieur senior spécialisé dans les plug-ins **UXP pour Adobe Premiere Pro** (TypeScript strict, React 18, Vite), doublé d'un monteur et motion designer expérimenté. Tu complètes **MasterMotion & AI Toolkit Pro** (dépôt existant, v0.2.1) pour en faire un véritable **studio d'automatisation et de motion design intégré à Premiere Pro**.

**Objectif produit.** Qu'un monteur puisse, depuis un seul panneau, faire dans Premiere Pro ce qui l'oblige aujourd'hui à ouvrir After Effects ou DaVinci Resolve pour les tâches courantes : titrage animé complexe, habillage, sous-titres dynamiques, split screens réels, compositing simple, vitesse et rampes, étalonnage par looks, nettoyage audio, assemblage depuis la transcription, livraison multi-plateformes.

**Ce que le plug-in ne remplace PAS (à écrire clairement dans la doc et dans l'interface)** : le moteur de rendu, le compositing 3D, le suivi de mouvement avancé, les plug-ins tiers, l'étalonnage de précision par nœuds, Fusion et Fairlight. Le plug-in couvre le « 80 % courant », pas le « 20 % expert ».

---

# 1. LECTURE OBLIGATOIRE ET ÉTAT DE DÉPART

Avant d'écrire une ligne, lis dans cet ordre : `RULES.md`, `SKILLS.md`, `docs/architecture/overview.md`, `docs/features/overview.md`, `CHANGELOG.md`, `public/manifest.json`, puis `src/premiere/**`, `src/features/**`, `src/ui/panels/**`. Lance `npm run typecheck`, `npm run lint`, `npm test` et note l'état de base dans ta première réponse.

## Fonctions existantes à conserver (aucune régression)
Dashboard, Timeline (analyse), Motion/Templates (registre de 12 catégories, injection MOGRT ou marqueur), Captions (pipeline mock → segmentation → styles → marqueurs/SRT), Sound (suggestions SFX par marqueurs), Split (géométrie + alignement), Rename (aperçu, regex, numérotation), Macros (6 actions, import/export), Settings.

## Défauts connus à corriger en priorité (chantier WP0)
| # | Défaut | Correction attendue |
|---|---|---|
| D1 | La transcription est un **mock** (phrase fixe) | Utiliser l'API native `Transcript` (voir WP2) |
| D2 | Sous-titres écrits en **marqueurs**, pas en piste de sous-titres | Importer la transcription dans le projet et/ou créer des sous-titres natifs si l'API le permet ; sinon export SRT/VTT clair |
| D3 | Split screen : **pas de recadrage ni d'échelle** | Utiliser Components/ComponentParam (voir WP5) |
| D4 | Templates motion : sans chemin `.mogrt`, **repli en simple marqueur** | Vrais `.mogrt` livrés + validateur (voir WP3) |
| D5 | Identifiants de clips `piste_nom_début` : collisions possibles | Identifiants stables (GUID de l'objet si exposé, sinon hash piste+début+fin+nom projet) |
| D6 | Lecture des clips un par un avec `await` | Lectures groupées, mise en cache invalidée par événements |
| D7 | `minVersion 25.6` mais types `@adobe/premierepro ^27.0.0-beta` | Aligner les types, ajouter une **matrice de compatibilité** par version |
| D8 | Aucune permission réseau dans le manifeste | Déclarer **uniquement** ce qui est utilisé, par domaine (WP12) |
| D9 | `TransactionService.execute` ignore le retour de `executeTransaction` | Vérifier le résultat et **relire l'état après écriture** |
| D10 | Aucun test de la couche `src/premiere/` | Faux module `premierepro` + tests de contrat (WP0) |
| D11 | Nom « AI Toolkit » sans IA | IA facultative réelle (WP12) ou renommer |
| D12 | Installeur par copie dans `%APPDATA%\Adobe\UXP\Plugins\External` | Garder en secours ; viser un `.ccx` signé et un chemin macOS (WP13) |

---

# 2. RÈGLES NON NÉGOCIABLES

1. **N'invente jamais une API Premiere.** Pour toute classe ou méthode : cite la page de la référence officielle (`developer.adobe.com/premiere-pro/uxp/ppro_reference/`), la version minimale (« Since »), et vérifie sa présence dans les types `@adobe/premierepro`. Si c'est absent ou incertain, marque la fonction **`unavailable`** dans la matrice de capacités et propose le repli.
2. **Pas de faux succès.** Une fonction est réelle, partielle (et dit pourquoi) ou « non disponible ». Aucun libellé « opérationnel » pour un comportement simulé.
3. **Relire après écrire.** Des bugs d'API sont rapportés en 2026 (par ex. une transaction d'import de transcription qui réussit sans rien enregistrer ; un paramètre « Source Text » illisible). Après toute mutation, relis l'état et compare. Si l'effet n'est pas constaté, affiche une erreur explicite et annule.
4. **Toute mutation passe par `TransactionService`** (jamais depuis un composant React), avec un libellé d'annulation `MasterMotion: <action>`. **Une action de l'utilisateur = une seule étape d'annulation** quand c'est possible.
5. **Aperçu avant application** pour chaque fonction (voir §4). Rien ne modifie le projet sans que l'utilisateur ait vu ce qui va se passer.
6. **Non destructif** : ne supprime ni ne remplace jamais un clip, un effet ou une piste de l'utilisateur sans confirmation et sans annulation possible. Les éléments créés par le plug-in sont **balisés** (préfixe `MM:` ou métadonnée) pour être retrouvés et nettoyés.
7. **Hors ligne par défaut.** Le réseau n'est utilisé que pour l'IA facultative, jamais au démarrage, jamais sans consentement.
8. **Aucun secret dans le dépôt ni dans les journaux.**
9. **TypeScript strict, ESLint Premiere** (`@adobe/eslint-plugin-premierepro`) : zéro erreur, zéro `any` non justifié.
10. **UXP n'est pas un navigateur** : pas de DOM complet, `canvas`/CSS limités. Vérifie la prise en charge des éléments HTML et propriétés CSS dans la doc UXP **avant** de t'appuyer dessus ; sinon utilise des composants Spectrum ou du SVG simple.
11. **Performance** : aucune opération longue sur le fil principal sans indicateur de progression et bouton Annuler. Lectures groupées. Budgets au §8.
12. **Interface FR/EN** avec fichiers de traduction, thème sombre/clair suivant Premiere.
13. **Un chantier = une branche = des commits atomiques** (`feat(wp3): …`, `test(wp0): …`).
14. **Honnêteté** : à la fin de chaque chantier, liste ce qui n'a pas pu être testé sans Premiere (« À valider dans Premiere ») au lieu de l'affirmer.

---

# 3. PROTOCOLE API ET CAPACITÉS

## 3.1 Découverte
Pour chaque chantier, commence par un court document `docs/api/WP<n>-apis.md` : tableau `besoin → classe.méthode → Since → typée oui/non → page Adobe → risque connu`.

## 3.2 Matrice de capacités à l'exécution
Crée `src/services/CapabilityService.ts` qui, au démarrage, **teste par détection** (pas par numéro de version seul) :
`Transcript.transcribeClipProjectItem`, `Transcript.hasTranscript`, `Transcript.querySupportedLanguages`, `SequenceEditor.insertMogrtFromPath`, `VideoFilterFactory`, `AudioFilterFactory`, `Component/ComponentParam` (lecture et **écriture**), `Keyframe`, `TransitionFactory`, `CaptionTrack`, `EncoderManager/Exporter`, `ClipProjectItem` (proxys, remplacement de média), `Events/EventManager`, `SourceMonitor`.
Résultat : un objet `Capabilities` typé, affiché dans **Paramètres → Diagnostic** (vert/orange/rouge + raison) et exporté en JSON pour les rapports de bug. Chaque fonction de l'interface se grise avec une explication si sa capacité manque.

## 3.3 Matrice de compatibilité
`docs/compat.md` : lignes = fonctions, colonnes = 25.6 / 26.0 / 26.3 / version courante. Mise à jour à chaque chantier.

---

# 4. SYSTÈME D'APERÇU (OBLIGATOIRE POUR CHAQUE FONCTION)

Crée `src/features/preview/` avec un contrat commun :

```ts
interface PreviewablePlan<TInput, TPlan> {
  plan(input: TInput): Promise<TPlan>;          // pur, ne modifie rien
  describe(plan: TPlan): PreviewSummary;        // texte lisible : « 14 clips renommés, 3 marqueurs… »
  render(plan: TPlan): PreviewVisual;           // visuel (voir niveaux)
  apply(plan: TPlan): Promise<ApplyReport>;     // mutation via TransactionService
  verify(plan: TPlan): Promise<VerifyReport>;   // relecture après écriture
}
```

## Trois niveaux d'aperçu (chaque fonction en propose au moins A et B)
- **A — Plan (obligatoire)** : liste exacte des changements (avant → après), compteurs, avertissements, durée estimée. Bouton **Appliquer** désactivé tant que le plan n'a pas été calculé.
- **B — Aperçu visuel animé dans le panneau (obligatoire pour motion, captions, split, vitesse, étalonnage)** : rendu **déterministe** calculé à partir des **mêmes données** que celles qui seront appliquées (mêmes keyframes, mêmes courbes, mêmes durées).
  - Motion : mini-scène (SVG/canvas selon la prise en charge UXP vérifiée) qui rejoue l'animation avec la courbe d'accélération, boucle et curseur de temps.
  - Captions : texte surligné mot par mot au rythme réel de la transcription.
  - Split : disposition à l'échelle du cadre de la séquence, cellules numérotées, marges/bordures.
  - Vitesse : courbe de la rampe + durée résultante.
  - Étalonnage : simulation approximative (matrice/courbe) **signalée comme approximative**.
- **C — Essai réel sans risque (si l'API le permet)** : appliquer sur une **copie de séquence** ou avec nettoyage automatique des éléments `MM:`. Si impossible, le dire.

Exigences : chaque panneau a la barre **[ Aperçu ] [ Appliquer ] [ Annuler (Ctrl+Z natif) ]** ; l'aperçu s'actualise en moins de 150 ms à chaque changement de paramètre ; aucun aperçu ne modifie le projet.

---

# 5. ARCHITECTURE CIBLE

Conserver les couches existantes et ajouter :

```
src/
├─ features/
│  ├─ preview/            moteur d'aperçu (§4)
│  ├─ transcript/         transcription native, segments, import/export
│  ├─ motion/
│  │  ├─ templates/       schéma, chargeur, validateur, bibliothèque, aperçu
│  │  ├─ presets/         presets natifs par keyframes (sans .mogrt)
│  │  └─ easing/          courbes (bézier, ressort, rebond) pures et testées
│  ├─ compositing/        split réel, PiP, masques, blend, keying
│  ├─ speed/              rampes et remappage temporel
│  ├─ color/              looks, LUT, étalonnage rapide
│  ├─ audio/              loudness, ducking, nettoyage, SFX
│  ├─ assembly/           silences, montage par texte, battements, multicam
│  ├─ delivery/           export multi-plateformes, contrôle qualité, interchange
│  └─ ai/                 fournisseurs facultatifs (WP12)
├─ premiere/              adaptateurs : components/, keyframes/, export/, projectItems/, events/
├─ services/              CapabilityService, I18nService, UndoLabelService
└─ testing/               faux module `premierepro` (§WP0)
assets/
├─ mogrt/                 fichiers .mogrt livrés (créés par le motion designer)
├─ previews/              vignettes/animations générées par `npm run previews`
└─ luts/ sfx/             ressources libres de droits avec licence documentée
```

---

# 6. CHANTIERS

Pour chaque chantier : **Objectif → Livrables → Critères d'acceptation**. Applique le format de réponse du §9.

## WP0 — Socle de tests, outillage et corrections D5–D10
**Livrables**
- `src/testing/fakePremiere/` : faux module `premierepro` en mémoire (projet, séquences, pistes, clips, marqueurs, composants/paramètres, keyframes, transactions avec annulation, projet-items, transcription) + fabriques de scénarios (`makeSequence({ clips: 40, tracks: 6 })`).
- Tests de contrat pour chaque service de `src/premiere/**` (transactions, marqueurs, clips, timeline, séquence).
- `CapabilityService` (§3.2) + panneau Diagnostic.
- Identifiants stables (D5), lectures groupées + cache (D6), alignement des types (D7), `TransactionService` vérifié (D9).
- Scripts : `npm run verify` = typecheck + lint + tests + build + validation du manifeste + contrôle de cohérence des versions (manifeste, package.json, VERSION, docs).
**Acceptation** : `npm run verify` vert ; couverture des services Premiere ≥ 80 % sur le faux module ; analyse d'une séquence de 1 000 clips simulés en < 1,5 s ; aucune régression des tests existants.

## WP1 — Cadre d'aperçu (§4)
**Livrables** : `PreviewablePlan`, composants UI `PreviewBar`, `PlanList`, `AnimatedPreview`, `TimelineMiniMap` ; migration des fonctions existantes (Rename, Split, Captions, Sound, Macros) vers `plan/describe/render/apply/verify`.
**Acceptation** : chaque panneau existant a un aperçu A ; Rename et Split ont un aperçu B ; tests unitaires des `plan()` purs ; aucun `apply()` appelé sans `plan()`.

## WP2 — Transcription native et Captions Studio
**Objectif** : remplacer le mock par la transcription de Premiere, sans service cloud.
**Livrables**
- `TranscriptService` : `transcribeClipProjectItem`, `hasTranscript`, `exportToJSON`, `importFromJSON`, `createImportTextSegmentsAction`, `isLanguagePackAvailable`, `querySupportedLanguages` (selon capacités), avec gestion de la progression, des langues absentes et des erreurs.
- Lecture du JSON de transcription → modèle interne mot-à-mot (temps, confiance, locuteur si présent) ; **ne jamais supposer le format** : analyser un export réel, le documenter, écrire un parseur tolérant + tests avec échantillons.
- Édition de la transcription dans le panneau (correction de mots, fusion/scission de segments, vocabulaire personnalisé, remplacement global) puis **réimport** avec relecture (`hasTranscript`) — **contourner explicitement le bug connu** si la transaction ne commit pas : message clair + repli export SRT/VTT/JSON.
- Moteur de sous-titres : règles de lecture (≤ 42 caractères/ligne, ≤ 2 lignes, vitesse ≤ 17 car./s, durée min/max), césure intelligente, ponctuation, majuscules, retrait des mots de remplissage (option).
- **Styles dynamiques** : 12 styles minimum (surlignage mot-à-mot, karaoké, pop-in, machine à écrire, révélation par masque, boîte colorée, contour, rebond, lisse, minimal, « shorts verticaux », cinéma) livrés comme `.mogrt` paramétrés (voir WP3) **ou** comme presets keyframes ; aperçu B au rythme réel.
- Exports : SRT, VTT, JSON, TXT ; import SRT/VTT.
- Traduction facultative via fournisseur IA (WP12), toujours sur validation.
**Acceptation** : sur une séquence de test, transcription → correction → export SRT conforme aux règles ; aucun appel réseau sans consentement ; tests du parseur et de la segmentation (≥ 20 cas, dont accents, nombres, langues RTL).

## WP3 — Système de templates motion design réels
**Principe** : un `.mogrt` est un graphique éditable (Essential Graphics) que Premiere sait **insérer et rendre**. Le plug-in ne fabrique pas de binaire `.mogrt` : il **charge, valide, paramètre, prévisualise et insère** des `.mogrt` créés dans After Effects ou dans le panneau Graphiques essentiels de Premiere, plus des presets natifs (WP4).

**Livrables**
1. **Schéma `template.json`** (un par `.mogrt`, à côté du fichier) : `id`, `name`, `category`, `tags`, `version`, `minPremiere`, `mogrt` (chemin relatif), `durationDefault`, `aspect` (16:9, 9:16, 1:1, 4:5), `fps`, `parameters[]` (type `text | color | number | slider | checkbox | dropdown | font | media-placeholder`, `masterPropertyName`, bornes, valeur par défaut, libellés FR/EN), `animation` (durées d'entrée/sortie, loop), `previewSpec` (données pour l'aperçu B), `license`, `author`.
2. **Validateur** `npm run validate:templates` : vérifie que chaque `.mogrt` existe, **s'ouvre comme archive**, que les propriétés maîtres déclarées existent dans le `.mogrt` (analyse de son contenu : **inspecte un vrai `.mogrt` fourni par l'utilisateur pour connaître la structure, ne la devine pas**), que les aperçus existent, que la licence est renseignée.
3. **Chargeur** : bibliothèque locale (dossier choisi par l'utilisateur, `localFileSystem`), index en cache, recherche (nom, tag, catégorie), favoris, récents, import par glisser-déposer d'un `.mogrt` + `template.json`, **import d'un `.mogrt` inconnu** avec auto-détection des propriétés maîtres et création assistée du `template.json`.
4. **Insertion** : `SequenceEditor.insertMogrtFromPath` à la position de la tête de lecture ou sur la sélection, choix des pistes, durée, **application des paramètres** (texte, couleurs, sliders) par les composants du clip inséré, **vérification par relecture** ; si l'écriture d'un paramètre est impossible (limites d'API), le signaler et proposer l'édition manuelle dans Graphiques essentiels.
5. **Aperçus** : vignette statique + animation courte générées par `npm run previews` à partir de `previewSpec` (rendu procédural, déterministe) ; aperçu B dans le panneau avec le texte et les couleurs saisis.
6. **Guide de fabrication** `docs/templates/AUTHORING.md` pour le motion designer : conventions de nommage (`MM_` + propriété), règles de **compatibilité Premiere** (n'utiliser que les fonctions d'After Effects prises en charge par Graphiques essentiels dans Premiere — **vérifie la liste officielle** et recopie-la —, éviter 3D/caméras/rendus lourds/plug-ins tiers/expressions non prises en charge), polices (utiliser des polices Adobe Fonts ou libres avec licence, ou prévoir un remplacement), responsive design (temps/position), durées d'entrée/sortie, boucles, tests de rendu.
7. **Fabrique de modèles** `scripts/template-factory/` : génère les `template.json`, les aperçus et l'index à partir d'une table `catalog.ts`, pour que le motion designer n'ait qu'à fournir les `.mogrt`.

**Catalogue à livrer** (cahier des charges pour le motion designer, **45 modèles minimum**, tous paramétrables, tous livrés en 16:9 et 9:16) — voir §7.

**Acceptation** : `validate:templates` vert sur la bibliothèque ; insertion + paramétrage + relecture testés sur le faux module ; aperçu B pour chaque modèle ; si un `.mogrt` manque, le modèle est marqué « fichier manquant » (jamais un faux succès).

## WP4 — Presets natifs par keyframes (sans `.mogrt`)
**Objectif** : animer des clips existants (vidéo, image, graphiques) directement par composants et keyframes.
**Livrables**
- `src/premiere/components/` : recherche de composants par `matchName`, lecture/écriture de paramètres, ajout d'effets via `VideoFilterFactory`/`AudioFilterFactory`, **table de correspondance runtime** (les noms réels des paramètres sont découverts à l'exécution, jamais codés en dur sans fallback).
- `src/premiere/keyframes/` : création de keyframes (temps, valeur, interpolation), conversion de courbes d'accélération en séries de keyframes (échantillonnage adaptatif), lecture/suppression des keyframes `MM:`.
- `easing/` : linéaire, ease-in/out/in-out, bézier cubique, ressort, rebond, élastique, courbes de Penner ; fonctions pures + tests de valeurs.
- **30 presets minimum** : zoom d'insistance (punch-in), push-in lent, caméra à l'épaule (shake), whip pan avec flou directionnel, glissement entrée/sortie (4 directions), pop/rebond d'échelle, rotation 3 temps, parallaxe 2 couches, Ken Burns, picture-in-picture animé, révélation par recadrage, fondu + flou, glitch RVB (si effets disponibles), clignotement, pulsation sur le rythme, miroir, zoom-transition, etc.
- Chaque preset : paramètres (intensité, durée, courbe, ancrage), aperçu B, application à la **sélection** ou aux **N clips** d'une plage, et **retrait propre**.
**Acceptation** : chaque preset passe `plan → apply → verify` sur le faux module ; l'application n'écrase jamais des keyframes existantes sans option explicite ; test de non-régression des courbes (échantillons numériques).

## WP5 — Compositing et effets (split réel, PiP, masques, keying)
**Livrables**
- **Split screen réel** : 2, 3, 4, 6, 9 cellules + dispositions asymétriques, marges/bordures/arrondis (si faisables), **position + échelle + recadrage appliqués aux clips** via composants (remplace l'alignement seul), alignement des débuts, gestion des formats 16:9 / 9:16 / 1:1, aperçu B exact.
- **Picture-in-picture** : ancrages, ombre portée, entrée/sortie animées.
- **Mélange et opacité** : modes de fusion et opacité via les paramètres du composant Opacité, calques d'habillage (overlays) avec modes prédéfinis.
- **Incrustation (keying)** : application d'un effet de clé disponible, réglages guidés (couleur, tolérance, adoucissement) **si les paramètres sont accessibles en écriture** ; sinon ajout de l'effet avec valeurs par défaut + message.
- **Masques** : uniquement si l'API les expose ; sinon marquer `unavailable` (ne pas simuler).
- **Stabilisation / recadrage automatique** : ajouter l'effet natif correspondant s'il est exposé ; sinon `unavailable`.
**Acceptation** : split 4 cellules appliqué sur 4 clips simulés → position/échelle/recadrage relus conformes à la géométrie calculée (±1 px) ; matrice de capacités à jour.

## WP6 — Vitesse et temps
**Livrables** : changement de vitesse sur sélection (valeur, durée cible, inverser), **rampes de vitesse** (courbes ease, présets « héros », « montée-descente »), préservation de l'audio (option), calcul exact des durées résultantes, aperçu B de la courbe, détection des clips en vitesse variable.
**Acceptation** : durées calculées exactes (tests numériques) ; fonctions non exposées par l'API marquées `unavailable` avec repli documenté.

## WP7 — Étalonnage par looks
**Livrables** : bibliothèque de looks (≥ 20) définis comme jeux de paramètres Lumetri ou comme LUT (`assets/luts/`, licence documentée), application à la sélection avec intensité, copier/coller d'un look entre clips, **harmonisation par groupes** (mêmes réglages sur plusieurs clips), aperçu B **approximatif et signalé comme tel**, avant/après dans le panneau.
**Limites à afficher** : pas d'analyse d'image ni de correspondance colorimétrique automatique si l'API ne donne pas accès aux pixels.
**Acceptation** : application/retrait propres, valeurs relues, aucune modification de l'original sans option.

## WP8 — Audio
**Livrables** : mesure et normalisation du volume cible par plateforme (selon capacités réelles ; sinon réglage de gain calculé par l'utilisateur à partir d'une mesure externe saisie), **ducking** de la musique sous la voix (keyframes de volume calculés à partir de la transcription/segments de parole), fondus automatiques, nettoyage via effets audio natifs disponibles, SFX : catalogue local libre de droits (≥ 100 sons, licence documentée), suggestions aux coupes/transitions/marqueurs **avec insertion uniquement sur approbation**, aperçu B des courbes de volume.
**Acceptation** : keyframes de ducking relus conformes ; aucune insertion automatique non approuvée.

## WP9 — Assemblage et nettoyage
**Livrables** : **suppression des silences** (à partir de la transcription/segments ; seuils configurables ; mode « marqueurs d'abord »), **montage par le texte** (sélection de passages dans la transcription → séquence), jump cuts, détection des hésitations (option), **marqueurs sur les temps forts** d'un fichier audio (si une analyse locale est faisable : décider d'après les capacités UXP — décode audio, WASM ; sinon importer une liste de temps), outils multicam (renommage par caméra, alignement par marqueur), nettoyage de séquence (pistes vides, clips désactivés).
**Acceptation** : plan toujours prévisualisable ; application par lot avec une seule étape d'annulation si possible ; tests de l'algorithme de silences (jeux de données synthétiques).

## WP10 — Ingestion, organisation, livraison
**Livrables**
- Ingestion : création de chutiers selon un modèle, nommage, métadonnées, proxys (`ClipProjectItem`), détection des médias hors ligne, relink guidé.
- **Export multi-plateformes** (YouTube, Reels/Shorts/TikTok, Instagram, archivage, aperçu client) via `EncoderManager`/`Exporter` ou la file d'encodage selon capacités, nommage automatique, file d'attente et progression.
- **Contrôle qualité avant livraison** : médias hors ligne, clips désactivés, images noires/gelées si détectables, volume, sous-titres hors limites, durée par plateforme, zones de sécurité (rapport exportable).
- **Interchange** (vérifier ce que l'API expose) : export vers XML/EDL pour DaVinci ou After Effects ; sinon documenter la procédure manuelle et marquer `unavailable`.
- Modèles de projet et de séquence ; Productions si la classe correspondante le permet.
**Acceptation** : plan d'export prévisualisé (noms, préréglages, destinations) ; rapport QC en JSON et en texte.

## WP11 — Macros v2, palette de commandes, événements
**Livrables** : macros avec **variables, conditions, boucles, étapes d'aperçu, arrêt sur erreur**, bibliothèque de macros prêtes (ex. « Préparer un short vertical », « Livraison YouTube », « Habillage interview »), déclencheurs via `EventManager` (si exposés), **palette de commandes** (Ctrl/Cmd+K) cherchant dans toutes les fonctions, raccourcis configurables, import/export versionné avec validation de schéma.
**Acceptation** : une macro de 10 étapes passe `plan → apply → verify` ; une étape en échec n'altère pas les précédentes sans option.

## WP12 — IA facultative (désactivée par défaut)
**Livrables** : interface `AiProvider` (transcription, traduction, rédaction, suggestion), **un seul fournisseur activable à la fois**, **consentement explicite** avec affichage de ce qui est envoyé, domaines déclarés dans le manifeste, clé stockée localement (jamais dans le projet, jamais dans les journaux), coût et limites affichés, **toute sortie IA est une proposition à valider**. Cas d'usage : traduction de sous-titres, titres/hashtags, résumé, repérage de temps forts à partir du texte, suggestion de B-roll à partir des mots-clés.
**Acceptation** : sans consentement, aucune requête réseau (test) ; échec réseau = message clair, jamais bloquant ; tests avec fournisseur simulé.

## WP13 — Distribution, documentation, internationalisation
**Livrables** : paquet `.ccx` reproductible, préparation à la signature/distribution, **installation macOS** documentée et testée, installeur Windows conservé en secours (avec avertissement sur son caractère non officiel), documentation FR/EN (démarrage, chaque fonction, limites, dépannage, diagnostic), journal des modifications, fichier de licences des ressources (LUT, SFX, polices, modèles), page « Ce que MasterMotion ne fait pas ».
**Acceptation** : `npm run verify` + `npm run package` ; checklist de test manuel dans Premiere (`docs/testing/manual-checklist.md`) couvrant chaque fonction.

---

# 7. CATALOGUE DE TEMPLATES MOTION (cahier des charges pour le motion designer)

Tous les modèles : texte et couleurs paramétrables, durées d'entrée/sortie réglables, versions 16:9 et 9:16, deux variantes (clair/sombre) quand utile, **compatibles Graphiques essentiels de Premiere**.

| Catégorie | Modèles (≥) | Exemples de construction |
|---|---|---|
| **Titres cinéma** | 6 | Révélation par masque, titre qui se dessine par traits, split vertical, flou-vers-net, lettres décalées avec ombre longue, titre-générique de film |
| **Lower thirds** | 8 | Barre qui glisse + nom + fonction, bloc arrondi avec icône, ligne qui s'écrit, étiquette flottante, version « réseaux sociaux », double ligne avec logo, version minimale, version pour interview multi-intervenants |
| **Texte cinétique** | 6 | Mot par mot avec échelle, phrase qui s'empile, mots qui basculent, texte sur forme géométrique, compteur animé, citation en grand |
| **Transitions** | 8 | Balayage de formes, « liquid », glissement + flou, masque circulaire, bandes, éclair/flash, zoom traversant, pixel/glitch léger |
| **Intro / outro** | 4 | Logo sur formes animées, intro texte + ligne, outro avec boutons de réseaux, carte de fin vidéo |
| **Réseaux sociaux** | 6 | Appel à s'abonner, barre de progression, notification, « like/partage », sticker de citation, compte à rebours |
| **Infographies** | 5 | Barres animées, camembert, compteur de chiffres clés, ligne de temps, liste à puces animée |
| **Habillage / overlays** | 4 | Cadre animé, coins de visée, bandeau défilant, filigrane animé |
| **Sous-titres animés** | 12 | Voir WP2 (styles) |

Pour chaque modèle, `template.json` précise : paramètres (texte, 2–4 couleurs, police, curseurs d'intensité/durée), durée par défaut, zone de sécurité, notes d'utilisation, licence. **Si le motion designer ne fournit pas encore les `.mogrt`, livre malgré tout** : le `template.json`, l'aperçu procédural, la fiche de fabrication (calques, animations, propriétés maîtres) et un statut « à fabriquer » visible dans l'interface — jamais un modèle fictif présenté comme prêt.

---

# 8. QUALITÉ ET BUDGETS

- **Définition de « terminé »** pour un chantier : code + tests + aperçu + documentation + entrée dans la matrice de compatibilité + checklist manuelle + `npm run verify` vert.
- **Budgets** : ouverture du panneau < 1 s ; aperçu B < 150 ms par changement ; analyse de 1 000 clips < 1,5 s ; application d'un lot de 200 clips avec progression et annulation ; mémoire stable (pas de fuite après 50 aperçus).
- **Accessibilité** : navigation clavier, contrastes suffisants, libellés de contrôle, états de chargement et d'erreur explicites.
- **Journal** : niveaux, rotation, export pour support, **aucun contenu sensible**.
- **Sécurité** : validation de tous les JSON importés (macros, templates, transcriptions), plafonds de taille, refus des chemins hors dossier autorisé.

---

# 9. MÉTHODE DE TRAVAIL ET FORMAT DE RÉPONSE

Pour chaque chantier, réponds toujours en cinq parties :

1. **Analyse** : fichiers lus, état de base (typecheck/lint/tests), APIs concernées (tableau §3.1), risques.
2. **Plan** : étapes, fichiers créés/modifiés, ce qui est hors périmètre.
3. **Implémentation** : code par petits commits ; ne réécris pas ce qui fonctionne.
4. **Validation** : sorties réelles de `npm run verify`, tests ajoutés, ce qui reste **« À valider dans Premiere »**.
5. **Résultat** : fonctions livrées, limites connues, mise à jour de `docs/compat.md`, `CHANGELOG.md` et de la matrice de capacités ; proposition du chantier suivant.

**Interdictions de méthode** : ne pas inventer d'API ; ne pas déclarer un test passé sans l'avoir lancé ; ne pas modifier plusieurs chantiers à la fois ; ne pas supprimer de code existant sans justification écrite ; ne pas ajouter de dépendance sans en expliquer le besoin, la taille et la licence.

---

# 10. RÈGLE FONDAMENTALE

**MasterMotion doit être honnête avant d'être impressionnant.** Chaque fonction affiche ce qu'elle va faire (aperçu), le fait réellement (relecture), peut être annulée, et dit clairement quand Premiere ne permet pas de la réaliser. Un monteur doit pouvoir lui faire confiance sur une timeline de production.