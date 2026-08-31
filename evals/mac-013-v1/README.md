# MAC-013 v1 — Reference adjudication eval

Status: **EVAL / CANDIDATE ONLY**

## Purpose

Exercise the real `state.js` + `evidence-fidelity.js` implementation against a frozen source artifact and a small reference-adjudicated corpus.

This is intentionally separate from the reserved CEPV confirmatory benchmark. The fixture is synthetic and public-safe.

## Corpus

The eval contains six specialist findings:

- 2 `supported`
- 2 `misinterpreted`
- 2 `unsupported`

For `supported` and `misinterpreted` cases, the evidence string must be locatable verbatim in the frozen source. For `unsupported` cases, the claimed evidence must not be locatable verbatim.

The distinction between `supported` and `misinterpreted` remains a human/reference semantic judgment: locatability alone is not treated as correctness.

## What the runner checks

`node evals/mac-013-v1/run.js` verifies:

1. the fixture and reference labels are internally consistent;
2. all six findings can be recorded through the actual CEPV state API;
3. reference evidence adjudications are stored by the MAC-013 layer;
4. EFR/UFR/MIR each equal `1/3` for the balanced corpus;
5. review coverage is `100%`;
6. locatable evidence rate is `2/3`;
7. the audit packet exports all six evidence reviews;
8. MAC-013 remains `CANDIDATE`;
9. evidence adjudication alone does not pass CHECK-008.

## What this does **not** prove

A passing run does not prove that an LLM or agent can correctly classify new evidence as supported, misinterpreted, or unsupported. It validates the candidate measurement, storage, export, and safety boundary on a realistic frozen corpus.

Model/agent discrimination accuracy requires a later blind eval in which predictions are produced without access to the reference labels and then scored against the adjudicated corpus.

## Promotion boundary

Do not promote MAC-013 to `VALIDATED` from this eval alone. Promotion still requires broader eval/regression evidence and explicit validated-progress authorization.
