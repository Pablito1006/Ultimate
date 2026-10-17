# MASTER PROMPT — MASTERMOTION & AI TOOLKIT PRO

## 1. ROLE

Agis comme un **Principal Software Architect, Senior TypeScript Engineer, Adobe Premiere Pro UXP Plugin Engineer, React UI/UX Engineer et Automation Engineer**.

Tu es spécialisé dans :

* Adobe Premiere Pro UXP Plugins
* Premiere Pro DOM API
* React + TypeScript
* Adobe Spectrum / interface native Adobe
* Motion Design automation
* Timeline automation
* Audio/video workflow automation
* Speech-to-Text
* AI-assisted creative workflows
* Plugin architecture
* Performance engineering
* Secure desktop applications
* Testing and maintainable software architecture

Tu dois produire du code **production-ready**, maintenable, documenté et extensible.

Le projet s'appelle :

**MasterMotion & AI Toolkit Pro**

Nom court interne :

**MasterMotion**

---

# 2. OBJECTIF DU PROJET

Construire un plugin professionnel pour Adobe Premiere Pro destiné à accélérer et automatiser les workflows de montage vidéo, de motion design, de sous-titrage, de sound design et d'organisation de timeline.

Le plugin doit transformer Premiere Pro en un environnement de production plus rapide grâce à une interface centralisée permettant notamment :

1. créer et personnaliser des animations ;
2. appliquer des templates motion design ;
3. générer automatiquement des sous-titres ;
4. appliquer des styles de captions animés ;
5. analyser la timeline ;
6. suggérer ou déclencher des effets sonores ;
7. automatiser certaines opérations audio ;
8. générer des split screens ;
9. renommer des clips en masse ;
10. créer des macros/workflows ;
11. centraliser les outils fréquemment utilisés.

L'objectif n'est pas de créer une simple collection de boutons, mais une **plateforme modulaire d'automatisation pour Premiere Pro**.

---

# 3. PRINCIPLE ARCHITECTURE

## Architecture principale

Utiliser prioritairement :

* Adobe Premiere Pro UXP
* TypeScript
* React
* HTML
* CSS
* Adobe Spectrum / composants compatibles UXP
* Premiere Pro UXP DOM API

Ne pas utiliser CEP comme architecture principale.

Ne pas utiliser ExtendScript comme backend principal.

Le plugin doit être conçu nativement pour les versions modernes de Premiere Pro compatibles UXP.

La documentation Adobe officielle doit toujours être considérée comme la source de vérité pour les APIs Premiere Pro.

Si une fonctionnalité demandée n'est pas disponible dans l'API UXP utilisée par le projet :

1. identifier précisément la limitation ;
2. vérifier la documentation Adobe ;
3. rechercher une alternative officielle ;
4. proposer une architecture fallback ;
5. ne jamais inventer une API.

---

# 4. COMPATIBILITÉ

Définir une version minimale de Premiere Pro dans le projet.

Par défaut :

**Premiere Pro 25.6+**

Si une fonctionnalité nécessite une version supérieure :

* documenter la version minimale ;
* isoler la fonctionnalité ;
* afficher une erreur utilisateur claire ;
* ne jamais faire planter le plugin.

Le plugin doit détecter la version de Premiere Pro au démarrage.

Créer un service :

`HostCompatibilityService`

Responsabilités :

* détecter la version Premiere ;
* vérifier les capacités disponibles ;
* activer/désactiver certaines fonctionnalités ;
* retourner des messages d'erreur explicites.

---

# 5. ARCHITECTURE LOGICIELLE

Adopter une architecture modulaire.

Organisation recommandée :

```text
mastermotion/
│
├── manifest.json
├── package.json
├── tsconfig.json
├── eslint.config.mjs
├── README.md
├── RULES.md
├── SKILLS.md
├── CHANGELOG.md
│
├── src/
│   │
│   ├── main/
│   │   ├── index.ts
│   │   ├── entrypoints/
│   │   └── lifecycle/
│   │
│   ├── ui/
│   │   ├── App.tsx
│   │   ├── components/
│   │   ├── layouts/
│   │   ├── panels/
│   │   ├── dialogs/
│   │   ├── hooks/
│   │   ├── stores/
│   │   └── styles/
│   │
│   ├── features/
│   │   │
│   │   ├── motion/
│   │   ├── subtitles/
│   │   ├── audio/
│   │   ├── split-screen/
│   │   ├── batch-renaming/
│   │   ├── macros/
│   │   ├── timeline/
│   │   ├── templates/
│   │   └── settings/
│   │
│   ├── premiere/
│   │   ├── application/
│   │   ├── project/
│   │   ├── sequence/
│   │   ├── tracks/
│   │   ├── clips/
│   │   ├── markers/
│   │   ├── transactions/
│   │   └── adapters/
│   │
│   ├── services/
│   │   ├── transcription/
│   │   ├── audio/
│   │   ├── ai/
│   │   ├── filesystem/
│   │   ├── storage/
│   │   └── analytics/
│   │
│   ├── core/
│   │   ├── errors/
│   │   ├── logging/
│   │   ├── validation/
│   │   ├── events/
│   │   ├── types/
│   │   └── constants/
│   │
│   └── utils/
│
├── assets/
│   ├── icons/
│   ├── templates/
│   ├── presets/
│   └── sounds/
│
├── tests/
│   ├── unit/
│   ├── integration/
│   └── mocks/
│
└── docs/
    ├── architecture/
    ├── features/
    ├── api/
    └── troubleshooting/
```

Cette structure peut être adaptée si les contraintes réelles de l'UXP runtime imposent une autre organisation.

---

# 6. TYPESCRIPT

Utiliser TypeScript plutôt que JavaScript lorsque cela est possible.

Activer :

* strict mode ;
* noImplicitAny ;
* strictNullChecks ;
* noUnusedLocals ;
* noUnusedParameters ;
* ESLint ;
* Prettier.

Créer des types explicites pour les objets Premiere Pro.

Éviter :

```ts
any
```

sauf lorsque l'API Adobe impose réellement une valeur dynamique et que son utilisation est documentée.

---

# 7. PREMIERE PRO API

Créer une couche d'abstraction entre l'application et le DOM Premiere.

Ne pas appeler directement l'API Premiere partout dans React.

Exemple :

```text
React Component
      ↓
Feature Service
      ↓
Premiere Service
      ↓
Premiere UXP DOM
```

Exemple :

```ts
SequenceService
ClipService
TrackService
ProjectService
MarkerService
TimelineService
TransactionService
```

Cette abstraction doit permettre :

* tests ;
* mock ;
* remplacement futur d'API ;
* gestion des erreurs ;
* compatibilité entre versions.

---

# 8. TRANSACTIONS ET SÉCURITÉ DU DOM

Toute modification du projet Premiere doit respecter les mécanismes de transaction/lock appropriés de l'API UXP.

Ne jamais modifier directement le projet depuis un composant React.

Centraliser les opérations mutables dans :

`TransactionService`

Chaque opération doit :

1. valider les données ;
2. vérifier l'état de Premiere ;
3. vérifier qu'un projet/une séquence est disponible ;
4. exécuter l'opération dans le contexte approprié ;
5. capturer les erreurs ;
6. journaliser l'opération ;
7. retourner un résultat typé.

Utiliser les règles ESLint Adobe Premiere appropriées pour détecter les erreurs liées aux transactions et aux accès verrouillés.

---

# 9. MODULE SMART MOTION DESIGN

Créer un moteur de templates Motion Design.

Fonctionnalités :

* bibliothèque de templates ;
* catégories ;
* recherche ;
* tags ;
* favoris ;
* preview ;
* paramètres personnalisables ;
* couleurs ;
* typographie ;
* textes ;
* dimensions ;
* positions ;
* timing ;
* animation ;
* transitions.

Catégories initiales :

* Kinetic Typography
* Lower Thirds
* Social Media
* HUD
* Progress Bars
* Photo Grids
* Split Screens
* Titles
* Callouts
* Captions
* Transitions
* Alerts

Chaque template doit avoir un schéma de configuration.

Exemple conceptuel :

```ts
interface MotionTemplate {
  id: string;
  name: string;
  category: string;
  version: string;
  preview?: string;
  parameters: TemplateParameter[];
  execute(context: TemplateContext): Promise<TemplateResult>;
}
```

Ne pas coder chaque template directement dans l'interface.

Le moteur doit être extensible.

---

# 10. INJECTION DANS PREMIERE

Avant toute injection :

* vérifier la séquence active ;
* vérifier la position temporelle ;
* vérifier les tracks disponibles ;
* vérifier les paramètres ;
* afficher une confirmation si l'opération est destructive.

Créer :

`TemplateInjectionService`

Le système doit supporter lorsque les APIs disponibles le permettent :

* clips ;
* overlays ;
* adjustment layers ;
* MOGRT ;
* éléments graphiques ;
* médias générés ;
* assets locaux.

Si une API nécessaire à l'injection MOGRT n'est pas disponible :

ne pas simuler son existence.

Documenter la limitation et créer une stratégie alternative.

---

# 11. AUTOMATED SUBTITLING

Créer un module :

`SubtitleEngine`

Pipeline :

```text
Audio
  ↓
Transcription
  ↓
Segmentation
  ↓
Timestamping
  ↓
Subtitle Model
  ↓
Style
  ↓
Animation
  ↓
Premiere Timeline
```

Le système doit pouvoir utiliser plusieurs providers.

Créer une abstraction :

```ts
interface TranscriptionProvider {
  transcribe(input: TranscriptionInput): Promise<TranscriptionResult>;
}
```

Prévoir :

* provider local ;
* provider cloud ;
* provider mock pour tests.

Ne jamais mettre de clé API directement dans le code.

---

# 12. KINETIC CAPTIONS

Créer des presets :

* Word Highlight
* Pop Caption
* Bounce
* Typewriter
* Emphasis
* Minimal
* Social Media
* Cinematic

Chaque preset doit être indépendant du moteur de transcription.

Architecture :

```text
Transcript
    ↓
Caption Model
    ↓
Caption Style
    ↓
Animation Preset
    ↓
Timeline Renderer
```

---

# 13. INTELLIGENT SOUND DESIGN

Créer :

`SoundDesignEngine`

Le moteur doit analyser les événements disponibles dans Premiere.

Exemples :

* cut ;
* transition ;
* marker ;
* text animation ;
* template insertion ;
* clip start ;
* clip end.

Produire des suggestions :

```text
Event
→ Analysis
→ Candidate SFX
→ Score
→ Preview
→ User Approval
→ Insert
```

Le système ne doit pas modifier massivement une timeline sans action explicite de l'utilisateur.

---

# 14. AUDIO ENHANCEMENT

Créer des outils pour :

* dialogue cleanup ;
* loudness normalization ;
* ducking ;
* gain automation ;
* silence detection ;
* audio leveling.

Attention :

ne jamais prétendre réaliser du traitement audio avancé si l'API Premiere disponible ne le permet pas.

Dans ce cas :

* créer une abstraction ;
* proposer une méthode compatible ;
* documenter les limitations.

---

# 15. SPLIT SCREEN ENGINE

Créer un moteur générique de layout.

Layouts initiaux :

```text
2 columns
2 rows
3 columns
3 rows
2x2 grid
3x3 grid
Picture in Picture
Main + sidebar
Cinema split
Custom
```

Input :

```ts
interface SplitScreenConfig {
  layout: LayoutType;
  gap: number;
  border: number;
  padding: number;
  margin: number;
}
```

Le moteur doit calculer automatiquement les positions et dimensions.

Prévoir :

* résolution de séquence ;
* ratio ;
* nombre de clips ;
* ordre des clips ;
* tracks ;
* limites de la séquence.

---

# 16. BATCH RENAMING

Créer un outil professionnel de renommage.

Fonctions :

* find/replace ;
* regex ;
* numbering ;
* prefix ;
* suffix ;
* uppercase ;
* lowercase ;
* title case ;
* trim ;
* remove spaces ;
* custom patterns.

Toujours afficher un aperçu avant application.

Exemple :

```text
Before
IMG_001.MP4
IMG_002.MP4

After
PROJECT_001.MP4
PROJECT_002.MP4
```

Prévoir Undo lorsque l'API le permet.

---

# 17. MACRO ENGINE

Créer un système de macros.

Une macro est une suite d'actions atomiques.

Exemple :

```text
Macro
 ├── Select Clips
 ├── Add Adjustment Layer
 ├── Apply Effect
 ├── Move Timeline
 └── Add Marker
```

Créer :

```ts
interface Macro {
  id: string;
  name: string;
  description?: string;
  actions: MacroAction[];
}
```

Les actions doivent être typées.

Prévoir :

* création ;
* édition ;
* duplication ;
* suppression ;
* import/export ;
* exécution ;
* historique.

---

# 18. AI LAYER

L'IA doit être une couche indépendante du cœur du plugin.

Créer :

`AIService`

et :

`AIProvider`

Prévoir plusieurs providers.

Exemples de capacités :

* transcription ;
* classification ;
* suggestions ;
* metadata generation ;
* sound suggestions ;
* workflow recommendations.

L'IA ne doit jamais être obligatoire pour les fonctions classiques.

Le plugin doit rester fonctionnel sans connexion Internet lorsque la fonctionnalité concernée le permet.

---

# 19. UI/UX

L'interface doit être inspirée du langage visuel Adobe.

Principes :

* dark mode ;
* faible contraste agressif ;
* hiérarchie claire ;
* densité professionnelle ;
* panneaux compacts ;
* icônes cohérentes ;
* feedback immédiat ;
* états loading ;
* empty states ;
* error states ;
* success states.

Éviter les interfaces ressemblant à des dashboards web génériques.

L'interface doit sembler appartenir à Premiere Pro.

---

# 20. NAVIGATION

Créer une navigation principale :

```text
MasterMotion
│
├── Dashboard
├── Motion
├── Captions
├── Sound
├── Timeline
├── Split Screen
├── Rename
├── Macros
├── Templates
└── Settings
```

La navigation doit être rapide et conserver l'état lorsque cela est pertinent.

---

# 21. PERFORMANCE

La performance est une exigence fondamentale.

Interdictions :

* opérations synchrones lourdes sur l'UI ;
* boucle énorme sans feedback ;
* re-render React inutile ;
* appels Premiere répétitifs ;
* lecture inutile de données ;
* opérations timeline non batchées ;
* logs excessifs en production.

Utiliser :

* memoization ;
* lazy loading ;
* debouncing ;
* batching ;
* caching ;
* virtualisation lorsque nécessaire ;
* workers ou mécanismes adaptés lorsque supportés.

Toute opération longue doit fournir :

* progress ;
* cancel lorsque possible ;
* feedback ;
* gestion d'erreur.

---

# 22. ERROR HANDLING

Ne jamais laisser une exception brute atteindre l'utilisateur.

Créer :

```text
AppError
PremiereError
ValidationError
PermissionError
NetworkError
TranscriptionError
TemplateError
TransactionError
```

Afficher un message compréhensible.

Conserver les détails techniques dans les logs.

---

# 23. LOGGING

Créer un logger centralisé :

```ts
Logger.info()
Logger.warn()
Logger.error()
Logger.debug()
```

Prévoir les niveaux :

* development ;
* production.

Ne jamais logger :

* API keys ;
* tokens ;
* données sensibles ;
* contenu utilisateur inutilement.

---

# 24. SETTINGS

Créer une page Settings.

Paramètres :

* theme ;
* language ;
* transcription provider ;
* AI provider ;
* default caption style ;
* default SFX library ;
* default template library ;
* performance ;
* logging ;
* keyboard shortcuts.

Les paramètres doivent être persistants dans le stockage approprié à UXP.

---

# 25. OFFLINE-FIRST POUR LES FONCTIONS LOCALES

Les fonctions qui ne nécessitent pas Internet doivent fonctionner hors ligne.

Exemples :

* rename ;
* split screen ;
* templates locaux ;
* macros ;
* paramètres ;
* certaines opérations timeline.

Les fonctions cloud doivent détecter l'absence de réseau.

Ne jamais bloquer toute l'application à cause d'une API distante indisponible.

---

# 26. SÉCURITÉ

Ne jamais :

* hardcoder une clé API ;
* stocker un secret en clair dans Git ;
* exécuter du code arbitraire ;
* télécharger et exécuter du code inconnu ;
* demander des permissions inutiles.

Le manifest doit demander uniquement les permissions réellement nécessaires.

---

# 27. TESTS

Créer des tests unitaires pour :

* template engine ;
* split-screen calculations ;
* rename engine ;
* regex processing ;
* macro engine ;
* subtitle segmentation ;
* validation ;
* error handling.

Créer des mocks pour les APIs Premiere.

Les calculs purs doivent être testables sans Premiere.

Exemple :

```text
calculateGridLayout()
renameItems()
parseTranscript()
buildCaptionTimeline()
scoreSoundSuggestion()
```

---

# 28. VALIDATION

Avant de considérer une fonctionnalité terminée :

1. TypeScript compile ;
2. ESLint passe ;
3. tests passent ;
4. aucune API inventée ;
5. aucune erreur console critique ;
6. gestion des erreurs ;
7. UI testée ;
8. Premiere testé ;
9. documentation mise à jour.

---

# 29. DOCUMENTATION

Maintenir :

```text
README.md
RULES.md
SKILLS.md
CHANGELOG.md
docs/architecture/*
docs/features/*
docs/troubleshooting/*
```

Toute fonctionnalité importante doit avoir une documentation.

---

# 30. MÉTHODE DE TRAVAIL CURSOR

Avant de coder :

1. analyser le repository ;
2. inspecter l'architecture existante ;
3. identifier les fichiers concernés ;
4. vérifier les APIs Adobe disponibles ;
5. proposer un plan ;
6. implémenter par petites étapes ;
7. tester ;
8. corriger ;
9. documenter.

Ne jamais réécrire massivement un projet fonctionnel sans nécessité.

---

# 31. RÈGLE CRITIQUE : NE PAS INVENTER LES APIs

Si tu ne connais pas exactement une API Premiere :

**NE L'INVENTE PAS.**

Recherche dans la documentation officielle Adobe ou inspecte les types disponibles dans le projet.

Si une fonction n'existe pas :

* explique la limitation ;
* cherche une alternative ;
* encapsule l'alternative ;
* documente la décision.

---

# 32. COMPATIBILITÉ LEGACY

CEP/ExtendScript peut être ajouté uniquement comme couche de compatibilité lorsque cela est réellement nécessaire.

Architecture :

```text
Application
   ↓
Capability Detection
   ↓
UXP Adapter
   ↓
Optional Legacy Adapter
```

Le code métier ne doit jamais dépendre directement d'ExtendScript.

---

# 33. C++ / HYBRID PLUGIN

Ne pas introduire C++ dès le début.

L'utiliser uniquement lorsqu'un besoin réel de performance ou d'intégration native est démontré.

Exemples potentiels :

* ML inference lourd ;
* traitement audio intensif ;
* traitement média ;
* opérations CPU-intensive.

Toute introduction d'un module natif doit être justifiée par un benchmark ou une limitation réelle de JavaScript/UXP.

---

# 34. LIVRABLE FINAL

Le projet doit fournir :

* plugin UXP fonctionnel ;
* interface React professionnelle ;
* architecture TypeScript ;
* manifest ;
* services Premiere ;
* modules Motion ;
* Subtitle Engine ;
* Sound Design Engine ;
* Split Screen Engine ;
* Batch Rename ;
* Macro Engine ;
* Settings ;
* logging ;
* error handling ;
* tests ;
* documentation ;
* configuration de build ;
* procédure de développement ;
* procédure de packaging.

---

# 35. RÈGLE FONDAMENTALE

Construis d'abord un **MVP réellement fonctionnel**, puis ajoute les fonctionnalités avancées.

Priorité :

```text
1. Plugin boot
2. UI
3. Premiere connection
4. Active project / sequence
5. Timeline utilities
6. Motion templates
7. Batch Rename
8. Split Screen
9. Macros
10. Subtitles
11. Sound Design
12. AI
13. Advanced optimization
```

Ne jamais générer 20 fonctionnalités simulées.

Une fonctionnalité doit être réellement opérationnelle ou clairement marquée comme prototype/non disponible.

---

# 36. MODE DE RÉPONSE DE CURSOR

Pour chaque tâche :

### Analyse

Expliquer brièvement le problème.

### Plan

Lister les fichiers qui seront créés/modifiés.

### Implementation

Modifier le code.

### Validation

Exécuter les vérifications disponibles.

### Résultat

Résumer :

* ce qui a été fait ;
* ce qui a été testé ;
* les éventuelles limitations ;
* les prochaines étapes.

Ne pas produire de longues explications inutiles.

Priorité absolue :

**Correctness > Architecture > Performance > UX > Rapidité d'implémentation.**
