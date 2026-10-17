import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, relative, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";

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
  console.log("Building plugin…");
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
    throw new Error("dist/manifest.json missing.");
  }

  mkdirSync(releaseDir, { recursive: true });
  const files = collectFiles(distDir);
  if (files.length === 0) {
    throw new Error("No files to package.");
  }

  const staging = mkdtempSync(join(tmpdir(), "mm-ccx-"));
  try {
    for (const file of files) {
      const dest = join(staging, file.rel);
      mkdirSync(dirname(dest), { recursive: true });
      copyFileSync(file.full, dest);
    }

    const zipPath = join(releaseDir, "_mastermotion_temp.zip");
    for (const path of [zipPath, versionedPath, stablePath]) {
      if (existsSync(path)) {
        rmSync(path);
      }
    }

    const ps = spawnSync(
      "powershell.exe",
      [
        "-NoProfile",
        "-Command",
        `Compress-Archive -Path (Join-Path '${staging.replace(/'/g, "''")}' '*') -DestinationPath '${zipPath.replace(/'/g, "''")}' -Force`,
      ],
      { stdio: "inherit" }
    );

    if (ps.status !== 0 || !existsSync(zipPath)) {
      throw new Error("Compress-Archive failed — cannot create .ccx");
    }

    copyFileSync(zipPath, versionedPath);
    copyFileSync(zipPath, stablePath);
    rmSync(zipPath);

    console.log(`Created ${versionedPath}`);
    console.log(`Created ${stablePath}`);
    console.log(`Files packaged: ${files.length}`);
  } finally {
    rmSync(staging, { recursive: true, force: true });
  }
}

ensureBuild();
packageCcx();
writeFileSync(
  join(releaseDir, "VERSION.txt"),
  `MasterMotion ${version}\nPremiere Pro 25.6+\nDouble-cliquez Installer.bat\n`,
  "utf8"
);
console.log("\nOK — dossier release/ pret a distribuer aux utilisateurs.");
