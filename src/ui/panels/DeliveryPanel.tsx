import { useCallback, useMemo, useState, type ReactElement } from "react";
import { getDeliveryFeatureStatus } from "../../features/delivery/deliveryCapabilities";
import {
  deliveryPreviewable,
  type DeliveryMode,
  type DeliveryPlan,
} from "../../features/delivery/deliveryPreviewable";
import { PLATFORM_PRESETS, type DeliveryPlatformId } from "../../features/delivery/platformPresets";
import type { InterchangeFormat } from "../../premiere/export/InterchangeService";
import { usePreviewSession } from "../../features/preview/usePreviewSession";
import { Banner } from "../components/Banner";
import { AnimatedPreview } from "../components/preview/AnimatedPreview";
import { PlanList } from "../components/preview/PlanList";
import { PreviewBar } from "../components/preview/PreviewBar";

const MODES: DeliveryMode[] = [
  "ingest-bins",
  "project-template",
  "offline-relink",
  "proxy-attach",
  "export",
  "qc",
  "interchange",
];

export function DeliveryPanel(): ReactElement {
  const [mode, setMode] = useState<DeliveryMode>("export");
  const [platformId, setPlatformId] = useState<DeliveryPlatformId>("youtube");
  const [outputFolder, setOutputFolder] = useState("C:/Exports");
  const [presetFile, setPresetFile] = useState("");
  const [exportType, setExportType] = useState<"queue-ame" | "queue-app" | "immediate">(
    "queue-ame"
  );
  const [confirmNotUndoable, setConfirmNotUndoable] = useState(false);
  const [relinkItemName, setRelinkItemName] = useState("Offline_Clip.mp4");
  const [relinkNewPath, setRelinkNewPath] = useState("C:/Media/fixed.mp4");
  const [proxyItemName, setProxyItemName] = useState("Online_Clip.mp4");
  const [proxyPath, setProxyPath] = useState("C:/Proxies/proxy.mp4");
  const [interchangeFormat, setInterchangeFormat] = useState<InterchangeFormat>("fcp-xml");
  const [interchangeOutputPath, setInterchangeOutputPath] = useState("C:/Exports/seq.xml");
  const [sequenceName, setSequenceName] = useState("MM:Main");
  const [measuredLufs, setMeasuredLufs] = useState(-16);
  const [targetLufs, setTargetLufs] = useState(-14);
  const [qcTextOut, setQcTextOut] = useState<string | null>(null);

  const input = useCallback(
    () => ({
      mode,
      platformId,
      outputFolder,
      presetFile: presetFile || undefined,
      exportType,
      confirmNotUndoable,
      relinkItemName,
      relinkNewPath,
      proxyItemName,
      proxyPath,
      interchangeFormat,
      interchangeOutputPath,
      sequenceName,
      measuredLufs: mode === "qc" ? measuredLufs : undefined,
      targetLufs: mode === "qc" ? targetLufs : undefined,
    }),
    [
      mode,
      platformId,
      outputFolder,
      presetFile,
      exportType,
      confirmNotUndoable,
      relinkItemName,
      relinkNewPath,
      proxyItemName,
      proxyPath,
      interchangeFormat,
      interchangeOutputPath,
      sequenceName,
      measuredLufs,
      targetLufs,
    ]
  );

  const session = usePreviewSession(deliveryPreviewable, input);
  const features = useMemo(() => getDeliveryFeatureStatus(), []);

  return (
    <section>
      <h1 className="mm-panel-title">Livraison</h1>
      <p className="mm-panel-subtitle">
        Ingestion (chutiers) · proxys / relink · export multi-plateformes · QC JSON/texte ·
        interchange XML/OTIO/AAF. EDL et images noires = unavailable.
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
              setQcTextOut(null);
              session.clear();
            }}
          >
            {m}
          </button>
        ))}
      </div>

      <div className="mm-card">
        {(mode === "export" || mode === "qc") && (
          <label className="mm-field">
            <span>Plateforme</span>
            <select
              value={platformId}
              onChange={(e) => setPlatformId(e.target.value as DeliveryPlatformId)}
            >
              {PLATFORM_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.aspect})
                </option>
              ))}
            </select>
          </label>
        )}

        {mode === "export" && (
          <>
            <label className="mm-field">
              <span>Dossier sortie</span>
              <input value={outputFolder} onChange={(e) => setOutputFolder(e.target.value)} />
            </label>
            <label className="mm-field">
              <span>Preset AME (.epr) — chemin local</span>
              <input
                value={presetFile}
                onChange={(e) => setPresetFile(e.target.value)}
                placeholder="C:/Presets/youtube1080.epr"
              />
            </label>
            <label className="mm-field">
              <span>Type d’export</span>
              <select
                value={exportType}
                onChange={(e) =>
                  setExportType(e.target.value as "queue-ame" | "queue-app" | "immediate")
                }
              >
                <option value="queue-ame">File AME (défaut)</option>
                <option value="queue-app">File Premiere</option>
                <option value="immediate">Immédiat</option>
              </select>
            </label>
          </>
        )}

        {mode === "qc" && (
          <>
            <label className="mm-field">
              <span>LUFS mesuré (externe)</span>
              <input
                type="number"
                value={measuredLufs}
                onChange={(e) => setMeasuredLufs(Number(e.target.value))}
              />
            </label>
            <label className="mm-field">
              <span>LUFS cible</span>
              <input
                type="number"
                value={targetLufs}
                onChange={(e) => setTargetLufs(Number(e.target.value))}
              />
            </label>
          </>
        )}

        {(mode === "offline-relink" || mode === "proxy-attach") && (
          <>
            {mode === "offline-relink" ? (
              <>
                <label className="mm-field">
                  <span>Item projet</span>
                  <input
                    value={relinkItemName}
                    onChange={(e) => setRelinkItemName(e.target.value)}
                  />
                </label>
                <label className="mm-field">
                  <span>Nouveau chemin média</span>
                  <input value={relinkNewPath} onChange={(e) => setRelinkNewPath(e.target.value)} />
                </label>
              </>
            ) : (
              <>
                <label className="mm-field">
                  <span>Item projet</span>
                  <input value={proxyItemName} onChange={(e) => setProxyItemName(e.target.value)} />
                </label>
                <label className="mm-field">
                  <span>Chemin proxy</span>
                  <input value={proxyPath} onChange={(e) => setProxyPath(e.target.value)} />
                </label>
              </>
            )}
            <label className="mm-field">
              <span>
                <input
                  type="checkbox"
                  checked={confirmNotUndoable}
                  onChange={(e) => setConfirmNotUndoable(e.target.checked)}
                />{" "}
                Je confirme — opération Not undoable (Adobe)
              </span>
            </label>
          </>
        )}

        {mode === "interchange" && (
          <>
            <label className="mm-field">
              <span>Format</span>
              <select
                value={interchangeFormat}
                onChange={(e) => setInterchangeFormat(e.target.value as InterchangeFormat)}
              >
                <option value="fcp-xml">Final Cut Pro XML (26.2+)</option>
                <option value="otio">OpenTimelineIO (26.2+)</option>
                <option value="aaf">AAF (26.3+)</option>
                <option value="edl">EDL (unavailable)</option>
              </select>
            </label>
            <label className="mm-field">
              <span>Fichier sortie</span>
              <input
                value={interchangeOutputPath}
                onChange={(e) => setInterchangeOutputPath(e.target.value)}
              />
            </label>
          </>
        )}

        {mode === "project-template" && (
          <label className="mm-field">
            <span>Nom séquence</span>
            <input value={sequenceName} onChange={(e) => setSequenceName(e.target.value)} />
          </label>
        )}
      </div>

      <div className="mm-card">
        <h2 className="mm-card__title">Capacités</h2>
        <ul className="mm-list">
          {features.map((f) => (
            <li key={f.id}>
              <strong>{f.status}</strong> — {f.id}: {f.reason}
            </li>
          ))}
        </ul>
      </div>

      <PreviewBar
        busy={session.busy}
        canApply={session.canApply}
        onPreview={() => void session.runPreview()}
        onApply={() => void session.runApply()}
        previewLabel="Aperçu"
        applyLabel="Appliquer"
      />

      {session.summary ? <PlanList summary={session.summary} /> : null}
      <AnimatedPreview visual={session.visual} />

      {mode === "qc" && session.plan ? (
        <div className="mm-card">
          <h2 className="mm-card__title">Rapport QC (texte)</h2>
          <pre className="mm-pre">{(session.plan as DeliveryPlan).qcText ?? "(aperçu requis)"}</pre>
          <button
            type="button"
            className="mm-btn"
            onClick={() => {
              setQcTextOut((session.plan as DeliveryPlan | null)?.qcJson ?? null);
            }}
          >
            Afficher JSON
          </button>
          {qcTextOut ? <pre className="mm-pre">{qcTextOut}</pre> : null}
        </div>
      ) : null}
    </section>
  );
}
