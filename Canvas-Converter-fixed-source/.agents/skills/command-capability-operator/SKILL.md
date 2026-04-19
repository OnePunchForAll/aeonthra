---
name: command-capability-operator
description: "Inventory live command and capability surfaces without hallucinating UI controls or unavailable tools."
---

# Command Capability Operator

Use this skill before a capability-heavy run that references desktop slash commands, tools, apps, plugins, or subagents.

## Boundaries

- Verify first, infer second, and clearly label inference.
- Distinguish agent-usable tools from user-trigger-only UI surfaces.
- Prefer live tool surfaces and repo evidence over generic assumptions.

## Inputs

- Tool availability in the current thread
- Repo-local skills
- Desktop connector discovery
- Any visible UI slash-command evidence supplied by the user

## Outputs

- Capability matrix
- Human-trigger sequence
- Clear owner mapping for each relevant capability

## Hard Stops

- Stop if a capability cannot be demonstrated and no trustworthy evidence exists.
