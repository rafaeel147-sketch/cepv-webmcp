const assert = require('assert');
const { score } = require('./score-lib');

const cases = [
  { id: 'a', summary: 'one', evidence: 'one' },
  { id: 'b', summary: 'two', evidence: 'two' },
  { id: 'c', summary: 'three', evidence: 'three' },
  { id: 'd', summary: 'four', evidence: 'four' },
  { id: 'e', summary: 'five', evidence: 'five' },
  { id: 'f', summary: 'six', evidence: 'six' }
];
const reference = {
  schema: 'mac-013-blind-reference-v1',
  fixture: 'selftest',
  labels: [
    { id: 'a', expected: 'supported' },
    { id: 'b', expected: 'supported' },
    { id: 'c', expected: 'misinterpreted' },
    { id: 'd', expected: 'misinterpreted' },
    { id: 'e', expected: 'unsupported' },
    { id: 'f', expected: 'unsupported' }
  ]
};
const predictions = {
  schema: 'mac-013-blind-predictions-v1',
  fixture: 'selftest',
  predictions: [
    { id: 'a', status: 'supported' },
    { id: 'b', status: 'supported' },
    { id: 'c', status: 'misinterpreted' },
    { id: 'd', status: 'supported' },
    { id: 'e', status: 'unsupported' },
    { id: 'f', status: 'unsupported' }
  ]
};

const result = score(cases, reference, predictions);
assert.strictEqual(result.total, 6);
assert.strictEqual(result.correct, 5);
assert.ok(Math.abs(result.accuracy - (5 / 6)) < 1e-12);
assert.strictEqual(result.confusion.misinterpreted.supported, 1);
assert.strictEqual(result.errors.length, 1);
assert.strictEqual(result.errors[0].id, 'd');
assert.ok(result.macroF1 > 0 && result.macroF1 < 1);
console.log('PASS MAC-013 blind scorer self-test');
