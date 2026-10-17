#!/usr/bin/env node
/**
 * Ensures VERSION, package.json, manifest.json and PLUGIN_VERSION stay aligned (D7).
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function readJson(rel) {
  return JSON.parse(readFileSync(join(root, rel), "utf8"));
}

function fail(msg) {
  console.error(`[verify:versions] ${msg}`);
  process.exitCode = 1;
}

const versionFile = existsSync(join(root, "VERSION"))
  ? readFileSync(join(root, "VERSION"), "utf8").trim()
  : null;
const pkg = readJson("package.json");
const manifest = readJson("public/manifest.json");
const versionTs = readFileSync(join(root, "src/core/constants/version.ts"), "utf8");
const versionTsMatch = versionTs.match(/PLUGIN_VERSION\s*=\s*"([^"]+)"/);
const pluginVersion = versionTsMatch ? versionTsMatch[1] : null;
const minMatch = versionTs.match(/MIN_PREMIERE_VERSION\s*=\s*"([^"]+)"/);
const minTs = minMatch ? minMatch[1] : null;

const expected = pkg.version;

if (!versionFile) {
  fail("VERSION file missing");
} else if (versionFile !== expected) {
  fail(`VERSION (${versionFile}) != package.json (${expected})`);
}

if (manifest.version !== expected) {
  fail(`manifest.json version (${manifest.version}) != package.json (${expected})`);
}

if (pluginVersion !== expected) {
  fail(`PLUGIN_VERSION (${pluginVersion}) != package.json (${expected})`);
}

if (manifest.host?.minVersion !== minTs) {
  fail(
    `manifest host.minVersion (${manifest.host?.minVersion}) != MIN_PREMIERE_VERSION (${minTs})`
  );
}

const typesPkg = readJson("node_modules/@adobe/premierepro/package.json");
console.log(`[verify:versions] plugin=${expected} minHost=${minTs} types=@adobe/premierepro@${typesPkg.version}`);
console.log(
  "[verify:versions] Note: types package version is independent of Premiere minVersion (see docs/compat.md)."
);

if (process.exitCode) {
  process.exit(process.exitCode);
}
console.log("[verify:versions] OK");
