import { useEffect, useMemo, useState, type ReactElement } from "react";
import { listMotionCategories, searchTemplates, countTemplatesByStatus } from "../../features/motion/templateRegistry";
import type { MotionCategory } from "../../features/motion/templateTypes";
import { templateLibrary } from "../../features/motion/templates/TemplateLibrary";
import { settingsService } from "../../services/storage/SettingsService";
import { Banner } from "../components/Banner";

export function TemplatesPanel(): ReactElement {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<MotionCategory | "all">("all");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [recents, setRecents] = useState<string[]>([]);
  const [libraryPath, setLibraryPath] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const templates = useMemo(() => searchTemplates(query, category), [query, category]);
  const categories = useMemo(() => listMotionCategories(), []);
  const statusCounts = useMemo(() => countTemplatesByStatus(), []);

  useEffect(() => {
    void settingsService.load().then((s) => {
      setFavorites(s.favoriteTemplateIds);
      setRecents(s.recentTemplateIds || []);
      setLibraryPath(s.templateLibraryPath || "");
    });
  }, []);

  async function toggleFavorite(id: string): Promise<void> {
    const next = await templateLibrary.toggleFavorite(id);
    setFavorites(next);
  }

  async function saveLibraryPath(): Promise<void> {
    await settingsService.update({ templateLibraryPath: libraryPath.trim() });
    setMessage(
      libraryPath.trim()
        ? `Dossier bibliothèque enregistré (chargement fichiers à la demande UXP).`
        : "Dossier bibliothèque effacé."
    );
  }

  return (
    <section>
      <h1 className="mm-panel-title">Templates</h1>
      <p className="mm-panel-subtitle">
        Bibliothèque locale — recherche, catégories, favoris, récents. Les .mogrt manquants restent « à fabriquer ».
      </p>
      {message ? <Banner tone="info">{message}</Banner> : null}

      <div className="mm-card">
        <h2 className="mm-card__title">Catalogue</h2>
        <p className="mm-muted">
          {templates.length} visible · missing-mogrt: {statusCounts["missing-mogrt"] || 0} · ready:{" "}
          {statusCounts.ready || 0}
        </p>
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
          <span>User library folder</span>
          <input
            value={libraryPath}
            onChange={(e) => setLibraryPath(e.target.value)}
            placeholder="C:\\…\\mogrt-library"
          />
        </label>
        <button type="button" className="mm-btn" onClick={() => void saveLibraryPath()}>
          Save library path
        </button>
      </div>

      {recents.length > 0 ? (
        <div className="mm-card">
          <h2 className="mm-card__title">Récents</h2>
          {recents.slice(0, 8).map((id) => (
            <div key={id} className="mm-row">
              <span className="mm-row__label">{id}</span>
            </div>
          ))}
        </div>
      ) : null}

      <div className="mm-card">
        <h2 className="mm-card__title">Library</h2>
        {templates.slice(0, 50).map((template) => (
          <div key={template.id} className="mm-row">
            <span className="mm-row__label">
              {favorites.indexOf(template.id) >= 0 ? "★ " : ""}
              {template.name}
              <span className="mm-muted">
                {" "}
                · {template.status === "missing-mogrt" ? "à fabriquer" : template.status}
              </span>
            </span>
            <button type="button" className="mm-btn" onClick={() => void toggleFavorite(template.id)}>
              {favorites.indexOf(template.id) >= 0 ? "Unfav" : "Fav"}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
