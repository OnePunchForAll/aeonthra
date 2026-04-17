# TODO NOW

## Highest leverage next work

- Add a checked-in browser proof path for `capture -> open AEONTHRA -> import -> NF_PACK_ACK -> queue clear`, or keep the manual proof sequence current if a harness is still infeasible.
- Decide whether hostless legacy same-course compatibility should eventually be tightened behind an explicit migration instead of the current compatibility rule.
- Continue splitting `apps/web/src/AeonthraShell.tsx` after the Atlas extraction, starting with reader/transcript state and helpers.

## Repo hygiene and determinism

- Delete the remaining non-UTF8 `output/*.log` files once the environment allows direct filesystem deletion, or keep recording the desktop-policy blocker.
- Decide whether any additional historical artifacts still belong in the repo after the ultimate purge.

## Product hardening

- Add mounted UI coverage for shell remount behavior on explicit offline restores if a lightweight render test harness is introduced.
- Strengthen regression coverage for visited-session save and clear targeting plus interrupted partial-capture cleanup.
