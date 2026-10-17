#!/usr/bin/env node
/**
 * Deterministic procedural SVG previews from previewSpec (npm run previews).
 */
import { mkdirSync, readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const templatesRoot = join(root, "assets/templates");
const previewsRoot = join(root, "assets/previews");

function dims(aspect) {
  if (aspect === "9:16") {
    return { w: 270, h: 480 };
  }
  if (aspect === "1:1") {
    return { w: 360, h: 360 };
  }
  if (aspect === "4:5") {
    return { w: 360, h: 450 };
  }
  return { w: 480, h: 270 };
}

function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderSvg(tpl, animated) {
  const { w, h } = dims(tpl.aspect);
  const spec = tpl.previewSpec || {};
  const primary = spec.primaryColor || "#5C9CE6";
  const secondary = spec.secondaryColor || "#1A1A1A";
  const text = esc(spec.sampleText || tpl.name);
  const seed = spec.seed || 1;
  const ox = (seed % 17) - 8;
  const oy = (Math.floor(seed / 17) % 11) - 5;
  const kind = spec.kind || "title-reveal";

  let body = "";
  if (kind === "lower-third") {
    const y = h * 0.72;
    body = `
      <rect x="${w * 0.08}" y="${y}" width="${w * 0.55}" height="${h * 0.14}" rx="4" fill="${primary}" opacity="0.95"/>
      <text x="${w * 0.1}" y="${y + h * 0.08}" fill="${secondary}" font-family="Segoe UI, sans-serif" font-size="${Math.max(12, w * 0.035)}" font-weight="600">${text}</text>
    `;
  } else if (kind === "transition") {
    body = `
      <rect x="0" y="0" width="${w}" height="${h}" fill="${secondary}"/>
      <polygon points="${w * 0.2},${h * 0.1} ${w * 0.85},${h * 0.5} ${w * 0.2},${h * 0.9}" fill="${primary}" opacity="0.85"/>
    `;
  } else if (kind === "social" || kind === "overlay") {
    body = `
      <rect x="${w * 0.15}" y="${h * 0.35}" width="${w * 0.7}" height="${h * 0.28}" rx="12" fill="${primary}" opacity="0.9"/>
      <text x="${w / 2}" y="${h * 0.52}" text-anchor="middle" fill="#fff" font-family="Segoe UI, sans-serif" font-size="${Math.max(11, w * 0.04)}">${text}</text>
    `;
  } else if (kind === "infographic") {
    const barH = h * 0.12;
    body = `
      <rect x="${w * 0.15}" y="${h * 0.3}" width="${w * 0.5}" height="${barH}" fill="${primary}"/>
      <rect x="${w * 0.15}" y="${h * 0.48}" width="${w * 0.35}" height="${barH}" fill="${primary}" opacity="0.7"/>
      <rect x="${w * 0.15}" y="${h * 0.66}" width="${w * 0.6}" height="${barH}" fill="${primary}" opacity="0.5"/>
    `;
  } else if (kind === "caption") {
    body = `
      <rect x="${w * 0.2}" y="${h * 0.75}" width="${w * 0.6}" height="${h * 0.12}" rx="6" fill="${secondary}" opacity="0.75"/>
      <text x="${w / 2}" y="${h * 0.83}" text-anchor="middle" fill="#fff" font-family="Segoe UI, sans-serif" font-size="${Math.max(11, w * 0.038)}">${text}</text>
    `;
  } else {
    // title / kinetic / intro
    body = `
      <text x="${w / 2 + ox}" y="${h / 2 + oy}" text-anchor="middle" dominant-baseline="middle"
        fill="${primary}" font-family="Georgia, serif" font-size="${Math.max(16, w * 0.07)}" font-weight="700">${text}</text>
      <line x1="${w * 0.3}" y1="${h * 0.62}" x2="${w * 0.7}" y2="${h * 0.62}" stroke="${primary}" stroke-width="2"/>
    `;
  }

  const anim = animated
    ? `<animateTransform attributeName="transform" type="translate" values="0 8;0 0;0 8" dur="2s" repeatCount="indefinite"/>`
    : "";

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(tpl.name)}">
  <rect width="${w}" height="${h}" fill="#0E0E10"/>
  <g>${anim}${body}</g>
  <text x="8" y="${h - 8}" fill="#666" font-size="9" font-family="monospace">${esc(tpl.id)}</text>
</svg>
`;
}

if (!existsSync(templatesRoot)) {
  console.error("[previews] Run templates:generate first");
  process.exit(1);
}

mkdirSync(previewsRoot, { recursive: true });
const dirs = readdirSync(templatesRoot, { withFileTypes: true }).filter((d) => d.isDirectory());
let count = 0;
for (const d of dirs) {
  const jsonPath = join(templatesRoot, d.name, "template.json");
  if (!existsSync(jsonPath)) {
    continue;
  }
  const tpl = JSON.parse(readFileSync(jsonPath, "utf8"));
  writeFileSync(join(previewsRoot, `${tpl.id}.svg`), renderSvg(tpl, false), "utf8");
  writeFileSync(join(previewsRoot, `${tpl.id}-anim.svg`), renderSvg(tpl, true), "utf8");
  count += 1;
}

console.log(`[previews] Wrote ${count * 2} SVG files → assets/previews/`);
