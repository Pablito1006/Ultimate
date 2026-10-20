import { useEffect, useMemo, useState, type ReactElement } from "react";
import {
  buildCommandRegistry,
  filterCommands,
  labelFor,
  type CommandDefinition,
} from "../../features/commands/commandRegistry";
import type { NavId } from "../navigation";

export interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  onNavigate: (id: NavId) => void;
  macros?: Array<{ id: string; name: string }>;
  language?: "en" | "fr";
  onRunMacro?: (macroId: string) => void;
}

export function CommandPalette({
  open,
  onClose,
  onNavigate,
  macros = [],
  language = "fr",
  onRunMacro,
}: CommandPaletteProps): ReactElement | null {
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);

  const commands = useMemo(() => buildCommandRegistry(macros), [macros]);
  const filtered = useMemo(
    () => filterCommands(commands, query, language),
    [commands, query, language]
  );

  useEffect(() => {
    if (open) {
      setQuery("");
      setIndex(0);
    }
  }, [open]);

  useEffect(() => {
    setIndex(0);
  }, [query]);

  if (!open) {
    return null;
  }

  function run(cmd: CommandDefinition): void {
    if (cmd.kind === "navigate" && cmd.navId) {
      onNavigate(cmd.navId);
    } else if (cmd.kind === "macro" && cmd.macroId) {
      onNavigate("macros");
      onRunMacro?.(cmd.macroId);
    } else if (cmd.actionId === "focusMacros") {
      onNavigate("macros");
    }
    onClose();
  }

  return (
    <div
      className="mm-palette-backdrop"
      role="presentation"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          onClose();
        }
      }}
    >
      <div
        className="mm-palette"
        role="dialog"
        aria-label="Command palette"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setIndex((i) => Math.min(filtered.length - 1, i + 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setIndex((i) => Math.max(0, i - 1));
          } else if (e.key === "Enter" && filtered[index]) {
            e.preventDefault();
            run(filtered[index]);
          } else if (e.key === "Escape") {
            onClose();
          }
        }}
      >
        <input
          className="mm-palette__input"
          autoFocus
          placeholder={language === "fr" ? "Rechercher une commande…" : "Search commands…"}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <ul className="mm-palette__list">
          {filtered.map((cmd, i) => (
            <li key={cmd.id}>
              <button
                type="button"
                className={`mm-palette__item ${i === index ? "mm-palette__item--active" : ""}`}
                onClick={() => run(cmd)}
                onMouseEnter={() => setIndex(i)}
              >
                <span>{labelFor(cmd, language)}</span>
                <span className="mm-muted">{cmd.kind}</span>
              </button>
            </li>
          ))}
          {filtered.length === 0 ? <li className="mm-muted">Aucun résultat</li> : null}
        </ul>
        <p className="mm-muted mm-palette__hint">↑↓ Entrée · Esc · Ctrl/Cmd+K</p>
      </div>
    </div>
  );
}
