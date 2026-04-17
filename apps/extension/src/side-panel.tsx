import React, { useEffect, useMemo, useState } from "react";
import ReactDOM from "react-dom/client";
import { Button, Card, ModeCard, Progress, Shell, Stat, formatBytes, formatRuntime, sendExtensionMessage, useExtensionState } from "./ui/shared";
import "./styles/global.css";

function formatDateTime(value: string): string {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
}

function shortHash(value: string, size = 12): string {
  return value.length <= size ? value : value.slice(0, size);
}

function SidePanelApp() {
  const { state, statusText, setStatusText } = useExtensionState();
  const [selectedMode, setSelectedMode] = useState<"complete" | "learning">("learning");

  useEffect(() => {
    if (state?.settings.defaultMode) {
      setSelectedMode(state.settings.defaultMode);
    }
  }, [state?.settings.defaultMode]);

  const activeCourse = state?.runtime.course ?? state?.activeCourse ?? null;
  const activeSession = state?.session ?? null;
  const isBusy = state ? ["starting", "discovering", "capturing", "paused"].includes(state.runtime.status) : false;
  const latestCapture = useMemo(() => state?.history[0] ?? null, [state]);
  const forensicRejections = useMemo(
    () => (state?.forensics?.itemVerdicts ?? [])
      .filter((verdict) => verdict.status !== "captured")
      .slice(-6)
      .reverse(),
    [state?.forensics?.itemVerdicts]
  );
  const finalInspection = state?.forensics?.finalInspection ?? null;
  const distinctIdentities = finalInspection?.distinctIdentities ?? [];

  const startCapture = async () => {
    const response = await sendExtensionMessage<{ ok: boolean; message?: string }>({
      type: "aeon:start-capture",
      mode: selectedMode
    });
    setStatusText(response.ok ? "Capture launched in the background. You can leave this panel open or come back later." : (response.message ?? "Unable to start capture."));
  };

  const pauseCapture = async () => {
    const response = await sendExtensionMessage<{ ok: boolean; message?: string }>({ type: "aeon:pause-capture" });
    setStatusText(response.ok ? "Capture paused." : (response.message ?? "Unable to pause capture."));
  };

  const resumeCapture = async () => {
    const response = await sendExtensionMessage<{ ok: boolean; message?: string }>({ type: "aeon:resume-capture" });
    setStatusText(response.ok ? "Capture resumed." : (response.message ?? "Unable to resume capture."));
  };

  const cancelCapture = async () => {
    const response = await sendExtensionMessage<{ ok: boolean; message?: string }>({ type: "aeon:cancel-capture" });
    setStatusText(response.ok ? "Capture cancelled. Partial work stays in local history." : (response.message ?? "Unable to cancel capture."));
  };

  const openClassroom = async (captureId?: string) => {
    const response = await sendExtensionMessage<{ ok: boolean; bridgeReady?: boolean; message?: string }>({
      type: "aeon:open-classroom",
      captureId: captureId ?? null
    });
    setStatusText(
      response.ok
        ? response.bridgeReady
          ? "AEONTHRA Classroom opened and import was requested. The queued bundle should load automatically."
          : "AEONTHRA Classroom opened and the bundle was queued for import."
        : (response.message ?? "Unable to open AEONTHRA Classroom.")
    );
  };

  const openWorkspace = async () => {
    const response = await sendExtensionMessage<{ ok: boolean; message?: string }>({
      type: "aeon:open-workspace"
    });
    setStatusText(response.ok ? "AEONTHRA Classroom opened without importing a capture." : (response.message ?? "Unable to open AEONTHRA Classroom."));
  };

  const downloadLatest = async (captureId?: string) => {
    const response = await sendExtensionMessage<{ ok: boolean; message?: string }>({
      type: "aeon:download-capture",
      captureId: captureId ?? null
    });
    setStatusText(response.ok ? "JSON export started." : (response.message ?? "Export failed."));
  };

  const deleteCapture = async (captureId: string) => {
    await sendExtensionMessage({ type: "aeon:delete-capture", captureId });
    setStatusText("Capture removed from local history.");
  };

  const saveSessionCapture = async () => {
    const response = await sendExtensionMessage<{ ok: boolean; title?: string; itemCount?: number; message?: string }>({
      type: "aeon:save-session-capture",
      origin: activeSession?.origin ?? activeCourse?.origin ?? null,
      courseId: activeSession?.courseId ?? activeCourse?.courseId ?? null
    });
    setStatusText(
      response.ok
        ? `${response.title ?? "Visited session"} saved with ${response.itemCount ?? 0} visited pages.`
        : (response.message ?? "Unable to save the visited session.")
    );
  };

  const clearSessionCapture = async () => {
    const response = await sendExtensionMessage<{ ok: boolean; message?: string }>({
      type: "aeon:clear-session",
      origin: activeSession?.origin ?? activeCourse?.origin ?? null,
      courseId: activeSession?.courseId ?? activeCourse?.courseId ?? null
    });
    setStatusText(response.ok ? "Visited session cleared." : (response.message ?? "Unable to clear the visited session."));
  };

  return (
    <Shell
      title={isBusy ? "AUTO CAPTURE RUNNING" : "COURSE BRIDGE"}
      subtitle={activeCourse ? `Canvas course detected: ${activeCourse.courseName}` : "Open a Canvas course, then let AEONTHRA capture supported course surfaces truthfully."}
      footer={
        <div className="ae-footer-actions">
          <Button variant="ghost" onClick={() => void sendExtensionMessage({ type: "aeon:open-side-panel" })}>Refresh Panel</Button>
          <Button variant="ghost" onClick={() => void chrome.runtime.openOptionsPage()}>Settings</Button>
        </div>
      }
    >
      {statusText ? <div className="ae-status">{statusText}</div> : null}

      {state ? (
        <Card accent={isBusy ? "teal" : "cyan"}>
          <div className="ae-card__title">{isBusy ? state.runtime.phaseLabel : activeCourse ? "Capture Supported Course Content" : "Waiting for Canvas"}</div>
          <p className="ae-copy">
            {isBusy
              ? state.runtime.currentTitle || "Walking the course in the background."
              : activeCourse
                ? "AEONTHRA can capture supported course surfaces or strip them down to forge-ready learning content."
                : "Open any Canvas course page first. The extension only runs where it can truthfully detect a course."}
          </p>

          {isBusy ? (
            <>
              <Progress value={state.runtime.progressPct} />
              <div className="ae-stats-grid">
                <Stat label="Progress" value={`${Math.round(state.runtime.progressPct)}%`} />
                <Stat label="Captured" value={`${state.runtime.completedCount}/${state.runtime.totalQueued || "?"}`} />
                <Stat label="Warnings" value={state.runtime.warningCount} />
                <Stat label="Failures" value={state.runtime.failedCount} />
              </div>
              <div className="ae-inline-actions">
                {state.runtime.status === "paused"
                  ? <Button variant="teal" onClick={() => void resumeCapture()}>Resume</Button>
                  : <Button variant="ghost" onClick={() => void pauseCapture()}>Pause</Button>}
                <Button variant="danger" onClick={() => void cancelCapture()}>Cancel</Button>
              </div>
            </>
          ) : activeCourse ? (
            <>
              <div className="mode-grid">
                <ModeCard mode="learning" selected={selectedMode === "learning"} onSelect={setSelectedMode} />
                <ModeCard mode="complete" selected={selectedMode === "complete"} onSelect={setSelectedMode} />
              </div>
              <div className="ae-inline-actions">
                <Button variant="primary" onClick={() => void startCapture()}>Capture Supported Content</Button>
                <Button variant="ghost" onClick={() => void openWorkspace()}>Open AEONTHRA Only</Button>
              </div>
            </>
          ) : null}
        </Card>
      ) : null}

      {state?.runtime.discovered ? (
        <Card accent="purple">
          <div className="ae-card__title">Discovery Snapshot</div>
          <div className="ae-stats-grid">
            <Stat label="Assignments" value={state.runtime.discovered.assignments} />
            <Stat label="Discussions" value={state.runtime.discovered.discussions} />
            <Stat label="Pages" value={state.runtime.discovered.pages} />
            <Stat label="Quizzes" value={state.runtime.discovered.quizzes} />
            <Stat label="Files" value={state.runtime.discovered.files} />
            <Stat label="Total" value={state.runtime.discovered.total} />
          </div>
        </Card>
      ) : null}

      {state ? (
        <Card accent={state.build ? "teal" : "orange"}>
          <div className="ae-card__title">Build Identity</div>
          {state.build ? (
            <>
              <div className="ae-stats-grid">
                <Stat label="Version" value={state.build.version} />
                <Stat label="Built" value={formatDateTime(state.build.builtAt)} />
                <Stat label="Source Hash" value={shortHash(state.build.sourceHash)} />
                <Stat label="Marker" value={state.build.markerPath} />
              </div>
              <p className="ae-copy">
                Canonical unpacked folder: <code>{state.build.unpackedPath}</code>.
                If this build stamp does not change after <code>npm run build:extension</code> and a Chrome reload,
                Chrome is not using the current dist output.
              </p>
            </>
          ) : (
            <p className="ae-copy">
              The loaded extension could not read <code>build-info.json</code>. Chrome may be loading the wrong unpacked folder or a stale build outside <code>apps/extension/dist</code>.
            </p>
          )}
        </Card>
      ) : null}

      {state?.forensics ? (
        <Card accent={finalInspection?.code ? "orange" : "cyan"}>
          <div className="ae-card__title">Live Capture Forensics</div>
          <div className="ae-stats-grid">
            <Stat label="Queue" value={state.forensics.queueTotal} />
            <Stat
              label="Captured"
              value={state.forensics.itemVerdicts.filter((verdict) => verdict.status === "captured").length}
            />
            <Stat
              label="Skipped"
              value={state.forensics.itemVerdicts.filter((verdict) => verdict.status === "skipped").length}
            />
            <Stat
              label="Failed"
              value={state.forensics.itemVerdicts.filter((verdict) => verdict.status === "failed").length}
            />
          </div>
          {finalInspection ? (
            <>
              <p className="ae-copy" style={{ marginTop: 14 }}>
                Final inspection: {finalInspection.code ?? "importable"}.
              </p>
              <p className="ae-copy">
                Expected identity: {finalInspection.expectedSourceHost || "unknown-host"} / {finalInspection.expectedCourseId || "unknown-course"}.
              </p>
              {distinctIdentities.length > 0 ? (
                <p className="ae-copy">
                  Seen identities: {distinctIdentities.map((identity) => `${identity.sourceHost}/${identity.courseId}`).join(", ")}.
                </p>
              ) : null}
            </>
          ) : (
            <p className="ae-copy" style={{ marginTop: 14 }}>
              Final inspection has not been recorded yet for this run.
            </p>
          )}
          {state.forensics.finalErrorMessage ? (
            <p className="ae-copy" style={{ marginTop: 14 }}>
              {state.forensics.finalErrorMessage}
            </p>
          ) : null}
          {state.forensics.lastPersistedCanonicalUrl ? (
            <p className="ae-copy">
              Last persisted item: <code>{state.forensics.lastPersistedCanonicalUrl}</code>
            </p>
          ) : null}
          {forensicRejections.length > 0 ? (
            <div className="history-list" style={{ marginTop: 12 }}>
              {forensicRejections.map((verdict) => (
                <div key={`${verdict.queueItemId}:${verdict.status}`} className="history-item">
                  <div>
                    <div className="history-item__title">{verdict.title}</div>
                    <div className="history-item__meta">
                      {verdict.type} | {verdict.status} | {verdict.url}
                    </div>
                  </div>
                  <div className="ae-copy" style={{ maxWidth: 340, margin: 0 }}>
                    {verdict.message ?? "No detailed rejection reason was recorded."}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </Card>
      ) : null}

      {activeCourse ? (
        <Card accent="purple">
          <div className="ae-card__title">Visited Session</div>
          <p className="ae-copy">
            {activeSession
              ? "AEONTHRA is accumulating the Canvas pages you actually visited in this course. Session capture pauses while a full-course run is active."
              : "As you browse this course, AEONTHRA can accumulate visited pages locally and save them later as a lightweight learning capture."}
          </p>
          {activeSession ? (
            <>
              <div className="ae-stats-grid">
                <Stat label="Visited" value={activeSession.itemCount} />
                <Stat label="Resources" value={activeSession.resourceCount} />
                <Stat label="Warnings" value={activeSession.warningCount} />
                <Stat label="Updated" value={new Date(activeSession.lastSeenAt).toLocaleTimeString()} />
              </div>
              <p className="ae-copy">Latest page: {activeSession.latestItemTitle}</p>
              <div className="ae-inline-actions">
                <Button variant="teal" onClick={() => void saveSessionCapture()} disabled={isBusy}>Save Session Capture</Button>
                <Button variant="ghost" onClick={() => void clearSessionCapture()} disabled={isBusy}>Clear Session</Button>
              </div>
            </>
          ) : null}
        </Card>
      ) : null}

      {latestCapture ? (
        <Card accent="gold">
          <div className="ae-card__title">Latest Capture</div>
          <p className="ae-copy">{latestCapture.title}</p>
          <div className="ae-stats-grid">
            <Stat label="Mode" value={latestCapture.mode} />
            <Stat label="Items" value={latestCapture.capturedItems} />
            <Stat label="Failures" value={latestCapture.failedItems} />
            <Stat label="Size" value={formatBytes(latestCapture.sizeBytes)} />
          </div>
          <div className="ae-inline-actions">
            <Button variant="primary" onClick={() => void openClassroom(latestCapture.id)}>Open + Import</Button>
            <Button variant="ghost" onClick={() => void downloadLatest(latestCapture.id)}>Download JSON</Button>
          </div>
        </Card>
      ) : null}

      <Card accent="orange">
        <div className="ae-card__title">Capture History</div>
        {state?.history.length ? (
          <div className="history-list">
            {state.history.map((entry) => (
              <div key={entry.id} className="history-item">
                <div>
                  <div className="history-item__title">{entry.title}</div>
                  <div className="history-item__meta">
                    {entry.mode} | {entry.capturedItems} captured | {formatBytes(entry.sizeBytes)}
                  </div>
                </div>
                <div className="history-item__actions">
                  <Button variant="ghost" onClick={() => void openClassroom(entry.id)}>Open + Import</Button>
                  <Button variant="ghost" onClick={() => void downloadLatest(entry.id)}>Export</Button>
                  <Button variant="danger" onClick={() => void deleteCapture(entry.id)}>Delete</Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="ae-copy">No saved captures yet. Run a full-course capture or save a visited session and it will appear here automatically.</p>
        )}
      </Card>

      {state ? (
        <Card accent="teal">
          <div className="ae-card__title">Storage</div>
          <Progress value={state.storage.quotaBytes > 0 ? (state.storage.usedBytes / state.storage.quotaBytes) * 100 : 0} />
          <div className="ae-copy">{formatBytes(state.storage.usedBytes)} used of {formatBytes(state.storage.quotaBytes)} local AEONTHRA storage.</div>
        </Card>
      ) : null}

      {state ? (
        <Card accent="cyan">
          <div className="ae-card__title">Status</div>
          <p className="ae-copy">{formatRuntime(state.runtime)}</p>
        </Card>
      ) : null}
    </Shell>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <SidePanelApp />
  </React.StrictMode>
);
