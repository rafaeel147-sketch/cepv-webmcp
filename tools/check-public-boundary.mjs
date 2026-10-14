#!/usr/bin/env node
// Prevent accidentally shipping CEPV's separate Python engine and secrets in
// this public WebMCP demonstration repository. This does not make existing
// browser JavaScript confidential or revoke existing open-source licenses.
import { execFileSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";

const paths = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" })
  .split("\0").filter(Boolean);
const errors = [];
const forbiddenPath = [
  { name: "motor privado ou fonte Python do CEPV", regex: /(^|\/)(engine_original|engine_only|private_engine|protected_core|src\/cepv)(\/|$)/i },
  { name: "pacote de implementação original", regex: /(^|\/)(CEPV_Editorial_Engine[^/]*\.(zip|tar|tgz|gz)|CEPV_v[0-9][^/]*_MVP_FINAL[^/]*\.zip)$/i },
  { name: "instalador contendo motor ou patch Codex privado", regex: /(^|\/)(Instalar_CEPV_v0\.[89]_Termux\.sh|Atualizar_CEPV_v0\.9_Codex\.sh)$/i },
  { name: "segredos e arquivos de ambiente", regex: /(^|\/)(\.env($|\.(?!example$|sample$)[^/]+)|\.dev\.vars$|credentials\.json$|service-account[^/]*\.json$|[^/]+\.(pem|p12|pfx|key))$/i },
  { name: "pacote de ground truth reservado", regex: /(^|\/)(reserved_ground_truth|private_benchmark|benchmark_private|validation_secrets)(\/|$)/i },
];
const forbiddenText = [
  { name: "payload de instalador privado incorporado", regex: /__CEPV_(?:ARCHIVE|V09_PATCH)_BELOW__/ },
  { name: "chave OpenAI com prefixo reconhecível", regex: /\bsk-(?:proj-|svcacct-)?[a-zA-Z0-9_-]{24,}\b/ },
  { name: "token pessoal GitHub", regex: /\b(?:ghp_|gho_|ghu_|ghs_|github_pat_)[a-zA-Z0-9_]{20,}\b/ },
  { name: "chave privada PEM", regex: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
];
for (const file of paths) {
  // Don't interpret this prevention tool's own detection patterns as a leak.
  if (file === "tools/check-public-boundary.mjs") continue;
  for (const rule of forbiddenPath) {
    if (rule.regex.test(file)) errors.push(`Arquivo reservado: ${file} [${rule.name}]`);
  }
  try {
    if (statSync(file).size > 1_000_000) continue;
    if (!/\.(?:js|mjs|cjs|ts|tsx|jsx|py|sh|json|html|txt|md|yml|yaml)$/i.test(file)) continue;
    const data = readFileSync(file, "utf8");
    for (const rule of forbiddenText) {
      if (rule.regex.test(data)) errors.push(`Conteúdo reservado: ${file} [${rule.name}]`);
    }
  } catch (error) {
    errors.push(`Não foi possível examinar: ${file} (${error.message})`);
  }
}
if (errors.length) {
  console.error("\nBLOQUEADO — arquivos ou segredos possivelmente privados detectados:");
  for (const e of errors) console.error(" - " + e);
  console.error("\nNão publique este commit. Revise os arquivos e preserve o CEPV original fora do repositório público.");
  process.exit(1);
}
console.log(`FRONTEIRA PÚBLICA OK: ${paths.length} arquivos rastreados analisados; motor original não identificado.`);
