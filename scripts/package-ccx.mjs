/**
 * Reproducible .ccx packaging (ZIP of dist/).
 * Uses fflate (cross-platform). PowerShell Compress-Archive is NOT required.
 */
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { join, relative, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { zipSync, strToU8 } from "fflate";

const require = createRequire(import.meta.url);
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const distDir = join(root, "dist");
const releaseDir = join(root, "release");
const packageJson = require(join(root, "package.json"));
const version = packageJson.version || "0.0.0";
const versionedName = `MasterMotion_premierepro_v${version}.ccx`;
const versionedPath = join(releaseDir, versionedName);
const stablePath = join(releaseDir, "MasterMotion_premierepro.ccx");

function ensureBuild() {
  console.log("[package] Building plugin…");
  const result = spawnSync("npm", ["run", "build"], {
    cwd: root,
    stdio: "inherit",
    shell: true,
  });
  if (result.status !== 0) {
    throw new Error("Build failed — cannot package.");
  }
}

function collectFiles(dir, base = dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name.endsWith(".map")) {
      continue;
    }
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      collectFiles(full, base, out);
    } else {
      out.push({
        full,
        rel: relative(base, full).replace(/\\/g, "/"),
      });
    }
  }
  return out;
}

function packageCcx() {
  if (!existsSync(join(distDir, "manifest.json"))) {
    throw new Error("dist/manifest.json missing — run build first.");
  }

  mkdirSync(releaseDir, { recursive: true });
  const files = collectFiles(distDir);
  if (files.length === 0) {
    throw new Error("No files to package.");
  }

  /** @type {Record<string, Uint8Array>} */
  const archive = {};
  for (const file of files) {
    archive[file.rel] = new Uint8Array(readFileSync(file.full));
  }

  const zipped = zipSync(archive, { level: 6 });
  for (const path of [versionedPath, stablePath]) {
    if (existsSync(path)) {
      rmSync(path);
    }
  }
  writeFileSync(versionedPath, zipped);
  copyFileSync(versionedPath, stablePath);

  console.log(`[package] Created ${versionedPath}`);
  console.log(`[package] Created ${stablePath}`);
  console.log(`[package] Files packaged: ${files.length}`);
}

function writeReleaseNotes() {
  const notes = [
    `MasterMotion ${version}`,
    `Premiere Pro 25.6+`,
    ``,
    `INSTALL`,
    `- Windows (secours non officiel): double-cliquer Installer.bat`,
    `- macOS: voir docs/install/README.md ou ./install-macos.sh`,
    `- Officiel: importer le .ccx via Adobe Developer Distribution / Creative Cloud`,
    ``,
    `AVERTISSEMENT: Installer.bat/ps1 = sideload External, non signe Adobe.`,
    `Voir docs/distribution/signing.md`,
    ``,
  ].join("\n");
  writeFileSync(join(releaseDir, "VERSION.txt"), notes, "utf8");
  writeFileSync(
    join(releaseDir, "LISEZMOI.txt"),
    notes +
      `\nDocumentation: docs/getting-started.md\nLimites: docs/LIMITS.md\nLicences: docs/LICENSES.md\n`,
    "utf8"
  );
  writeFileSync(
    join(releaseDir, "README.txt"),
    [
      `MasterMotion ${version} — release package`,
      ``,
      `Files:`,
      `- MasterMotion_premierepro.ccx (stable name)`,
      `- ${versionedName}`,
      `- Installer.bat / Installer.ps1 (Windows sideload — UNOFFICIAL)`,
      `- install-macos.sh (macOS sideload — UNOFFICIAL)`,
      ``,
      `Preferred: signed .ccx via Adobe distribution.`,
      `See docs/install/README.md`,
      ``,
    ].join("\n"),
    "utf8"
  );
}

ensureBuild();
packageCcx();
writeReleaseNotes();
console.log("\n[package] OK — release/ ready.");
