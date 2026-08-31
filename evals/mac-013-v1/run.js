const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const ROOT = path.resolve(__dirname, '..', '..');
const source = fs.readFileSync(path.join(__dirname, 'source.txt'), 'utf8');
const cases = JSON.parse(fs.readFileSync(path.join(__dirname, 'cases.json'), 'utf8'));

assert.strictEqual(cases.length, 6, 'Reference eval must contain exactly six cases.');
assert.strictEqual(new Set(cases.map(c => c.id)).size, cases.length, 'Case ids must be unique.');

const allowedStatuses = new Set(['supported', 'misinterpreted', 'unsupported']);
const referenceCounts = { supported: 0, misinterpreted: 0, unsupported: 0 };

for (const c of cases) {
  assert.ok(c.id && c.summary && c.evidence, `Case ${c.id || '<missing-id>'} is incomplete.`);
  assert.ok(allowedStatuses.has(c.expected), `Case ${c.id} has invalid expected status.`);

  const evidenceIsLocatable = source.includes(c.evidence);
  if (c.expected === 'unsupported') {
    assert.strictEqual(evidenceIsLocatable, false, `${c.id}: unsupported evidence must not be locatable verbatim in the frozen source.`);
  } else {
    assert.strictEqual(evidenceIsLocatable, true, `${c.id}: supported/misinterpreted evidence must be locatable verbatim in the frozen source.`);
  }
  referenceCounts[c.expected] += 1;
}

assert.deepStrictEqual(referenceCounts, { supported: 2, misinterpreted: 2, unsupported: 2 });

const storage = new Map();
const sandbox = {
  console,
  Date,
  Math,
  JSON,
  crypto: { randomUUID: (() => { let n = 0; return () => `eval-uuid-${++n}`; })() },
  localStorage: {
    getItem: key => storage.has(key) ? storage.get(key) : null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: key => storage.delete(key)
  }
};
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'state.js'), 'utf8'), sandbox);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'evidence-fidelity.js'), 'utf8'), sandbox);

const S = sandbox.CEPVState;
const state = S.freshState();
const applied = [];

for (const c of cases) {
  const finding = S.submitFinding(state, {
    run: 'specialist',
    checkId: 'CHECK-005',
    summary: c.summary,
    evidence: c.evidence,
    severity: 'medium'
  }, 'agent');

  const review = S.reviewEvidence(finding.id, c.expected, `Reference adjudication: ${c.id}`);
  applied.push({ caseId: c.id, findingId: finding.id, expected: c.expected, recorded: review.status });
  assert.strictEqual(review.status, c.expected, `${c.id}: recorded adjudication differs from reference.`);
}

const metrics = S.evidenceMetrics(state, 'specialist');
assert.strictEqual(metrics.totalFindings, 6);
assert.strictEqual(metrics.reviewedFindings, 6);
assert.strictEqual(metrics.unreviewedFindings, 0);
assert.strictEqual(metrics.supported, 2);
assert.strictEqual(metrics.misinterpreted, 2);
assert.strictEqual(metrics.unsupported, 2);
assert.strictEqual(metrics.reviewCoverage, 1);
assert.ok(Math.abs(metrics.evidenceFidelityRate - (1 / 3)) < 1e-12);
assert.ok(Math.abs(metrics.unsupportedFindingRate - (1 / 3)) < 1e-12);
assert.ok(Math.abs(metrics.misinterpretationRate - (1 / 3)) < 1e-12);
assert.ok(Math.abs(metrics.locatableEvidenceRate - (2 / 3)) < 1e-12);

const contract = S.contract();
const mac013 = contract.candidateCapabilities.find(c => c.id === 'MAC-013');
assert.ok(mac013, 'MAC-013 must remain present in the contract.');
assert.strictEqual(mac013.status, 'CANDIDATE', 'This eval must not promote MAC-013 automatically.');
assert.strictEqual(contract.evidenceFidelity.humanOnlyAdjudication, true);

const gate = S.gate(state);
assert.strictEqual(gate.status, 'blocked', 'Evidence adjudication alone must not pass CHECK-008.');
assert.strictEqual(gate.approvalAllowed, false, 'Evidence adjudication alone must not allow unrestricted approval.');

const packet = S.exportPacket(state);
assert.strictEqual(packet.evidenceFidelity.specialist.reviewedFindings, 6);
assert.strictEqual(Object.keys(packet.evidenceFidelity.reviews).length, 6);

const report = {
  schema: 'mac-013-reference-eval-report-v1',
  fixture: 'synthetic-review-memo-001',
  verdict: 'PASS',
  candidateStatus: mac013.status,
  cases: cases.length,
  referenceDistribution: referenceCounts,
  metrics,
  gateUnchanged: gate.status === 'blocked' && gate.approvalAllowed === false,
  applied
};

console.log(JSON.stringify(report, null, 2));
