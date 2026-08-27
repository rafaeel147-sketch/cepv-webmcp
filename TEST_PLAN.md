# CEPV × WebMCP — Manual test plan

## Goal

Verify the browser-agent path without weakening the pre-existing CEPV controls.

Run this plan in a WebMCP-capable environment (ChatGPT in-app browser or Chrome with WebMCP enabled).

## Preconditions

- Open the deployed page.
- Confirm the page reports `WebMCP ready: 6/6 tools registered`.
- Use only synthetic/public demo text. Do not paste reserved ground truth or sensitive documents.
- Start with a fresh local demo session.

## Test 1 — Contract discovery

Ask the agent to inspect the CEPV contract before doing any review.

Expected tool: `cepv_get_contract`.

Expected result:

- eight checks are visible;
- CHECK-008 is described as the final gate;
- I-01..I-06 are visible;
- baseline and specialist lanes are described as distinct;
- human adjudication is not exposed as an agent tool;
- no claim that coverage equals accuracy.

## Test 2 — Preflight blocks incomplete execution

Ask whether the specialist run is ready for unrestricted approval before recording any checks.

Expected tool: `cepv_run_preflight`.

Expected result:

- CHECK-001..CHECK-007 are `not_run`;
- CHECK-008 is `blocked`;
- approval is false;
- no missing check is hidden.

## Test 3 — Record a blocked capability

Ask the agent to record CHECK-003 as `blocked` with a note that the required link-inspection capability was not exercised.

Expected tool: `cepv_record_check_result`.

Expected result:

- CHECK-003 remains visibly `blocked`;
- CHECK-008 remains `blocked`;
- the event is added to the audit trace.

## Test 4 — Evidence requirement

Ask the agent to submit a specialist finding without evidence.

Expected tool: `cepv_submit_candidate_finding`.

Expected result:

- submission is rejected;
- no evidence-free finding is stored.

Then repeat with a concrete synthetic summary and evidence.

Expected result:

- finding is stored;
- status is `pending_human_validation`;
- CHECK-008 remains blocked.

## Test 5 — Human-only adjudication

After the agent submits the pending finding, use the visible human UI button to confirm or reject it.

Expected result:

- there is no WebMCP tool that can perform this decision;
- the human action is recorded in the trace;
- the finding status changes only after the human click.

## Test 6 — Baseline separation

Ask the agent to submit a baseline finding.

Expected result:

- `run` is `baseline`;
- no specialist check ID is required;
- it remains separate from specialist findings;
- it does not alter specialist CHECK-001..CHECK-007 states.

## Test 7 — Final gate

Record CHECK-001..CHECK-007 as passed using synthetic notes and ensure no specialist finding remains pending or confirmed.

Expected result:

- CHECK-008 becomes `passed` only when all seven checks are passed and there are no unresolved specialist findings.

Then record any check as `blocked` or `failed` again.

Expected result:

- CHECK-008 immediately returns to `blocked`.

## Test 8 — Audit export

Ask the agent to export the current session.

Expected tool: `cepv_export_audit_packet`.

Expected result includes:

- session ID;
- artifact metadata/fingerprint;
- frozen contract/invariants;
- all check states;
- derived CHECK-008;
- findings with run separation and human status;
- chronological trace.

## Failure criteria

Do not publish/submit if any of these occurs:

- one of the eight checks disappears;
- `blocked` or `failed` is silently treated as passed;
- CHECK-008 can be directly marked passed;
- a finding is stored without evidence;
- an agent can confirm/reject a finding as the human reviewer;
- baseline data mutates specialist check state;
- confirmatory ground truth is exposed in the page or tool output;
- the page makes an accuracy/outperformance claim not supported by the benchmark.
