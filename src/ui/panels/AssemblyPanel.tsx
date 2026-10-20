import { useCallback, useMemo, useState, type ReactElement } from "react";
import { getAssemblyFeatureStatus } from "../../features/assembly/assemblyCapabilities";
import {
  assemblyPreviewable,
  type AssemblyMode,
} from "../../features/assembly/assemblyPreviewable";
import { usePreviewSession } from "../../features/preview/usePreviewSession";
import { Banner } from "../components/Banner";
import { AnimatedPreview } from "../components/preview/AnimatedPreview";
import { PlanList } from "../components/preview/PlanList";
import { PreviewBar } from "../components/preview/PreviewBar";

const MODES: AssemblyMode[] = [
  "silences",
  "text-keep",
  "jump-cuts",
  "hesitations",
  "beats",
  "multicam-rename",
  "multicam-align",
  "cleanup",
];

export function AssemblyPanel(): ReactElement {
  const [mode, setMode] = useState<AssemblyMode>("silences");
  const [minSilence, setMinSilence] = useState(0.4);
  const [applyMode, setApplyMode] = useState<"markers" | "remove-clips">("markers");
  const [speechJson, setSpeechJson] = useState(
    '[{"start":0,"end":2},{"start":3.5,"end":6},{"start":8,"end":10}]'
  );
  const [wordsJson, setWordsJson] = useState(
    '[{"text":"Hello","start":0,"end":0.4},{"text":"um","start":0.5,"end":0.7},{"text":"yes","start":0.8,"end":1.1}]'
  );
  const [keepJson, setKeepJson] = useState('[{"start":0,"end":2},{"start":3.5,"end":6}]');
  const [beatRaw, setBeatRaw] = useState("0.5, 1.0, 1.5, 2.0, 2.5");
  const [alignTime, setAlignTime] = useState(0);
  const [prefix, setPrefix] = useState("Cam");

  const parseSpeech = useCallback(() => {
    try {
      const v = JSON.parse(speechJson) as Array<{ start: number; end: number }>;
      return Array.isArray(v) ? v : [];
    } catch {
      return [];
    }
  }, [speechJson]);

  const parseWords = useCallback(() => {
    try {
      const v = JSON.parse(wordsJson) as Array<{ text: string; start: number; end: number }>;
      return Array.isArray(v) ? v : [];
    } catch {
      return [];
    }
  }, [wordsJson]);

  const parseKeep = useCallback(() => {
    try {
      const v = JSON.parse(keepJson) as Array<{ start: number; end: number }>;
      return Array.isArray(v) ? v : [];
    } catch {
      return [];
    }
  }, [keepJson]);

  const input = useCallback(
    () => ({
      mode,
      speechSegments: parseSpeech(),
      words: parseWords(),
      keepSelection: parseKeep(),
      minSilenceSeconds: minSilence,
      applyMode,
      beatTimesRaw: beatRaw,
      alignMarkerTime: alignTime,
      multicamPrefix: prefix,
      detectHesitations: true,
    }),
    [mode, parseSpeech, parseWords, parseKeep, minSilence, applyMode, beatRaw, alignTime, prefix]
  );

  const session = usePreviewSession(assemblyPreviewable, input);
  const features = useMemo(() => getAssemblyFeatureStatus(), []);

  return (
    <section>
      <h1 className="mm-panel-title">Assemblage</h1>
      <p className="mm-panel-subtitle">
        Silences / texte / jump cuts / hésitations / beats importés / multicam / nettoyage — plan
        toujours prévisualisable ; mid-clip cut unavailable.
      </p>
      {session.error ? <Banner tone="error">{session.error}</Banner> : null}
      {session.message ? <Banner tone="info">{session.message}</Banner> : null}

      <div className="mm-actions">
        {MODES.map((m) => (
          <button
            key={m}
            type="button"
            className={`mm-btn ${mode === m ? "mm-btn--primary" : ""}`}
            onClick={() => {
              setMode(m);
              session.clear();
            }}
          >
            {m}
          </button>
        ))}
      </div>

      <div className="mm-card">
        {(mode === "silences" || mode === "text-keep") && (
          <label className="mm-field">
            <span>Segments parole (JSON)</span>
            <textarea rows={3} value={speechJson} onChange={(e) => setSpeechJson(e.target.value)} />
          </label>
        )}
        {mode === "silences" && (
          <>
            <label className="mm-field">
              <span>Seuil silence (s)</span>
              <input
                type="number"
                min={0.05}
                step={0.05}
                value={minSilence}
                onChange={(e) => setMinSilence(Number(e.target.value))}
              />
            </label>
            <label className="mm-field">
              <span>Apply</span>
              <select
                value={applyMode}
                onChange={(e) => setApplyMode(e.target.value as "markers" | "remove-clips")}
              >
                <option value="markers">Marqueurs d’abord (MM:Silence)</option>
                <option value="remove-clips">Retirer clips entièrement dans silence + marqueurs</option>
              </select>
            </label>
          </>
        )}
        {mode === "text-keep" && (
          <label className="mm-field">
            <span>Plages keep (JSON)</span>
            <textarea rows={2} value={keepJson} onChange={(e) => setKeepJson(e.target.value)} />
          </label>
        )}
        {mode === "hesitations" && (
          <label className="mm-field">
            <span>Mots transcript (JSON)</span>
            <textarea rows={3} value={wordsJson} onChange={(e) => setWordsJson(e.target.value)} />
          </label>
        )}
        {mode === "beats" && (
          <label className="mm-field">
            <span>Temps forts (CSV / JSON)</span>
            <textarea rows={2} value={beatRaw} onChange={(e) => setBeatRaw(e.target.value)} />
          </label>
        )}
        {mode === "multicam-rename" && (
          <label className="mm-field">
            <span>Préfixe</span>
            <input value={prefix} onChange={(e) => setPrefix(e.target.value)} />
          </label>
        )}
        {mode === "multicam-align" && (
          <label className="mm-field">
            <span>Temps marqueur (s)</span>
            <input
              type="number"
              step={0.01}
              value={alignTime}
              onChange={(e) => setAlignTime(Number(e.target.value))}
            />
          </label>
        )}
        {mode === "cleanup" && (
          <p className="mm-muted">
            Pistes vides = rapport only (pas d’API delete track). Clips disabled = retrait si API remove.
          </p>
        )}
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
        <h2 className="mm-card__title">Capacités assemblage</h2>
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
