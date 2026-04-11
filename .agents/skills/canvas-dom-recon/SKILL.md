---
name: canvas-dom-recon
description: "Reverse engineer Canvas page structures from visited DOM snapshots and keep selectors resilient."
---

# Canvas DOM Recon

Use this skill when capture logic needs to understand or repair Canvas-specific page extraction.

## Focus

- classify visited Canvas surfaces by URL and visible landmarks
- prefer semantic regions like `main`, headings, landmarks, labels, and link text
- avoid long brittle class chains
- record selector wins and losses in fixtures or ledgers before changing logic
- preserve a manual fallback when confident extraction is not available

## Workflow

1. Reproduce the failing page type with a saved DOM fixture or live page.
2. Identify the smallest stable selector set that survives cosmetic layout changes.
3. Add or update a fixture before widening capture logic.
4. Patch extraction conservatively and keep the raw-text fallback intact.
