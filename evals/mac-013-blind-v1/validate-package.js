const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { validateCases } = require('./score-lib');

const source = fs.readFileSync(path.join(__dirname, 'source.txt'), 'utf8');
const cases = JSON.parse(fs.readFileSync(path.join(__dirname, 'blind_cases.json'), 'utf8'));
const commitment = fs.readFileSync(path.join(__dirname, 'reference.sha256'), 'utf8').trim();

assert.ok(source.includes('CEPV Synthetic Blind Memo — Fixture 002'));
const ids = validateCases(cases);
assert.strictEqual(ids.size, 9, 'Blind v1 must expose exactly nine unlabeled cases.');
assert.match(commitment, /^[a-f0-9]{64}$/, 'Reference commitment must be a SHA-256 hex digest.');
assert.strictEqual(fs.existsSync(path.join(__dirname, 'reference.private.json')), false, 'Private reference must never be committed into the public eval directory.');

const forbidden = new Set(['expected', 'status', 'label', 'classification', 'groundTruth', 'ground_truth']);
for (const c of cases) {
  for (const key of Object.keys(c)) {
    assert.ok(!forbidden.has(key), `${c.id}: public blind case leaks label-like key ${key}`);
  }
}

console.log(JSON.stringify({
  schema: 'mac-013-blind-package-validation-v1',
  verdict: 'PASS',
  cases: cases.length,
  referenceCommitment: commitment,
  privateReferenceCommitted: false
}, null, 2));
