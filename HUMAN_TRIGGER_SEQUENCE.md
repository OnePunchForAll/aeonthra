# Human Trigger Sequence

This sequence covers only the desktop UI actions and browser steps the agent cannot autonomously prove in this thread.

| Phase | Human action | Why it matters | Expected evidence | Fallback if unavailable |
| --- | --- | --- | --- | --- |
| Capability confirmation | Open the slash menu and check `/status` | Confirms whether the desktop exposes status diagnostics in this build | A visible status panel or explicit absence | Skip and rely on agent-run `update_plan`, terminal, and repo docs |
| Capability confirmation | Open the slash menu and check `/apps`, `/plugins`, or `/mcp` if present | Confirms whether the desktop UI exposes connector inventory beyond the tool surface | A visible list of apps or plugins or explicit absence | Use `tool_search` inventory already documented in `COMMAND_CAPABILITY_MATRIX.md` |
| Review confirmation | Run `/review` if present after the first full implementation loop | Adds a human-triggered desktop review surface separate from automated tests | Review findings or an explicit clean result | Use the agent-run review loop and document that the desktop review surface was unavailable |
| Diff confirmation | Run `/diff` if present after the first full implementation loop | Adds a UI diff inspection surface | Visual diff or explicit absence | Use `git diff --stat` and targeted file inspection |
| Extension proof | In Chrome, remove any stale unpacked copy and load `apps/extension/dist` as the unpacked extension | Proves the canonical unpacked extension path after the fix | Chrome shows the extension loaded from `apps/extension/dist` | Rebuild with `npm run build:extension` and reload that folder |
| App proof | Run the web app locally and open `http://127.0.0.1:5176/` | Puts AEONTHRA in the exact local state used for bridge validation | AEONTHRA app visible at the local origin | Use the documented alternate dev origin if the port changes and record it |
| Real capture proof | Visit a real Canvas course page, trigger the extension capture, and then open AEONTHRA from the extension handoff path | Produces the required end-to-end extension capture evidence | Import succeeds and the app reports an accepted extension capture | If the automatic open fails, open the app manually and trigger the bridge request again |
| Failure proof | Try one deliberately invalid bundle import through the manual JSON import path | Confirms precise error boundaries between extension handoff and manual import | Actionable validation error naming the actual mismatch | Use the existing validator tests if manual import UI is unavailable |
| Final review stop check | Run `/review` again if present after the second full verify loop | Confirms the last two loops no longer surface material defects | No findings or only trivial polish findings | Stop after agent review, test, and scoreboard convergence |

## Exact Manual Path For The Bridge Proof

1. Build the repo so `apps/extension/dist` is current.
2. Open Chrome extension management.
3. Remove any older unpacked AEONTHRA or Canvas Converter load target.
4. Load unpacked from `C:\Users\aquae\OneDrive\Documents (Dokyumento)\Canvas Converter\apps\extension\dist`.
5. Open the local app at `http://127.0.0.1:5176/`.
6. Visit a real Canvas course page that belongs to a single identifiable course.
7. Trigger the extension capture and handoff action.
8. Confirm the app accepts the handoff and imports the course bundle.
9. If a rejection appears, copy the exact error text into `BRIDGE_FAILURE_ROOT_CAUSE_ULTIMATE.md`.

## Evidence To Preserve

- The exact local app origin used for proof.
- The exact extension folder Chrome loaded.
- Whether the bridge import was accepted or rejected.
- The exact rejection text if any.
- Whether `/review`, `/diff`, `/apps`, `/plugins`, or `/mcp` were visible.
