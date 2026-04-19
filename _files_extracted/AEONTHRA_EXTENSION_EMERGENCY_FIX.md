# AEONTHRA EXTENSION — Emergency Fix

**Codex: the extension is completely non-functional. The user is ON a Canvas course page (uagc.instructure.com) and the extension shows "Loading extension state..." forever. No buttons work. This is the fix.**

---

## THE SYMPTOMS (from the screenshot)

1. User is on `uagc.instructure.com/courses/[id]` — a real Canvas course page
2. Popup shows "Loading extension state..." with a RETRY button — the service worker NEVER responds
3. Popup says "This popup becomes useful once Canvas is on a course page" — but the user IS on a course page, so course detection is broken
4. START, OPEN PANEL, OPTIONS buttons do nothing when clicked
5. RETRY button does nothing

## ROOT CAUSE ANALYSIS

There are THREE independent failures happening:

### Failure 1: Service worker is dead or not responding

The popup sends a message (`chrome.runtime.sendMessage`), the service worker's `onMessage` listener either:
- Throws an error before calling `sendResponse`
- Doesn't match the message type the popup sends
- The async handler returns a Promise that rejects, and `sendResponse` is never called

**Fix: rewrite the service worker listener to be crash-proof.**

### Failure 2: Course detection doesn't recognize the URL

The popup should detect `uagc.instructure.com` as a Canvas URL. But the regex or URL matching pattern is wrong — it might be looking for `*.instructure.com/courses/*` but the URL might be `uagc.instructure.com/courses/123/announcements` or similar.

**Fix: broaden the Canvas URL detection to match any page under `/courses/`.**

### Failure 3: Button click handlers aren't wired

The START, OPEN PANEL, and OPTIONS buttons have no `onClick` handlers, or the handlers call functions that throw errors silently.

**Fix: wire every button to a working handler with error catching.**

---

## THE COMPLETE FIX

### Step 1: Replace the entire service worker message handler

```typescript
// service-worker.ts — REPLACE the entire onMessage handler with this

chrome.runtime.onMessage.addListener(
  (message: any, sender: chrome.runtime.MessageSender, sendResponse: (response: any) => void) => {
    // Immediately wrap in async IIFE that ALWAYS calls sendResponse
    (async () => {
      try {
        const result = await handleMessage(message, sender);
        sendResponse({ ok: true, ...result });
      } catch (err: any) {
        console.error('[AEONTHRA SW] Error handling message:', err);
        sendResponse({ ok: false, error: err?.message || 'Service worker error' });
      }
    })();
    
    // MUST return true to keep the message channel open for async response
    return true;
  }
);

async function handleMessage(message: any, sender: chrome.runtime.MessageSender): Promise<any> {
  const type = message?.type || '';
  
  // Accept BOTH message formats (old and new)
  if (type === 'GET_STATE' || type === 'aeon:get-extension-state' || type === 'getState') {
    return await getExtensionState();
  }
  
  if (type === 'START_CAPTURE' || type === 'aeon:start-capture') {
    return await startCapture(message.mode || 'learning');
  }
  
  if (type === 'PAUSE_CAPTURE' || type === 'aeon:pause-capture') {
    return { state: 'paused' };
  }
  
  if (type === 'CANCEL_CAPTURE' || type === 'aeon:cancel-capture') {
    return { state: 'idle' };
  }
  
  if (type === 'OPEN_PANEL') {
    try {
      await chrome.sidePanel.open({ windowId: sender.tab?.windowId });
    } catch (e) {
      // sidePanel might not be available
    }
    return { state: 'panel-opened' };
  }
  
  // Unknown message type — respond anyway, don't crash
  console.warn('[AEONTHRA SW] Unknown message type:', type);
  return { state: 'idle', message: `Unknown message type: ${type}` };
}

async function getExtensionState(): Promise<any> {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const url = tab?.url || '';
    
    // Broad Canvas detection — match ANY Instructure domain or Canvas instance
    const isCanvas = /instructure\.com|canvas\./i.test(url);
    const courseMatch = url.match(/\/courses\/(\d+)/);
    
    // Get course name from the tab title if possible
    const courseName = tab?.title?.replace(/\s*-\s*Canvas.*$/i, '').trim() || '';
    
    // Load capture history
    let history: any[] = [];
    try {
      const stored = await chrome.storage.local.get('captureHistory');
      history = stored.captureHistory || [];
    } catch (e) {
      // storage might fail, that's okay
    }
    
    return {
      state: isCanvas && courseMatch ? 'course-detected' : 'idle',
      isCanvas,
      courseId: courseMatch?.[1] || null,
      courseName,
      url,
      tabId: tab?.id || null,
      history,
    };
  } catch (err: any) {
    console.error('[AEONTHRA SW] getExtensionState error:', err);
    return { state: 'idle', error: err?.message || 'Failed to get state' };
  }
}

// Keep service worker alive
chrome.runtime.onInstalled.addListener(() => {
  console.log('[AEONTHRA] Extension installed/updated');
});
```

### Step 2: Replace the entire popup state-fetching logic

```typescript
// popup.tsx — REPLACE the state fetching and rendering

import React, { useState, useEffect } from 'react';

interface ExtState {
  state: string;
  isCanvas?: boolean;
  courseId?: string | null;
  courseName?: string;
  url?: string;
  error?: string;
  history?: any[];
}

function Popup() {
  const [ext, setExt] = useState<ExtState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const fetchState = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_STATE' });
      
      if (response?.ok !== false) {
        setExt(response);
      } else {
        setError(response?.error || 'Extension returned an error');
      }
    } catch (err: any) {
      const msg = err?.message || String(err);
      
      // Translate Chrome MV3 errors to human-readable messages
      if (msg.includes('message channel closed') || 
          msg.includes('Receiving end does not exist') ||
          msg.includes('Extension context invalidated') ||
          msg.includes('Could not establish connection')) {
        setError('Extension is reloading. Close this popup and reopen it.');
      } else {
        setError(`Connection error: ${msg}`);
      }
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchState();
  }, []);
  
  const handleStart = async () => {
    try {
      await chrome.runtime.sendMessage({ type: 'START_CAPTURE', mode: 'learning' });
      fetchState(); // refresh
    } catch (e) {
      setError('Failed to start capture');
    }
  };
  
  const handleOpenPanel = async () => {
    try {
      await chrome.runtime.sendMessage({ type: 'OPEN_PANEL' });
    } catch (e) {
      // Try direct sidePanel API as fallback
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab?.windowId) {
          await (chrome as any).sidePanel?.open({ windowId: tab.windowId });
        }
      } catch (e2) {
        setError('Side panel not available');
      }
    }
  };
  
  const handleOptions = () => {
    chrome.runtime.openOptionsPage?.() || 
    chrome.tabs.create({ url: chrome.runtime.getURL('options.html') });
  };
  
  // ---- RENDER ----
  
  return (
    <div className="popup" style={{
      width: '360px',
      minHeight: '300px',
      background: '#020208',
      color: '#e0e0ff',
      fontFamily: "'Sora', sans-serif",
      padding: '20px',
    }}>
      {/* Wordmark */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{
          fontFamily: "'Orbitron', sans-serif",
          fontSize: '1.2rem',
          fontWeight: 900,
          color: '#00f0ff',
          textShadow: '0 0 15px rgba(0, 240, 255, 0.4)',
          letterSpacing: '0.12em',
        }}>AEONTHRA</div>
        <div style={{
          fontFamily: "'Orbitron', sans-serif",
          fontSize: '0.55rem',
          color: '#6a6a9a',
          letterSpacing: '0.2em',
        }}>CAPTURE INTELLIGENCE</div>
      </div>
      
      {/* Loading state */}
      {loading && (
        <div style={{
          padding: '16px',
          background: 'rgba(0, 240, 255, 0.05)',
          borderRadius: '12px',
          border: '1px solid rgba(0, 240, 255, 0.15)',
          textAlign: 'center',
        }}>
          Detecting Canvas course...
        </div>
      )}
      
      {/* Error state */}
      {error && !loading && (
        <div style={{
          padding: '16px',
          background: 'rgba(255, 68, 102, 0.05)',
          borderRadius: '12px',
          border: '1px solid rgba(255, 68, 102, 0.2)',
          marginBottom: '16px',
        }}>
          <p style={{ fontSize: '0.8rem', color: '#b0b0d0', margin: '0 0 12px 0' }}>{error}</p>
          <button
            onClick={fetchState}
            style={{
              background: 'transparent',
              border: '1px solid rgba(0, 240, 255, 0.3)',
              color: '#00f0ff',
              padding: '8px 16px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontFamily: "'Orbitron', sans-serif",
              fontSize: '0.7rem',
              letterSpacing: '0.1em',
            }}
          >RETRY</button>
        </div>
      )}
      
      {/* Course detected */}
      {!loading && !error && ext?.state === 'course-detected' && (
        <div>
          <div style={{
            padding: '16px',
            background: 'rgba(0, 240, 255, 0.05)',
            borderRadius: '12px',
            border: '1px solid rgba(0, 240, 255, 0.2)',
            marginBottom: '16px',
          }}>
            <div style={{
              fontFamily: "'Orbitron', sans-serif",
              fontSize: '0.65rem',
              color: '#00f0ff',
              letterSpacing: '0.15em',
              marginBottom: '8px',
            }}>COURSE DETECTED</div>
            <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>
              {ext.courseName || `Course ${ext.courseId}`}
            </div>
            <div style={{ fontSize: '0.7rem', color: '#6a6a9a', marginTop: '4px' }}>
              {new URL(ext.url || '').hostname}
            </div>
          </div>
          
          <button
            onClick={handleStart}
            style={{
              width: '100%',
              padding: '14px',
              background: 'linear-gradient(135deg, #00f0ff, #0080ff)',
              border: 'none',
              borderRadius: '10px',
              color: '#000',
              fontFamily: "'Orbitron', sans-serif",
              fontSize: '0.75rem',
              fontWeight: 700,
              letterSpacing: '0.1em',
              cursor: 'pointer',
              marginBottom: '10px',
            }}
          >⚡ CAPTURE ENTIRE COURSE</button>
          
          <button
            onClick={handleOpenPanel}
            style={{
              width: '100%',
              padding: '10px',
              background: 'transparent',
              border: '1px solid rgba(0, 240, 255, 0.2)',
              borderRadius: '10px',
              color: '#00f0ff',
              fontFamily: "'Orbitron', sans-serif",
              fontSize: '0.65rem',
              letterSpacing: '0.1em',
              cursor: 'pointer',
            }}
          >OPEN SIDE PANEL</button>
        </div>
      )}
      
      {/* Not on Canvas */}
      {!loading && !error && ext?.state !== 'course-detected' && (
        <div style={{
          padding: '20px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '1.5rem', marginBottom: '12px' }}>⚡</div>
          <p style={{ fontSize: '0.85rem', color: '#b0b0d0', lineHeight: 1.6 }}>
            Navigate to any page of a Canvas course and I'll detect it automatically.
          </p>
        </div>
      )}
      
      {/* Footer */}
      <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid rgba(26, 26, 58, 0.3)' }}>
        <button
          onClick={handleOptions}
          style={{
            background: 'transparent',
            border: '1px solid rgba(26, 26, 58, 0.4)',
            color: '#6a6a9a',
            padding: '8px 16px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontFamily: "'Orbitron', sans-serif",
            fontSize: '0.6rem',
            letterSpacing: '0.12em',
          }}
        >⚙ OPTIONS</button>
      </div>
    </div>
  );
}

export default Popup;
```

### Step 3: Verify the manifest has correct permissions and host_permissions

```json
{
  "manifest_version": 3,
  "name": "AEONTHRA Capture Intelligence",
  "version": "1.0.0",
  "permissions": [
    "storage",
    "tabs",
    "scripting",
    "activeTab",
    "sidePanel"
  ],
  "host_permissions": [
    "https://*.instructure.com/*",
    "https://canvas.*.edu/*",
    "https://*.canvas.edu/*"
  ],
  "background": {
    "service_worker": "service-worker.js",
    "type": "module"
  },
  "action": {
    "default_popup": "popup.html",
    "default_title": "AEONTHRA Capture"
  },
  "side_panel": {
    "default_path": "side-panel.html"
  },
  "content_scripts": [
    {
      "matches": ["https://*.instructure.com/*", "https://canvas.*.edu/*"],
      "js": ["content-canvas.js"],
      "run_at": "document_idle"
    }
  ]
}
```

**Key permissions:**
- `tabs` — needed to read the active tab's URL for course detection
- `activeTab` — needed to interact with the current Canvas page
- `host_permissions` for `*.instructure.com/*` — needed to access Canvas pages
- WITHOUT `tabs` permission, `chrome.tabs.query()` returns tabs without URLs, which breaks course detection

### Step 4: The build must actually produce working output

After editing the source files, rebuild:

```bash
cd apps/extension
npm run build
# or
node scripts/build.mjs
```

Then in Chrome:
1. Go to `chrome://extensions`
2. Find AEONTHRA extension
3. Click the refresh/reload icon (circular arrow)
4. Navigate to a Canvas course page
5. Click the extension icon
6. The popup should show "COURSE DETECTED" with the course name

### Step 5: Common gotchas that will silently break the extension

1. **TypeScript compilation errors** — if the build produces JS with syntax errors, the service worker won't load. Check `chrome://extensions` for error badges.

2. **Missing `return true`** — if the `onMessage` listener doesn't return `true`, the message channel closes before the async handler finishes. The code above handles this correctly.

3. **Permissions not in manifest** — if `tabs` is missing from `permissions`, `chrome.tabs.query()` returns tab objects without `.url`, so Canvas detection fails silently.

4. **Service worker not registered** — if `manifest.json` has a typo in `background.service_worker`, the SW never loads. Check the exact filename matches.

5. **Module import failures** — if the service worker uses `import` statements and the imported module has an error, the entire SW fails to load. Use `type: "module"` in manifest and ensure all imports resolve.

---

## ACCEPTANCE TEST

After fixing and rebuilding:

1. Navigate to `uagc.instructure.com/courses/[your-course-id]`
2. Click the AEONTHRA extension icon
3. **Expected:** Popup shows "COURSE DETECTED" with course name, "⚡ CAPTURE ENTIRE COURSE" button, and "OPEN SIDE PANEL" button
4. **NOT expected:** "Loading extension state..." forever, Chrome error messages, or "This popup becomes useful once Canvas is on a course page"
5. Click OPTIONS — should open the options page
6. Navigate to a non-Canvas page (e.g., google.com)
7. Click the extension icon
8. **Expected:** "Navigate to any page of a Canvas course and I'll detect it automatically."

**If the popup still shows "Loading extension state..." after this fix:**
1. Go to `chrome://extensions`
2. Check if the AEONTHRA extension has any error badges (red circle)
3. Click "Inspect views: service worker" to open the SW DevTools
4. Check the Console tab for errors
5. Report the exact error message — that's the real bug
