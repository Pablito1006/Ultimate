import { useState, type ReactElement } from "react";
import { toUserMessage } from "../../core/errors/AppError";
import {
  CAPTION_STYLE_PRESETS,
  type CaptionStyleId,
} from "../../features/subtitles/captionStyles";
import {
  subtitleEngine,
  type SubtitleBuildResult,
} from "../../features/subtitles/SubtitleEngine";
import { Banner } from "../components/Banner";

export function CaptionsPanel(): ReactElement {
  const [text, setText] = useState(
    "Welcome to MasterMotion. Generate captions offline, style them, then apply markers or copy SRT."
  );
  const [styleId, setStyleId] = useState<CaptionStyleId>("social");
  const [result, setResult] = useState<SubtitleBuildResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function generate(): Promise<void> {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const built = await subtitleEngine.buildFromText({ text, styleId, providerId: "mock" });
      setResult(built);
      setMessage(`Built ${built.segments.length} caption segment(s) via ${built.transcription.providerId}.`);
    } catch (cause) {
      setError(toUserMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  async function applyMarkers(): Promise<void> {
    if (!result) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const count = await subtitleEngine.applyAsMarkers(result);
      setMessage(`Applied ${count} caption marker(s) on the active sequence.`);
    } catch (cause) {
      setError(toUserMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  async function copySrt(): Promise<void> {
    if (!result) {
      return;
    }
    try {
      await navigator.clipboard.writeText(result.srt);
      setMessage("SRT copied to clipboard.");
    } catch {
      setMessage(result.srt);
    }
  }

  return (
    <section>
      <h1 className="mm-panel-title">Captions</h1>
      <p className="mm-panel-subtitle">
        Transcription → segmentation → kinetic style → markers / SRT.
      </p>
      {error ? <Banner tone="error">{error}</Banner> : null}
      {message ? <Banner tone="info">{message}</Banner> : null}
      <Banner tone="warn">
        CaptionTrack item APIs are limited in current typings. Apply uses Comment markers + SRT export
        (real). Cloud STT providers can be registered later — mock provider works offline.
      </Banner>

      <div className="mm-card">
        <label className="mm-field">
          <span>Source text</span>
          <textarea rows={5} value={text} onChange={(e) => setText(e.target.value)} />
        </label>
        <label className="mm-field">
          <span>Style</span>
          <select
            value={styleId}
            onChange={(e) => setStyleId(e.target.value as CaptionStyleId)}
          >
            {CAPTION_STYLE_PRESETS.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mm-actions">
        <button type="button" className="mm-btn mm-btn--primary" disabled={busy} onClick={() => void generate()}>
          Generate
        </button>
        <button type="button" className="mm-btn" disabled={busy || !result} onClick={() => void applyMarkers()}>
          Apply markers
        </button>
        <button type="button" className="mm-btn" disabled={!result} onClick={() => void copySrt()}>
          Copy SRT
        </button>
      </div>

      {result ? (
        <div className="mm-card">
          <h2 className="mm-card__title">Segments ({result.segments.length})</h2>
          {result.segments.slice(0, 20).map((seg) => (
            <div key={seg.id} className="mm-row">
              <span className="mm-row__label">
                {seg.start.toFixed(2)}–{seg.end.toFixed(2)}
              </span>
              <span className="mm-row__value">{seg.text}</span>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
