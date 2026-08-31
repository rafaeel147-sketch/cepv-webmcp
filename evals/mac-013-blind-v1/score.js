const fs = require('fs');
const path = require('path');
const { sha256Bytes, score } = require('./score-lib');

const [predictionsPath, referencePath] = process.argv.slice(2);
if (!predictionsPath || !referencePath) {
  console.error('Usage: node score.js <predictions.json> <reference.private.json>');
  process.exit(2);
}

const cases = JSON.parse(fs.readFileSync(path.join(__dirname, 'blind_cases.json'), 'utf8'));
const commitment = fs.readFileSync(path.join(__dirname, 'reference.sha256'), 'utf8').trim();
const referenceBytes = fs.readFileSync(referencePath);
const actualHash = sha256Bytes(referenceBytes);
if (actualHash !== commitment) {
  throw new Error(`Reference hash mismatch: expected ${commitment}, got ${actualHash}`);
}

const reference = JSON.parse(referenceBytes.toString('utf8'));
const predictions = JSON.parse(fs.readFileSync(predictionsPath, 'utf8'));
const metrics = score(cases, reference, predictions);

const report = {
  schema: 'mac-013-blind-score-report-v1',
  fixture: reference.fixture,
  referenceCommitment: commitment,
  referenceHashVerified: true,
  model: predictions.model || null,
  runId: predictions.runId || null,
  metrics,
  candidateStatus: 'CANDIDATE',
  disclosure: 'This report measures blind evidence-fidelity classification on one synthetic fixture. It does not by itself validate MAC-013 or prove general model accuracy.'
};

console.log(JSON.stringify(report, null, 2));
