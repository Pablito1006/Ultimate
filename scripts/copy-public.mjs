import { cpSync, mkdirSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const src = resolve(root, "public");
const dest = resolve(root, "dist");

if (!existsSync(dest)) {
  mkdirSync(dest, { recursive: true });
}

cpSync(src, dest, { recursive: true });
console.log("Copied public/ → dist/");
