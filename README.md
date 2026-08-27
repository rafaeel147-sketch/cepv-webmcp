# CEPV × WebMCP

**Auditable human-agent specialist execution for the OpenAI WebMCP Challenge.**

[![CEPV WebMCP verification](https://github.com/rafaeel147-sketch/cepv-webmcp/actions/workflows/verify.yml/badge.svg)](https://github.com/rafaeel147-sketch/cepv-webmcp/actions/workflows/verify.yml)

CEPV — **Companheiros Especialistas com Progresso Validado** — is a pre-existing project for making specialist AI execution explicit, traceable and measurable. This repository contains the **new WebMCP adapter created during the Challenge period**; it does not replace or rewrite the original CEPV engine.

## Preserved CEPV core

**Versioned Specialist Profile → Execution Contract → Checks → Results → Evidence → Human Validation → Evaluation → Validated Progress**

The adapter preserves these controls:

- CHECK-001..CHECK-008 remain visible;
- CHECK-008 is a derived final gate and cannot be directly marked passed;
- `blocked` and `failed` are never silently treated as `passed`;
- findings require evidence;
- coverage is not accuracy;
- baseline and specialist findings remain distinct;
- agent-submitted findings stay `pending_human_validation`;
- human confirmation/rejection is intentionally **not** exposed as a WebMCP tool.

## WebMCP tool surface

The static page uses the current imperative browser API through `document.modelContext.registerTool(...)` and registers six tools when WebMCP is available:

1. `cepv_get_contract`
2. `cepv_run_preflight`
3. `cepv_record_check_result`
4. `cepv_submit_candidate_finding`
5. `cepv_list_findings`
6. `cepv_export_audit_packet`

If WebMCP is unavailable, the human UI remains usable and reports that tool registration is unavailable.

## Privacy and benchmark isolation

- No API key is embedded in this app.
- No external network call is made by the runtime.
- Demo state is stored locally with `localStorage`.
- Artifact notes can be fingerprinted locally with SHA-256.
- Reserved benchmark ground truth and confirmatory source documents are not embedded.
- The UI asks for synthetic or public demo material only.

## Verification status

Automated/local verification completed before this dedicated repository was populated, and the same verification is now enforced by GitHub Actions on pushes and pull requests.

- JavaScript syntax checks: PASS (`state.js`, `webmcp.js`, `app.js`)
- CEPV state/invariant tests: **12/12 PASS**
- WebMCP registration/fallback tests: **3/3 PASS**
- total deterministic tests: **15/15 PASS**
- static HTTP smoke test: PASS
- dedicated-repository GitHub Actions verification: **PASS**

A real WebMCP-capable browser end-to-end run is still required before final submission. See [`TEST_PLAN.md`](TEST_PLAN.md).

Run the deterministic tests with Node:

```bash
node tests/state.test.js
node tests/webmcp.test.js
node --check state.js
node --check webmcp.js
node --check app.js
```

For a normal local browser preview:

```bash
python -m http.server 8080
```

Then open `http://localhost:8080/`.

## Challenge provenance

The public CEPV landing page predates the Challenge submission window: commit `6ede5d4ebcf7d3622649703f0b7b3682fa04b796`, dated **2026-08-20**, in `rafaeel147-sketch/antes-do-primeiro-gole1`.

The exact pre-existing/new-work boundary is documented in [`CHALLENGE_CHANGELOG.md`](CHALLENGE_CHANGELOG.md).

## License

This dedicated Challenge repository is licensed under the **Apache License 2.0**. See [`LICENSE`](LICENSE).
