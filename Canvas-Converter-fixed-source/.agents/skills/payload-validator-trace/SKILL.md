---
name: payload-validator-trace
description: "Trace storage, parse, validation, acknowledgement, and import-result paths for queued bridge payloads."
---

# Payload Validator Trace

Use this skill when a schema-valid payload still fails product-level import truth checks.

## Boundaries

- Follow the full queue -> message -> validator -> ack path.
- Name whether the failure is parse, schema, product contract, scoping, or stale-state drift.

## Inputs

- Storage helpers
- Service-worker message handlers
- Web bridge intake logic
- Shared message schemas

## Outputs

- Stage-by-stage trace
- Patch plan or implementation
- Tests for the exact broken stage

## Hard Stops

- Stop if the diagnosis relies on guessed browser behavior instead of code or reproducible evidence.
