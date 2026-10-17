#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(readFileSync(join(root, "public/manifest.json"), "utf8"));

function fail(msg) {
  console.error(`[validate:manifest] ${msg}`);
  process.exitCode = 1;
}

if (manifest.manifestVersion !== 5) {
  fail(`expected manifestVersion 5, got ${manifest.manifestVersion}`);
}
if (!manifest.id || typeof manifest.id !== "string") {
  fail("missing id");
}
if (manifest.host?.app !== "premierepro") {
  fail("host.app must be premierepro");
}
if (!manifest.host?.minVersion) {
  fail("host.minVersion required");
}
if (!Array.isArray(manifest.entrypoints) || manifest.entrypoints.length === 0) {
  fail("entrypoints required");
}
const panel = manifest.entrypoints.find((e) => e.type === "panel");
if (!panel) {
  fail("panel entrypoint required");
}

// Network permissions must be explicit (D8 / WP12). WP0 only documents absence.
const perms = manifest.requiredPermissions || {};
if (perms.network) {
  console.log("[validate:manifest] network permissions declared:", JSON.stringify(perms.network));
} else {
  console.log("[validate:manifest] no network permissions (offline-first) — OK for WP0");
}

if (process.exitCode) {
  process.exit(process.exitCode);
}
console.log("[validate:manifest] OK");
