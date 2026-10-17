import { useEffect, useState, type ReactElement } from "react";
import { toUserMessage } from "../../core/errors/AppError";
import {
  createMacro,
  duplicateMacro,
  exportMacroJson,
  importMacroJson,
} from "../../features/macros/macroEngine";
import { BUILTIN_MACROS, macroRunner } from "../../features/macros/MacroRunner";
import type { Macro, MacroRunResult } from "../../features/macros/macroTypes";
import { settingsService } from "../../services/storage/SettingsService";
import { Banner } from "../components/Banner";

export function MacrosPanel(): ReactElement {
  const [macros, setMacros] = useState<Macro[]>(BUILTIN_MACROS);
  const [selectedId, setSelectedId] = useState<string>(BUILTIN_MACROS[0]?.id ?? "");
  const [importRaw, setImportRaw] = useState("");
  const [result, setResult] = useState<MacroRunResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void settingsService.load().then((settings) => {
      if (settings.macros.length > 0) {
        setMacros(settings.macros);
        setSelectedId(settings.macros[0].id);
      }
    });
  }, []);

  const selected = macros.find((m) => m.id === selectedId) ?? null;

  async function persist(next: Macro[]): Promise<void> {
    setMacros(next);
    await settingsService.update({ macros: next });
  }

  async function runSelected(): Promise<void> {
    if (!selected) {
      return;
    }
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const run = await macroRunner.run(selected);
      setResult(run);
      setMessage(run.ok ? "Macro completed." : "Macro stopped on failure.");
    } catch (cause) {
      setError(toUserMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  async function addBlank(): Promise<void> {
    const next = createMacro({
      name: "New Macro",
      description: "Custom workflow",
      actions: [{ id: "a1", type: "analyzeTimeline" }],
    });
    await persist(macros.concat([next]));
    setSelectedId(next.id);
  }

  async function dup(): Promise<void> {
    if (!selected) {
      return;
    }
    const copy = duplicateMacro(selected);
    await persist(macros.concat([copy]));
    setSelectedId(copy.id);
  }

  async function removeSelected(): Promise<void> {
    if (!selected) {
      return;
    }
    const next = macros.filter((m) => m.id !== selected.id);
    await persist(next.length > 0 ? next : BUILTIN_MACROS);
    setSelectedId((next[0] ?? BUILTIN_MACROS[0]).id);
  }

  async function doImport(): Promise<void> {
    try {
      const macro = importMacroJson(importRaw);
      await persist(macros.concat([macro]));
      setSelectedId(macro.id);
      setMessage(`Imported “${macro.name}”.`);
      setImportRaw("");
    } catch (cause) {
      setError(toUserMessage(cause));
    }
  }

  return (
    <section>
      <h1 className="mm-panel-title">Macros</h1>
      <p className="mm-panel-subtitle">Composable atomic Premiere actions with history-friendly runs.</p>
      {error ? <Banner tone="error">{error}</Banner> : null}
      {message ? <Banner tone="info">{message}</Banner> : null}

      <div className="mm-card">
        <h2 className="mm-card__title">Library</h2>
        {macros.map((macro) => (
          <button
            key={macro.id}
            type="button"
            className={`mm-list-item ${selectedId === macro.id ? "mm-list-item--active" : ""}`}
            onClick={() => setSelectedId(macro.id)}
          >
            <strong>{macro.name}</strong>
            <span>{macro.description || `${macro.actions.length} action(s)`}</span>
          </button>
        ))}
      </div>

      <div className="mm-actions">
        <button type="button" className="mm-btn mm-btn--primary" disabled={busy || !selected} onClick={() => void runSelected()}>
          Run
        </button>
        <button type="button" className="mm-btn" onClick={() => void addBlank()}>
          New
        </button>
        <button type="button" className="mm-btn" disabled={!selected} onClick={() => void dup()}>
          Duplicate
        </button>
        <button type="button" className="mm-btn" disabled={!selected} onClick={() => void removeSelected()}>
          Delete
        </button>
      </div>

      {selected ? (
        <div className="mm-card">
          <h2 className="mm-card__title">Actions</h2>
          {selected.actions.map((action) => (
            <div key={action.id} className="mm-row">
              <span className="mm-row__label">{action.type}</span>
              <span className="mm-row__value">{JSON.stringify(action.params ?? {})}</span>
            </div>
          ))}
          <div className="mm-actions">
            <button
              type="button"
              className="mm-btn"
              onClick={() => {
                void navigator.clipboard.writeText(exportMacroJson(selected));
                setMessage("Macro JSON copied.");
              }}
            >
              Export JSON
            </button>
          </div>
        </div>
      ) : null}

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

      {result ? (
        <div className="mm-card">
          <h2 className="mm-card__title">Last run</h2>
          {result.steps.map((step) => (
            <div key={step.actionId} className="mm-row">
              <span className="mm-row__label">{step.ok ? "ok" : "fail"}</span>
              <span className="mm-row__value">{step.message}</span>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
