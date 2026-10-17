import { useState, type ReactElement } from "react";
import { toUserMessage } from "../../core/errors/AppError";
import {
  soundDesignService,
  type SoundDesignReport,
} from "../../features/audio/SoundDesignService";
import { Banner } from "../components/Banner";

export function SoundPanel(): ReactElement {
  const [report, setReport] = useState<SoundDesignReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [trackIndex, setTrackIndex] = useState(0);

  async function analyze(): Promise<void> {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      setReport(await soundDesignService.analyzeAndSuggest());
    } catch (cause) {
      setError(toUserMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  async function applyMarkers(): Promise<void> {
    if (!report) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const count = await soundDesignService.applySuggestionMarkers(report.suggestions);
      setMessage(`Placed ${count} SFX suggestion marker(s). Review before importing media.`);
    } catch (cause) {
      setError(toUserMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  async function mute(mute: boolean): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      await soundDesignService.setAudioTrackMute(trackIndex, mute);
      setMessage(`${mute ? "Muted" : "Unmuted"} audio track ${trackIndex}.`);
    } catch (cause) {
      setError(toUserMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section>
      <h1 className="mm-panel-title">Sound</h1>
      <p className="mm-panel-subtitle">Event analysis, SFX suggestions, and audio track mute helpers.</p>
      {error ? <Banner tone="error">{error}</Banner> : null}
      {message ? <Banner tone="info">{message}</Banner> : null}
      <Banner tone="warn">
        Suggestions never insert media silently. Markers are placed for approval. Advanced DSP
        (loudness, ducking) is not claimed without Premiere API support.
      </Banner>

      <div className="mm-card">
        <label className="mm-field">
          <span>Audio track index</span>
          <input
            type="number"
            min={0}
            value={trackIndex}
            onChange={(e) => setTrackIndex(Number(e.target.value) || 0)}
          />
        </label>
      </div>

      <div className="mm-actions">
        <button type="button" className="mm-btn mm-btn--primary" disabled={busy} onClick={() => void analyze()}>
          Analyze & suggest
        </button>
        <button type="button" className="mm-btn" disabled={busy || !report} onClick={() => void applyMarkers()}>
          Mark suggestions
        </button>
        <button type="button" className="mm-btn" disabled={busy} onClick={() => void mute(true)}>
          Mute track
        </button>
        <button type="button" className="mm-btn" disabled={busy} onClick={() => void mute(false)}>
          Unmute track
        </button>
      </div>

      {report ? (
        <>
          <div className="mm-card">
            <h2 className="mm-card__title">Events ({report.events.length})</h2>
            {report.events.slice(0, 25).map((event) => (
              <div key={event.id} className="mm-row">
                <span className="mm-row__label">{event.time.toFixed(2)}s</span>
                <span className="mm-row__value">
                  {event.type}
                  {event.label ? ` · ${event.label}` : ""}
                </span>
              </div>
            ))}
          </div>
          <div className="mm-card">
            <h2 className="mm-card__title">Suggestions ({report.suggestions.length})</h2>
            {report.suggestions.length === 0 ? (
              <p className="mm-empty">No suggestions above threshold.</p>
            ) : (
              report.suggestions.map((s) => (
                <div key={`${s.eventId}_${s.sfxId}`} className="mm-row">
                  <span className="mm-row__label">{s.time.toFixed(2)}s</span>
                  <span className="mm-row__value">
                    {s.sfxName} · {(s.score * 100).toFixed(0)}% · {s.reason}
                  </span>
                </div>
              ))
            )}
          </div>
        </>
      ) : null}
    </section>
  );
}
