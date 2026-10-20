/**
 * Export / bin naming helpers (pure).
 */

export function sanitizeFileToken(raw: string): string {
  let out = "";
  const trimmed = raw.trim();
  for (let i = 0; i < trimmed.length; i += 1) {
    const ch = trimmed.charAt(i);
    const code = trimmed.charCodeAt(i);
    if (code < 32 || '<>:"/\\|?*'.includes(ch)) {
      out += "_";
    } else if (/\s/.test(ch)) {
      out += "_";
    } else {
      out += ch;
    }
  }
  return out.replace(/_+/g, "_").replace(/^\.+|\.+$/g, "").slice(0, 80) || "untitled";
}

export function formatDateStamp(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

export interface ExportNameInput {
  projectName: string;
  sequenceName: string;
  platformSlug: string;
  extension: string;
  /** Optional override date (tests). */
  date?: Date;
}

/**
 * `{project}_{sequence}_{platform}_{yyyyMMdd}.{ext}`
 */
export function buildExportFileName(input: ExportNameInput): string {
  const project = sanitizeFileToken(input.projectName);
  const sequence = sanitizeFileToken(input.sequenceName);
  const platform = sanitizeFileToken(input.platformSlug);
  const stamp = formatDateStamp(input.date);
  let ext = input.extension.trim().replace(/^\./, "").toLowerCase();
  if (!ext) {
    ext = "mp4";
  }
  return `${project}_${sequence}_${platform}_${stamp}.${ext}`;
}

export function joinOutputPath(folder: string, fileName: string): string {
  const dir = folder.replace(/[/\\]+$/, "");
  const sep = dir.includes("\\") ? "\\" : "/";
  return `${dir}${sep}${fileName}`;
}
