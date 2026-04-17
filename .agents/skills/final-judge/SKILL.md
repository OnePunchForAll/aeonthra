---
name: final-judge
description: "Decide when repeated hardening loops have stopped producing material gains and record why the pass ends."
---

# Final Judge

Use this skill after each full verify and review loop once the major fixes are in place.

## Boundaries

- Judge by material gains in correctness, robustness, semantic quality, Atlas integrity, UX quality, and repo hygiene.
- Require two consecutive no-material-delta loops before stopping unless a hard environment blocker ends proof earlier.

## Inputs

- Iteration scoreboard
- Review findings
- Verification results
- Remaining known defects

## Outputs

- Continue or stop decision
- Explicit rationale
- Residual-risk note if stopping

## Hard Stops

- Stop if unresolved material defects still appear fixable in the current environment.
