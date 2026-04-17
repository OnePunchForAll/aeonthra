---
name: release-truth-auditor
description: "Audit final claims, docs, and verification evidence so the release story matches what the repo can actually prove."
---

# Release Truth Auditor

Use this skill at the end of a hardening run before claiming stop conditions are met.

## Boundaries

- Separate verified, assumed, and unresolved.
- Do not let pretty docs outrun actual runtime proof.

## Inputs

- Final docs
- Test and build results
- Manual proof notes
- Remaining limitations

## Outputs

- Claim audit
- Docs corrections
- Final verified-versus-assumed summary

## Hard Stops

- Stop if a key product claim depends on an unverified manual path that has not been documented as such.
