# Agent Swarm Roster

The swarm is organized into waves of at most six concurrently active specialists. Status starts as `planned` and is updated as roles are actually run.

| Wave | Role | Scope | Dependencies | Inputs | Outputs | Mapping | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Live command surface auditor | Verify agent-usable and user-trigger-only capability surfaces | None | Tool inventory, repo state | Capability findings | Command surface | planned |
| 1 | App slash-command operator | Check app slash surfaces versus connector tools | Live command surface auditor | Desktop connector inventory | Slash capability notes | Command surface | planned |
| 1 | CLI-capability compatibility auditor | Map shell, filesystem, and desktop constraints | Live command surface auditor | Shell output, environment vars | Compatibility notes | Command surface | planned |
| 1 | Skill invocation strategist | Inspect repo-local skills and identify missing ones | None | `.agents/skills` inventory | Skill gap list | Skills | planned |
| 1 | MCP / apps / plugins inventory auditor | Verify connector and MCP availability | Live command surface auditor | `tool_search`, MCP listings | App and MCP inventory | Connectors | planned |
| 1 | Review-loop operator | Define review loop evidence and stop conditions | CLI-capability compatibility auditor | Test/build surfaces | Review protocol | Review loop | planned |
| 2 | Status / diagnostics operator | Track thread, terminal, and plan status surfaces | CLI-capability compatibility auditor | Terminal, plan state | Diagnostics notes | Command surface | planned |
| 2 | Human-trigger sequence planner | Convert UI-only actions into exact human steps | Live command surface auditor | Slash command inventory | Trigger script | Human workflow | planned |
| 2 | Subagent orchestration judge | Decide wave boundaries and reuse strategy | None | Swarm requirement list | Wave schedule | Orchestration | planned |
| 2 | Command-to-agent mapping auditor | Pair each capability with a specialist owner | Wave 1 outputs | Capability matrix | Ownership map | Orchestration | planned |
| 2 | Bridge root-cause investigator | Trace extension-to-app import rejection path | None | Extension and web bridge code | Root-cause summary | Bridge | planned |
| 2 | Queue payload validator auditor | Audit queue storage, validator, and parse path | Bridge root-cause investigator | Storage and schema code | Payload mismatch report | Bridge | planned |
| 3 | CaptureMeta/schema contract auditor | Audit schema truth for capture metadata | Queue payload validator auditor | Schema package | Contract delta list | Bridge/schema | planned |
| 3 | Canvas capture packaging auditor | Trace emitted bundle packaging | Bridge root-cause investigator | Extension capture code | Emitted shape notes | Bridge | planned |
| 3 | Content-script capture auditor | Check capture metadata and source item truth | Canvas capture packaging auditor | Content scripts | Capture findings | Extension | planned |
| 3 | Service-worker flow auditor | Audit handoff request, ready, ack, and result flow | Queue payload validator auditor | Service worker code | Flow audit | Extension | planned |
| 3 | Popup UX / truth auditor | Check extension UX claims and error text | Service-worker flow auditor | Popup code, copy | UX truth notes | Extension UX | planned |
| 3 | Dist-vs-src canonicality auditor | Prove canonical extension output folder | Build-system and workspace hygiene reviewer | Build scripts, dist layout | Canonicality report | Build/canonicality | planned |
| 4 | Unpacked-extension path auditor | Validate Chrome load path and stale folder risk | Dist-vs-src canonicality auditor | Build outputs, docs | Path guidance | Extension | planned |
| 4 | Replay/offline-site import auditor | Separate replay import from live extension bridge | Bridge root-cause investigator | Web import code | Boundary notes | Web import | planned |
| 4 | Source-workspace / reset auditor | Audit workspace import/reset drift | Replay/offline-site import auditor | Workspace storage code | Reset findings | Web state | planned |
| 4 | Persistence / storage drift auditor | Audit extension and app persisted queue drift | Queue payload validator auditor | Storage helpers | Drift findings | Persistence | planned |
| 4 | Workspace identity / scoping auditor | Check course and host identity handling | CaptureMeta/schema contract auditor | Identity code paths | Scoping rules | Bridge | planned |
| 4 | Extension build posture auditor | Verify build scripts and assets for release truth | Dist-vs-src canonicality auditor | Build scripts | Build posture notes | Release | planned |
| 5 | End-to-end bridge verifier | Run the final bridge proof path | Prior bridge fixes | Built extension, app | Bridge proof result | Bridge | planned |
| 5 | Semantic root-cause auditor | Audit repetitive output and weak evidence paths | None | Content engine outputs and tests | Root-cause summary | Semantics | planned |
| 5 | Block segmentation specialist | Improve source segmentation quality | Semantic root-cause auditor | `pipeline.ts`, fixtures | Segmentation changes | Semantics | planned |
| 5 | HTML cleanup / wrapper stripping specialist | Remove wrappers and junk before extraction | Block segmentation specialist | Normalized HTML | Cleanup changes | Semantics | planned |
| 5 | Candidate extraction specialist | Improve candidate mining and ranking | Semantic root-cause auditor | Pipeline scores | Candidate ranking changes | Semantics | planned |
| 5 | Alias/dedupe/noise firewall specialist | Collapse aliases and reject junk candidates | Candidate extraction specialist | Concept candidates | Dedupe firewall changes | Semantics | planned |
| 6 | Evidence provenance specialist | Add field-level provenance and evidence truth | Semantic root-cause auditor | Synthesis and schema code | Provenance changes | Semantics/schema | planned |
| 6 | Relation-graph specialist | Improve relation selection and support | Evidence provenance specialist | Relations code and fixtures | Relation logic changes | Semantics | planned |
| 6 | Distinctness-gate architect | Strengthen cross-field distinctness and blanking | Semantic root-cause auditor | Existing gate logic | Distinctness gate changes | Semantics | planned |
| 6 | Hook quality specialist | Improve hook realism and evidence use | Distinctness-gate architect | Synthesis fields | Hook changes | Semantics | planned |
| 6 | Trap quality specialist | Improve misconception/trap realism | Distinctness-gate architect | Synthesis fields | Trap changes | Semantics | planned |
| 6 | Transfer quality specialist | Require real transfer evidence for transfer artifacts | Evidence provenance specialist | Shell mapper and synthesis | Transfer changes | Semantics/shell | planned |
| 7 | Summary / primer / mnemonic distinctness specialist | Prevent recap fields from collapsing into each other | Distinctness-gate architect | Synthesis outputs | Distinctness refinements | Semantics | planned |
| 7 | Deterministic scoring specialist | Tighten explainable field support scoring | Semantic root-cause auditor | Support scores | Scoring changes | Semantics | planned |
| 7 | Shell-mapper anti-repetition specialist | Remove shell circular proof and fail closed | Transfer quality specialist | `shell-mapper.ts` | Mapper changes | Shell | planned |
| 7 | Source-quality gate specialist | Enforce degraded and blocked-with-warning boundaries | Semantic root-cause auditor | Source quality helpers | Gate changes | Semantics | planned |
| 7 | Weak-fallback exterminator | Remove fake generic fallback spread | Distinctness-gate architect | Synthesis and mapper | Fallback removals | Semantics | planned |
| 7 | Semantic regression specialist | Add deterministic regression fixtures and tests | All semantic specialists | Fixture corpus | New semantic tests | Testing | planned |
| 8 | Atlas progression systems designer | Define real skill progression semantics | None | Atlas model and UX | Progression plan | Atlas | planned |
| 8 | Skill-tree systems architect | Extend canonical Atlas data seams | Atlas progression systems designer | `atlas-skill-tree.ts`, `atlas-shell.ts` | Model changes | Atlas | planned |
| 8 | Chapter-to-skill unlock mapper | Tighten chapter reward and unlock derivation | Skill-tree systems architect | Chapter and concept graph data | Unlock logic changes | Atlas | planned |
| 8 | Assignment-readiness integrity auditor | Require deterministic readiness evidence | Skill-tree systems architect | Assignment and mastery state | Readiness changes | Atlas | planned |
| 8 | Gamification balance designer | Keep progression motivating without fake claims | Atlas progression systems designer | Atlas UI and copy | Balance adjustments | Atlas UX | planned |
| 8 | Mastery-state model auditor | Audit mastery and recovery transitions | Skill-tree systems architect | Mastery thresholds | State model changes | Atlas | planned |
| 9 | Recovery-loop designer | Shape weak-skill reopening logic | Mastery-state model auditor | Recovery signals | Recovery loop changes | Atlas | planned |
| 9 | Atlas UX overhaul director | Extract Atlas rendering and inspect-first UX | Atlas progression systems designer | `AeonthraShell.tsx` | UI refactor plan | Atlas UI | planned |
| 9 | Visual systems art director | Keep the Atlas presentation coherent and premium | Atlas UX overhaul director | Layout, styles | Visual refinements | UI polish | planned |
| 9 | Node semantics / branching designer | Add branch metadata and dependency inspection | Skill-tree systems architect | Atlas graph | Branching changes | Atlas | planned |
| 9 | AeonthraShell refactor surgeon | Split Atlas rendering out of shell monolith | Atlas UX overhaul director | `AeonthraShell.tsx` | Refactor changes | Refactor | planned |
| 9 | App orchestration reviewer | Split web intake and persistence seams from `App.tsx` | Bridge fixes | `App.tsx` | Orchestration refactor | Refactor | planned |
| 10 | Pipeline refactor surgeon | Move field assembly and provenance seams out cleanly | Semantic specialists | `pipeline.ts`, `synthesis.ts` | Refactor changes | Refactor | planned |
| 10 | Build-system and workspace hygiene reviewer | Tighten Vite and workspace canonicality | Dist-vs-src canonicality auditor | Build config | Build hygiene changes | Hygiene | planned |
| 10 | Purge strategist | Decide what to delete, keep, or archive | Audit outputs | Repo inventory | Purge decisions | Hygiene | planned |
| 10 | Docs / truth-claims auditor | Align README, docs, and truth boundaries | All fixes in flight | Docs and ledgers | Truth doc changes | Docs | planned |
| 10 | Performance / accessibility reviewer | Check keyboard, focus, motion, and weight | Atlas/UI changes | UI code and build | Perf and a11y notes | Quality | planned |
| 10 | Release hardening engineer | Run final verification and release hardening | All implementation passes | Full repo | Final hardening notes | Release | planned |
| 11 | Canonical source-of-truth judge | Name final canonical files and kill drift | Build, bridge, docs outputs | Repo state | Canonicality verdict | Release/docs | planned |
| 11 | Final integration judge | Decide stop condition after repeated loops | All prior outputs | Scoreboard, review, tests | Final go/no-go | Final stop rule | planned |

## Wave Rule

- Maximum concurrent agents per wave: 6
- Reuse is allowed only when the same specialist continues the same domain
- Integration waits only when the next blocking step requires that output

## Actual Roles Run

The run covered `25` specialist roles with the six available agents, reused in waves:

- Singer: live command surface auditor, final integration judge, canonical source-of-truth judge, app orchestration reviewer
- Hypatia: app slash-command operator, human-trigger sequence planner, subagent orchestration judge, command-to-agent mapping auditor, Atlas UX overhaul director
- Harvey: queue payload validator auditor, shell-mapper anti-repetition specialist, workspace identity/scoping auditor
- Linnaeus: docs / truth-claims auditor, review-loop operator, service-worker flow auditor
- Beauvoir: purge strategist, dist-vs-src canonicality auditor, unpacked-extension path auditor, extension build posture auditor
- Dewey: status / diagnostics operator, replay/offline-site import auditor, source-workspace / reset auditor, persistence / storage drift auditor, release hardening engineer

Additional agent findings were integrated into bridge, Atlas, persistence, purge, and final-stop decisions. Roles without direct evidence in this run remain `planned` rather than claimed as executed.
