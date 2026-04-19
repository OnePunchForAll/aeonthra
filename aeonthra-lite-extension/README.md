# Aeonthra Lite · Canvas Capture

A Manifest V3 Chrome extension that captures the **real authored content** of Canvas LMS pages — pages, assignments, discussions, syllabus, quizzes, modules — and exports a JSON bundle that loads cleanly into [Aeonthra Lite](../aeonthra-lite/) via **Ingest → Extension JSON**.

Built because the default extension capture was only grabbing headings and page chrome (~200 chars per page). This one uses Canvas-specific DOM selectors (`.user_content`, `#wiki_page_show`, `.discussion-section .message_wrapper`, etc.) so each capture is the full multi-thousand-character authored body — including rubric text, Prepare/Reflect sections, SWOT blocks, and anything else the instructor actually wrote.

## Install

1. Clone or download this repo.
2. Open `chrome://extensions` in Chrome (or Edge / Brave / any Chromium browser).
3. Toggle **Developer mode** on (top-right).
4. Click **Load unpacked** and select the `aeonthra-lite-extension/` folder.
5. Pin the extension for one-click access.

No build step. No bundler. Pure ES modules.

## Use

### Capture one page
1. Navigate to any page under `*.instructure.com`.
2. Click the extension icon → **Capture this page**.
3. The popup shows what was captured + character count.

### Capture an entire course
1. Navigate to the course's **Modules** page (`/courses/<id>/modules`).
2. Click the extension icon → **Sweep entire course**.
3. The extension fetches every linked page/assignment/discussion in turn (using your Canvas session cookie, rate-limited to ~5/sec) and adds each to the queue.

### Export
1. Click **Download as .json** — you'll get `aeonthra-canvas-<timestamp>.json`.
2. In Aeonthra Lite (`localhost:5180` or wherever you host it), go to **Ingest → Extension JSON** and pick the file.
3. Each captured item becomes a first-class `canvas`-kind source with full text, headings, URL, and capture timestamp.

## What gets captured, per surface

| Canvas surface | Primary selector | What you get |
|---|---|---|
| Page (`/pages/:slug`) | `#wiki_page_show .user_content` | Full authored body + all H1–H5 headings |
| Assignment (`/assignments/:id`) | `.description.user_content` | Prompt body + due-at + points + rubric |
| Submission (`/submissions/:id`) | `.description.user_content` + meta | Same as assignment (prompt survives in submission view) |
| Discussion (`/discussion_topics/:id`) | `.discussion-section .message_wrapper .user_content` | Top-level prompt + any inline instructor replies |
| Syllabus (`/assignments/syllabus`) | `#course_syllabus` | Full syllabus body |
| Quiz (`/quizzes/:id`) | `#quiz_description .user_content` | Quiz description (question bodies stay Canvas-side) |
| Announcement | `.discussion-section .message_wrapper .user_content` | Announcement body |
| Modules index | `#context_modules` | Module titles + links (use Sweep to get their contents) |
| Course home | `#course_home_content .user_content` | Home-page authored content |

## Output schema (matches Aeonthra Lite's `sourceFromJson` CaptureBundle)

```json
{
  "schemaVersion": "0.3.0",
  "source": "extension-capture",
  "title": "Canvas Capture",
  "exportedAt": "2026-04-18T21:10:34.552Z",
  "items": [
    {
      "title": "Week 1 - Discussion Forum",
      "canonicalUrl": "https://uagc.instructure.com/courses/154971/assignments/2992529",
      "plainText": "Your initial discussion thread is due on Day 3 (Thursday)… Understanding Yourself [WLOs: 1, 3, 4] [CLOs: 2, 3] This discussion is based on the Personal SWOT Analysis…",
      "headingTrail": ["GEN101", "Week 1 - Discussion Forum"],
      "tags": ["canvas", "kind:assignment", "course:154971"],
      "kind": "canvas",
      "capturedAt": "2026-04-18T21:08:42.117Z"
    }
  ]
}
```

## Privacy

- **No network calls leave your browser** except to the Canvas host you're already logged into.
- All capture + queue state lives in `chrome.storage.local`, scoped to this extension.
- Nothing is uploaded. The export is a local file download, nothing more.
- Host permissions are narrow: `*://*.instructure.com/*`. The extension cannot read any other site.

## Troubleshooting

**"Not a Canvas page"** — The extension only runs on `*.instructure.com` URLs. If your institution uses a white-label domain, edit `manifest.json` to add it to both `host_permissions` and `content_scripts.matches`.

**Sweep button is disabled** — You need to be on a `/courses/<id>/modules` page. That's where the extension reads the item list.

**Capture returns very little text** — Canvas sometimes lazy-loads content for Pages on scroll. Scroll to the bottom first, then capture. For Assignments this is usually not an issue — the description is in the initial HTML.

**Discussion capture misses student replies** — By design. Student replies are a privacy surface and usually not what you need for study. The extension captures the instructor prompt only.

## License & status

Local-first, single-purpose, no telemetry. Pair it with Aeonthra Lite for a fully offline Canvas → deterministic concept engine → study workspace pipeline.
