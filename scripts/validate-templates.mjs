#!/usr/bin/env node
/**
 * Validates assets/templates library:
 * - schema fields, license, preview paths
 * - if status=ready: .mogrt must exist, open as ZIP, master properties match
 * - missing-mogrt is OK (honest)
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { unzipSync, strFromU8 } from "fflate";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const templatesRoot = join(root, "assets/templates");
const previewsRoot = join(root, "assets/previews");

const REQUIRED = [
  "id",
  "name",
  "category",
  "version",
  "tags",
  "minPremiere",
  "durationDefault",
  "aspect",
  "fps",
  "parameters",
  "animation",
  "previewSpec",
  "license",
  "author",
  "status",
];

let errors = 0;
let warnings = 0;

function fail(msg) {
  console.error(`  ERROR: ${msg}`);
  errors += 1;
}

function warn(msg) {
  console.warn(`  WARN: ${msg}`);
  warnings += 1;
}

function extractMasterNames(definition) {
  const names = new Set();
  if (!definition || typeof definition !== "object") {
    return names;
  }
  const lists = [
    definition.masterProperties,
    definition.clientControls,
    definition.editableProperties,
    definition.properties,
  ];
  for (const list of lists) {
    if (!Array.isArray(list)) {
      continue;
    }
    for (const item of list) {
      if (!item || typeof item !== "object") {
        continue;
      }
      const n = item.name || item.uiName || item.masterPropertyName || item.capPropName;
      if (typeof n === "string" && n.length > 0) {
        names.add(n);
      }
    }
  }
  return names;
}

function inspectMogrt(filePath) {
  const buf = new Uint8Array(readFileSync(filePath));
  let files;
  try {
    files = unzipSync(buf);
  } catch (cause) {
    throw new Error(`Not a readable ZIP/mogrt: ${cause}`);
  }
  const defKey = Object.keys(files).find((k) => k.replace(/\\/g, "/").endsWith("definition.json"));
  if (!defKey) {
    throw new Error("definition.json missing inside .mogrt");
  }
  const definition = JSON.parse(strFromU8(files[defKey]));
  return { definition, masterNames: extractMasterNames(definition), entries: Object.keys(files) };
}

function validateTemplate(tpl, dir) {
  console.log(`• ${tpl.id}`);
  for (const key of REQUIRED) {
    if (tpl[key] === undefined || tpl[key] === null) {
      fail(`${tpl.id}: missing field ${key}`);
    }
  }
  if (!tpl.license || String(tpl.license).trim().length < 3) {
    fail(`${tpl.id}: license empty`);
  }
  if (!Array.isArray(tpl.parameters) || tpl.parameters.length === 0) {
    fail(`${tpl.id}: parameters[] required`);
  } else {
    for (const p of tpl.parameters) {
      if (!p.masterPropertyName) {
        fail(`${tpl.id}: parameter ${p.id} missing masterPropertyName`);
      }
    }
  }

  const staticPreview = join(previewsRoot, `${tpl.id}.svg`);
  const animPreview = join(previewsRoot, `${tpl.id}-anim.svg`);
  if (!existsSync(staticPreview)) {
    fail(`${tpl.id}: missing preview ${staticPreview}`);
  }
  if (!existsSync(animPreview)) {
    fail(`${tpl.id}: missing preview ${animPreview}`);
  }

  const mogrtRel = tpl.mogrt || tpl.mogrtPath;
  const mogrtAbs = mogrtRel ? resolve(dir, mogrtRel) : null;

  if (tpl.status === "ready") {
    if (!mogrtAbs || !existsSync(mogrtAbs)) {
      fail(`${tpl.id}: status=ready but .mogrt missing (${mogrtRel})`);
      return;
    }
    try {
      const { masterNames } = inspectMogrt(mogrtAbs);
      for (const p of tpl.parameters) {
        if (!masterNames.has(p.masterPropertyName)) {
          fail(
            `${tpl.id}: masterPropertyName "${p.masterPropertyName}" not found in mogrt definition.json`
          );
        }
      }
    } catch (cause) {
      fail(`${tpl.id}: mogrt inspect failed — ${cause.message || cause}`);
    }
  } else if (tpl.status === "missing-mogrt") {
    if (mogrtAbs && existsSync(mogrtAbs)) {
      warn(`${tpl.id}: status=missing-mogrt but file exists — consider status=ready`);
    }
  } else if (tpl.status === "invalid") {
    warn(`${tpl.id}: marked invalid`);
  } else {
    fail(`${tpl.id}: unknown status ${tpl.status}`);
  }
}

// Optional: validate fixture mogrt itself
const fixture = join(root, "tests/fixtures/mogrt/sample-mm-title.mogrt");
if (existsSync(fixture)) {
  try {
    const { masterNames, entries } = inspectMogrt(fixture);
    console.log(
      `[fixture] sample-mm-title.mogrt OK — entries=${entries.join(",")} masters=${[...masterNames].join(",")}`
    );
  } catch (cause) {
    fail(`fixture mogrt: ${cause.message || cause}`);
  }
} else {
  warn("fixture sample-mm-title.mogrt missing — run node scripts/create-mogrt-fixture.mjs");
}

if (!existsSync(templatesRoot)) {
  fail("assets/templates missing — run npm run templates:generate");
  process.exit(1);
}

const indexPath = join(templatesRoot, "index.json");
if (!existsSync(indexPath)) {
  fail("assets/templates/index.json missing");
  process.exit(1);
}

const index = JSON.parse(readFileSync(indexPath, "utf8"));
console.log(`[validate:templates] ${index.templateCount} templates in index`);

const dirs = readdirSync(templatesRoot, { withFileTypes: true }).filter((d) => d.isDirectory());
for (const d of dirs) {
  const dir = join(templatesRoot, d.name);
  const jsonPath = join(dir, "template.json");
  if (!existsSync(jsonPath)) {
    fail(`${d.name}: template.json missing`);
    continue;
  }
  const tpl = JSON.parse(readFileSync(jsonPath, "utf8"));
  validateTemplate(tpl, dir);
}

if (errors > 0) {
  console.error(`[validate:templates] FAILED — ${errors} error(s), ${warnings} warning(s)`);
  process.exit(1);
}
console.log(`[validate:templates] OK — ${warnings} warning(s)`);
