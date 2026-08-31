# MAC-013 Blind Eval v1

Status: **EVAL / CANDIDATE**

## Purpose

Measure whether an agent can classify evidence fidelity without seeing the reference labels in advance.

This is a process-blind evaluation package. The public repository contains:

- `source.txt` — frozen synthetic source artifact;
- `blind_cases.json` — nine unlabeled findings;
- `predictions.template.json` — required output shape;
- `reference.sha256` — SHA-256 commitment to the private reference file;
- `score-lib.js` / `score.js` — deterministic scorer;
- `validate-package.js` / `selftest.js` — CI-safe integrity tests.

The private reference labels are intentionally **not committed** to the public repository.

## Allowed classifications

Each case must receive exactly one status:

- `supported`
- `misinterpreted`
- `unsupported`

The agent receives only `source.txt`, `blind_cases.json`, and the output schema. It must not receive, search for, or infer labels from evaluator-only storage.

## Execution protocol

1. Freeze the model/version, prompt, tool permissions, and run identifier before classification.
2. Provide only the source and blind cases to the agent.
3. Save the agent output using `predictions.template.json` as the schema.
4. Only after predictions are frozen, retrieve the evaluator-only `reference.private.json` from private storage.
5. Run:

   `node score.js predictions.json /private/path/reference.private.json`

6. The scorer verifies the private reference bytes against `reference.sha256` before calculating results.
7. Preserve the raw predictions and score report as eval evidence.

## Metrics

The scorer reports:

- exact classification accuracy;
- macro-F1;
- per-class precision, recall, F1, and support;
- full confusion matrix;
- individual misclassified case IDs.

## Integrity boundaries

- A passing package self-test does **not** constitute a blind model run.
- CI never receives the private labels.
- Reference labels must remain external until predictions are frozen.
- A blind result on this single synthetic fixture is evidence about one controlled task, not proof of general accuracy.
- MAC-013 remains `CANDIDATE`; this eval does not change CHECK-008 or authorize promotion to `VALIDATED`.

## Reference commitment

The committed SHA-256 is the integrity commitment to the exact private reference-file bytes. If the evaluator supplies a different reference file, `score.js` fails before scoring.
