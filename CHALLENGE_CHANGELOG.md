# WebMCP Challenge change boundary

This document distinguishes the pre-existing CEPV work from the new WebMCP extension created during the Challenge submission period.

## Before the Challenge submission period

Public and preserved CEPV work already included:

- CEPV — **Companheiros Especialistas com Progresso Validado** as an auditable specialist-execution/document-QA concept;
- versioned specialist profile and execution-contract methodology;
- CHECK-001..CHECK-008 specialist review structure;
- findings linked to evidence;
- visible `blocked` / `failed` states;
- human validation/adjudication;
- baseline vs specialist A/B benchmark design;
- traceability / run history;
- the rule that coverage is not accuracy;
- the rule that unresolved findings and blocked/failed checks prevent unrestricted approval;
- Codex/ChatGPT harness work that preserved the original engine and benchmark history.

Public timestamp evidence includes the pre-existing CEPV landing page commit from **2026-08-20** (`6ede5d4ebcf7d3622649703f0b7b3682fa04b796`) in `rafaeel147-sketch/antes-do-primeiro-gole1`, plus the provenance record created there before this dedicated repository was populated.

## New work created after the Challenge started

This dedicated repository contains the Challenge-period WebMCP extension. It adds a browser-agent interface without replacing the original CEPV engine.

### New WebMCP capabilities

- current imperative WebMCP registration through `document.modelContext.registerTool(...)`;
- six structured browser-agent tools;
- browser-local session state and event trace;
- artifact note fingerprinting for the demo session;
- explicit baseline/specialist finding lanes;
- agent recording of CHECK-001..CHECK-007 as `passed`, `blocked`, or `failed`;
- derived CHECK-008 gate;
- evidence-required candidate findings;
- enforced `pending_human_validation` status for agent-submitted findings;
- human-only confirm/reject controls in the visible UI;
- audit JSON export;
- graceful fallback when WebMCP is unavailable;
- deterministic tests for state invariants, tool registration, and failure isolation;
- manual WebMCP end-to-end test plan.

## Intentionally not changed

- original CEPV engine package;
- pre-existing benchmark ground truth;
- frozen A/B methodology;
- pre-existing run history;
- confirmatory source documents;
- user API credentials;
- claims about comparative accuracy or superiority.

## Submission disclosure

The Challenge submission should describe only the **new WebMCP extension** as Challenge-period development when discussing work evaluated for this hackathon. Pre-existing CEPV material is background/context and should remain clearly labeled as such.
