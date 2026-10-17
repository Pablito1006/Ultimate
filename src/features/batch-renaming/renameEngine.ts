export type RenameCaseMode = "none" | "upper" | "lower" | "title" | "trim";

export interface RenameOptions {
  find?: string;
  replace?: string;
  useRegex?: boolean;
  prefix?: string;
  suffix?: string;
  numbering?: {
    enabled: boolean;
    start: number;
    pad: number;
    separator?: string;
  };
  caseMode?: RenameCaseMode;
  removeSpaces?: boolean;
  customPattern?: string;
}

export interface RenamePreviewItem {
  id: string;
  before: string;
  after: string;
  changed: boolean;
}

function applyCase(value: string, mode: RenameCaseMode | undefined): string {
  if (!mode || mode === "none") {
    return value;
  }
  if (mode === "upper") {
    return value.toUpperCase();
  }
  if (mode === "lower") {
    return value.toLowerCase();
  }
  if (mode === "trim") {
    return value.trim();
  }
  return value.replace(/\w\S*/g, (word) => {
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  });
}

function applyFindReplace(
  value: string,
  find: string | undefined,
  replace: string | undefined,
  useRegex: boolean | undefined
): string {
  if (!find) {
    return value;
  }
  const replacement = replace ?? "";
  if (useRegex) {
    try {
      return value.replace(new RegExp(find, "g"), replacement);
    } catch {
      return value;
    }
  }
  return value.split(find).join(replacement);
}

function applyCustomPattern(
  original: string,
  index: number,
  pattern: string | undefined,
  numbering: RenameOptions["numbering"]
): string | null {
  if (!pattern) {
    return null;
  }
  const start = numbering?.start ?? 1;
  const pad = numbering?.pad ?? 2;
  const n = String(start + index).padStart(pad, "0");
  return pattern
    .replace(/\{name\}/g, original)
    .replace(/\{n\}/g, n)
    .replace(/\{index\}/g, String(index + 1));
}

/**
 * Pure rename engine — previewable, deterministic, no Premiere dependency.
 */
export function renameItems(
  items: Array<{ id: string; name: string }>,
  options: RenameOptions
): RenamePreviewItem[] {
  return items.map((item, index) => {
    let next =
      applyCustomPattern(item.name, index, options.customPattern, options.numbering) ??
      item.name;

    if (!options.customPattern) {
      next = applyFindReplace(next, options.find, options.replace, options.useRegex);
      if (options.prefix) {
        next = options.prefix + next;
      }
      if (options.suffix) {
        next = next + options.suffix;
      }
      if (options.numbering?.enabled) {
        const start = options.numbering.start;
        const pad = options.numbering.pad;
        const sep = options.numbering.separator ?? "_";
        const n = String(start + index).padStart(pad, "0");
        next = `${next}${sep}${n}`;
      }
    }

    next = applyCase(next, options.caseMode);
    if (options.removeSpaces) {
      next = next.replace(/\s+/g, "");
    }

    return {
      id: item.id,
      before: item.name,
      after: next,
      changed: next !== item.name,
    };
  });
}
