import type { ReactElement } from "react";
import { useI18n } from "../../i18n";
import type { HostContextSnapshot } from "../../premiere/application/ApplicationService";
import { StatusDot } from "../components/StatusDot";

interface DashboardPanelProps {
  loading: boolean;
  error: string | null;
  context: HostContextSnapshot | null;
  onRefresh: () => void;
}

export function DashboardPanel({
  loading,
  error,
  context,
  onRefresh,
}: DashboardPanelProps): ReactElement {
  const { t } = useI18n();
  const compatibility = context?.compatibility;
  const hostTone =
    !compatibility
      ? "idle"
      : compatibility.compatible
        ? "ok"
        : "err";

  return (
    <section>
      <h1 className="mm-panel-title">{t("dashboard.title")}</h1>
      <p className="mm-panel-subtitle">{t("dashboard.subtitle")}</p>

      {error ? <div className="mm-banner mm-banner--error">{error}</div> : null}

      {compatibility && !compatibility.compatible ? (
        <div className="mm-banner mm-banner--error">{compatibility.message}</div>
      ) : null}

      {compatibility?.compatible ? (
        <div className="mm-banner mm-banner--info">{compatibility.message}</div>
      ) : null}

      <div className="mm-card">
        <h2 className="mm-card__title">{t("dashboard.host")}</h2>
        <div className="mm-row">
          <span className="mm-row__label">Status</span>
          <span className="mm-row__value">
            <StatusDot
              tone={loading ? "warn" : hostTone}
              label={loading ? "Refreshing…" : compatibility?.compatible ? "Connected" : "Unavailable"}
            />
          </span>
        </div>
        <div className="mm-row">
          <span className="mm-row__label">Premiere</span>
          <span className="mm-row__value">{compatibility?.hostVersion ?? "—"}</span>
        </div>
        <div className="mm-row">
          <span className="mm-row__label">Minimum</span>
          <span className="mm-row__value">{compatibility?.minVersion ?? "—"}</span>
        </div>
      </div>

      <div className="mm-card">
        <h2 className="mm-card__title">{t("dashboard.project")}</h2>
        {context?.project ? (
          <>
            <div className="mm-row">
              <span className="mm-row__label">Name</span>
              <span className="mm-row__value">{context.project.name}</span>
            </div>
            <div className="mm-row">
              <span className="mm-row__label">Path</span>
              <span className="mm-row__value">{context.project.path}</span>
            </div>
          </>
        ) : (
          <p className="mm-empty">No active project. Open a .prproj in Premiere Pro.</p>
        )}
      </div>

      <div className="mm-card">
        <h2 className="mm-card__title">{t("dashboard.sequence")}</h2>
        {context?.sequence ? (
          <>
            <div className="mm-row">
              <span className="mm-row__label">Active</span>
              <span className="mm-row__value">{context.sequence.name}</span>
            </div>
            <div className="mm-row">
              <span className="mm-row__label">Sequences</span>
              <span className="mm-row__value">{context.sequenceCount}</span>
            </div>
          </>
        ) : (
          <p className="mm-empty">
            {context?.project
              ? "No active sequence. Open a sequence in the timeline."
              : "Open a project to inspect sequences."}
          </p>
        )}
      </div>

      <div className="mm-card">
        <h2 className="mm-card__title">Tool hub</h2>
        <p className="mm-panel-subtitle" style={{ marginBottom: 8 }}>
          Central entry points — use the left nav for Motion, Captions, Sound, Timeline, Split,
          Rename, Macros, Templates and Settings.
        </p>
        <div className="mm-row">
          <span className="mm-row__label">1–2</span>
          <span className="mm-row__value">Motion / Templates</span>
        </div>
        <div className="mm-row">
          <span className="mm-row__label">3–4</span>
          <span className="mm-row__value">Captions (STT + styles)</span>
        </div>
        <div className="mm-row">
          <span className="mm-row__label">5</span>
          <span className="mm-row__value">Timeline analysis</span>
        </div>
        <div className="mm-row">
          <span className="mm-row__label">6–7</span>
          <span className="mm-row__value">Sound suggestions + mute</span>
        </div>
        <div className="mm-row">
          <span className="mm-row__label">8</span>
          <span className="mm-row__value">Split screen layouts</span>
        </div>
        <div className="mm-row">
          <span className="mm-row__label">9</span>
          <span className="mm-row__value">Batch rename</span>
        </div>
        <div className="mm-row">
          <span className="mm-row__label">10</span>
          <span className="mm-row__value">Macros / workflows</span>
        </div>
      </div>

      {compatibility ? (
        <div className="mm-card">
          <h2 className="mm-card__title">Capabilities</h2>
          <div className="mm-cap-list">
            {compatibility.capabilities.map((cap) => (
              <div key={cap.featureId} className="mm-cap">
                <span className="mm-cap__id">{cap.featureId}</span>
                <span className={cap.available ? "mm-cap__state mm-cap__state--on" : "mm-cap__state"}>
                  {cap.available ? "on" : "off"}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mm-card">
        <h2 className="mm-card__title">{t("dashboard.limitsTitle")}</h2>
        <p className="mm-muted">{t("dashboard.limitsBody")}</p>
      </div>

      <div className="mm-actions">
        <button type="button" className="mm-btn mm-btn--primary" onClick={onRefresh} disabled={loading}>
          {loading ? t("common.loading") : t("dashboard.refresh")}
        </button>
      </div>
    </section>
  );
}
