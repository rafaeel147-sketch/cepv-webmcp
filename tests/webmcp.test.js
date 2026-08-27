const fs = require('fs');
const vm = require('vm');
const assert = require('assert');
const path = require('path');

function load(withContext = true, failName = null) {
  const registered = [];
  const storage = new Map();
  const sandbox = {
    console, Date, Math, JSON, AbortController,
    crypto: { randomUUID: () => 'test-uuid' },
    localStorage: { getItem:k=>storage.get(k)||null, setItem:(k,v)=>storage.set(k,v) },
    document: withContext ? {
      modelContext: {
        registerTool: async (def) => {
          if (def.name === failName) throw new Error('injected registration failure');
          registered.push(def);
        }
      }
    } : {},
    globalThis: null
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(__dirname,'..','state.js'),'utf8'), sandbox);
  vm.runInContext(fs.readFileSync(path.join(__dirname,'..','webmcp.js'),'utf8'), sandbox);
  return { sandbox, registered };
}

(async () => {
  const a = load(true);
  const status = await a.sandbox.CEPVWebMCP.registerAll();
  assert.strictEqual(status.supported, true);
  assert.strictEqual(status.registered, 6);
  assert.strictEqual(status.errors.length, 0);
  assert.strictEqual(new Set(a.registered.map(t=>t.name)).size, 6);
  assert.ok(a.registered.every(t => t.inputSchema && t.inputSchema.type === 'object'));
  assert.ok(a.registered.find(t=>t.name==='cepv_get_contract').annotations.readOnlyHint);
  assert.strictEqual(a.registered.find(t=>t.name==='cepv_submit_candidate_finding').annotations.readOnlyHint, false);
  console.log('PASS registers six unique schema-backed tools');

  const b = load(false);
  const noCtx = await b.sandbox.CEPVWebMCP.registerAll();
  assert.deepStrictEqual(JSON.parse(JSON.stringify(noCtx)), { supported:false, registered:0, errors:[] });
  console.log('PASS graceful fallback without WebMCP');

  const c = load(true, 'cepv_record_check_result');
  const partial = await c.sandbox.CEPVWebMCP.registerAll();
  assert.strictEqual(partial.supported, true);
  assert.strictEqual(partial.registered, 5);
  assert.strictEqual(partial.errors.length, 1);
  assert.strictEqual(partial.errors[0].tool, 'cepv_record_check_result');
  console.log('PASS isolated registration failure does not hide other tools');
})().catch(err => { console.error(err); process.exit(1); });
