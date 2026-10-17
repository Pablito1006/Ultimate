#!/usr/bin/env node
/**
 * Builds tests/fixtures/mogrt/sample-mm-title.mogrt — a minimal ZIP with definition.json
 * matching the structure MasterMotion inspects (not a production AE export).
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { zipSync, strToU8 } from "fflate";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "tests/fixtures/mogrt");
mkdirSync(outDir, { recursive: true });

/**
 * Structure documented in docs/templates/MOGRT_STRUCTURE.md after inspecting this fixture.
 * Real AE exports may add project.aegraphic / thumb.png — inspector accepts either shape.
 */
const definition = {
  name: "MM Sample Title",
  author: "MasterMotion fixture",
  version: "1.0.0",
  masterProperties: [
    { name: "MM_Title", type: "text", uiName: "Title" },
    { name: "MM_Subtitle", type: "text", uiName: "Subtitle" },
    { name: "MM_ColorPrimary", type: "color", uiName: "Primary color" },
    { name: "MM_ColorSecondary", type: "color", uiName: "Secondary color" },
    { name: "MM_Intensity", type: "slider", uiName: "Intensity" },
    { name: "MM_InDuration", type: "number", uiName: "In duration" },
  ],
};

const zipped = zipSync(
  {
    "definition.json": strToU8(JSON.stringify(definition, null, 2)),
    "README.txt": strToU8(
      "MasterMotion test fixture. Not a production After Effects Motion Graphics template.\n"
    ),
  },
  { level: 6 }
);

const outPath = join(outDir, "sample-mm-title.mogrt");
writeFileSync(outPath, zipped);
writeFileSync(join(outDir, "definition.json"), JSON.stringify(definition, null, 2) + "\n");
console.log(`[fixture] Wrote ${outPath}`);
