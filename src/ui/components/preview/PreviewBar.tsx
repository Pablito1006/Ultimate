import type { ReactElement } from "react";

export interface PreviewBarProps {
  busy: boolean;
  canApply: boolean;
  onPreview: () => void;
  onApply: () => void;
  previewLabel?: string;
  applyLabel?: string;
  /** Level C unavailable note (honest). */
  levelCNote?: string;
}

/**
 * Standard [ Preview ] [ Apply ] [ Undo = native Ctrl/Cmd+Z ] bar.
 * Apply stays disabled until a plan has been computed.
 */
export function PreviewBar({
  busy,
  canApply,
  onPreview,
  onApply,
  previewLabel = "Preview",
  applyLabel = "Apply",
  levelCNote,
}: PreviewBarProps): ReactElement {
  return (
    <div className="mm-preview-bar">
      <div className="mm-actions">
        <button type="button" className="mm-btn" disabled={busy} onClick={onPreview}>
          {busy ? "Working…" : previewLabel}
        </button>
        <button
          type="button"
          className="mm-btn mm-btn--primary"
          disabled={busy || !canApply}
          onClick={onApply}
          title={canApply ? undefined : "Compute a preview plan first"}
        >
          {applyLabel}
        </button>
        <span className="mm-preview-undo" title="Use Premiere Edit → Undo (Ctrl/Cmd+Z)">
          Undo: Ctrl+Z
        </span>
      </div>
      {levelCNote ? <p className="mm-muted mm-preview-c-note">{levelCNote}</p> : null}
    </div>
  );
}
