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
import {
  macroTriggerService,
  type MacroTriggerBinding,
} from "../../features/macros/macroTriggers";
import type { Macro } from "../../features/macros/macroTypes";
import { eventService } from "../../premiere/events/EventService";
import { usePreviewSession } from "../../features/preview/usePreviewSession";
import { settingsService } from "../../services/storage/SettingsService";
import { Banner } from "../components/Banner";
import { AnimatedPreview } from "../components/preview/AnimatedPreview";
import { PlanList } from "../components/preview/PlanList";
import { PreviewBar } from "../components/preview/PreviewBar";

export interface MacrosPanelProps {
  focusMacroId?: string | null;
}

export function MacrosPanel({ focusMacroId = null }: MacrosPanelProps): ReactElement {
  const [macros, setMacros] = useState<Macro[]>(BUILTIN_MACROS);
  const [selectedId, setSelectedId] = useState<string>(BUILTIN_MACROS[0]?.id ?? "");
  const [importRaw, setImportRaw] = useState("");
  const [libError, setLibError] = useState<string | null>(null);
  const [libMessage, setLibMessage] = useState<string | null>(null);
  const [continueOnError, setContinueOnError] = useState(false);
  const [triggers, setTriggers] = useState<MacroTriggerBinding[]>([]);
  const [triggerEvent, setTriggerEvent] = useState<"SELECTION_CHANGED" | "ACTIVATED">(
    "SELECTION_CHANGED"
  );

  useEffect(() => {
    void settingsService.load().then((settings) => {
      if (settings.macros.length > 0) {
        setMacros(settings.macros);
        setSelectedId(settings.macros[0].id);
      }
      setTriggers(settings.macroTriggers ?? []);
      macroTriggerService.setMacroCatalog(
        settings.macros.length > 0 ? settings.macros : BUILTIN_MACROS
      );
    });
  }, []);

  useEffect(() => {
    if (focusMacroId) {
      setSelectedId(focusMacroId);
    }
  }, [focusMacroId]);

  const selected = macros.find((m) => m.id === selectedId) ?? null;

  const getInput = useCallback((): MacroPlanInput => {
    if (!selected) {
      throw new Error("Select a macro first.");
    }
    return { macro: selected, continueOnError };
  }, [selected, continueOnError]);

  const session = usePreviewSession(macroPreviewable, getInput);

  async function persist(next: Macro[]): Promise<void> {
    setMacros(next);
    macroTriggerService.setMacroCatalog(next);
    await settingsService.update({ macros: next });
  }

  async function addBlank(): Promise<void> {
    const next = createMacro({
      name: "New Macro",
      description: "Custom workflow (schema v2)",
      schemaVersion: 2,
      variables: {},
      steps: [
        { kind: "preview", id: "p1", label: "Review plan" },
        { kind: "action", id: "a1", type: "analyzeTimeline" },
      ],
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
      setLibMessage(`Imported “${macro.name}” (schema v${macro.schemaVersion ?? 1}).`);
      setLibError(null);
      setImportRaw("");
      session.clear();
    } catch (cause) {
      setLibError(toUserMessage(cause));
    }
  }

  async function addTrigger(): Promise<void> {
    if (!selected) {
      return;
    }
    if (!eventService.isAvailable()) {
      setLibError("EventManager unavailable on this host.");
      return;
    }
    const binding: MacroTriggerBinding = {
      id: `trg_${Date.now()}`,
      macroId: selected.id,
      trigger: { scope: "sequence", event: triggerEvent },
      enabled: false,
    };
    const next = triggers.concat([binding]);
    setTriggers(next);
    await settingsService.update({ macroTriggers: next });
    setLibMessage(
      "Déclencheur ajouté (désactivé). Activez-le explicitement — jamais d’auto-run par défaut."
    );
  }

  async function toggleTrigger(id: string, enabled: boolean): Promise<void> {
    const next = triggers.map((t) => (t.id === id ? { ...t, enabled } : t));
    setTriggers(next);
    await settingsService.update({ macroTriggers: next });
    macroTriggerService.setMacroCatalog(macros);
    const attached = await macroTriggerService.applyBindings(next);
    setLibMessage(
      enabled
        ? `Déclencheurs actifs: ${attached} (EventManager).`
        : "Déclencheur désactivé."
    );
  }

  return (
    <section>
      <h1 className="mm-panel-title">Macros v2</h1>
      <p className="mm-panel-subtitle">
        Variables · conditions · boucles · étapes d’aperçu · arrêt sur erreur · recettes. Palette
        Ctrl/Cmd+K. Déclencheurs EventManager opt-in.
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
            <strong>
              {macro.name}{" "}
              <span className="mm-muted">v{macro.schemaVersion ?? 1}</span>
            </strong>
            <span>
              {macro.description ||
                `${macro.steps?.length ?? macro.actions.length} step(s)`}
            </span>
          </button>
        ))}
      </div>

      <div className="mm-card">
        <label className="mm-field">
          <span>
            <input
              type="checkbox"
              checked={continueOnError}
              onChange={(e) => {
                setContinueOnError(e.target.checked);
                session.clear();
              }}
            />{" "}
            Continuer après erreur (dangereux — les étapes OK précédentes ne sont pas annulées)
          </span>
        </label>
      </div>

      <PreviewBar
        busy={session.busy}
        canApply={session.canApply}
        onPreview={() => void session.runPreview()}
        onApply={() => void session.runApply()}
        previewLabel="Aperçu"
        applyLabel="Appliquer / Run"
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
              setLibMessage("Macro JSON v2 copied.");
            }}
          >
            Export JSON
          </button>
        ) : null}
      </div>

      <PlanList summary={session.summary} />
      <AnimatedPreview visual={session.visual} />

      <div className="mm-card">
        <h2 className="mm-card__title">Déclencheurs EventManager (opt-in)</h2>
        <p className="mm-muted">
          API Since 25.6 — SequenceEvent / ProjectEvent. Jamais activés sans case explicite.
        </p>
        <label className="mm-field">
          <span>Événement séquence</span>
          <select
            value={triggerEvent}
            onChange={(e) =>
              setTriggerEvent(e.target.value as "SELECTION_CHANGED" | "ACTIVATED")
            }
          >
            <option value="SELECTION_CHANGED">SELECTION_CHANGED</option>
            <option value="ACTIVATED">ACTIVATED</option>
          </select>
        </label>
        <button type="button" className="mm-btn" disabled={!selected} onClick={() => void addTrigger()}>
          Ajouter déclencheur (off)
        </button>
        {triggers.map((t) => (
          <label key={t.id} className="mm-field">
            <span>
              <input
                type="checkbox"
                checked={t.enabled}
                onChange={(e) => void toggleTrigger(t.id, e.target.checked)}
              />{" "}
              {t.macroId} ← {t.trigger.scope}.{t.trigger.event}
            </span>
          </label>
        ))}
      </div>

      <div className="mm-card">
        <h2 className="mm-card__title">Import JSON (schema v1/v2 validé)</h2>
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
