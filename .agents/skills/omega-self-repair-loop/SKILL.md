# omega-self-repair-loop

The Omega system is AEONTHRA's meta-layer for tracking bugs, decisions, and
repair priorities. It prevents the same class of error from recurring by
recording root causes, fixes, and guard conditions.

## Ledger files

| File | Purpose |
|------|---------|
| `.omega/ERROR_LEDGER.md` | Bugs found, root cause, fix applied, guard added |
| `.omega/IMPLEMENTATION_LEDGER.md` | Features built, files modified, design rationale |
| `.omega/TODO_NOW.md` | Highest-priority next actions (≤ 10 items) |
| `.omega/DECISIONS.md` | Architectural choices and the reasoning behind them |
| `.omega/DIAGNOSTIC_PROTOCOL.md` | Step-by-step procedure for diagnosing new bugs |

## ERROR_LEDGER entry format

```markdown
## [CATEGORY] Bug title — YYYY-MM-DD

**Status**: FIXED | ONGOING | KNOWN
**Root cause**: One-sentence causal description
**Symptom**: What the user/dev saw
**Fix**: Which file(s) changed, what changed
**Guard**: What prevents recurrence (ref guard, test, rule)
**Introduced by**: Which change/commit caused it (if known)
```

## IMPLEMENTATION_LEDGER entry format

```markdown
## Feature/fix name — YYYY-MM-DD

**Files changed**: list
**What it does**: description
**Why**: rationale / user complaint it resolves
**Downstream effects**: what other systems it affects
**Skill refs**: which .agents/skills/ files govern this behavior
```

## Self-repair protocol

When a new bug is found:
1. Check ERROR_LEDGER — has this pattern appeared before?
2. Check DIAGNOSTIC_PROTOCOL — follow the relevant diagnosis path
3. Identify the exact guard condition that would have blocked this bug
4. Fix the bug AND add the guard (code or test)
5. Add an ERROR_LEDGER entry BEFORE closing the task
6. Update TODO_NOW.md to remove the task

## TODO_NOW discipline

- Maximum 10 items at any time
- Each item must be actionable in < 1 session
- Items are ordered by impact × urgency
- Completed items are removed immediately, not archived
- Blocked items are annotated with what they're waiting for

## DECISIONS.md discipline

When a design choice has non-obvious trade-offs (e.g., "why does clone scoring
use 0.05 not 0.0?"), add a DECISIONS entry with:
- The option considered
- The option chosen
- Why (data, user impact, or principle)

## Anti-drift rule

If the `.omega/` ledgers have not been updated in the same session as a
significant code change, the change is considered incomplete. Ledger updates
are part of the definition of "done".

## Implementation files (of the Omega system itself)

- `.omega/ERROR_LEDGER.md`
- `.omega/IMPLEMENTATION_LEDGER.md`
- `.omega/TODO_NOW.md`
- `.omega/DECISIONS.md`
- `.omega/DIAGNOSTIC_PROTOCOL.md`
