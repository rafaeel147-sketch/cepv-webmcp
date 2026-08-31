const crypto = require('crypto');

const STATUSES = Object.freeze(['supported', 'misinterpreted', 'unsupported']);

function sha256Bytes(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function validateCases(cases) {
  if (!Array.isArray(cases) || cases.length === 0) throw new Error('blind cases must be a non-empty array');
  const ids = new Set();
  for (const c of cases) {
    if (!c || typeof c !== 'object') throw new Error('invalid blind case');
    if (!c.id || !c.summary || !c.evidence) throw new Error(`incomplete blind case: ${c && c.id ? c.id : '<missing-id>'}`);
    if (ids.has(c.id)) throw new Error(`duplicate case id: ${c.id}`);
    ids.add(c.id);
  }
  return ids;
}

function validateReference(reference, caseIds) {
  if (!reference || reference.schema !== 'mac-013-blind-reference-v1') throw new Error('invalid reference schema');
  if (!Array.isArray(reference.labels)) throw new Error('reference labels are required');
  const labels = new Map();
  for (const row of reference.labels) {
    if (!row || !caseIds.has(row.id)) throw new Error(`unknown reference case: ${row && row.id}`);
    if (!STATUSES.includes(row.expected)) throw new Error(`invalid reference status for ${row.id}`);
    if (labels.has(row.id)) throw new Error(`duplicate reference label: ${row.id}`);
    labels.set(row.id, row.expected);
  }
  if (labels.size !== caseIds.size) throw new Error('reference must label every blind case exactly once');
  return labels;
}

function validatePredictions(payload, caseIds, fixture) {
  if (!payload || payload.schema !== 'mac-013-blind-predictions-v1') throw new Error('invalid predictions schema');
  if (payload.fixture !== fixture) throw new Error('prediction fixture does not match reference fixture');
  if (!Array.isArray(payload.predictions)) throw new Error('predictions array is required');
  const predictions = new Map();
  for (const row of payload.predictions) {
    if (!row || !caseIds.has(row.id)) throw new Error(`unknown prediction case: ${row && row.id}`);
    if (!STATUSES.includes(row.status)) throw new Error(`invalid prediction status for ${row.id}`);
    if (predictions.has(row.id)) throw new Error(`duplicate prediction: ${row.id}`);
    predictions.set(row.id, row.status);
  }
  if (predictions.size !== caseIds.size) throw new Error('predictions must classify every blind case exactly once');
  return predictions;
}

function score(cases, reference, predictionPayload) {
  const caseIds = validateCases(cases);
  const referenceLabels = validateReference(reference, caseIds);
  const predictions = validatePredictions(predictionPayload, caseIds, reference.fixture);

  const confusion = Object.fromEntries(STATUSES.map(expected => [expected, Object.fromEntries(STATUSES.map(predicted => [predicted, 0]))]));
  const errors = [];
  let correct = 0;

  for (const c of cases) {
    const expected = referenceLabels.get(c.id);
    const predicted = predictions.get(c.id);
    confusion[expected][predicted] += 1;
    if (expected === predicted) correct += 1;
    else errors.push({ id: c.id, expected, predicted });
  }

  const perClass = {};
  for (const status of STATUSES) {
    const tp = confusion[status][status];
    const fp = STATUSES.reduce((sum, expected) => sum + (expected === status ? 0 : confusion[expected][status]), 0);
    const fn = STATUSES.reduce((sum, predicted) => sum + (predicted === status ? 0 : confusion[status][predicted]), 0);
    const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
    const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
    const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;
    perClass[status] = { precision, recall, f1, support: tp + fn };
  }

  const macroF1 = STATUSES.reduce((sum, s) => sum + perClass[s].f1, 0) / STATUSES.length;
  return {
    total: cases.length,
    correct,
    accuracy: correct / cases.length,
    macroF1,
    confusion,
    perClass,
    errors
  };
}

module.exports = { STATUSES, sha256Bytes, validateCases, validateReference, validatePredictions, score };
