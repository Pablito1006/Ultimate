# Format de transcription Premiere (WP2)

Source de vérité Adobe : schéma publié dans
[uxp-premiere-pro-samples …/transcript_format_spec.json](https://github.com/AdobeDocs/uxp-premiere-pro-samples/blob/main/sample-panels/premiere-api/assets/transcript_format_spec.json)
(`$id`: `https://schemas.adobe.com/transcript/v1.0.0`).

MasterMotion **ne invente pas** ce format. Le parseur (`parsePremiereTranscriptJson`) :

1. accepte le schéma Adobe strict ;
2. tolère des variantes observées (langues en majuscules `en-US`, `words` absents → texte segment, `end` au lieu de `duration`) ;
3. ignore les champs inconnus ;
4. produit le modèle interne `MmTranscript` (mots avec confiance / locuteur / tags filler|profanity).

Échantillons de tests : `tests/fixtures/transcript/`.
