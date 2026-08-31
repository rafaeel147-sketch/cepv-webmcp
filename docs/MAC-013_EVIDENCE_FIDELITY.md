# MAC-013 — Evidence Fidelity / Grounding

Status: **CANDIDATE**

## Purpose

Measure whether each editorial finding is actually grounded in the source artifact, separately from whether the finding is ultimately correct.

This capability was added after a comparative review exposed an important failure mode: a reviewer can produce a plausible editorial finding while quoting or attributing text that does not exist in the document. Precision/recall alone do not distinguish that failure from an ordinary interpretive false positive.

## Human evidence adjudication states

- `supported` — the cited/identified evidence exists in the artifact and supports the finding.
- `misinterpreted` — the evidence exists in the artifact, but the conclusion drawn from it is not supported.
- `unsupported` — the claimed evidence cannot be located in the artifact, is fabricated, or materially differs from the source.
- `unreviewed` — no human evidence adjudication has been recorded yet.

The agent does not self-certify these states. Evidence fidelity adjudication is human-side only.

## Metrics

Metrics use reviewed findings as the denominator and publish review coverage separately.

- **EFR — Evidence Fidelity Rate** = `supported / reviewed findings`
- **UFR — Unsupported Finding Rate** = `unsupported / reviewed findings`
- **MIR — Misinterpretation Rate** = `misinterpreted / reviewed findings`
- **Evidence Review Coverage** = `reviewed findings / total findings`
- **Locatable Evidence Rate** = `(supported + misinterpreted) / reviewed findings`

A null rate means the denominator is zero. Unknown/unreviewed findings are never silently treated as supported.

## Relationship to existing CEPV metrics

MAC-013 complements, but does not replace:

- TP / FP / FN
- precision
- recall
- F1
- protocol coverage
- page coverage
- evidence coverage

`evidence coverage` answers whether a finding contains an evidence field. MAC-013 asks whether that evidence is actually faithful to the source artifact.

## Candidate gate rule

The current implementation records and exports MAC-013 metrics but **does not yet change CHECK-008 automatically**. This is deliberate while the capability is in CANDIDATE state.

Promotion proposal after evals:

1. Evidence Review Coverage must reach 100% for a benchmark result to publish final EFR/UFR/MIR.
2. UFR should be 0% for a specialist run intended for unrestricted approval.
3. Any `unsupported` evidence must remain visible in the audit packet even if the associated finding is later rejected.
4. The gate behavior must be regression-tested before MAC-013 is promoted from CANDIDATE.

## Minimum deterministic evals

1. Three reviewed findings: one supported, one misinterpreted, one unsupported -> EFR/UFR/MIR each equal 1/3.
2. An unreviewed finding lowers review coverage but does not change reviewed-denominator rates.
3. Evidence reviews survive normal page/state reloads.
4. Reset clears candidate evidence reviews together with the demo session.
5. Audit export contains specialist and baseline evidence-fidelity metrics plus the human review map.
6. Agent-facing tools cannot mark their own evidence as supported.

## Promotion rule

Do not call MAC-013 validated merely because the code exists or deterministic tests pass. Promotion requires benchmark/eval evidence and explicit authorization under the CEPV validated-progress rules.
