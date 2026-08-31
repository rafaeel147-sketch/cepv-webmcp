const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

const [predictionsPath, manifestPath, outDirArg] = process.argv.slice(2);
if (!predictionsPath || !manifestPath) {
  console.error('Usage: node freeze.js predictions.json run-manifest.json [output-dir]');
  process.exit(2);
}

const allowed = new Set(['supported', 'misinterpreted', 'unsupported']);
const requiredIds = Array.from({ length: 9 }, (_, i) => `blind-${String(i + 1).padStart(3, '0')}`);
const predictions = JSON.parse(fs.readFileSync(predictionsPath, 'utf8'));
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

function fail(message) { throw new Error(message); }
function cleanString(v) { return typeof v === 'string' && v.trim() && !v.includes('REPLACE_WITH'); }

if (predictions.schema !== 'mac-013-blind-predictions-v1') fail('Invalid prediction schema.');
if (predictions.fixture !== 'synthetic-blind-memo-002') fail('Invalid prediction fixture.');
if (!cleanString(predictions.model) || !cleanString(predictions.runId)) fail('Predictions require concrete model and runId.');
if (!Array.isArray(predictions.predictions) || predictions.predictions.length !== 9) fail('Exactly nine predictions are required.');
const ids = predictions.predictions.map(p => p.id);
if (new Set(ids).size !== 9 || requiredIds.some(id => !ids.includes(id))) fail('Prediction IDs must be blind-001..blind-009 exactly once.');
for (const p of predictions.predictions) if (!allowed.has(p.status)) fail(`Invalid status for ${p.id}.`);

if (manifest.schema !== 'mac-013-blind-run-manifest-v1') fail('Invalid run manifest schema.');
if (manifest.fixture !== predictions.fixture) fail('Manifest/prediction fixture mismatch.');
if (manifest.model !== predictions.model || manifest.runId !== predictions.runId) fail('Manifest/prediction model or runId mismatch.');
if (manifest.referenceVisibleBeforeFreeze !== false) fail('Blind run cannot declare reference visibility before freeze.');
if (manifest.toolPolicy !== 'source-and-cases-only') fail('Unexpected tool policy.');

const canonicalPredictions = JSON.stringify(predictions, null, 2) + '\n';
const canonicalManifest = JSON.stringify(manifest, null, 2) + '\n';
const predictionsSha256 = crypto.createHash('sha256').update(canonicalPredictions).digest('hex');
const manifestSha256 = crypto.createHash('sha256').update(canonicalManifest).digest('hex');
const frozenAt = new Date().toISOString();
const receipt = {
  schema: 'mac-013-blind-freeze-receipt-v1',
  fixture: predictions.fixture,
  model: predictions.model,
  runId: predictions.runId,
  frozenAt,
  predictionsSha256,
  manifestSha256,
  referenceVisibleBeforeFreeze: false
};

const outDir = outDirArg || path.join(process.cwd(), 'frozen', predictions.runId);
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'predictions.json'), canonicalPredictions, { flag: 'wx' });
fs.writeFileSync(path.join(outDir, 'run-manifest.json'), canonicalManifest, { flag: 'wx' });
fs.writeFileSync(path.join(outDir, 'freeze-receipt.json'), JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify(receipt, null, 2));
