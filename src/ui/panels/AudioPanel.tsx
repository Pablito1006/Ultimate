import { useCallback, useMemo, useState, type ReactElement } from "react";
import { getAudioFeatureStatus } from "../../features/audio/audioCapabilities";
import {
  audioPreviewable,
  type AudioToolMode,
} from "../../features/audio/audioPreviewable";
import type { LoudnessPlatform } from "../../features/audio/audioMath";
import { sfxCatalogCount } from "../../features/audio/sfxCatalog";
import {
  soundPreviewable,
  type SoundPlanInput,
} from "../../features/audio/soundPreviewable";
import { usePreviewSession } from "../../features/preview/usePreviewSession";
import { Banner } from "../components/Banner";
import { AnimatedPreview } from "../components/preview/AnimatedPreview";
import { PlanList } from "../components/preview/PlanList";
import { PreviewBar } from "../components/preview/PreviewBar";
import { TimelineMiniMap } from "../components/preview/TimelineMiniMap";

type Tab = "sfx" | "ducking" | "fade" | "gain" | "cleanup" | "limits";

export function AudioPanel(): ReactElement {
  const [tab, setTab] = useState<Tab>("ducking");
  const [musicTrack, setMusicTrack] = useState(0);
  const [duckDb, setDuckDb] = useState(-12);
  const [fadeIn, setFadeIn] = useState(0.5);
  const [fadeOut, setFadeOut] = useState(0.5);
  const [measuredLufs, setMeasuredLufs] = useState(-18);
  const [platform, setPlatform] = useState<LoudnessPlatform>("youtube");
  const [overwrite, setOverwrite] = useState(true);
  const [speechJson, setSpeechJson] = useState('[{"start":1,"end":3},{"start":5,"end":7}]');

  const parseSpeech = useCallback(() => {
    try {
      const raw = JSON.parse(speechJson) as Array<{ start: number; end: number }>;
      return Array.isArray(raw) ? raw : [];
    } catch {
      return [];
    }
  }, [speechJson]);

  const audioInput = useCallback(() => {
    const mode: AudioToolMode =
      tab === "fade" ? "fade" : tab === "gain" ? "gain" : tab === "cleanup" ? "cleanup" : "ducking";
    return {
      mode,
      musicTrackIndex: musicTrack,
      speechSegments: parseSpeech(),
      duckDb,
      fadeInSeconds: fadeIn,
      fadeOutSeconds: fadeOut,
      measuredLufs,
      platform,
      overwriteExisting: overwrite,
    };
  }, [
    tab,
    musicTrack,
    parseSpeech,
    duckDb,
    fadeIn,
    fadeOut,
    measuredLufs,
    platform,
    overwrite,
  ]);

  const sfxInput = useCallback((): SoundPlanInput => ({}), []);
  const audioSession = usePreviewSession(audioPreviewable, audioInput);
  const sfxSession = usePreviewSession(soundPreviewable, sfxInput);
  const session = tab === "sfx" ? sfxSession : audioSession;
  const features = useMemo(() => getAudioFeatureStatus(), []);

  const timelinePayload =
    sfxSession.visual?.kind === "timeline"
      ? (sfxSession.visual.payload as {
          duration: number;
          playhead: number;
          clips: Array<{ start: number; end: number; track: number; label: string }>;
          markers: Array<{ time: number; label: string }>;
        })
      : null;

  return (
    <section>
      <h1 className="mm-panel-title">Audio</h1>
      <p className="mm-panel-subtitle">
        Ducking / fondus / gain (LUFS saisi) / nettoyage · SFX catalogue ({sfxCatalogCount()}) —
        insertion média jamais automatique.
      </p>
      {session.error ? <Banner tone="error">{session.error}</Banner> : null}
      {session.message ? <Banner tone="info">{session.message}</Banner> : null}

      <div className="mm-actions">
        {(["ducking", "fade", "gain", "cleanup", "sfx", "limits"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            className={`mm-btn ${tab === t ? "mm-btn--primary" : ""}`}
            onClick={() => {
              setTab(t);
              audioSession.clear();
              sfxSession.clear();
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "ducking" ? (
        <div className="mm-card">
          <label className="mm-field">
            <span>Piste musique</span>
            <input
              type="number"
              min={0}
              value={musicTrack}
              onChange={(e) => setMusicTrack(Number(e.target.value))}
            />
          </label>
          <label className="mm-field">
            <span>Duck (dB)</span>
            <input
              type="number"
              value={duckDb}
              onChange={(e) => setDuckDb(Number(e.target.value))}
            />
          </label>
          <label className="mm-field">
            <span>Segments parole (JSON)</span>
            <textarea
              rows={3}
              value={speechJson}
              onChange={(e) => setSpeechJson(e.target.value)}
            />
          </label>
          <p className="mm-muted">Depuis transcription WP2 ou saisie manuelle — pas de loudness auto.</p>
        </div>
      ) : null}

      {tab === "fade" ? (
        <div className="mm-card">
          <label className="mm-field">
            <span>Fade in (s)</span>
            <input
              type="number"
              min={0}
              step={0.05}
              value={fadeIn}
              onChange={(e) => setFadeIn(Number(e.target.value))}
            />
          </label>
          <label className="mm-field">
            <span>Fade out (s)</span>
            <input
              type="number"
              min={0}
              step={0.05}
              value={fadeOut}
              onChange={(e) => setFadeOut(Number(e.target.value))}
            />
          </label>
        </div>
      ) : null}

      {tab === "gain" ? (
        <div className="mm-card">
          <Banner tone="warn">
            Loudness meter unavailable — saisissez une mesure LUFS externe (YouTube −14, podcast −16…).
          </Banner>
          <label className="mm-field">
            <span>Mesure LUFS</span>
            <input
              type="number"
              value={measuredLufs}
              onChange={(e) => setMeasuredLufs(Number(e.target.value))}
            />
          </label>
          <label className="mm-field">
            <span>Cible plateforme</span>
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value as LoudnessPlatform)}
            >
              <option value="youtube">YouTube (−14)</option>
              <option value="podcast">Podcast (−16)</option>
              <option value="broadcast">Broadcast (−23)</option>
              <option value="custom">Custom</option>
            </select>
          </label>
        </div>
      ) : null}

      {tab === "cleanup" ? (
        <div className="mm-card">
          <p className="mm-muted">
            Append DeNoise / DeEsser si listés par AudioFilterFactory — sinon message unavailable.
          </p>
        </div>
      ) : null}

      {tab === "sfx" ? (
        <div className="mm-card">
          <p className="mm-muted">
            {sfxCatalogCount()} SFX (métadonnées). Apply = marqueurs d’approbation uniquement.
          </p>
        </div>
      ) : null}

      {tab !== "limits" && tab !== "sfx" ? (
        <label className="mm-field">
          <span>
            <input
              type="checkbox"
              checked={overwrite}
              onChange={(e) => setOverwrite(e.target.checked)}
            />{" "}
            Écraser keyframes volume existants
          </span>
        </label>
      ) : null}

      {tab === "limits" ? (
        <div className="mm-card">
          <h2 className="mm-card__title">Capacités audio</h2>
          {features.map((f) => (
            <div key={f.id} className="mm-row">
              <span className="mm-row__label">
                {f.id}: <strong>{f.status}</strong>
              </span>
              <span className="mm-muted">{f.reason}</span>
            </div>
          ))}
        </div>
      ) : (
        <>
          <PreviewBar
            busy={session.busy}
            canApply={
              tab === "sfx"
                ? session.canApply && (sfxSession.summary?.counts.suggestions ?? 0) > 0
                : session.canApply
            }
            onPreview={() => void session.runPreview()}
            onApply={() => void session.runApply()}
            previewLabel="Aperçu"
            applyLabel={tab === "sfx" ? "Marqueurs SFX" : "Appliquer"}
          />
          <PlanList summary={session.summary} />
          {tab === "sfx" && timelinePayload ? (
            <TimelineMiniMap
              duration={timelinePayload.duration}
              playhead={timelinePayload.playhead}
              clips={timelinePayload.clips}
              markers={timelinePayload.markers}
            />
          ) : (
            <AnimatedPreview visual={session.visual} />
          )}
        </>
      )}
    </section>
  );
}
