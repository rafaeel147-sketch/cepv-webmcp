const fs = require('fs');
const vm = require('vm');
const assert = require('assert');
const path = require('path');

const storage = new Map();
const sandbox = {
  console,
  Date,
  Math,
  JSON,
  crypto: { randomUUID: (() => { let n = 0; return () => `uuid-${++n}`; })() },
  localStorage: {
    getItem: k => storage.has(k) ? storage.get(k) : null,
    setItem: (k, v) => storage.set(k, v),
    removeItem: k => storage.delete(k)
  }
};
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'state.js'), 'utf8'), sandbox);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'evidence-fidelity.js'), 'utf8'), sandbox);
const S = sandbox.CEPVState;

function test(name, fn) {
  try { fn(); console.log(`PASS ${name}`); }
  catch (e) { console.error(`FAIL ${name}:`, e.message); process.exitCode = 1; }
}

function addSpecialistFinding(state, summary) {
  return S.submitFinding(state, {
    run: 'specialist',
    checkId: 'CHECK-005',
    summary,
    evidence: `Evidence for ${summary}`,
    severity: 'medium'
  }, 'agent');
}

test('MAC-013 is exposed as candidate capability', () => {
  const mac = S.contract().candidateCapabilities.find(c => c.id === 'MAC-013');
  assert.ok(mac);
  assert.strictEqual(mac.status, 'CANDIDATE');
});

test('supported/misinterpreted/unsupported produce one-third rates', () => {
  const s = S.freshState();
  const a = addSpecialistFinding(s, 'Finding A');
  const b = addSpecialistFinding(s, 'Finding B');
  const c = addSpecialistFinding(s, 'Finding C');
  S.reviewEvidence(a.id, 'supported');
  S.reviewEvidence(b.id, 'misinterpreted');
  S.reviewEvidence(c.id, 'unsupported');
  const m = S.evidenceMetrics(s, 'specialist');
  assert.strictEqual(m.reviewedFindings, 3);
  assert.strictEqual(m.supported, 1);
  assert.strictEqual(m.misinterpreted, 1);
  assert.strictEqual(m.unsupported, 1);
  assert.strictEqual(m.reviewCoverage, 1);
  assert.ok(Math.abs(m.evidenceFidelityRate - (1 / 3)) < 1e-12);
  assert.ok(Math.abs(m.unsupportedFindingRate - (1 / 3)) < 1e-12);
  assert.ok(Math.abs(m.misinterpretationRate - (1 / 3)) < 1e-12);
  assert.ok(Math.abs(m.locatableEvidenceRate - (2 / 3)) < 1e-12);
});

test('unreviewed findings lower review coverage without changing reviewed denominator', () => {
  const s = S.freshState();
  const a = addSpecialistFinding(s, 'Finding A');
  addSpecialistFinding(s, 'Finding B');
  S.reviewEvidence(a.id, 'supported');
  const m = S.evidenceMetrics(s, 'specialist');
  assert.strictEqual(m.totalFindings, 2);
  assert.strictEqual(m.reviewedFindings, 1);
  assert.strictEqual(m.unreviewedFindings, 1);
  assert.strictEqual(m.reviewCoverage, 0.5);
  assert.strictEqual(m.evidenceFidelityRate, 1);
  assert.strictEqual(m.unsupportedFindingRate, 0);
});

test('evidence review persists in local storage', () => {
  const s = S.freshState();
  const f = addSpecialistFinding(s, 'Persistent');
  S.reviewEvidence(f.id, 'unsupported', 'Source text not found');
  const r = S.getEvidenceReview(f.id);
  assert.strictEqual(r.status, 'unsupported');
  assert.strictEqual(r.note, 'Source text not found');
  assert.ok(r.reviewedAt);
});

test('audit export contains evidence fidelity metrics and reviews', () => {
  const s = S.freshState();
  const f = addSpecialistFinding(s, 'Exported');
  S.reviewEvidence(f.id, 'supported');
  const packet = S.exportPacket(s);
  assert.ok(packet.evidenceFidelity);
  assert.strictEqual(packet.evidenceFidelity.specialist.supported, 1);
  assert.strictEqual(packet.evidenceFidelity.reviews[f.id].status, 'supported');
});

test('reset clears evidence fidelity reviews', () => {
  const s = S.freshState();
  const f = addSpecialistFinding(s, 'Reset');
  S.reviewEvidence(f.id, 'unsupported');
  S.resetState();
  assert.strictEqual(S.getEvidenceReview(f.id).status, 'unreviewed');
});

test('agent cannot self-certify evidence through existing agent state API', () => {
  assert.strictEqual(typeof S.reviewEvidence, 'function');
  assert.strictEqual(S.contract().evidenceFidelity.humanOnlyAdjudication, true);
});
