import { useCallback, useMemo, useState, type ReactElement } from "react";
import { getSpeedFeatureStatus } from "../../features/speed/speedCapabilities";
import { SPEED_RAMP_PRESETS, type SpeedRampPresetId } from "../../features/speed/speedRamps";
import { speedPreviewable } from "../../features/speed/speedPreviewable";
import type { SpeedMode } from "../../features/speed/speedTypes";
import { usePreviewSession } from "../../features/preview/usePreviewSession";
import { Banner } from "../components/Banner";
import { AnimatedPreview } from "../components/preview/AnimatedPreview";
import { PlanList } from "../components/preview/PlanList";
import { PreviewBar } from "../components/preview/PreviewBar";

export function SpeedPanel(): ReactElement {
  const [mode, setMode] = useState<SpeedMode>("constant");
  const [percent, setPercent] = useState(200);
  const [targetDuration, setTargetDuration] = useState(1);
  const [rampPreset, setRampPreset] = useState<SpeedRampPresetId>("hero");
  const [rampStart, setRampStart] = useState(50);
  const [rampEnd, setRampEnd] = useState(100);
  const [rampPeak, setRampPeak] = useState(250);
  const [reverse, setReverse] = useState(false);
  const [preserveAudio, setPreserveAudio] = useState(true);

  const input = useCallback(
    () => ({
      mode,
      targetPercent: percent,
      targetDuration,
      reverse,
      preserveAudio,
      rampPreset,
      rampStartSpeed: rampStart / 100,
      rampEndSpeed: rampEnd / 100,
      rampPeakSpeed: rampPeak / 100,
      videoOnly: true,
    }),
    [
      mode,
      percent,
      targetDuration,
      reverse,
      preserveAudio,
      rampPreset,
      rampStart,
      rampEnd,
      rampPeak,
    ]
  );

  const session = usePreviewSession(speedPreviewable, input);
  const features = useMemo(() => getSpeedFeatureStatus(), []);

  return (
    <section>
      <h1 className="mm-panel-title">Vitesse et temps</h1>
      <p className="mm-panel-subtitle">
        Lecture getSpeed, durées exactes, courbes d’aperçu — écriture Speed/Duration marquée unavailable
        tant que Premiere UXP ne l’expose pas.
      </p>
      {session.error ? <Banner tone="error">{session.error}</Banner> : null}
      {session.message ? <Banner tone="info">{session.message}</Banner> : null}

      <div className="mm-card">
        <label className="mm-field">
          <span>Mode</span>
          <select value={mode} onChange={(e) => setMode(e.target.value as SpeedMode)}>
            <option value="constant">Vitesse constante</option>
            <option value="target-duration">Durée cible</option>
            <option value="ramp">Rampe (aperçu)</option>
          </select>
        </label>

        {mode === "constant" ? (
          <label className="mm-field">
            <span>Vitesse %</span>
            <input
              type="number"
              min={1}
              max={10000}
              value={percent}
              onChange={(e) => setPercent(Number(e.target.value))}
            />
          </label>
        ) : null}

        {mode === "target-duration" ? (
          <label className="mm-field">
            <span>Durée cible (s)</span>
            <input
              type="number"
              min={0.01}
              step={0.01}
              value={targetDuration}
              onChange={(e) => setTargetDuration(Number(e.target.value))}
            />
          </label>
        ) : null}

        {mode === "ramp" ? (
          <>
            <label className="mm-field">
              <span>Preset rampe</span>
              <select
                value={rampPreset}
                onChange={(e) => setRampPreset(e.target.value as SpeedRampPresetId)}
              >
                {SPEED_RAMP_PRESETS.filter((p) => p.id !== "constant").map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="mm-field">
              <span>Début %</span>
              <input
                type="number"
                min={1}
                value={rampStart}
                onChange={(e) => setRampStart(Number(e.target.value))}
              />
            </label>
            <label className="mm-field">
              <span>Fin %</span>
              <input
                type="number"
                min={1}
                value={rampEnd}
                onChange={(e) => setRampEnd(Number(e.target.value))}
              />
            </label>
            <label className="mm-field">
              <span>Pic %</span>
              <input
                type="number"
                min={1}
                value={rampPeak}
                onChange={(e) => setRampPeak(Number(e.target.value))}
              />
            </label>
          </>
        ) : null}

        <label className="mm-field">
          <span>
            <input
              type="checkbox"
              checked={reverse}
              onChange={(e) => setReverse(e.target.checked)}
            />{" "}
            Inverser (plan seulement)
          </span>
        </label>
        <label className="mm-field">
          <span>
            <input
              type="checkbox"
              checked={preserveAudio}
              onChange={(e) => setPreserveAudio(e.target.checked)}
            />{" "}
            Préserver hauteur audio (unavailable)
          </span>
        </label>
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
        <h2 className="mm-card__title">Capacités vitesse</h2>
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
