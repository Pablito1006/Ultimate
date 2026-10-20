import { en } from "../../i18n/locales/en";
import { fr } from "../../i18n/locales/fr";
import type { NavId } from "../../ui/navigation";
import { NAV_ITEMS } from "../../ui/navigation";

export type CommandKind = "navigate" | "macro" | "action";

export interface CommandDefinition {
  id: string;
  title: string;
  titleFr: string;
  keywords: string[];
  kind: CommandKind;
  /** Navigate target. */
  navId?: NavId;
  /** Builtin macro id. */
  macroId?: string;
  /** Free-form action id (palette handlers). */
  actionId?: string;
  /** Default shortcut chord, e.g. "mod+k". */
  defaultShortcut?: string;
}

/**
 * Flat searchable command index for Ctrl/Cmd+K.
 */
export function buildCommandRegistry(extraMacros?: Array<{ id: string; name: string }>): CommandDefinition[] {
  const commands: CommandDefinition[] = [
    {
      id: "cmd.palette",
      title: "Command palette",
      titleFr: "Palette de commandes",
      keywords: ["palette", "search", "goto"],
      kind: "action",
      actionId: "openPalette",
      defaultShortcut: "mod+k",
    },
    {
      id: "cmd.macros.runSelected",
      title: "Run selected macro (preview first)",
      titleFr: "Lancer la macro sélectionnée (aperçu d’abord)",
      keywords: ["macro", "run", "play"],
      kind: "action",
      actionId: "focusMacros",
      defaultShortcut: "mod+shift+m",
    },
  ];

  for (const item of NAV_ITEMS) {
    if (!item.enabled) {
      continue;
    }
    const enLabel = en[item.labelKey];
    const frLabel = fr[item.labelKey];
    commands.push({
      id: `nav.${item.id}`,
      title: `Go to ${enLabel}`,
      titleFr: `Aller à ${frLabel}`,
      keywords: [item.id, enLabel, frLabel, item.hint ?? "", "panel", "navigate"],
      kind: "navigate",
      navId: item.id,
    });
  }

  const macros = extraMacros ?? [];
  for (const m of macros) {
    commands.push({
      id: `macro.${m.id}`,
      title: `Macro: ${m.name}`,
      titleFr: `Macro : ${m.name}`,
      keywords: ["macro", m.name, m.id],
      kind: "macro",
      macroId: m.id,
      navId: "macros",
    });
  }

  return commands;
}

export function filterCommands(
  commands: CommandDefinition[],
  query: string,
  lang: "en" | "fr" = "fr"
): CommandDefinition[] {
  const q = query.trim().toLowerCase();
  if (!q) {
    return commands.slice(0, 40);
  }
  return commands
    .map((c) => {
      const primary = lang === "fr" ? c.titleFr : c.title;
      const hay = [c.id, c.title, c.titleFr, ...c.keywords].join(" ").toLowerCase();
      const score = hay.includes(q)
        ? primary.toLowerCase().startsWith(q)
          ? 3
          : c.title.toLowerCase().startsWith(q)
            ? 2
            : 1
        : 0;
      return { c, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.c)
    .slice(0, 40);
}

export function labelFor(cmd: CommandDefinition, lang: "en" | "fr"): string {
  return lang === "fr" ? cmd.titleFr : cmd.title;
}

/** Parse "mod+k" / "ctrl+shift+m" against a KeyboardEvent. */
export function matchShortcut(chord: string, e: KeyboardEvent): boolean {
  const parts = chord.toLowerCase().split("+").map((p) => p.trim());
  const needMod = parts.includes("mod") || parts.includes("ctrl") || parts.includes("cmd");
  const needShift = parts.includes("shift");
  const needAlt = parts.includes("alt");
  const key = parts.filter((p) => !["mod", "ctrl", "cmd", "shift", "alt"].includes(p))[0];
  if (!key) {
    return false;
  }
  const modPressed = e.metaKey || e.ctrlKey;
  if (needMod !== modPressed) {
    return false;
  }
  if (needShift !== e.shiftKey) {
    return false;
  }
  if (needAlt !== e.altKey) {
    return false;
  }
  return e.key.toLowerCase() === key.toLowerCase();
}
