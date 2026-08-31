const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');
const assert = require('assert');

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mac013-freeze-'));
const predictionsPath = path.join(dir, 'predictions.json');
const manifestPath = path.join(dir, 'manifest.json');
const outDir = path.join(dir, 'frozen');

const predictions = {
  schema: 'mac-013-blind-predictions-v1',
  fixture: 'synthetic-blind-memo-002',
  model: 'test-model-clean-instance',
  runId: 'test-run-001',
  predictions: Array.from({ length: 9 }, (_, i) => ({
    id: `blind-${String(i + 1).padStart(3, '0')}`,
    status: ['supported', 'misinterpreted', 'unsupported'][i % 3]
  }))
};
const manifest = {
  schema: 'mac-013-blind-run-manifest-v1',
  fixture: 'synthetic-blind-memo-002',
  model: predictions.model,
  runId: predictions.runId,
  promptFile: 'AGENT_PROMPT.txt',
  sourceFile: 'source.txt',
  casesFile: 'blind_cases.json',
  predictionSchemaFile: 'predictions.template.json',
  toolPolicy: 'source-and-cases-only',
  referenceVisibleBeforeFreeze: false,
  notes: 'self-test only'
};
fs.writeFileSync(predictionsPath, JSON.stringify(predictions));
fs.writeFileSync(manifestPath, JSON.stringify(manifest));

let result = spawnSync(process.execPath, [path.join(__dirname, 'freeze.js'), predictionsPath, manifestPath, outDir], { encoding: 'utf8' });
assert.strictEqual(result.status, 0, result.stderr);
const receipt = JSON.parse(fs.readFileSync(path.join(outDir, 'freeze-receipt.json'), 'utf8'));
const frozenPredictions = fs.readFileSync(path.join(outDir, 'predictions.json'), 'utf8');
const frozenManifest = fs.readFileSync(path.join(outDir, 'run-manifest.json'), 'utf8');
assert.strictEqual(receipt.predictionsSha256, crypto.createHash('sha256').update(frozenPredictions).digest('hex'));
assert.strictEqual(receipt.manifestSha256, crypto.createHash('sha256').update(frozenManifest).digest('hex'));
assert.strictEqual(receipt.referenceVisibleBeforeFreeze, false);

result = spawnSync(process.execPath, [path.join(__dirname, 'freeze.js'), predictionsPath, manifestPath, outDir], { encoding: 'utf8' });
assert.notStrictEqual(result.status, 0, 'A second freeze into the same directory must fail instead of overwriting evidence.');

const badManifest = { ...manifest, referenceVisibleBeforeFreeze: true };
fs.writeFileSync(path.join(dir, 'bad-manifest.json'), JSON.stringify(badManifest));
result = spawnSync(process.execPath, [path.join(__dirname, 'freeze.js'), predictionsPath, path.join(dir, 'bad-manifest.json'), path.join(dir, 'bad-out')], { encoding: 'utf8' });
assert.notStrictEqual(result.status, 0, 'A non-blind manifest must be rejected.');

console.log('PASS MAC-013 blind prediction freeze self-test');
