import { useCallback, useEffect, useMemo, useState, type ReactElement } from "react";
import {
  listPresetCategories,
  searchPresets,
  getPresetById,
} from "../../features/motion/presets/presetCatalog";
import { presetPreviewable, removePresetKeyframes } from "../../features/motion/presets/presetPreviewable";
import { usePreviewSession } from "../../features/preview/usePreviewSession";
import { Banner } from "../components/Banner";
import { AnimatedPreview } from "../components/preview/AnimatedPreview";
import { PlanList } from "../components/preview/PlanList";
import { PreviewBar } from "../components/preview/PreviewBar";

export function PresetsPanel(): ReactElement {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, string | number | boolean>>({});
  const [removeMsg, setRemoveMsg] = useState<string | null>(null);

  const presets = useMemo(() => searchPresets(query, category), [query, category]);
  const categories = useMemo(() => listPresetCategories(), []);
  const selected = selectedId ? getPresetById(selectedId) : undefined;

  useEffect(() => {
    if (!selected) {
      return;
    }
    const next: Record<string, string | number | boolean> = {};
    for (const p of selected.parameters) {
      next[p.id] = values[p.id] ?? p.defaultValue;
    }
    setValues(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset on preset change
  }, [selected?.id]);

  const getInput = useCallback(
    () => ({
      presetId: selectedId || "",
      values,
      maxClips: 20,
    }),
    [selectedId, values]
  );

  const session = usePreviewSession(presetPreviewable, getInput);

  async function onRemove(): Promise<void> {
    if (!session.plan) {
      setRemoveMsg("Compute a preview plan first, then remove uses the same ranges.");
      return;
    }
    const report = await removePresetKeyframes(session.plan);
    setRemoveMsg(report.message);
  }

  return (
    <section>
      <h1 className="mm-panel-title">Presets</h1>
      <p className="mm-panel-subtitle">
        Presets natifs par keyframes (sans .mogrt) — aperçu, application, retrait propre. N’écrase pas les
        keyframes existants sans option explicite.
      </p>
      {session.error ? <Banner tone="error">{session.error}</Banner> : null}
      {session.message ? <Banner tone="info">{session.message}</Banner> : null}
      {removeMsg ? <Banner tone="info">{removeMsg}</Banner> : null}

      <div className="mm-card">
        <label className="mm-field">
          <span>Search</span>
          <input value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
        <label className="mm-field">
          <span>Category</span>
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="all">All</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mm-card">
        <h2 className="mm-card__title">Presets ({presets.length})</h2>
        {presets.map((preset) => (
          <button
            key={preset.id}
            type="button"
            className={`mm-list-item ${selectedId === preset.id ? "mm-list-item--active" : ""}`}
            onClick={() => {
              setSelectedId(preset.id);
              session.clear();
              setRemoveMsg(null);
            }}
          >
            <strong>{preset.name}</strong>
            <span>
              {preset.category} · {preset.tags.join(", ")}
            </span>
          </button>
        ))}
      </div>

      {selected ? (
        <div className="mm-card">
          <h2 className="mm-card__title">Parameters — {selected.name}</h2>
          <p className="mm-muted">{selected.description}</p>
          {selected.parameters.map((p) => (
            <label key={p.id} className="mm-field">
              <span>{p.label.en}</span>
              {p.type === "checkbox" ? (
                <input
                  type="checkbox"
                  checked={Boolean(values[p.id])}
                  onChange={(e) => setValues((v) => ({ ...v, [p.id]: e.target.checked }))}
                />
              ) : p.type === "dropdown" || p.type === "easing" ? (
                <select
                  value={String(values[p.id] ?? p.defaultValue)}
                  onChange={(e) => setValues((v) => ({ ...v, [p.id]: e.target.value }))}
                >
                  {(p.options || []).map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="number"
                  min={p.min}
                  max={p.max}
                  step={p.step ?? 1}
                  value={Number(values[p.id] ?? 0)}
                  onChange={(e) => setValues((v) => ({ ...v, [p.id]: Number(e.target.value) }))}
                />
              )}
            </label>
          ))}
        </div>
      ) : null}

      <PlanList summary={session.summary} />
      <AnimatedPreview visual={session.visual} />

      <PreviewBar
        busy={session.busy || !selectedId}
        canApply={session.canApply}
        onPreview={() => void session.runPreview()}
        onApply={() => void session.runApply()}
        previewLabel="Aperçu"
        applyLabel="Appliquer"
        levelCNote="Essai sur copie de séquence : non disponible (WP4)."
      />

      <div className="mm-actions">
        <button type="button" className="mm-btn" disabled={!session.plan} onClick={() => void onRemove()}>
          Retirer keyframes du plan
        </button>
      </div>
    </section>
  );
}
