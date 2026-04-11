---
name: reforge-qa
description: "Drive the build-time repair loop with root-cause analysis and regression-first fixes."
---

# REFORGE QA

Use this skill when a change needs verification, failure triage, or regression hardening.

## Workflow

1. Reproduce the failure.
2. Find the root cause.
3. Add or improve a regression test.
4. Patch the issue.
5. Rerun the narrow check, then the full check sequence.
6. Record the failure in `.omega/ERROR_LEDGER.md` when it materially affected the product.
