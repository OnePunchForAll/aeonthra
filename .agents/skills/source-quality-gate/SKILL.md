# source-quality-gate

Classifies a CaptureBundle before synthesis to prevent admin/orientation/thin
content from silently producing high-confidence learning artifacts.

## Classification rules

### Admin/orientation bundle
- adminSignalScore > academicSignalScore × 1.5 AND adminSignalScore ≥ 30
- Triggers when majority of items contain: "welcome to", "start here", "orientation",
  "introduce yourself", "course policies", "support services", navigation text

### Structurally repetitive bundle
- 3+ clone families (items with identical 80-char fingerprint)
- OR dominant boilerplate phrase appears in ≥ 40% of items
- Clone families: group items by `${title} ${body}`.slice(0,80).normalize()

### Chrome-heavy bundle
- ≥ 50% of items contain Canvas metadata (points, submission type, attempt limits)
  but little actual academic content

### Thin bundle
- avgCharsPerItem < 60 AND no textbook present

## Synthesis modes

| Mode | Meaning | Required action |
|------|---------|-----------------|
| `full` | Proceed normally | None |
| `degraded` | Thin/admin/repetitive source | Show qualityBanner in Home view; suppress certainty language |
| `blocked-with-warning` | Totally unusable (all chrome, 0 items) | Show explanation, do not synthesize |

## Degraded mode behavior

- Continue synthesis — do NOT hard-crash
- Surface qualityBanner string (orange) at top of Home view
- All warnings available in `data.synthesis.qualityWarnings[]`
- Do NOT suppress or hide the app; keep it usable and honest

## Implementation file
`packages/content-engine/src/source-quality.ts`
Exported from `packages/content-engine/src/index.ts`
Called in `apps/web/src/lib/shell-mapper.ts::mapSynthesis()`
Rendered in `AeonthraShell.tsx` Home view

## Anti-overblocking

- textbook-present bundles NEVER downgrade to blocked
- academicSignalScore ≥ 20 counts as academic regardless of admin signals
- Do not block on small bundle size alone if textbook is present
