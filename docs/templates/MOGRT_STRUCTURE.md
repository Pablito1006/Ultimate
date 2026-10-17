# Structure `.mogrt` inspectée (fixture MasterMotion)

**Source** : `tests/fixtures/mogrt/sample-mm-title.mogrt` (généré par `node scripts/create-mogrt-fixture.mjs`).

Un fichier `.mogrt` est une **archive ZIP**. Après ouverture (`fflate` / rename → `.zip`) :

| Entrée | Rôle |
| --- | --- |
| `definition.json` | Métadonnées + liste des propriétés maîtres exposées |
| `README.txt` | (fixture uniquement) |

Les exports After Effects / Premiere réels peuvent aussi contenir `project.aegraphic`, `thumb.png`, etc. Le validateur MasterMotion **exige** `definition.json` et lit les propriétés dans l’un des tableaux :

- `masterProperties[]`
- `clientControls[]`
- `editableProperties[]`
- `properties[]`

Chaque entrée doit exposer un nom via `name`, `uiName`, `masterPropertyName` ou `capPropName`.

## Fixture `definition.json` (extrait)

```json
{
  "name": "MM Sample Title",
  "masterProperties": [
    { "name": "MM_Title", "type": "text", "uiName": "Title" },
    { "name": "MM_ColorPrimary", "type": "color", "uiName": "Primary color" }
  ]
}
```

Convention MasterMotion : préfixe `MM_` pour les propriétés déclarées dans `template.json` → `parameters[].masterPropertyName`.

**Important** : ce fixture n’est **pas** un livrable produit. Les vrais `.mogrt` sont fournis par le motion designer (voir AUTHORING.md).
