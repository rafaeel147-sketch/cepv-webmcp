# MAC-013 Blind Eval v1

Status: **EVAL / CANDIDATE**

## Purpose

Measure whether an agent can classify evidence fidelity without seeing the reference labels in advance.

This is a process-blind evaluation package. The public repository contains:

- `source.txt` — frozen synthetic source artifact;
- `blind_cases.json` — nine unlabeled findings;
- `predictions.template.json` — required output shape;
- `AGENT_PROMPT.txt` — fixed clean-instance instruction;
- `packet.sha256.json` / `verify-packet.js` — SHA-256 commitment to the exact four-file agent packet;
- `run-manifest.template.json` — execution metadata schema;
- `freeze.js` — validates and freezes predictions before reference access, including the packet commitment;
- `reference.sha256` — SHA-256 commitment to the private reference file;
- `score-lib.js` / `score.js` — deterministic scorer;
- `validate-package.js`, `selftest.js`, and `freeze-selftest.js` — CI-safe integrity tests.

The private reference labels are intentionally **not committed** to the public repository.

## Allowed classifications

Each case must receive exactly one status:

- `supported`
- `misinterpreted`
- `unsupported`

The clean agent receives only `AGENT_PROMPT.txt`, `source.txt`, `blind_cases.json`, and `predictions.template.json`. It must not receive, search for, or infer labels from evaluator-only storage.

## Execution protocol

1. Verify the public agent packet: `node verify-packet.js`.
2. Create a clean model instance that has not seen the private reference or prior classifications.
3. Freeze the exact model identifier, prompt, tool policy, and unique run ID in a copy of `run-manifest.template.json`.
4. Give the clean instance only the four committed packet files.
5. Save its output as `predictions.json` without editing individual classifications.
6. Before retrieving the private reference, freeze the run:

   `node freeze.js predictions.json run-manifest.json /evidence/run-id`

7. Preserve `predictions.json`, `run-manifest.json`, `packet.sha256.json`, and `freeze-receipt.json`. The receipt binds the run to the exact packet SHA-256 and refuses overwrite into an already frozen evidence directory.
8. Only after the freeze receipt exists, retrieve evaluator-only `reference.private.json` from private storage.
9. Score the frozen copy:

   `node score.js /evidence/run-id/predictions.json /private/path/reference.private.json`

10. Preserve the raw score report beside the freeze evidence.

## Metrics

The scorer reports:

- exact classification accuracy;
- macro-F1;
- per-class precision, recall, F1, and support;
- full confusion matrix;
- individual misclassified case IDs.

## Integrity boundaries

- A passing package, packet, or freeze self-test does **not** constitute a blind model run.
- CI never receives the private labels.
- Reference labels must remain external until predictions and execution metadata are frozen.
- The committed agent-packet digest prevents later prompt/source/case/schema edits from being presented as the packet used for a prior run.
- `freeze.js` rejects packet hash mismatches, placeholders, duplicate/missing case IDs, invalid classes, model/run-ID mismatch, unexpected tool policy, or any manifest stating that the reference was visible before freeze.
- Frozen evidence is write-once at the selected output directory; a second freeze there fails instead of overwriting evidence.
- A blind result on this single synthetic fixture is evidence about one controlled task, not proof of general accuracy.
- MAC-013 remains `CANDIDATE`; this eval does not change CHECK-008 or authorize promotion to `VALIDATED`.

## Commitments

`packet.sha256.json` commits the exact public bytes shown to the clean agent. `reference.sha256` separately commits the evaluator-only reference bytes. This creates two independent integrity anchors: what the model saw and what it was scored against.
