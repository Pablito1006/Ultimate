import { useCallback, useEffect, useMemo, useState, type ReactElement } from "react";
import { getAiFeatureStatus } from "../../features/ai/aiCapabilities";
import { aiPreviewable } from "../../features/ai/aiPreviewable";
import { aiService } from "../../features/ai/AiService";
import { aiKeyStore } from "../../features/ai/AiKeyStore";
import type { AiProviderId, AiTaskKind } from "../../features/ai/aiTypes";
import {
  buildBrollPayload,
  buildHighlightsPayload,
  buildSummaryPayload,
  buildTitlesPayload,
  buildTranslatePayload,
  taskLabel,
} from "../../features/ai/aiUseCases";
import { usePreviewSession } from "../../features/preview/usePreviewSession";
import { settingsService } from "../../services/storage/SettingsService";
import { Banner } from "../components/Banner";
import { AnimatedPreview } from "../components/preview/AnimatedPreview";
import { PlanList } from "../components/preview/PlanList";
import { PreviewBar } from "../components/preview/PreviewBar";

const TASKS: AiTaskKind[] = ["translate", "titles", "summary", "highlights", "broll"];

export function AiPanel(): ReactElement {
  const [enabled, setEnabled] = useState(false);
  const [consentGiven, setConsentGiven] = useState(false);
  const [acknowledgedLimits, setAcknowledgedLimits] = useState(false);
  const [providerId, setProviderId] = useState<AiProviderId>("mock");
  const [apiKeyDraft, setApiKeyDraft] = useState("");
  const [hasKey, setHasKey] = useState(false);
  const [task, setTask] = useState<AiTaskKind>("summary");
  const [inputText, setInputText] = useState(
    "Bonjour, bienvenue dans cette vidéo sur le montage Premiere Pro."
  );
  const [targetLang, setTargetLang] = useState("en");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    void settingsService.load().then((s) => {
      const ai = s.ai;
      setEnabled(ai.enabled);
      setConsentGiven(ai.consentGiven);
      setAcknowledgedLimits(ai.acknowledgedLimits);
      setProviderId(ai.providerId);
      aiService.setConsent({ ...ai });
      setHasKey(aiKeyStore.hasKey());
    });
  }, []);

  async function persistConsent(partial: {
    enabled?: boolean;
    consentGiven?: boolean;
    acknowledgedLimits?: boolean;
    providerId?: AiProviderId;
  }): Promise<void> {
    const next = aiService.setConsent({
      ...partial,
      consentAt:
        partial.consentGiven === true ? new Date().toISOString() : aiService.getConsent().consentAt,
    });
    setEnabled(next.enabled);
    setConsentGiven(next.consentGiven);
    setAcknowledgedLimits(next.acknowledgedLimits);
    setProviderId(next.providerId);
    await settingsService.update({ ai: next });
    setMessage(null);
  }

  const input = useCallback(() => {
    let payload;
    switch (task) {
      case "translate":
        payload = buildTranslatePayload(inputText, targetLang);
        break;
      case "titles":
        payload = buildTitlesPayload(inputText);
        break;
      case "highlights":
        payload = buildHighlightsPayload(inputText);
        break;
      case "broll":
        payload = buildBrollPayload(inputText);
        break;
      default:
        payload = buildSummaryPayload(inputText);
    }
    return { payload };
  }, [task, inputText, targetLang]);

  const session = usePreviewSession(aiPreviewable, input);
  const features = useMemo(
    () =>
      getAiFeatureStatus(
        { enabled, consentGiven, acknowledgedLimits, providerId, consentAt: null },
        providerId
      ),
    [enabled, consentGiven, acknowledgedLimits, providerId]
  );

  const last = aiService.getLastProposal();
  const provider = aiService.getActiveProvider();

  return (
    <section>
      <h1 className="mm-panel-title">IA facultative</h1>
      <p className="mm-panel-subtitle">
        Désactivée par défaut · un fournisseur à la fois · consentement + aperçu du texte envoyé ·
        toute sortie est une proposition à valider.
      </p>
      {session.error ? <Banner tone="error">{session.error}</Banner> : null}
      {session.message || message ? (
        <Banner tone="info">{session.message || message}</Banner>
      ) : null}

      <div className="mm-card">
        <h2 className="mm-card__title">Activation & consentement</h2>
        <label className="mm-field">
          <span>
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => void persistConsent({ enabled: e.target.checked })}
            />{" "}
            Activer l’IA (défaut: off)
          </span>
        </label>
        <label className="mm-field">
          <span>Fournisseur (un seul)</span>
          <select
            value={providerId}
            onChange={(e) => {
              void persistConsent({ providerId: e.target.value as AiProviderId });
              session.clear();
            }}
          >
            <option value="mock">Mock offline (recommandé / tests)</option>
            <option value="openai">OpenAI (https://api.openai.com)</option>
          </select>
        </label>
        <p className="mm-muted">
          Coût: {provider.info.limits.costHint} · {provider.info.limits.rateHint}
        </p>
        <label className="mm-field">
          <span>
            <input
              type="checkbox"
              checked={acknowledgedLimits}
              onChange={(e) => void persistConsent({ acknowledgedLimits: e.target.checked })}
            />{" "}
            J’ai lu coût / limites / domaines
          </span>
        </label>
        <label className="mm-field">
          <span>
            <input
              type="checkbox"
              checked={consentGiven}
              onChange={(e) => void persistConsent({ consentGiven: e.target.checked })}
            />{" "}
            J’autorise l’envoi du texte affiché ci-dessous au fournisseur sélectionné
          </span>
        </label>
        {providerId === "openai" ? (
          <>
            <label className="mm-field">
              <span>Clé API (stockage local uniquement — jamais dans le projet ni les logs)</span>
              <input
                type="password"
                value={apiKeyDraft}
                placeholder={hasKey ? "•••••••• (déjà enregistrée)" : "sk-…"}
                onChange={(e) => setApiKeyDraft(e.target.value)}
              />
            </label>
            <div className="mm-actions">
              <button
                type="button"
                className="mm-btn"
                onClick={() => {
                  aiKeyStore.set(apiKeyDraft);
                  setApiKeyDraft("");
                  setHasKey(aiKeyStore.hasKey());
                  setMessage("Clé enregistrée localement.");
                }}
              >
                Enregistrer la clé
              </button>
              <button
                type="button"
                className="mm-btn"
                onClick={() => {
                  aiKeyStore.clear();
                  setHasKey(false);
                  setMessage("Clé effacée.");
                }}
              >
                Effacer la clé
              </button>
            </div>
          </>
        ) : null}
      </div>

      <div className="mm-card">
        <h2 className="mm-card__title">Tâche</h2>
        <div className="mm-actions">
          {TASKS.map((t) => (
            <button
              key={t}
              type="button"
              className={`mm-btn ${task === t ? "mm-btn--primary" : ""}`}
              onClick={() => {
                setTask(t);
                session.clear();
              }}
            >
              {taskLabel(t)}
            </button>
          ))}
        </div>
        {task === "translate" ? (
          <label className="mm-field">
            <span>Langue cible</span>
            <input value={targetLang} onChange={(e) => setTargetLang(e.target.value)} />
          </label>
        ) : null}
        <label className="mm-field">
          <span>Texte source (affiché avant envoi)</span>
          <textarea rows={5} value={inputText} onChange={(e) => setInputText(e.target.value)} />
        </label>
      </div>

      <PreviewBar
        busy={session.busy}
        canApply={session.canApply}
        onPreview={() => void session.runPreview()}
        onApply={() => void session.runApply()}
        previewLabel="Aperçu payload"
        applyLabel="Générer proposition"
      />
      <PlanList summary={session.summary} />
      <AnimatedPreview visual={session.visual} />

      {last ? (
        <div className="mm-card">
          <h2 className="mm-card__title">Proposition ({last.status})</h2>
          <pre className="mm-pre">{last.content}</pre>
          <div className="mm-actions">
            <button
              type="button"
              className="mm-btn mm-btn--primary"
              onClick={() => {
                aiService.setProposalStatus(last.id, "accepted");
                void navigator.clipboard?.writeText(last.content);
                setMessage("Proposition acceptée (copiée) — collez manuellement où besoin.");
              }}
            >
              Accepter + copier
            </button>
            <button
              type="button"
              className="mm-btn"
              onClick={() => {
                aiService.setProposalStatus(last.id, "rejected");
                setMessage("Proposition rejetée.");
              }}
            >
              Rejeter
            </button>
          </div>
        </div>
      ) : null}

      <div className="mm-card">
        <h2 className="mm-card__title">Capacités IA</h2>
        {features.map((f) => (
          <div key={f.id} className="mm-row">
            <span className="mm-row__label">
              {f.id}: <strong>{f.status}</strong>
            </span>
            <span className="mm-muted">{f.reason}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
