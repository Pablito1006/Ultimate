import { useCallback, useEffect, useMemo, useState, type ReactElement } from "react";
import { motionPreviewable } from "../../features/motion/motionPreviewable";
import { usePreviewSession } from "../../features/preview/usePreviewSession";
import {
  listMotionCategories,
  searchTemplates,
} from "../../features/motion/templateRegistry";
import type { MotionCategory, MotionTemplateDefinition } from "../../features/motion/templateTypes";
import { labelText } from "../../features/motion/templateTypes";
import { templateLibrary } from "../../features/motion/templates/TemplateLibrary";
import { settingsService } from "../../services/storage/SettingsService";
import { Banner } from "../components/Banner";
import { AnimatedPreview } from "../components/preview/AnimatedPreview";
import { PlanList } from "../components/preview/PlanList";
import { PreviewBar } from "../components/preview/PreviewBar";

export function MotionPanel(): ReactElement {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<MotionCategory | "all">("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, string | number | boolean>>({});
  const [allowMarkerFallback, setAllowMarkerFallback] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);

  const templates = useMemo(() => searchTemplates(query, category), [query, category]);
  const categories = useMemo(() => listMotionCategories(), []);
  const selected: MotionTemplateDefinition | undefined = useMemo(
    () => templates.find((t) => t.id === selectedId) || searchTemplates("", "all").find((t) => t.id === selectedId),
    [templates, selectedId]
  );

  useEffect(() => {
    void settingsService.load().then((s) => setFavorites(s.favoriteTemplateIds));
  }, []);

  useEffect(() => {
    if (!selected) {
      return;
    }
    const next: Record<string, string | number | boolean> = {};
    for (const p of selected.parameters) {
      next[p.id] = values[p.id] ?? p.defaultValue;
    }
    setValues(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset when template changes
  }, [selected?.id]);

  const getInput = useCallback(
    () => ({
      templateId: selectedId || "",
      values,
      allowMarkerFallback,
    }),
    [selectedId, values, allowMarkerFallback]
  );

  const session = usePreviewSession(motionPreviewable, getInput);

  async function onSelect(id: string): Promise<void> {
    setSelectedId(id);
    session.clear();
    await templateLibrary.pushRecent(id);
  }

  async function toggleFav(id: string): Promise<void> {
    const next = await templateLibrary.toggleFavorite(id);
    setFavorites(next);
  }

  return (
    <section>
      <h1 className="mm-panel-title">Motion</h1>
      <p className="mm-panel-subtitle">
        Templates réels (.mogrt) — aperçu avant insertion. Sans fichier : « à fabriquer », jamais un faux succès.
      </p>
      {session.error ? <Banner tone="error">{session.error}</Banner> : null}
      {session.message ? <Banner tone="info">{session.message}</Banner> : null}

      <div className="mm-card">
        <label className="mm-field">
          <span>Search</span>
          <input value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
        <label className="mm-field">
          <span>Category</span>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as MotionCategory | "all")}
          >
            <option value="all">All</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mm-card">
        <h2 className="mm-card__title">Templates ({templates.length})</h2>
        {templates.slice(0, 40).map((template) => (
          <button
            key={template.id}
            type="button"
            className={`mm-list-item ${selectedId === template.id ? "mm-list-item--active" : ""}`}
            onClick={() => void onSelect(template.id)}
          >
            <strong>
              {favorites.indexOf(template.id) >= 0 ? "★ " : ""}
              {template.name}
            </strong>
            <span>
              {template.category} · {template.status === "missing-mogrt" ? "à fabriquer" : template.status} ·{" "}
              {template.aspect}
            </span>
          </button>
        ))}
        {templates.length > 40 ? (
          <p className="mm-muted">Showing 40 / {templates.length} — refine search.</p>
        ) : null}
      </div>

      {selected ? (
        <div className="mm-card">
          <h2 className="mm-card__title">Parameters — {selected.name}</h2>
          <p className="mm-muted">
            Status: <strong>{selected.status}</strong>
            {selected.status === "missing-mogrt" ? " (fichier .mogrt manquant)" : ""}
          </p>
          <div className="mm-actions" style={{ marginBottom: 8 }}>
            <button type="button" className="mm-btn" onClick={() => void toggleFav(selected.id)}>
              {favorites.indexOf(selected.id) >= 0 ? "Unfavorite" : "Favorite"}
            </button>
          </div>
          {selected.parameters.map((p) => (
            <label key={p.id} className="mm-field">
              <span>{labelText(p.label)}</span>
              {p.type === "checkbox" ? (
                <input
                  type="checkbox"
                  checked={Boolean(values[p.id])}
                  onChange={(e) => setValues((v) => ({ ...v, [p.id]: e.target.checked }))}
                />
              ) : p.type === "color" ? (
                <input
                  type="text"
                  value={String(values[p.id] ?? "")}
                  onChange={(e) => setValues((v) => ({ ...v, [p.id]: e.target.value }))}
                />
              ) : p.type === "slider" || p.type === "number" ? (
                <input
                  type="number"
                  min={p.min}
                  max={p.max}
                  step={p.step ?? 1}
                  value={Number(values[p.id] ?? 0)}
                  onChange={(e) => setValues((v) => ({ ...v, [p.id]: Number(e.target.value) }))}
                />
              ) : (
                <input
                  type="text"
                  value={String(values[p.id] ?? "")}
                  onChange={(e) => setValues((v) => ({ ...v, [p.id]: e.target.value }))}
                />
              )}
            </label>
          ))}
          <label className="mm-field">
            <span>
              <input
                type="checkbox"
                checked={allowMarkerFallback}
                onChange={(e) => setAllowMarkerFallback(e.target.checked)}
              />{" "}
              Placeholder marker if .mogrt missing (explicit)
            </span>
          </label>
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
        levelCNote="Essai sur copie de séquence : non disponible (WP3)."
      />
    </section>
  );
}
