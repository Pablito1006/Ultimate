import { useEffect, useState, type ReactElement } from "react";
import { toUserMessage } from "../../core/errors/AppError";
import { Logger } from "../../core/logging/Logger";
import { CAPTION_STYLE_PRESETS, type CaptionStyleId } from "../../features/subtitles/captionStyles";
import {
  settingsService,
  type PluginSettings,
} from "../../services/storage/SettingsService";
import { Banner } from "../components/Banner";

export function SettingsPanel(): ReactElement {
  const [settings, setSettings] = useState<PluginSettings | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
    </section>
  );
}
