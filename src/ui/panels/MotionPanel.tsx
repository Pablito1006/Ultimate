import { useMemo, useState, type ReactElement } from "react";
import { toUserMessage } from "../../core/errors/AppError";
import { templateInjectionService } from "../../features/motion/TemplateInjectionService";
import {
  listMotionCategories,
  searchTemplates,
} from "../../features/motion/templateRegistry";
import type { MotionCategory } from "../../features/motion/templateTypes";
import { Banner } from "../components/Banner";

export function MotionPanel(): ReactElement {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<MotionCategory | "all">("all");
  const [text, setText] = useState("MasterMotion");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const templates = useMemo(
    () => searchTemplates(query, category),
    [query, category]
  );
  const categories = useMemo(() => listMotionCategories(), []);

  async function inject(): Promise<void> {
    if (!selectedId) {
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const result = await templateInjectionService.inject(selectedId, {
        text,
        values: { text, duration: 3 },
      });
      setMessage(result.message);
    } catch (cause) {
      setError(toUserMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section>
      <h1 className="mm-panel-title">Motion</h1>
      <p className="mm-panel-subtitle">Browse templates and inject at the playhead.</p>
      {error ? <Banner tone="error">{error}</Banner> : null}
      {message ? <Banner tone="info">{message}</Banner> : null}

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
        <label className="mm-field">
          <span>Text</span>
          <input value={text} onChange={(e) => setText(e.target.value)} />
        </label>
      </div>

      <div className="mm-card">
        <h2 className="mm-card__title">Templates ({templates.length})</h2>
        {templates.map((template) => (
          <button
            key={template.id}
            type="button"
            className={`mm-list-item ${selectedId === template.id ? "mm-list-item--active" : ""}`}
            onClick={() => setSelectedId(template.id)}
          >
            <strong>{template.name}</strong>
            <span>
              {template.category} · {template.tags.join(", ")}
            </span>
          </button>
        ))}
      </div>

      <div className="mm-actions">
        <button
          type="button"
          className="mm-btn mm-btn--primary"
          disabled={busy || !selectedId}
          onClick={() => void inject()}
        >
          {busy ? "Injecting…" : "Inject at playhead"}
        </button>
      </div>
    </section>
  );
}
