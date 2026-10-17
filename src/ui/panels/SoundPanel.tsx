import { useCallback, useState, type ReactElement } from "react";
import { toUserMessage } from "../../core/errors/AppError";
import { soundDesignService } from "../../features/audio/SoundDesignService";
import {
  soundPreviewable,
  type SoundPlanInput,
} from "../../features/audio/soundPreviewable";
import { usePreviewSession } from "../../features/preview/usePreviewSession";
import { Banner } from "../components/Banner";
import { PlanList } from "../components/preview/PlanList";
import { PreviewBar } from "../components/preview/PreviewBar";
import { TimelineMiniMap } from "../components/preview/TimelineMiniMap";

export function SoundPanel(): ReactElement {
  const [trackIndex, setTrackIndex] = useState(0);
  const [muteError, setMuteError] = useState<string | null>(null);
  const [muteMessage, setMuteMessage] = useState<string | null>(null);
  const [muteBusy, setMuteBusy] = useState(false);

  const getInput = useCallback((): SoundPlanInput => ({}), []);
  const session = usePreviewSession(soundPreviewable, getInput);

  async function mute(mute: boolean): Promise<void> {
    setMuteBusy(true);
    setMuteError(null);
    try {
      await soundDesignService.setAudioTrackMute(trackIndex, mute);
      setMuteMessage(`${mute ? "Muted" : "Unmuted"} audio track ${trackIndex}.`);
    } catch (cause) {
      setMuteError(toUserMessage(cause));
    } finally {
      setMuteBusy(false);
    }
  }

  const timelinePayload =
    session.visual?.kind === "timeline"
      ? (session.visual.payload as {
          duration: number;
          playhead: number;
          clips: Array<{ start: number; end: number; track: number; label: string }>;
          markers: Array<{ time: number; label: string }>;
        })
      : null;

  return (
    <section>
      <h1 className="mm-panel-title">Sound</h1>
      <p className="mm-panel-subtitle">
        Preview SFX suggestions (A), then mark for approval — never auto-inserts media.
      </p>
      {session.error || muteError ? (
        <Banner tone="error">{session.error || muteError}</Banner>
      ) : null}
      {session.message || muteMessage ? (
        <Banner tone="info">{session.message || muteMessage}</Banner>
      ) : null}
      <Banner tone="warn">
        Suggestions never insert media silently. Advanced DSP is not claimed without Premiere API
        support.
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

      <PreviewBar
        busy={session.busy}
        canApply={session.canApply && (session.summary?.counts.suggestions ?? 0) > 0}
        onPreview={() => void session.runPreview()}
        onApply={() => void session.runApply()}
        previewLabel="Preview"
        applyLabel="Mark suggestions"
        levelCNote={session.summary?.levelCNote}
      />
      <div className="mm-actions">
        <button type="button" className="mm-btn" disabled={muteBusy} onClick={() => void mute(true)}>
          Mute track
        </button>
        <button type="button" className="mm-btn" disabled={muteBusy} onClick={() => void mute(false)}>
          Unmute track
        </button>
      </div>

      <PlanList summary={session.summary} />
      {timelinePayload ? (
        <TimelineMiniMap
          title="Suggestion map"
          duration={timelinePayload.duration}
          playhead={timelinePayload.playhead}
          clips={timelinePayload.clips}
          markers={timelinePayload.markers}
        />
      ) : null}
    </section>
  );
}
