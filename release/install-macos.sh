#!/usr/bin/env bash
# MasterMotion — macOS sideload (UNOFFICIAL External folder)
# Preferred distribution: signed .ccx via Adobe Developer Distribution.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CCX="${SCRIPT_DIR}/MasterMotion_premierepro.ccx"
PLUGIN_ID="com.mastermotion.toolkit"
EXTERNAL="${HOME}/Library/Application Support/Adobe/UXP/Plugins/External"

echo ""
echo "========================================"
echo " MasterMotion — Installation macOS"
echo "========================================"
echo ""
echo "AVERTISSEMENT: sideload External = non officiel / non signé Adobe."
echo "Pour la production, utilisez un .ccx signé (docs/distribution/signing.md)."
echo ""

if [[ ! -f "$CCX" ]]; then
  echo "ERREUR: introuvable: $CCX"
  echo "Lancez d'abord: npm run package"
  exit 1
fi

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

# .ccx is a zip
unzip -q -o "$CCX" -d "$TMP"

VERSION="$(python3 -c "import json; print(json.load(open('$TMP/manifest.json'))['version'])" 2>/dev/null \
  || node -e "console.log(JSON.parse(require('fs').readFileSync('$TMP/manifest.json','utf8')).version)")"

TARGET="${EXTERNAL}/${PLUGIN_ID}_${VERSION}"
mkdir -p "$EXTERNAL"
rm -rf "$TARGET"
mkdir -p "$TARGET"
cp -R "$TMP"/* "$TARGET/"

echo "Installé: $TARGET"
echo "Redémarrez Premiere Pro 25.6+, puis Fenêtre → Extensions → MasterMotion"
echo ""
