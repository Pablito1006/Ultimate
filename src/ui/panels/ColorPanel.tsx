import { useCallback, useMemo, useState, type ReactElement } from "react";
import { LOOK_CATALOG } from "../../features/color/lookCatalog";
import { getColorFeatureStatus } from "../../features/color/colorCapabilities";
import {
  colorPreviewable,
  readLookFromFirstClip,
  type ColorAction,
} from "../../features/color/colorPreviewable";
import type { AppliedLookValues } from "../../features/color/lookTypes";
import { usePreviewSession } from "../../features/preview/usePreviewSession";
import { Banner } from "../components/Banner";
import { AnimatedPreview } from "../components/preview/AnimatedPreview";
import { PlanList } from "../components/preview/PlanList";
import { PreviewBar } from "../components/preview/PreviewBar";

export function ColorPanel(): ReactElement {
  const [lookId, setLookId] = useState(LOOK_CATALOG[1]?.id ?? "warm-sun");
  const [intensity, setIntensity] = useState(100);
  const [action, setAction] = useState<ColorAction>("apply");
  const [overwrite, setOverwrite] = useState(false);
  const [clipboard, setClipboard] = useState<AppliedLookValues | null>(null);
  const [usePaste, setUsePaste] = useState(false);

  const input = useCallback(
    () => ({
      lookId,
      intensity: intensity / 100,
      action,
      overwriteExisting: overwrite,
      pastedValues: usePaste && clipboard ? clipboard : undefined,
      maxClips: action === "harmonize" ? 40 : 20,
    }),
    [lookId, intensity, action, overwrite, usePaste, clipboard]
  );

  const session = usePreviewSession(colorPreviewable, input);
  const features = useMemo(() => getColorFeatureStatus(), []);
  const look = LOOK_CATALOG.find((l) => l.id === lookId);

  return (
    <section>
      <h1 className="mm-panel-title">Étalonnage — Looks</h1>
      <p className="mm-panel-subtitle">
        Bibliothèque Lumetri-style (≥20) · intensité · harmonisation · aperçu B approximatif. Pas de match
        auto (pixels unavailable). LUT fichier = import manuel.
      </p>
      {session.error ? <Banner tone="error">{session.error}</Banner> : null}
      {session.message ? <Banner tone="info">{session.message}</Banner> : null}

      <div className="mm-card">
        <label className="mm-field">
          <span>Look</span>
          <select value={lookId} onChange={(e) => setLookId(e.target.value)}>
            {LOOK_CATALOG.map((l) => (
              <option key={l.id} value={l.id}>
                [{l.category}] {l.name}
              </option>
            ))}
          </select>
        </label>
        {look ? <p className="mm-muted">{look.description}</p> : null}
        {look?.lutFile ? (
          <p className="mm-muted">Réf. LUT: assets/luts/{look.lutFile} (apply GUID unavailable)</p>
        ) : null}

        <label className="mm-field">
          <span>Intensité %</span>
          <input
            type="number"
            min={0}
            max={100}
            value={intensity}
            onChange={(e) => setIntensity(Number(e.target.value))}
          />
        </label>

        <label className="mm-field">
          <span>Action</span>
          <select value={action} onChange={(e) => setAction(e.target.value as ColorAction)}>
            <option value="apply">Appliquer</option>
            <option value="harmonize">Harmoniser (groupe)</option>
            <option value="remove">Retirer (neutres)</option>
          </select>
        </label>

        <label className="mm-field">
          <span>
            <input
              type="checkbox"
              checked={overwrite}
              onChange={(e) => setOverwrite(e.target.checked)}
            />{" "}
            Écraser réglages couleur existants
          </span>
        </label>

        <div className="mm-actions">
          <button
            type="button"
            className="mm-btn"
            onClick={() => {
              void (async () => {
                const v = await readLookFromFirstClip();
                setClipboard(v);
                setUsePaste(false);
              })();
            }}
          >
            Copier look (1er clip)
          </button>
          <button
            type="button"
            className="mm-btn"
            disabled={!clipboard}
            onClick={() => setUsePaste(true)}
          >
            Coller au prochain aperçu
          </button>
        </div>
        {clipboard ? (
          <p className="mm-muted">
            Presse-papiers: temp {clipboard.temperature.toFixed(0)} · sat{" "}
            {clipboard.saturation.toFixed(0)}
            {usePaste ? " · actif pour aperçu" : ""}
          </p>
        ) : null}
      </div>

      <PreviewBar
        busy={session.busy}
        canApply={session.canApply}
        onPreview={() => void session.runPreview()}
        onApply={() => void session.runApply()}
        previewLabel="Aperçu"
        applyLabel="Appliquer"
      />
      <PlanList summary={session.summary} />
      <AnimatedPreview visual={session.visual} />

      <div className="mm-card">
        <h2 className="mm-card__title">Capacités couleur</h2>
        {features.map((f) => (
          <div key={f.id} className="mm-row">
            <span className="mm-row__label">
              {f.id}: <strong>{f.status}</strong>
            </span>
            <span className="mm-muted">{f.reason}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
