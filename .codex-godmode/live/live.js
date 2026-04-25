const statusEl = document.querySelector('#status');
const summary = document.querySelector('#summary');
const changed = document.querySelector('#changed');
const failed = document.querySelector('#failed');
const next = document.querySelector('#next');
const proofs = document.querySelector('#proofs');
const commentPanel = document.querySelector('#commentPanel');
const commentText = document.querySelector('#commentText');
const commentList = document.querySelector('#commentList');
const commentStatus = document.querySelector('#commentStatus');

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (match) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[match]);
}

function list(el, items, empty) {
  const source = Array.isArray(items) && items.length ? items : [empty];
  el.innerHTML = source.map((item) => `<li>${esc(item)}</li>`).join('');
}

function setCommentStatus(message, kind = '') {
  commentStatus.className = `comment-status ${kind}`.trim();
  commentStatus.textContent = message;
}

function renderFeedback(events) {
  if (!Array.isArray(events) || events.length === 0) {
    commentList.innerHTML = '<li>No persisted feedback yet.</li>';
    return;
  }

  commentList.innerHTML = events
    .slice()
    .reverse()
    .map((event) => {
      const created = event.created_at ? new Date(event.created_at).toLocaleString() : 'unknown time';
      const target = event.target || 'live-result-viewer';
      return `<li><strong>${esc(created)}</strong> <span>${esc(target)}</span><br>${esc(event.text)}</li>`;
    })
    .join('');
}

async function loadFeedback() {
  try {
    const response = await fetch('/api/visual-feedback', { cache: 'no-store' });
    if (!response.ok) throw new Error(`feedback ${response.status}`);
    const payload = await response.json();
    renderFeedback(payload.events);
  } catch (err) {
    commentList.innerHTML = `<li>Feedback replay degraded: ${esc(err.message)}</li>`;
  }
}

async function load() {
  try {
    const response = await fetch('/result-state.json', { cache: 'no-store' });
    if (!response.ok) throw new Error(`state ${response.status}`);
    const state = await response.json();
    statusEl.className = 'badge ok';
    statusEl.textContent = `${state.status || 'unknown'} · ${new Date(state.updated_at).toLocaleTimeString()}`;
    summary.innerHTML = [
      `<dt>Browser status</dt><dd>${esc(state.browser_status)}</dd>`,
      `<dt>Live URL</dt><dd>${esc(state.live_url || location.href)}</dd>`,
      `<dt>Arena URL</dt><dd>${esc(state.arena_url || 'not started')}</dd>`,
      `<dt>Console errors</dt><dd>${esc(state.console_error_count)}</dd>`,
      `<dt>Comment Mode</dt><dd>${esc(state.comment_mode || 'not configured')}</dd>`
    ].join('');
    list(changed, state.what_changed, 'Empty state: no changes projected yet.');
    list(failed, state.what_still_failed, 'Success state: no current failures listed.');
    next.textContent = state.next_repair_action || 'No next action recorded.';
    proofs.textContent = JSON.stringify({
      latest_proof_bundle: state.latest_proof_bundle,
      validation_logs: state.validation_logs,
      proof_bundles: state.proof_bundles,
      screenshots: state.screenshots
    }, null, 2);
  } catch (err) {
    statusEl.className = 'badge error';
    statusEl.textContent = `Live viewer degraded: ${err.message}`;
  }
}

document.querySelector('#toggleComments').onclick = async () => {
  commentPanel.hidden = !commentPanel.hidden;
  if (!commentPanel.hidden) await loadFeedback();
};

document.querySelector('#saveComment').onclick = async () => {
  const text = commentText.value.trim();
  if (!text) {
    setCommentStatus('Write a note before saving.', 'bad');
    return;
  }

  setCommentStatus('Saving…');
  try {
    const response = await fetch('/api/visual-feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        target: 'live-result-viewer',
        page_url: location.href,
        text
      })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.ok === false) {
      throw new Error(payload.error || `feedback ${response.status}`);
    }
    commentText.value = '';
    setCommentStatus('Saved to visual-feedback-events.jsonl.', 'ok');
    await loadFeedback();
  } catch (err) {
    setCommentStatus(`Save failed: ${err.message}`, 'bad');
  }
};

loadFeedback();
load();
setInterval(load, 2000);
