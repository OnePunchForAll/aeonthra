---
name: pdf-text-forensics
description: "Extract text deterministically from PDF with layout-aware cleanup and confidence checks."
---

# PDF Text Forensics

Use this skill when building or repairing PDF import for textbooks, notes, or exported course files.

## Focus

- page-by-page extraction
- header and footer suppression
- hyphen repair
- line merge rules
- repeated margin artifact removal
- low-confidence fallback when the text layer is weak

## Workflow

1. Inspect raw extracted text from a few representative pages.
2. Classify artifacts before writing cleanup rules.
3. Keep transformations pure and order-dependent.
4. Preserve provenance when collapsing lines or paragraphs.
