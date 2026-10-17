import { useCallback, useState, type ReactElement } from "react";
import {
  CAPTION_STYLE_PRESETS,
  type CaptionStyleId,
} from "../../features/subtitles/captionStyles";
import {
  captionsPreviewable,
  type CaptionsPlanInput,
} from "../../features/subtitles/captionsPreviewable";
import { usePreviewSession } from "../../features/preview/usePreviewSession";
import { Banner } from "../components/Banner";
import { AnimatedPreview } from "../components/preview/AnimatedPreview";
import { PlanList } from "../components/preview/PlanList";
import { PreviewBar } from "../components/preview/PreviewBar";

export function CaptionsPanel(): ReactElement {
  const [text, setText] = useState(
    "Welcome to MasterMotion. Generate captions offline, style them, then apply markers or copy SRT."
  );
  const [styleId, setStyleId] = useState<CaptionStyleId>("social");

  const getInput = useCallback(
    (): CaptionsPlanInput => ({ text, styleId, providerId: "mock" }),
    [text, styleId]
  );
  const session = usePreviewSession(captionsPreviewable, getInput);

  async function copySrt(): Promise<void> {
    if (!session.plan) {
      return;
    }
    try {
      await navigator.clipboard.writeText(session.plan.srt);
    } catch {
      // fall through — message shows srt length only
    }
  }

  return (
    <section>
      <h1 className="mm-panel-title">Captions</h1>
      <p className="mm-panel-subtitle">
        Plan → karaoke preview → markers / SRT (mock STT until WP2).
      </p>
      {session.error ? <Banner tone="error">{session.error}</Banner> : null}
      {session.message ? <Banner tone="info">{session.message}</Banner> : null}
      <Banner tone="warn">
        CaptionTrack item APIs are limited. Apply uses Comment markers + SRT export (real). Cloud STT
        is not enabled.
      </Banner>

      <div className="mm-card">
        <label className="mm-field">
          <span>Source text</span>
          <textarea
            rows={5}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              session.clear();
            }}
          />
        </label>
        <label className="mm-field">
          <span>Style</span>
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
              </option>
            ))}
          </select>
        </label>
      </div>

      <PreviewBar
        busy={session.busy}
        canApply={session.canApply}
        onPreview={() => void session.runPreview()}
        onApply={() => void session.runApply()}
        applyLabel="Apply markers"
        levelCNote={session.summary?.levelCNote}
      />
      <div className="mm-actions">
        <button
          type="button"
          className="mm-btn"
          disabled={!session.plan}
          onClick={() => void copySrt().then(() => undefined)}
        >
          Copy SRT
        </button>
      </div>

      <PlanList summary={session.summary} />
      <AnimatedPreview visual={session.visual} />
    </section>
  );
}
