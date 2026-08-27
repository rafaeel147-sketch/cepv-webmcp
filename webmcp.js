(function (global) {
  'use strict';

  const registeredControllers = [];

  function stringify(value) {
    return JSON.stringify(value, null, 2);
  }

  function toolResult(value) {
    return stringify(value);
  }

  async function registerTool(definition) {
    const ctx = document.modelContext;
    const controller = new AbortController();
    await ctx.registerTool(definition, { signal: controller.signal });
    registeredControllers.push(controller);
  }

  async function registerAll(onStateChange) {
    if (!document.modelContext || typeof document.modelContext.registerTool !== 'function') {
      return { supported: false, registered: 0, errors: [] };
    }

    const tools = [
      {
        name: 'cepv_get_contract',
        description: 'Use this when you need the frozen CEPV specialist contract, mandatory checks, invariants, benchmark separation rule, and validation boundary before performing work.',
        inputSchema: { type: 'object', properties: {}, additionalProperties: false },
        annotations: { readOnlyHint: true },
        execute: async () => toolResult(CEPVState.contract())
      },
      {
        name: 'cepv_run_preflight',
        description: 'Use this before claiming a CEPV specialist run is complete. It reports all CHECK-001..CHECK-007 states and derives CHECK-008 without hiding not_run, blocked, failed, pending, or confirmed findings.',
        inputSchema: { type: 'object', properties: {}, additionalProperties: false },
        annotations: { readOnlyHint: true },
        execute: async () => {
          const state = CEPVState.loadState();
          return toolResult({ sessionId: state.sessionId, specialistChecks: state.specialistChecks, finalGate: CEPVState.gate(state) });
        }
      },
      {
        name: 'cepv_record_check_result',
        description: 'Use this after actually exercising one specialist check. Record CHECK-001..CHECK-007 as passed, blocked, or failed with a trace note. Never use this to mark CHECK-008; the final gate is derived automatically.',
        inputSchema: {
          type: 'object',
          properties: {
            check_id: { type: 'string', enum: ['CHECK-001','CHECK-002','CHECK-003','CHECK-004','CHECK-005','CHECK-006','CHECK-007'] },
            status: { type: 'string', enum: ['passed','blocked','failed'] },
            note: { type: 'string', minLength: 1, maxLength: 4000 }
          },
          required: ['check_id','status','note'],
          additionalProperties: false
        },
        annotations: { readOnlyHint: false },
        execute: async ({ check_id, status, note }) => {
          const state = CEPVState.loadState();
          CEPVState.recordCheck(state, { checkId: check_id, status, note });
          if (onStateChange) onStateChange();
          return toolResult({ recorded: state.specialistChecks[check_id], finalGate: CEPVState.gate(state) });
        }
      },
      {
        name: 'cepv_submit_candidate_finding',
        description: 'Use this when you have a concrete finding with evidence. Submit it to the baseline or CEPV specialist lane. Specialist findings must reference CHECK-001..CHECK-007. Every agent-submitted finding stays pending human validation.',
        inputSchema: {
          type: 'object',
          properties: {
            run: { type: 'string', enum: ['baseline','specialist'] },
            check_id: { type: 'string', enum: ['CHECK-001','CHECK-002','CHECK-003','CHECK-004','CHECK-005','CHECK-006','CHECK-007'] },
            summary: { type: 'string', minLength: 3, maxLength: 1000 },
            evidence: { type: 'string', minLength: 3, maxLength: 4000 },
            severity: { type: 'string', enum: ['low','medium','high','critical'] }
          },
          required: ['run','summary','evidence','severity'],
          additionalProperties: false
        },
        annotations: { readOnlyHint: false },
        execute: async ({ run, check_id, summary, evidence, severity }) => {
          const state = CEPVState.loadState();
          const finding = CEPVState.submitFinding(state, { run, checkId: check_id, summary, evidence, severity }, 'agent');
          if (onStateChange) onStateChange();
          return toolResult({ finding, validationBoundary: 'pending_human_validation — only the human UI can confirm or reject this finding', finalGate: CEPVState.gate(state) });
        }
      },
      {
        name: 'cepv_list_findings',
        description: 'Use this to inspect recorded baseline and specialist findings without changing them. You can filter by run and human-validation status.',
        inputSchema: {
          type: 'object',
          properties: {
            run: { type: 'string', enum: ['all','baseline','specialist'] },
            status: { type: 'string', enum: ['all','pending_human_validation','confirmed_issue','rejected'] }
          },
          additionalProperties: false
        },
        annotations: { readOnlyHint: true },
        execute: async ({ run = 'all', status = 'all' } = {}) => {
          const state = CEPVState.loadState();
          return toolResult({ findings: CEPVState.listFindings(state, { run, status }), finalGate: CEPVState.gate(state) });
        }
      },
      {
        name: 'cepv_export_audit_packet',
        description: 'Use this when you need a traceable snapshot of the current CEPV WebMCP session: artifact metadata, contract, check states, derived final gate, findings, and event trace.',
        inputSchema: { type: 'object', properties: {}, additionalProperties: false },
        annotations: { readOnlyHint: true },
        execute: async () => toolResult(CEPVState.exportPacket(CEPVState.loadState()))
      }
    ];

    const errors = [];
    let registered = 0;
    for (const tool of tools) {
      try {
        await registerTool(tool);
        registered += 1;
      } catch (error) {
        errors.push({ tool: tool.name, message: String(error && error.message ? error.message : error) });
      }
    }
    return { supported: true, registered, errors };
  }

  function unregisterAll() {
    while (registeredControllers.length) {
      try { registeredControllers.pop().abort(); } catch (_) {}
    }
  }

  global.CEPVWebMCP = { registerAll, unregisterAll };
})(typeof window !== 'undefined' ? window : globalThis);
