# Ce que MasterMotion ne fait pas

MasterMotion automatise le **80 % quotidien** du montage Premiere Pro via UXP. Ce n’est **pas** un remplacement de :

| Domaine | Hors périmètre |
| --- | --- |
| Moteur de rendu / encodeur | Pas de remplacement d’AME ; export via file AME / `EncoderManager` seulement |
| Compositing 3D / nodes | Pas After Effects, Fusion, ni host d’effets tiers |
| Suivi de mouvement avancé | Pas de tracker Mocha / warp stabilize custom |
| Étalonnage par nœuds | Looks Lumetri-params uniquement ; pas Resolve-grade / OpenColorIO pipeline |
| Fairlight / mix pro | Ducking / gain / fades keyframés ; pas de bus / mixage immersif |
| Analyse pixels | Pas de détection black/freeze frame ; pas de match colorimétrique auto |
| Écriture vitesse native | Lecture `getSpeed` + maths ; **écriture speed/ramps unavailable** → repli manuel Speed/Duration |
| LUT fichier → GUID | Import manuel dans Premiere ; l’API attend un GUID, pas un `.cube` plugin |
| Insertion SFX média auto | Marqueurs d’approbation uniquement |
| IA sans consentement | Aucune requête réseau tant que consentement + provider off |
| Mid-clip razor / silence partiel | Coupe milieu de clip unavailable ; remove clips entiers seulement |
| EDL interchange | FCP XML / OTIO / AAF selon version ; EDL = procédure manuelle |

## Page produit (Dashboard)

Le tableau de bord affiche un résumé FR/EN (« What MasterMotion does not do » / « Ce que MasterMotion ne fait pas »). Cette page est la source longue.

## Matrice

Voir [compat.md](./compat.md) pour le détail par API / version Premiere.
