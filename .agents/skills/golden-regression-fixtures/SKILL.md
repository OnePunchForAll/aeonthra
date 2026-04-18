# golden-regression-fixtures

Cutover note: the canonical engine runtime now lives in `packages/content-engine-v2/src/**` and is consumed as `@learning/content-engine`. Any older `packages/content-engine/src/**` references in this skill are historical and should be mapped onto the v2 engine before editing.

Defines the structure, storage, and maintenance protocol for regression test
fixtures that prevent pipeline regressions from shipping silently.

## Fixture location

```
packages/content-engine/src/__tests__/fixtures/
  bundles/
    ethics-101.json          # CaptureBundle — academic, 12 items, 2 textbook
    admin-orientation.json   # CaptureBundle — orientation-heavy, triggers degraded mode
    clone-heavy.json         # CaptureBundle — 8 identical reflections + 2 pages
    thin-discussion.json     # CaptureBundle — 3 discussion items, no pages
  snapshots/
    ethics-101.snap.json     # Expected LearningBundle output
    admin-orientation.snap.json
    clone-heavy.snap.json
    thin-discussion.snap.json
```

## Bundle fixture schema (CaptureBundle)

Each `bundles/*.json` file is a valid CaptureBundle:
```json
{
  "title": "Ethics 101",
  "capturedAt": "2024-01-15T10:00:00Z",
  "courseUrl": "https://canvas.example.com/courses/123",
  "items": [ ... ],
  "resources": [ ... ]
}
```

Fixtures use **synthetic, invented content** — never real student or instructor data.

## Snapshot update protocol

When intentional behavior changes (new feature, scoring tweak):
1. Run tests → identify which snapshots differ
2. Review each diff: is the change expected?
3. If yes: update snapshot manually with new expected output
4. Add a comment in `ERROR_LEDGER.md` explaining why the snapshot changed
5. Never auto-update snapshots without human review

**Do NOT use `--update-snapshots` blindly.** Each snapshot update is a contract change.

## Regression test contract

Each fixture must test at least:
- `concepts.length >= 1` (never empty)
- `concepts[0].label` matches expected top concept
- `synthesis.synthesisMode` matches expected mode
- `synthesis.qualityBanner` present/absent as expected
- No concept label matches any blocked pattern from deterministic-concept-firewall

## Clone-heavy fixture requirements

`clone-heavy.json` must include 8 items with identical 80-char fingerprints and
2 textbook-backed pages. The snapshot must show:
- Textbook concepts ranked above reflection-activity concepts
- Reflection items contribute ≤ 1/20 weight beyond the first member

## Admin-orientation fixture requirements

`admin-orientation.json` must trigger `synthesisMode: "degraded"`.
The snapshot must show `qualityBanner` is a non-empty string.

## Implementation files

- `packages/content-engine/src/__tests__/` — test files
- `packages/content-engine/src/__tests__/fixtures/` — fixture JSON files
- `vitest.config.ts` — test runner configuration
- `.agents/skills/offline-export-determinism/SKILL.md` — determinism rules
