const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const assert = require('assert');

const dir = __dirname;
const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'packet.sha256.json'), 'utf8'));
assert.strictEqual(manifest.schema, 'mac-013-blind-packet-integrity-v1');
assert.strictEqual(manifest.fixture, 'synthetic-blind-memo-002');
assert.strictEqual(manifest.algorithm, 'sha256');

const names = Object.keys(manifest.files).sort();
assert.deepStrictEqual(names, ['AGENT_PROMPT.txt', 'blind_cases.json', 'predictions.template.json', 'source.txt']);

for (const name of names) {
  const bytes = fs.readFileSync(path.join(dir, name));
  const actual = crypto.createHash('sha256').update(bytes).digest('hex');
  assert.strictEqual(actual, manifest.files[name], `${name}: SHA-256 mismatch`);
}

const composite = names.map(name => `${name} ${manifest.files[name]}\n`).join('');
const packetSha256 = crypto.createHash('sha256').update(composite).digest('hex');
assert.strictEqual(packetSha256, manifest.packetSha256, 'Composite packet SHA-256 mismatch');

console.log(JSON.stringify({
  schema: manifest.schema,
  fixture: manifest.fixture,
  filesVerified: names.length,
  packetSha256
}, null, 2));
