import { useCallback, useEffect, useState, type ReactElement } from "react";
import { toUserMessage } from "../../core/errors/AppError";
import {
  createMacro,
  duplicateMacro,
  exportMacroJson,
  importMacroJson,
} from "../../features/macros/macroEngine";
import { BUILTIN_MACROS } from "../../features/macros/MacroRunner";
import {
  macroPreviewable,
  type MacroPlanInput,
} from "../../features/macros/macroPreviewable";
import type { Macro } from "../../features/macros/macroTypes";
import { usePreviewSession } from "../../features/preview/usePreviewSession";
import { settingsService } from "../../services/storage/SettingsService";
import { Banner } from "../components/Banner";
import { PlanList } from "../components/preview/PlanList";
import { PreviewBar } from "../components/preview/PreviewBar";

export function MacrosPanel(): ReactElement {
  const [macros, setMacros] = useState<Macro[]>(BUILTIN_MACROS);
  const [selectedId, setSelectedId] = useState<string>(BUILTIN_MACROS[0]?.id ?? "");
  const [importRaw, setImportRaw] = useState("");
  const [libError, setLibError] = useState<string | null>(null);
  const [libMessage, setLibMessage] = useState<string | null>(null);

  useEffect(() => {
    void settingsService.load().then((settings) => {
      if (settings.macros.length > 0) {
        setMacros(settings.macros);
        setSelectedId(settings.macros[0].id);
      }
    });
  }, []);

  const selected = macros.find((m) => m.id === selectedId) ?? null;

  const getInput = useCallback((): MacroPlanInput => {
    if (!selected) {
      throw new Error("Select a macro first.");
    }
    return { macro: selected };
  }, [selected]);

  const session = usePreviewSession(macroPreviewable, getInput);

  async function persist(next: Macro[]): Promise<void> {
    setMacros(next);
    await settingsService.update({ macros: next });
  }

  async function addBlank(): Promise<void> {
    const next = createMacro({
      name: "New Macro",
      description: "Custom workflow",
      actions: [{ id: "a1", type: "analyzeTimeline" }],
    });
    await persist(macros.concat([next]));
    setSelectedId(next.id);
    session.clear();
  }

  async function dup(): Promise<void> {
    if (!selected) {
      return;
    }
    const copy = duplicateMacro(selected);
    await persist(macros.concat([copy]));
    setSelectedId(copy.id);
    session.clear();
  }

  async function removeSelected(): Promise<void> {
    if (!selected) {
      return;
    }
    const next = macros.filter((m) => m.id !== selected.id);
    await persist(next.length > 0 ? next : BUILTIN_MACROS);
    setSelectedId((next[0] ?? BUILTIN_MACROS[0]).id);
    session.clear();
  }

  async function doImport(): Promise<void> {
    try {
      const macro = importMacroJson(importRaw);
      await persist(macros.concat([macro]));
      setSelectedId(macro.id);
      setLibMessage(`Imported “${macro.name}”.`);
      setImportRaw("");
      session.clear();
    } catch (cause) {
      setLibError(toUserMessage(cause));
    }
  }

  return (
    <section>
      <h1 className="mm-panel-title">Macros</h1>
      <p className="mm-panel-subtitle">
        Preview the action plan (A), then apply — Apply disabled until Preview.
      </p>
      {session.error || libError ? (
        <Banner tone="error">{session.error || libError}</Banner>
      ) : null}
      {session.message || libMessage ? (
        <Banner tone="info">{session.message || libMessage}</Banner>
      ) : null}

      <div className="mm-card">
        <h2 className="mm-card__title">Library</h2>
        {macros.map((macro) => (
          <button
            key={macro.id}
            type="button"
            className={`mm-list-item ${selectedId === macro.id ? "mm-list-item--active" : ""}`}
            onClick={() => {
              setSelectedId(macro.id);
              session.clear();
            }}
          >
            <strong>{macro.name}</strong>
            <span>{macro.description || `${macro.actions.length} action(s)`}</span>
          </button>
        ))}
      </div>

      <PreviewBar
        busy={session.busy}
        canApply={session.canApply}
        onPreview={() => void session.runPreview()}
        onApply={() => void session.runApply()}
        previewLabel="Preview"
        applyLabel="Apply / Run"
        levelCNote={session.summary?.levelCNote}
      />

      <div className="mm-actions">
        <button type="button" className="mm-btn" onClick={() => void addBlank()}>
          New
        </button>
        <button type="button" className="mm-btn" disabled={!selected} onClick={() => void dup()}>
          Duplicate
        </button>
        <button
          type="button"
          className="mm-btn"
          disabled={!selected}
          onClick={() => void removeSelected()}
        >
          Delete
        </button>
        {selected ? (
          <button
            type="button"
            className="mm-btn"
            onClick={() => {
              void navigator.clipboard.writeText(exportMacroJson(selected));
              setLibMessage("Macro JSON copied.");
            }}
          >
            Export JSON
          </button>
        ) : null}
      </div>

      <PlanList summary={session.summary} />

      <div className="mm-card">
        <h2 className="mm-card__title">Import JSON</h2>
        <label className="mm-field">
          <span>Paste macro</span>
          <textarea rows={4} value={importRaw} onChange={(e) => setImportRaw(e.target.value)} />
        </label>
        <button type="button" className="mm-btn" onClick={() => void doImport()}>
          Import
        </button>
      </div>
    </section>
  );
}
