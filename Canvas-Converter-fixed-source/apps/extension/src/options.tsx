import React from "react";
import ReactDOM from "react-dom/client";
import { BRIDGE_URL_REQUIREMENT } from "./core/platform";
import { Button, Card, Progress, Shell, formatBytes, sendExtensionMessage, useEditableSettings, useExtensionState } from "./ui/shared";
import "./styles/global.css";

function OptionsApp() {
  const { state, statusText, setStatusText } = useExtensionState(1800);
  const { draft, setDraft } = useEditableSettings(state);

  const save = async () => {
    if (!draft) {
      return;
    }
    const response = await sendExtensionMessage<{ ok: boolean; message?: string }>({ type: "aeon:update-settings", settings: draft });
    setStatusText(response.ok ? "Settings saved." : (response.message ?? "Settings could not be saved."));
  };

  const clearCaptures = async () => {
    await sendExtensionMessage({ type: "aeon:clear-captures" });
    setStatusText("All saved captures were cleared.");
  };

  return (
    <Shell
      title="SETTINGS"
      subtitle="Tune the capture engine, handoff behavior, and local storage without changing the zero-backend contract."
    >
      {statusText ? <div className="ae-status">{statusText}</div> : null}

      {draft ? (
        <>
          <Card accent="cyan">
            <div className="ae-card__title">Capture</div>
            <p className="ae-copy">
              Capture now always runs as <strong>Complete Snapshot</strong> so the extension preserves the full supported Canvas surface instead of splitting between partial and full modes.
            </p>
            <label className="field">
              <span>Inter-request delay ({draft.requestDelay} ms)</span>
              <input type="range" min="400" max="1200" step="50" value={draft.requestDelay} onChange={(event) => setDraft({ ...draft, requestDelay: Number(event.target.value) })} />
            </label>
            <label className="toggle">
              <input type="checkbox" checked={draft.autoHandoff} onChange={(event) => setDraft({ ...draft, autoHandoff: event.target.checked })} />
              <span>Open AEONTHRA automatically after capture completes</span>
            </label>
            <label className="toggle">
              <input type="checkbox" checked={draft.autoDeleteAfterImport} onChange={(event) => setDraft({ ...draft, autoDeleteAfterImport: event.target.checked })} />
              <span>Delete saved capture after any acknowledged AEONTHRA import</span>
            </label>
          </Card>

          <Card accent="purple">
            <div className="ae-card__title">Handoff</div>
            <label className="field">
              <span>AEONTHRA Classroom URL</span>
              <input value={draft.aeonthraUrl} onChange={(event) => setDraft({ ...draft, aeonthraUrl: event.target.value })} />
            </label>
            <p className="ae-copy">{BRIDGE_URL_REQUIREMENT}</p>
            <label className="field">
              <span>Retry backoff ({draft.retryBackoffMs} ms)</span>
              <input type="range" min="600" max="3000" step="100" value={draft.retryBackoffMs} onChange={(event) => setDraft({ ...draft, retryBackoffMs: Number(event.target.value) })} />
            </label>
            <label className="field">
              <span>Retry attempts ({draft.maxRetries})</span>
              <input type="range" min="0" max="5" step="1" value={draft.maxRetries} onChange={(event) => setDraft({ ...draft, maxRetries: Number(event.target.value) })} />
            </label>
          </Card>

          <Card accent="gold">
            <div className="ae-card__title">Storage</div>
            {state ? (
              <>
                <Progress value={state.storage.quotaBytes > 0 ? (state.storage.usedBytes / state.storage.quotaBytes) * 100 : 0} />
                <p className="ae-copy">{formatBytes(state.storage.usedBytes)} used of {formatBytes(state.storage.quotaBytes)} allocated storage.</p>
              </>
            ) : null}
            <div className="ae-inline-actions">
              <Button variant="primary" onClick={() => void save()}>Save Settings</Button>
              <Button variant="danger" onClick={() => void clearCaptures()}>Clear All Captures</Button>
            </div>
          </Card>
        </>
      ) : null}
    </Shell>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <OptionsApp />
  </React.StrictMode>
);
