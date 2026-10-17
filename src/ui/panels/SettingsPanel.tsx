import { useEffect, useState, type ReactElement } from "react";
import { toUserMessage } from "../../core/errors/AppError";
import { Logger } from "../../core/logging/Logger";
import { CAPTION_STYLE_PRESETS, type CaptionStyleId } from "../../features/subtitles/captionStyles";
import {
  capabilityService,
  type CapabilitiesReport,
  type CapabilityStatus,
} from "../../services/CapabilityService";
import {
  settingsService,
  type PluginSettings,
} from "../../services/storage/SettingsService";
import { Banner } from "../components/Banner";
import { StatusDot, type StatusTone } from "../components/StatusDot";

function statusToTone(status: CapabilityStatus): StatusTone {
  return capabilityService.statusTone(status);
}

function statusLabel(status: CapabilityStatus): string {
  if (status === "available") {
    return "OK";
  }
  if (status === "partial") {
    return "Partial";
  }
  return "Unavailable";
}

export function SettingsPanel(): ReactElement {
  const [settings, setSettings] = useState<PluginSettings | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [capabilities, setCapabilities] = useState<CapabilitiesReport | null>(null);
  const [diagBusy, setDiagBusy] = useState(false);
  const [exportHint, setExportHint] = useState<string | null>(null);

  useEffect(() => {
    void settingsService.load().then(setSettings).catch((cause) => setError(toUserMessage(cause)));
  }, []);

  async function save(partial: Partial<PluginSettings>): Promise<void> {
    try {
      const next = await settingsService.update(partial);
      setSettings(next);
      Logger.configure({
        minLevel: next.loggingLevel,
        environment: next.loggingLevel === "debug" ? "development" : "production",
      });
      setMessage("Settings saved.");
    } catch (cause) {
      setError(toUserMessage(cause));
    }
  }

  async function runDiagnostic(): Promise<void> {
    setDiagBusy(true);
    setError(null);
    setExportHint(null);
    try {
      const report = await capabilityService.probe();
      setCapabilities(report);
      setMessage("Diagnostic refreshed.");
    } catch (cause) {
      setError(toUserMessage(cause));
    } finally {
      setDiagBusy(false);
    }
  }

  async function copyDiagnosticJson(): Promise<void> {
    if (!capabilities) {
      return;
    }
    const json = capabilityService.toJSON(capabilities);
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(json);
        setExportHint("Diagnostic JSON copied to clipboard (no project paths / secrets).");
      } else {
        setExportHint(json);
      }
    } catch {
      setExportHint(json);
    }
  }

  if (!settings) {
    return (
      <section>
        <h1 className="mm-panel-title">Settings</h1>
        <p className="mm-empty">Loading…</p>
      </section>
    );
  }

  return (
    <section>
      <h1 className="mm-panel-title">Settings</h1>
      <p className="mm-panel-subtitle">Persistent preferences for MasterMotion.</p>
      {error ? <Banner tone="error">{error}</Banner> : null}
      {message ? <Banner tone="info">{message}</Banner> : null}

      <div className="mm-card">
        <label className="mm-field">
          <span>Theme</span>
          <select
            value={settings.theme}
            onChange={(e) => void save({ theme: e.target.value as PluginSettings["theme"] })}
          >
            <option value="dark">Dark</option>
            <option value="light">Light</option>
          </select>
        </label>
        <label className="mm-field">
          <span>Language</span>
          <select
            value={settings.language}
            onChange={(e) => void save({ language: e.target.value as PluginSettings["language"] })}
          >
            <option value="en">English</option>
            <option value="fr">Français</option>
          </select>
        </label>
        <label className="mm-field">
          <span>Transcription provider</span>
          <select
            value={settings.transcriptionProvider}
            onChange={(e) => void save({ transcriptionProvider: e.target.value })}
          >
            <option value="mock">Mock (offline)</option>
          </select>
        </label>
        <label className="mm-field">
          <span>Default caption style</span>
          <select
            value={settings.defaultCaptionStyle}
            onChange={(e) =>
              void save({ defaultCaptionStyle: e.target.value as CaptionStyleId })
            }
          >
            {CAPTION_STYLE_PRESETS.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.name}
              </option>
            ))}
          </select>
        </label>
        <label className="mm-field">
          <span>Logging</span>
          <select
            value={settings.loggingLevel}
            onChange={(e) =>
              void save({ loggingLevel: e.target.value as PluginSettings["loggingLevel"] })
            }
          >
            <option value="debug">debug</option>
            <option value="info">info</option>
            <option value="warn">warn</option>
            <option value="error">error</option>
          </select>
        </label>
      </div>

      <div className="mm-card" style={{ marginTop: 12 }}>
        <h2 className="mm-card__title">Diagnostic</h2>
        <p className="mm-panel-subtitle">
          Runtime capability probe (not version number alone). Green = available, orange = partial,
          red = unavailable.
        </p>
        <div className="mm-row" style={{ gap: 8, marginBottom: 8 }}>
          <button type="button" className="mm-btn" disabled={diagBusy} onClick={() => void runDiagnostic()}>
            {diagBusy ? "Probing…" : "Run diagnostic"}
          </button>
          <button
            type="button"
            className="mm-btn mm-btn--ghost"
            disabled={!capabilities}
            onClick={() => void copyDiagnosticJson()}
          >
            Export JSON
          </button>
        </div>
        {capabilities ? (
          <>
            <p className="mm-muted">
              Host: {capabilities.hostVersion ?? "unknown"} · Checked: {capabilities.checkedAt}
            </p>
            <p className="mm-muted">{capabilities.typesPackageNote}</p>
            <ul className="mm-diag-list">
              {capabilities.entries.map((entry) => (
                <li key={entry.id} className="mm-diag-item">
                  <StatusDot tone={statusToTone(entry.status)} label={statusLabel(entry.status)} />
                  <span className="mm-diag-id">{entry.id}</span>
                  {entry.since ? <span className="mm-muted">since {entry.since}</span> : null}
                  {entry.reason ? <span className="mm-diag-reason">{entry.reason}</span> : null}
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="mm-empty">No diagnostic yet. Run inside Premiere for live results.</p>
        )}
        {exportHint ? (
          <pre className="mm-diag-export" tabIndex={0}>
            {exportHint}
          </pre>
        ) : null}
      </div>
    </section>
  );
}
