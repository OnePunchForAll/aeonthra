# Importability Decision Table

Importability is decided in two layers:

1. A queue item must yield a retained `CaptureItem`.
2. The final bundle must pass `inspectCanvasCourseKnowledgePack()`.

The final bundle classifier is bundle-level, not page-type-specific. The page category only determines how likely a page is to produce a retained `CaptureItem`.

| Page type | Current capture rule | Importable | Why | Evidence required | Expected source fields | Edge cases | Test coverage status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `assignment` | `html-fetch` against assignment URL, retain only if cleaned text survives assignment threshold | Conditional yes | Assignment pages are supported, but they still drop out if Canvas chrome dominates and importable text falls below threshold | `itemVerdicts[]`, `lastPersistedCanonicalUrl`, final inspection trace | `html_url` or `/assignments/:id`, course host, course id | mixed-host `html_url`, thin prompt pages, iframe-heavy assignment bodies | Covered by worker router regression and origin normalization regression |
| `discussion` | `html-fetch` against discussion topic URL, retain only if prompt/body survives discussion threshold | Conditional yes | Discussion support is intentional, not filtered out, but prompt-light or reply-heavy discussions can still collapse to no retained text | `itemVerdicts[]` with per-page skip reason | `html_url` or `/discussion_topics/:id`, course host, course id | prompt-only vs reply-only pages, Canvas reply chrome dominating retained text | Covered by verdict instrumentation; no authenticated live fixture yet |
| `page` | `html-fetch` against Canvas page URL, retain only if cleaned page body survives page threshold | Conditional yes | Pages are supported, but div-heavy or iframe-heavy course pages can still clean down below threshold | `itemVerdicts[]`, raw page URL, final inspection trace | `html_url` or `/pages/:slug`, course host, course id | front-matter pages, embedded tools, sparse body text | Covered by origin normalization regression; no DOM-heavy live fixture yet |
| `quiz` | `html-fetch` against quiz URL, retain only if cleaned quiz content survives quiz threshold | Conditional yes | Quiz shells are supported, but thin instructions or blocked quiz content can still drop out | `itemVerdicts[]`, warning list | `html_url` or `/quizzes/:id`, course host, course id | locked quizzes, JS-rendered quiz bodies, sparse instructions | Covered by verdict instrumentation; no locked-quiz fixture yet |
| `module` | `api-only` summary built from module metadata and first 40 module items | Conditional yes | Modules do not fetch HTML; they import only if API metadata yields at least 30 meaningful characters | `itemVerdicts[]`, module metadata | module id/name, module items, unlock time | multiple modules once collapsed to same hash URL before this pass; module metadata can still be too thin | Covered by metadata repair; no dedicated regression fixture yet |
| `file` | `api-only` summary built from file metadata | Conditional yes | Files import as metadata summaries only; they do not extract the file body | `itemVerdicts[]`, file metadata | `html_url` preferred, file id, name, content-type, size | file metadata too thin, `url` vs `html_url` host drift | Covered by metadata repair; no dedicated regression fixture yet |
| `announcement` | `api-only` summary built from announcement title and message | Conditional yes | Announcements import only if title/message survives cleanup and length threshold | `itemVerdicts[]`, announcement metadata | `html_url` or generated `/announcements/:id`, title, message | multiple announcements previously collapsed onto one fallback URL; thin announcements still skip | Covered by metadata repair; no dedicated regression fixture yet |
| `syllabus` | `api-only` summary built from `syllabus_body` | Conditional yes | Syllabus is treated as a course page summary and kept only if meaningful text survives cleanup | `itemVerdicts[]`, course info metadata | `syllabus_body`, course URL, course id | empty syllabus body, syllabus body dominated by embeds | Covered indirectly by bundle classifier regressions |
| Unsupported/non-course/admin pages | No queue item or no retained item | No | Only discovered queue items above participate in importability | `warnings[]`, missing verdicts, discovery counts | valid Canvas course context | external tools, gradebook, inbox, JS-only admin pages | Not directly fixture-covered |

## Bundle-level rejection rules

These rules apply after page-level retention:

| Rejection code | Meaning | Practical effect |
| --- | --- | --- |
| `empty-bundle` | zero retained items | surfaces as `No Importable Pages Captured` |
| `textbook-only` | retained items are not Canvas course items | rejected from queue/import |
| `missing-course-id` | capture metadata lacks course id | rejected from queue/import |
| `missing-source-host` | capture metadata lacks source host | rejected from queue/import |
| `missing-course-url` | no retained URL resolves back to one course | rejected from queue/import |
| `ambiguous-course-identity` | retained URLs resolve to more than one host/course identity | surfaces as `Capture Identity Rejected` |
| `host-mismatch` | retained URLs do not match `captureMeta.sourceHost` | surfaces as `Capture Identity Rejected` |
| `course-identity-mismatch` | retained URLs do not match `captureMeta.courseId` | surfaces as `Capture Identity Rejected` |

## Current truth

- Discussion/forum pages are intentionally supported.
- `No Importable Pages Captured` now specifically means the final retained bundle was empty.
- The side panel now exposes per-page verdicts so future live failures can be tied to exact page URLs and rejection reasons instead of bundle-level guesswork.
