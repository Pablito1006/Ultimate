import { useCallback, useMemo, useState, type ReactElement } from "react";
import { toUserMessage } from "../../core/errors/AppError";
import {
  CAPTION_STYLE_PRESETS,
  type CaptionStyleId,
} from "../../features/subtitles/captionStyles";
import {
  captionsPreviewable,
  type CaptionsPlanInput,
  type CaptionsSourceMode,
} from "../../features/subtitles/captionsPreviewable";
import {
  correctWord,
  mergeSegments,
  replaceAllWords,
  splitSegment,
} from "../../features/transcript/editTranscript";
import { exportCaptions } from "../../features/transcript/subtitleExport";
import type { MmTranscript } from "../../features/transcript/transcriptModel";
import { usePreviewSession } from "../../features/preview/usePreviewSession";
import { transcriptService } from "../../premiere/transcript/TranscriptService";
import { Banner } from "../components/Banner";
import { AnimatedPreview } from "../components/preview/AnimatedPreview";
import { PlanList } from "../components/preview/PlanList";
import { PreviewBar } from "../components/preview/PreviewBar";

export function CaptionsPanel(): ReactElement {
  const [mode, setMode] = useState<CaptionsSourceMode>("mock-text");
  const [text, setText] = useState(
    "Welcome to MasterMotion. Generate captions offline, style them, then apply markers or copy SRT."
  );
  const [importRaw, setImportRaw] = useState("");
  const [styleId, setStyleId] = useState<CaptionStyleId>("karaoke");
  const [removeFillers, setRemoveFillers] = useState(true);
  const [language, setLanguage] = useState("en-US");
  const [edited, setEdited] = useState<MmTranscript | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [nativeBusy, setNativeBusy] = useState(false);
  const [find, setFind] = useState("");
  const [replace, setReplace] = useState("");
  const [exportFormat, setExportFormat] = useState<"srt" | "vtt" | "json" | "txt">("srt");

  const caps = useMemo(() => transcriptService.getCapabilities(), []);

  const getInput = useCallback((): CaptionsPlanInput => {
    return {
      mode,
      text,
      importRaw,
      transcript: edited,
      styleId,
      language,
      reading: { removeFillers, maxCharsPerLine: 42, maxLines: 2, maxCharsPerSecond: 17 },
    };
  }, [mode, text, importRaw, edited, styleId, language, removeFillers]);

  const session = usePreviewSession(captionsPreviewable, getInput);

  async function runNativeTranscribe(): Promise<void> {
    setNativeBusy(true);
    setStatus(null);
    try {
      const { clipProjectItem, clipName } = await transcriptService.resolveActiveClipProjectItem();
      const result = await transcriptService.transcribeClipProjectItem(clipProjectItem, {
        language: language || undefined,
        onProgress: (m) => setStatus(m),
      });
      if (!result.ok || !result.transcript) {
        setStatus(result.message);
        return;
      }
      setEdited(result.transcript);
      setMode("premiere-native");
      setStatus(`${result.message} · clip “${clipName}”`);
      session.clear();
    } catch (cause) {
      setStatus(toUserMessage(cause));
    } finally {
      setNativeBusy(false);
    }
  }

  async function loadExistingNative(): Promise<void> {
    setNativeBusy(true);
    setStatus(null);
    try {
      const { clipProjectItem, clipName } = await transcriptService.resolveActiveClipProjectItem();
      if (caps.hasTranscript && !transcriptService.hasTranscript(clipProjectItem)) {
        setStatus(`No transcript on “${clipName}”. Run native transcription first.`);
        return;
      }
      const transcript = await transcriptService.exportParsed(clipProjectItem);
      setEdited(transcript);
      setMode("premiere-native");
      setStatus(`Loaded transcript from “${clipName}” · ${transcript.segments.length} segment(s).`);
      session.clear();
    } catch (cause) {
      setStatus(toUserMessage(cause));
    } finally {
      setNativeBusy(false);
    }
  }

  async function reimportEdited(): Promise<void> {
    if (!edited) {
      return;
    }
    setNativeBusy(true);
    setStatus(null);
    try {
      const { project, clipProjectItem } = await transcriptService.resolveActiveClipProjectItem();
      const result = await transcriptService.reimportTranscript(project, clipProjectItem, edited);
      setStatus(result.message);
      if (result.fallbackRecommended) {
        setStatus(
          `${result.message} — use Export below (SRT/VTT/JSON). No faux succès.`
        );
      }
    } catch (cause) {
      setStatus(toUserMessage(cause));
    } finally {
      setNativeBusy(false);
    }
  }

  function applyGlobalReplace(): void {
    const base = edited ?? session.plan?.transcript;
    if (!base || !find) {
      return;
    }
    const next = replaceAllWords(base, find, replace);
    setEdited(next);
    session.clear();
  }

  async function copyExport(): Promise<void> {
    const plan = session.plan;
    if (!plan) {
      setStatus("Preview first to build cues for export.");
      return;
    }
    const payload = exportCaptions(exportFormat, plan.cues, plan.transcript);
    try {
      await navigator.clipboard.writeText(payload);
      setStatus(`Copied ${exportFormat.toUpperCase()} (${payload.length} chars).`);
    } catch {
      setStatus(payload.slice(0, 500));
    }
  }

  const working = edited ?? session.plan?.transcript ?? null;

  return (
    <section>
      <h1 className="mm-panel-title">Captions Studio</h1>
      <p className="mm-panel-subtitle">
        Native Premiere transcription (offline) · edit · reading rules · export. No cloud by default.
      </p>
      {session.error ? <Banner tone="error">{session.error}</Banner> : null}
      {session.message || status ? (
        <Banner tone="info">{session.message || status}</Banner>
      ) : null}
      <Banner tone="warn">
        CaptionTrack item writing is limited — apply uses CAP markers + SRT. If transcript re-import
        does not verify, export files instead (known Premiere quirk).
      </Banner>

      <div className="mm-card">
        <h2 className="mm-card__title">Source</h2>
        <label className="mm-field">
          <span>Mode</span>
          <select
            value={mode}
            onChange={(e) => {
              setMode(e.target.value as CaptionsSourceMode);
              session.clear();
            }}
          >
            <option value="mock-text">Mock / plain text (offline)</option>
            <option value="premiere-native">Premiere native Transcript</option>
            <option value="import">Import SRT / VTT / JSON</option>
          </select>
        </label>

        {mode === "mock-text" ? (
          <label className="mm-field">
            <span>Source text</span>
            <textarea
              rows={4}
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                setEdited(null);
                session.clear();
              }}
            />
          </label>
        ) : null}

        {mode === "import" ? (
          <label className="mm-field">
            <span>Paste SRT / VTT / JSON</span>
            <textarea
              rows={5}
              value={importRaw}
              onChange={(e) => {
                setImportRaw(e.target.value);
                setEdited(null);
                session.clear();
              }}
            />
          </label>
        ) : null}

        {mode === "premiere-native" ? (
          <div className="mm-actions">
            <button
              type="button"
              className="mm-btn mm-btn--primary"
              disabled={nativeBusy || !caps.transcribe}
              onClick={() => void runNativeTranscribe()}
            >
              Transcribe active clip
            </button>
            <button
              type="button"
              className="mm-btn"
              disabled={nativeBusy || !caps.exportJson}
              onClick={() => void loadExistingNative()}
            >
              Load existing
            </button>
            {!caps.transcribe ? (
              <p className="mm-muted">Native Transcript API unavailable in this host.</p>
            ) : null}
            {!caps.hasTranscript ? (
              <p className="mm-muted">hasTranscript requires Premiere 26.3+ (probe).</p>
            ) : null}
          </div>
        ) : null}

        <label className="mm-field">
          <span>Language (native)</span>
          <input value={language} onChange={(e) => setLanguage(e.target.value)} />
        </label>
        <label className="mm-field">
          <span>Style (12 presets)</span>
          <select
            value={styleId}
            onChange={(e) => {
              setStyleId(e.target.value as CaptionStyleId);
              session.clear();
            }}
          >
            {CAPTION_STYLE_PRESETS.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.name}
                {preset.delivery === "mogrt-pending" ? " (MOGRT pending)" : ""}
              </option>
            ))}
          </select>
        </label>
        <label className="mm-check">
          <input
            type="checkbox"
            checked={removeFillers}
            onChange={(e) => {
              setRemoveFillers(e.target.checked);
              session.clear();
            }}
          />
          Remove filler words (um, uh, …)
        </label>
      </div>

      {working && working.segments.length > 0 ? (
        <div className="mm-card">
          <h2 className="mm-card__title">
            Edit transcript ({working.segments.length} seg · source {working.source})
          </h2>
          <div className="mm-actions">
            <input
              placeholder="Find word"
              value={find}
              onChange={(e) => setFind(e.target.value)}
              style={{ flex: 1, minWidth: 80 }}
            />
            <input
              placeholder="Replace"
              value={replace}
              onChange={(e) => setReplace(e.target.value)}
              style={{ flex: 1, minWidth: 80 }}
            />
            <button type="button" className="mm-btn" onClick={applyGlobalReplace}>
              Replace all
            </button>
            <button
              type="button"
              className="mm-btn"
              disabled={nativeBusy || !edited}
              onClick={() => void reimportEdited()}
            >
              Re-import to Premiere
            </button>
          </div>
          <div className="mm-transcript-edit">
            {working.segments.slice(0, 30).map((seg, si) => (
              <div key={seg.id} className="mm-transcript-seg">
                <div className="mm-muted">
                  {seg.start.toFixed(2)}–{seg.end.toFixed(2)}s
                  <button
                    type="button"
                    className="mm-btn mm-btn--ghost"
                    style={{ marginLeft: 8, padding: "2px 6px" }}
                    onClick={() => {
                      setEdited(mergeSegments(working, si));
                      session.clear();
                    }}
                  >
                    Merge↓
                  </button>
                  <button
                    type="button"
                    className="mm-btn mm-btn--ghost"
                    style={{ marginLeft: 4, padding: "2px 6px" }}
                    disabled={seg.words.length < 2}
                    onClick={() => {
                      setEdited(splitSegment(working, si, Math.floor(seg.words.length / 2)));
                      session.clear();
                    }}
                  >
                    Split
                  </button>
                </div>
                <div className="mm-transcript-words">
                  {seg.words.map((w, wi) => (
                    <input
                      key={`${seg.id}_${wi}`}
                      className="mm-word-input"
                      value={w.text}
                      title={
                        w.confidence !== null ? `confidence ${w.confidence.toFixed(2)}` : undefined
                      }
                      onChange={(e) => {
                        setEdited(correctWord(working, si, wi, e.target.value));
                        session.clear();
                      }}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <PreviewBar
        busy={session.busy || nativeBusy}
        canApply={session.canApply}
        onPreview={() => void session.runPreview()}
        onApply={() => void session.runApply()}
        applyLabel="Apply markers"
        levelCNote={session.summary?.levelCNote}
      />

      <div className="mm-card">
        <h2 className="mm-card__title">Export</h2>
        <div className="mm-actions">
          <select
            value={exportFormat}
            onChange={(e) => setExportFormat(e.target.value as typeof exportFormat)}
          >
            <option value="srt">SRT</option>
            <option value="vtt">VTT</option>
            <option value="json">JSON</option>
            <option value="txt">TXT</option>
          </select>
          <button type="button" className="mm-btn" disabled={!session.plan} onClick={() => void copyExport()}>
            Copy export
          </button>
        </div>
        <p className="mm-muted">
          Traduction IA : panneau AI (WP12) — proposition à valider, aucun réseau sans consentement.
        </p>
      </div>

      <PlanList summary={session.summary} />
      <AnimatedPreview visual={session.visual} />
    </section>
  );
}
