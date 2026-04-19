# Command Capability Matrix

This matrix records the live capability surface verified in this thread on April 16, 2026. It treats desktop slash commands as user-triggered or unverified unless directly demonstrated here.

| Capability | Availability | Current surface | Agent or user | Why it matters | Owner | When to use | Expected evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `AGENTS.md` chain | Verified | Repo filesystem | Agent-usable | Governs scope, truth rules, and ledgers | Live command surface auditor | Before any edits and before final report | Root policy file read and followed |
| Repo-local skills under `.agents/skills` | Verified | Repo filesystem | Agent-usable | Supplies local workflows for capture, semantics, fixtures, and QA | Skill invocation strategist | Audit phase, before implementation loops | Skill inventory and created gaps documented |
| Global skill catalog in desktop session | Verified | Desktop skill registry | Agent-usable | Supplies orchestration, extension, local-first, and UI workflows | Command-to-agent mapping auditor | Audit phase and before each subsystem pass | Skill files loaded for active work |
| `functions.shell_command` | Verified | Developer tool | Agent-usable | Primary repo inspection, build, test, and diagnostics surface | CLI-capability compatibility auditor | Throughout all phases | Command output saved in docs and report |
| `functions.apply_patch` | Verified | Developer tool | Agent-usable | Required safe editing path for files in this run | Release hardening engineer | Before every manual file edit | Coherent diffs only through patch application |
| `functions.spawn_agent` | Verified | Developer tool | Agent-usable | Required swarm execution surface | Subagent orchestration judge | After audit and capability inventory | Spawned specialist agents with scoped prompts |
| `functions.send_input` | Verified | Developer tool | Agent-usable | Reuse and redirect spawned agents between waves | Subagent orchestration judge | Between waves | Follow-up outputs from existing agents |
| `functions.wait_agent` | Verified | Developer tool | Agent-usable | Collect blocking swarm results when integration needs them | Review-loop operator | Before integration checkpoints | Agent completion messages |
| `functions.close_agent` | Verified | Developer tool | Agent-usable | Clean up completed specialists and keep swarm bounded | Final integration judge | After each completed wave | Closed agent states |
| `functions.update_plan` | Verified | Developer tool | Agent-usable | Keeps the execution loop explicit and current | Status / diagnostics operator | Before and after major passes | Updated step statuses |
| `functions.read_thread_terminal` | Verified | Developer tool | Agent-usable | Reads current desktop terminal state if command context drifts | Status / diagnostics operator | Diagnostics and verification | Live thread terminal text |
| `multi_tool_use.parallel` | Verified | Developer tool wrapper | Agent-usable | Fast parallel file reads and diagnostics | Live command surface auditor | Audit and review phases | Parallel inspection outputs |
| `tool_search.tool_search_tool` | Verified | Desktop apps connector discovery | Agent-usable | Confirms app connector surface without hallucinating MCP apps | MCP / apps / plugins inventory auditor | Capability audit only unless a connector is needed | Connector tool inventory results |
| Generic MCP resources | Verified absent | MCP resource registry | Not available here | Confirms there is no broader generic MCP resource surface to depend on | MCP / apps / plugins inventory auditor | Audit phase | Empty MCP resource result |
| Generic MCP resource templates | Verified absent | MCP template registry | Not available here | Confirms no parameterized MCP resources exist here | MCP / apps / plugins inventory auditor | Audit phase | Empty MCP template result |
| `/status` | Unverified | Desktop UI slash layer | User-triggered only | Could expose live thread or workspace diagnostics | Status / diagnostics operator | Human verification phase | Screenshot or copied UI output |
| `/review` | Unverified | Desktop UI slash layer | User-triggered only | Could produce an additional review loop beyond agent-run review | Review-loop operator | After implementation and before stop decision | Review findings or explicit no-findings output |
| `/mcp` | Unverified | Desktop UI slash layer | User-triggered only | Could expose desktop MCP status if present | MCP / apps / plugins inventory auditor | Human-trigger diagnostics | UI listing or explicit absence |
| `/apps` | Unverified | Desktop UI slash layer | User-triggered only | Could expose connected desktop apps | App slash-command operator | Human-trigger diagnostics | UI listing or explicit absence |
| `/plugins` | Unverified | Desktop UI slash layer | User-triggered only | Could expose plugin surface if separate from apps | App slash-command operator | Human-trigger diagnostics | UI listing or explicit absence |
| `/diff` | Unverified | Desktop UI slash layer | User-triggered only | Could provide an alternate diff review surface | Review-loop operator | Post-implementation review | UI diff or explicit absence |
| `/plan-mode` | Unverified in current mode | Desktop UI slash layer | User-triggered only | Could switch collaboration mode but is not agent-executable here | Human-trigger sequence planner | Optional only | Visible mode change or absence |
| `/plan` | Unverified | Desktop UI slash layer | User-triggered only | Could create a UI plan separate from agent plan | Human-trigger sequence planner | Optional only | UI plan or absence |
| `/model` | Unverified | Desktop UI slash layer | User-triggered only | Could expose model switch options | Live command surface auditor | Optional only | UI model list or absence |
| `/fast` | Unverified | Desktop UI slash layer | User-triggered only | Could alter desktop reasoning mode | Live command surface auditor | Optional only | UI state or absence |
| `/permissions` | Unverified | Desktop UI slash layer | User-triggered only | Could show current sandbox policy | CLI-capability compatibility auditor | Optional only | UI permission state or absence |
| `/sandbox-add-read-dir` | Unverified | Desktop UI slash layer | User-triggered only | Not needed because filesystem is already unsandboxed | CLI-capability compatibility auditor | Irrelevant in this environment | Explicit absence or no-op |
| `/init` | Unverified | Desktop UI slash layer | User-triggered only | Not needed in an existing repo | Canonical source-of-truth judge | Irrelevant | Explicit absence or no-op |
| `/agent` | Unverified | Desktop UI slash layer | User-triggered only | Desktop UI entry for subagents if exposed | Subagent orchestration judge | Optional only | UI list or absence |
| `/debug-config` | Unverified | Desktop UI slash layer | User-triggered only | Might expose desktop config | Status / diagnostics operator | Optional only | UI config or absence |
| `/statusline` | Unverified | Desktop UI slash layer | User-triggered only | Cosmetic diagnostics only | Status / diagnostics operator | Irrelevant | UI statusline or absence |
| `/title` | Unverified | Desktop UI slash layer | User-triggered only | Cosmetic thread metadata only | Human-trigger sequence planner | Irrelevant | Renamed title or absence |
| `/ps` | Unverified | Desktop UI slash layer | User-triggered only | Could list processes but shell already covers this | CLI-capability compatibility auditor | Fallback only | UI process list or absence |
| `/stop` | Unverified | Desktop UI slash layer | User-triggered only | Human interrupt control, not part of the pass itself | Human-trigger sequence planner | Only if the user wants to halt | Interrupted thread |
| `/mention` | Unverified | Desktop UI slash layer | User-triggered only | Could help mention connectors or agents | Command-to-agent mapping auditor | Optional only | Mention insertion or absence |
| `/new` | Unverified | Desktop UI slash layer | User-triggered only | Starts a new thread, not needed here | Human-trigger sequence planner | Irrelevant | New thread or absence |
| `/resume` | Unverified | Desktop UI slash layer | User-triggered only | Thread management only | Human-trigger sequence planner | Irrelevant | Resumed thread or absence |
| `/fork` | Unverified | Desktop UI slash layer | User-triggered only | Thread branching only | Human-trigger sequence planner | Irrelevant | Forked thread or absence |
| `/feedback` | Unverified | Desktop UI slash layer | User-triggered only | Product feedback, not repo work | Human-trigger sequence planner | Irrelevant | Feedback modal or absence |
| `/logout` | Unverified | Desktop UI slash layer | User-triggered only | Session control only | Human-trigger sequence planner | Irrelevant | Session logout or absence |
| `/quit` | Unverified | Desktop UI slash layer | User-triggered only | App control only | Human-trigger sequence planner | Irrelevant | App exit or absence |
| `/exit` | Unverified | Desktop UI slash layer | User-triggered only | App control only | Human-trigger sequence planner | Irrelevant | App exit or absence |
| `approvals` alias | Unverified | Desktop UI slash layer | User-triggered only | Not needed because approval policy is `never` | CLI-capability compatibility auditor | Irrelevant | UI alias or absence |
| Review directives `::code-comment` | Verified | Desktop app response renderer | Agent-usable | Allows inline findings if a code review pass is needed | Review-loop operator | Review pass only | Rendered inline findings |
| Workspace terminal / filesystem | Verified | Desktop workspace | Agent-usable | Source of truth for repo state, tests, and docs | Canonical source-of-truth judge | All phases | Reproducible commands and file state |

## Notes

- Agent-usable connector namespaces were verified through the desktop connector discovery surface, not through any slash command.
- UI slash commands are documented for the human because they are not directly invokable by the model in this thread.
- The canonical verification surface for this pass remains repository commands plus targeted tests and browser or manual bridge proof.
