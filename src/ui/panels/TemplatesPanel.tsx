import { useMemo, useState, type ReactElement } from "react";
import { listMotionCategories, searchTemplates } from "../../features/motion/templateRegistry";
import type { MotionCategory } from "../../features/motion/templateTypes";

export function TemplatesPanel(): ReactElement {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<MotionCategory | "all">("all");
  const [favorites, setFavorites] = useState<string[]>([]);
  const templates = useMemo(() => searchTemplates(query, category), [query, category]);
  const categories = useMemo(() => listMotionCategories(), []);

  function toggleFavorite(id: string): void {
    setFavorites((prev) =>
      prev.indexOf(id) >= 0 ? prev.filter((x) => x !== id) : prev.concat([id])
    );
  }

  return (
    <section>
      <h1 className="mm-panel-title">Templates</h1>
      <p className="mm-panel-subtitle">Library browser with categories, tags and favorites.</p>

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
        <h2 className="mm-card__title">Library</h2>
        {templates.map((template) => (
          <div key={template.id} className="mm-row">
            <span className="mm-row__label">
              {favorites.indexOf(template.id) >= 0 ? "★ " : ""}
              {template.name}
            </span>
            <button type="button" className="mm-btn" onClick={() => toggleFavorite(template.id)}>
              {favorites.indexOf(template.id) >= 0 ? "Unfav" : "Fav"}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
