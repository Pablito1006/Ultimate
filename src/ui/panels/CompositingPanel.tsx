import { useCallback, useMemo, useState, type ReactElement } from "react";
import { getCompositingFeatureStatus } from "../../features/compositing/compositingCapabilities";
import { keyingPreviewable } from "../../features/compositing/keyingPreviewable";
import { getMasksStatus, getStabilizeStatus } from "../../features/compositing/masksAndStabilize";
import { opacityPreviewable } from "../../features/compositing/opacityPreviewable";
import { pipPreviewable, type PipAnchor } from "../../features/compositing/pipPreviewable";
import { usePreviewSession } from "../../features/preview/usePreviewSession";
import { Banner } from "../components/Banner";
import { AnimatedPreview } from "../components/preview/AnimatedPreview";
import { PlanList } from "../components/preview/PlanList";
import { PreviewBar } from "../components/preview/PreviewBar";

type Tab = "pip" | "opacity" | "keying" | "limits";

export function CompositingPanel(): ReactElement {
  const [tab, setTab] = useState<Tab>("pip");
  const [anchor, setAnchor] = useState<PipAnchor>("bottom-right");
  const [pipSize, setPipSize] = useState(28);
  const [opacity, setOpacity] = useState(100);
  const [keyColor, setKeyColor] = useState("#00FF00");

  const pipInput = useCallback(
    () => ({ anchor, sizePercent: pipSize, opacity: 100, animateIn: false }),
    [anchor, pipSize]
  );
  const opacityInput = useCallback(() => ({ opacity, blendMode: "Normal" }), [opacity]);
  const keyingInput = useCallback(() => ({ keyColor, tolerance: 40, softness: 10 }), [keyColor]);

  const pipSession = usePreviewSession(pipPreviewable, pipInput);
  const opacitySession = usePreviewSession(opacityPreviewable, opacityInput);
  const keyingSession = usePreviewSession(keyingPreviewable, keyingInput);

  const session = tab === "pip" ? pipSession : tab === "opacity" ? opacitySession : keyingSession;
  const features = useMemo(() => getCompositingFeatureStatus(), []);
  const masks = getMasksStatus();
  const stabilize = getStabilizeStatus();

  return (
    <section>
      <h1 className="mm-panel-title">Compositing</h1>
      <p className="mm-panel-subtitle">
        PiP, opacité, keying — masques / stabilisation marqués unavailable si l’API Premiere ne les expose pas.
      </p>
      {session.error ? <Banner tone="error">{session.error}</Banner> : null}
      {session.message ? <Banner tone="info">{session.message}</Banner> : null}

      <div className="mm-actions">
        {(["pip", "opacity", "keying", "limits"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            className={`mm-btn ${tab === t ? "mm-btn--primary" : ""}`}
            onClick={() => {
              setTab(t);
              pipSession.clear();
              opacitySession.clear();
              keyingSession.clear();
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "pip" ? (
        <div className="mm-card">
          <label className="mm-field">
            <span>Anchor</span>
            <select value={anchor} onChange={(e) => setAnchor(e.target.value as PipAnchor)}>
              <option value="top-left">top-left</option>
              <option value="top-right">top-right</option>
              <option value="bottom-left">bottom-left</option>
              <option value="bottom-right">bottom-right</option>
            </select>
          </label>
          <label className="mm-field">
            <span>Size %</span>
            <input
              type="number"
              min={10}
              max={50}
              value={pipSize}
              onChange={(e) => setPipSize(Number(e.target.value))}
            />
          </label>
        </div>
      ) : null}

      {tab === "opacity" ? (
        <div className="mm-card">
          <label className="mm-field">
            <span>Opacity</span>
            <input
              type="number"
              min={0}
              max={100}
              value={opacity}
              onChange={(e) => setOpacity(Number(e.target.value))}
            />
          </label>
        </div>
      ) : null}

      {tab === "keying" ? (
        <div className="mm-card">
          <label className="mm-field">
            <span>Key color</span>
            <input value={keyColor} onChange={(e) => setKeyColor(e.target.value)} />
          </label>
          <p className="mm-muted">Tolérance / adoucissement : appliqués si params writables ; sinon défauts + Effect Controls.</p>
        </div>
      ) : null}

      {tab === "limits" ? (
        <div className="mm-card">
          <h2 className="mm-card__title">Capacités compositing</h2>
          {features.map((f) => (
            <div key={f.id} className="mm-row">
              <span className="mm-row__label">
                {f.id}: <strong>{f.status}</strong>
              </span>
              <span className="mm-muted">{f.reason}</span>
            </div>
          ))}
          <p className="mm-muted">{masks.message}</p>
          <p className="mm-muted">{stabilize.message}</p>
        </div>
      ) : (
        <>
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
        </>
      )}
    </section>
  );
}
