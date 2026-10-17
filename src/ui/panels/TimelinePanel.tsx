import { useCallback, useState, type ReactElement } from "react";
import { toUserMessage } from "../../core/errors/AppError";
import {
  timelineService,
  type TimelineAnalysis,
} from "../../premiere/timeline/TimelineService";
import { Banner } from "../components/Banner";

export function TimelinePanel(): ReactElement {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<TimelineAnalysis | null>(null);

  const analyze = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await timelineService.analyzeActive();
      setAnalysis(result);
    } catch (cause) {
      setError(toUserMessage(cause));
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <section>
      <h1 className="mm-panel-title">Timeline</h1>
      <p className="mm-panel-subtitle">Analyze tracks, clips, markers and playhead.</p>
      {error ? <Banner tone="error">{error}</Banner> : null}

      <div className="mm-actions">
        <button type="button" className="mm-btn mm-btn--primary" disabled={loading} onClick={() => void analyze()}>
          {loading ? "Analyzing…" : "Analyze timeline"}
        </button>
      </div>

      {analysis ? (
        <>
          <div className="mm-card">
            <h2 className="mm-card__title">Summary</h2>
            <div className="mm-row">
              <span className="mm-row__label">Sequence</span>
              <span className="mm-row__value">{analysis.sequenceName}</span>
            </div>
            <div className="mm-row">
              <span className="mm-row__label">Frame</span>
              <span className="mm-row__value">
                {analysis.frameWidth}×{analysis.frameHeight}
              </span>
            </div>
            <div className="mm-row">
              <span className="mm-row__label">Tracks V/A/C</span>
              <span className="mm-row__value">
                {analysis.videoTrackCount}/{analysis.audioTrackCount}/{analysis.captionTrackCount}
              </span>
            </div>
            <div className="mm-row">
              <span className="mm-row__label">Playhead</span>
              <span className="mm-row__value">{analysis.playerPosition.toFixed(3)}s</span>
            </div>
            <div className="mm-row">
              <span className="mm-row__label">End</span>
              <span className="mm-row__value">{analysis.endTime.toFixed(3)}s</span>
            </div>
          </div>

          <div className="mm-card">
            <h2 className="mm-card__title">Clips ({analysis.clips.length})</h2>
            {analysis.clips.length === 0 ? (
              <p className="mm-empty">No clips on timeline.</p>
            ) : (
              <div className="mm-table">
                {analysis.clips.slice(0, 40).map((clip) => (
                  <div key={clip.id} className="mm-row">
                    <span className="mm-row__label">
                      {clip.trackKind[0].toUpperCase()}
                      {clip.trackIndex + 1}
                    </span>
                    <span className="mm-row__value">
                      {clip.name} · {clip.start.toFixed(2)}–{clip.end.toFixed(2)}s
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mm-card">
            <h2 className="mm-card__title">Markers ({analysis.markers.length})</h2>
            {analysis.markers.length === 0 ? (
              <p className="mm-empty">No markers.</p>
            ) : (
              analysis.markers.slice(0, 30).map((marker, index) => (
                <div key={`${marker.name}_${index}`} className="mm-row">
                  <span className="mm-row__label">{marker.start.toFixed(2)}s</span>
                  <span className="mm-row__value">
                    {marker.name} · {marker.type}
                  </span>
                </div>
              ))
            )}
          </div>
        </>
      ) : (
        <p className="mm-empty">Run analysis on the active sequence.</p>
      )}
    </section>
  );
}
