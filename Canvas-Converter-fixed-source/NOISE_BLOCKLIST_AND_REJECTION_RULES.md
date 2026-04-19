# Noise Blocklist And Rejection Rules

## Hard-block text classes

- JS-disabled fallback text
- Tool-window reload text
- LMS navigation chrome
- Accessibility shell text
- Rubric admin rows
- Quiz/assignment header metadata
- Repetitive reflection/discussion boilerplate
- Generic week wrappers with no instructional body
- Generic module/section wrappers with no grounded content
- Broken heading fragments
- Truncated noun phrases
- Stopword-heavy labels

## Required hard-block examples

- `You need to have JavaScript enabled in order to access this site.`
- `This tool needs to be loaded in a new browser window.`
- `Reload the page to access the tool again.`
- `Module item`
- `Points possible`
- `Allowed attempts`
- `Initial post`
- `Respond to classmates`
- `Submission types`
- `Question count`
- `Week 1`
- `Week 2`
- `Week 3`

## Rejection rules by surface

### Capture intake

- Reject capture blocks that are dominated by shell text even if they appear in a content container.
- Add the exact JS-disabled string to the extension capture blocklist.
- Do not keep blocks whose only value is LMS control metadata.

### Workspace tasks

- Reject tasks whose derived title is generic, week-only, shell text, or evidence-thin.
- Reject assignment-like items whose summary/raw text is dominated by chrome or whose only due/date signal is suspicious.
- Do not let week wrappers become assignment rows unless real captured requirement evidence exists.

### Concepts

- Reject labels shorter than the quality threshold, longer than the fragment threshold, truncated, stopword-heavy, or malformed.
- Reject candidates without valid provenance and evidence strength.
- Reject candidates that only survive because they were extracted from fallback titles or generic headings.

### Readiness and Atlas

- Reject concept-only readiness claims when no captured requirement evidence exists.
- Reject Atlas nodes sourced from concepts that fail provenance or evidence thresholds.
- Reject checklist-derived readiness when the checklist is not traceable to captured assignment evidence.

## Exact files to enforce

- `apps/extension/src/content-canvas.ts`
- `apps/web/src/lib/workspace.ts`
- `apps/web/src/lib/shell-mapper.ts`
- `apps/web/src/lib/atlas-skill-tree.ts`
- `packages/content-engine/src/pipeline.ts`
- `packages/content-engine/src/synthesis.ts`
- `packages/content-engine/src/source-quality.ts`
