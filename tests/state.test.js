const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const storage = new Map();
const sandbox = {
  console,
  Date,
  Math,
  JSON,
  crypto: { randomUUID: (() => { let n = 0; return () => `uuid-${++n}`; })() },
  localStorage: {
    getItem: k => storage.has(k) ? storage.get(k) : null,
    setItem: (k,v) => storage.set(k,v),
    removeItem: k => storage.delete(k)
  }
};
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(require('path').join(__dirname, '..', 'state.js'), 'utf8'), sandbox);
const S = sandbox.CEPVState;

function test(name, fn) {
  try { fn(); console.log(`PASS ${name}`); }
  catch (e) { console.error(`FAIL ${name}:`, e.message); process.exitCode = 1; }
}

test('contract has eight checks', () => assert.strictEqual(S.contract().checks.length, 8));
test('CHECK-008 is derived', () => assert.strictEqual(S.contract().checks.find(c => c.id === 'CHECK-008').derived, true));
test('fresh gate blocks not-run work', () => assert.strictEqual(S.gate(S.freshState()).approvalAllowed, false));
test('agent cannot record CHECK-008', () => assert.throws(() => S.recordCheck(S.freshState(), { checkId:'CHECK-008', status:'passed', note:'x' })));
test('finding without evidence is rejected', () => assert.throws(() => S.submitFinding(S.freshState(), { run:'specialist', checkId:'CHECK-005', summary:'Issue', evidence:'', severity:'medium' }, 'agent')));
test('baseline finding does not require specialist check', () => {
  const s=S.freshState(); const f=S.submitFinding(s,{run:'baseline',summary:'Issue',evidence:'Observed text',severity:'low'},'agent'); assert.strictEqual(f.checkId,null);
});
test('agent finding stays pending human validation', () => {
  const s=S.freshState(); const f=S.submitFinding(s,{run:'specialist',checkId:'CHECK-005',summary:'Issue',evidence:'Observed text',severity:'medium'},'agent'); assert.strictEqual(f.status,'pending_human_validation');
});
test('blocked check remains visible and blocks gate', () => {
  const s=S.freshState(); S.recordCheck(s,{checkId:'CHECK-001',status:'blocked',note:'tool unavailable'}); assert.strictEqual(s.specialistChecks['CHECK-001'].status,'blocked'); assert.strictEqual(S.gate(s).approvalAllowed,false);
});
test('all passed plus no findings allows gate', () => {
  const s=S.freshState(); for (const c of S.CHECKS.filter(c=>!c.derived)) S.recordCheck(s,{checkId:c.id,status:'passed',note:'executed'}); assert.strictEqual(S.gate(s).approvalAllowed,true);
});
test('confirmed issue blocks gate even after all checks pass', () => {
  const s=S.freshState(); for (const c of S.CHECKS.filter(c=>!c.derived)) S.recordCheck(s,{checkId:c.id,status:'passed',note:'executed'}); const f=S.submitFinding(s,{run:'specialist',checkId:'CHECK-005',summary:'Issue',evidence:'Evidence',severity:'high'},'agent'); S.humanReviewFinding(s,f.id,'confirmed_issue'); assert.strictEqual(S.gate(s).approvalAllowed,false);
});
test('rejected finding does not block gate after all checks pass', () => {
  const s=S.freshState(); for (const c of S.CHECKS.filter(c=>!c.derived)) S.recordCheck(s,{checkId:c.id,status:'passed',note:'executed'}); const f=S.submitFinding(s,{run:'specialist',checkId:'CHECK-005',summary:'Issue',evidence:'Evidence',severity:'high'},'agent'); S.humanReviewFinding(s,f.id,'rejected'); assert.strictEqual(S.gate(s).approvalAllowed,true);
});
test('audit export contains trace and gate', () => {
  const p=S.exportPacket(S.freshState()); assert.ok(Array.isArray(p.trace)); assert.strictEqual(p.finalGate.checkId,'CHECK-008');
});
