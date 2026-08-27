(function (global) {
  'use strict';

  const VERSION = '0.1.0-webmcp';
  const STORAGE_KEY = 'cepv-webmcp-state-v1';
  const CHECKS = Object.freeze([
    { id: 'CHECK-001', label: 'Extraction integrity' },
    { id: 'CHECK-002', label: 'Joined words / spacing defects' },
    { id: 'CHECK-003', label: 'Link validation' },
    { id: 'CHECK-004', label: 'QR validation' },
    { id: 'CHECK-005', label: 'Textual consistency' },
    { id: 'CHECK-006', label: 'Institutional wording' },
    { id: 'CHECK-007', label: 'Visual layout' },
    { id: 'CHECK-008', label: 'Final unresolved-findings gate', derived: true }
  ]);
  const INVARIANTS = Object.freeze([
    'I-01 — capability requires a recorded execution',
    'I-02 — a required check cannot disappear',
    'I-03 — blocked/failed are never treated as passed',
    'I-04 — coverage is not accuracy',
    'I-05 — individual feedback cannot mutate the global version',
    'I-06 — progress must remain traceable'
  ]);
  const SEVERITIES = Object.freeze(['low', 'medium', 'high', 'critical']);
  const CHECK_STATUSES = Object.freeze(['not_run', 'passed', 'blocked', 'failed']);
  const FINDING_STATUSES = Object.freeze(['pending_human_validation', 'confirmed_issue', 'rejected']);

  function freshState() {
    return {
      version: VERSION,
      sessionId: makeId('session'),
      createdAt: new Date().toISOString(),
      artifact: { label: 'Demo artifact', fingerprint: null, note: '' },
      specialistChecks: Object.fromEntries(CHECKS.filter(c => !c.derived).map(c => [c.id, {
        checkId: c.id,
        status: 'not_run',
        note: '',
        recordedAt: null
      }])),
      findings: [],
      eventLog: [{ type: 'session_created', at: new Date().toISOString() }]
    };
  }

  function makeId(prefix) {
    if (global.crypto && typeof global.crypto.randomUUID === 'function') {
      return `${prefix}-${global.crypto.randomUUID()}`;
    }
    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function loadState() {
    try {
      const raw = global.localStorage && global.localStorage.getItem(STORAGE_KEY);
      if (!raw) return freshState();
      const parsed = JSON.parse(raw);
      return normalizeState(parsed);
    } catch (_) {
      return freshState();
    }
  }

  function normalizeState(value) {
    const base = freshState();
    if (!value || typeof value !== 'object') return base;
    base.sessionId = typeof value.sessionId === 'string' ? value.sessionId : base.sessionId;
    base.createdAt = typeof value.createdAt === 'string' ? value.createdAt : base.createdAt;
    base.artifact = Object.assign(base.artifact, value.artifact || {});
    for (const check of CHECKS.filter(c => !c.derived)) {
      const incoming = value.specialistChecks && value.specialistChecks[check.id];
      if (!incoming) continue;
      base.specialistChecks[check.id] = {
        checkId: check.id,
        status: CHECK_STATUSES.includes(incoming.status) ? incoming.status : 'not_run',
        note: typeof incoming.note === 'string' ? incoming.note.slice(0, 4000) : '',
        recordedAt: typeof incoming.recordedAt === 'string' ? incoming.recordedAt : null
      };
    }
    base.findings = Array.isArray(value.findings) ? value.findings.filter(isValidStoredFinding).map(f => ({
      id: String(f.id),
      run: f.run === 'baseline' ? 'baseline' : 'specialist',
      checkId: f.run === 'baseline' ? null : (isCheckId(f.checkId) ? f.checkId : 'CHECK-005'),
      summary: String(f.summary).slice(0, 1000),
      evidence: String(f.evidence).slice(0, 4000),
      severity: SEVERITIES.includes(f.severity) ? f.severity : 'medium',
      status: FINDING_STATUSES.includes(f.status) ? f.status : 'pending_human_validation',
      submittedBy: f.submittedBy === 'human' ? 'human' : 'agent',
      createdAt: typeof f.createdAt === 'string' ? f.createdAt : new Date().toISOString(),
      reviewedAt: typeof f.reviewedAt === 'string' ? f.reviewedAt : null
    })) : [];
    base.eventLog = Array.isArray(value.eventLog) ? value.eventLog.slice(-300) : base.eventLog;
    return base;
  }

  function isValidStoredFinding(f) {
    return f && typeof f === 'object' && f.id != null && f.summary != null && f.evidence != null;
  }

  function saveState(state) {
    if (global.localStorage) global.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return state;
  }

  function isCheckId(value) {
    return CHECKS.some(c => c.id === value && !c.derived);
  }

  function addEvent(state, type, payload) {
    state.eventLog.push({ type, at: new Date().toISOString(), payload: payload || null });
    if (state.eventLog.length > 300) state.eventLog = state.eventLog.slice(-300);
  }

  function setArtifact(state, patch) {
    if (patch.label != null) state.artifact.label = String(patch.label).slice(0, 200);
    if (patch.note != null) state.artifact.note = String(patch.note).slice(0, 2000);
    if (patch.fingerprint !== undefined) state.artifact.fingerprint = patch.fingerprint ? String(patch.fingerprint).slice(0, 200) : null;
    addEvent(state, 'artifact_updated', { label: state.artifact.label, hasFingerprint: Boolean(state.artifact.fingerprint) });
    return saveState(state);
  }

  function recordCheck(state, input) {
    if (!isCheckId(input.checkId)) throw new Error('check_id must be CHECK-001..CHECK-007. CHECK-008 is derived.');
    if (!CHECK_STATUSES.includes(input.status) || input.status === 'not_run') throw new Error('status must be passed, blocked, or failed.');
    const record = state.specialistChecks[input.checkId];
    record.status = input.status;
    record.note = String(input.note || '').slice(0, 4000);
    record.recordedAt = new Date().toISOString();
    addEvent(state, 'check_recorded', { checkId: input.checkId, status: input.status });
    return saveState(state);
  }

  function submitFinding(state, input, submittedBy) {
    const run = input.run === 'baseline' ? 'baseline' : 'specialist';
    if (run === 'specialist' && !isCheckId(input.checkId)) throw new Error('Specialist findings require check_id CHECK-001..CHECK-007.');
    const summary = String(input.summary || '').trim();
    const evidence = String(input.evidence || '').trim();
    if (summary.length < 3) throw new Error('summary is required.');
    if (evidence.length < 3) throw new Error('evidence is required. Findings without evidence are rejected by CEPV invariants.');
    if (!SEVERITIES.includes(input.severity)) throw new Error('severity must be low, medium, high, or critical.');
    const finding = {
      id: makeId('finding'),
      run,
      checkId: run === 'specialist' ? input.checkId : null,
      summary: summary.slice(0, 1000),
      evidence: evidence.slice(0, 4000),
      severity: input.severity,
      status: 'pending_human_validation',
      submittedBy: submittedBy === 'human' ? 'human' : 'agent',
      createdAt: new Date().toISOString(),
      reviewedAt: null
    };
    state.findings.push(finding);
    addEvent(state, 'finding_submitted', { id: finding.id, run, checkId: finding.checkId });
    saveState(state);
    return finding;
  }

  function humanReviewFinding(state, findingId, decision) {
    const finding = state.findings.find(f => f.id === findingId);
    if (!finding) throw new Error('Finding not found.');
    if (!['confirmed_issue', 'rejected'].includes(decision)) throw new Error('Invalid human decision.');
    finding.status = decision;
    finding.reviewedAt = new Date().toISOString();
    addEvent(state, 'human_review', { id: finding.id, decision });
    return saveState(state);
  }

  function gate(state) {
    const checkRecords = CHECKS.filter(c => !c.derived).map(c => state.specialistChecks[c.id]);
    const pending = state.findings.filter(f => f.run === 'specialist' && f.status === 'pending_human_validation');
    const confirmed = state.findings.filter(f => f.run === 'specialist' && f.status === 'confirmed_issue');
    const blocked = checkRecords.filter(c => c.status === 'blocked');
    const failed = checkRecords.filter(c => c.status === 'failed');
    const notRun = checkRecords.filter(c => c.status === 'not_run');
    const passed = checkRecords.filter(c => c.status === 'passed');
    const approvalAllowed = blocked.length === 0 && failed.length === 0 && notRun.length === 0 && pending.length === 0 && confirmed.length === 0;
    return {
      checkId: 'CHECK-008',
      status: approvalAllowed ? 'passed' : 'blocked',
      approvalAllowed,
      counts: {
        passed: passed.length,
        blocked: blocked.length,
        failed: failed.length,
        notRun: notRun.length,
        pendingFindings: pending.length,
        confirmedFindings: confirmed.length
      },
      reason: approvalAllowed
        ? 'All specialist checks passed and no unresolved or confirmed issue remains.'
        : 'Final approval is blocked while any required check is not_run/blocked/failed or any specialist finding remains pending/confirmed.'
    };
  }

  function listFindings(state, filters) {
    const run = filters && filters.run;
    const status = filters && filters.status;
    return state.findings.filter(f => (!run || run === 'all' || f.run === run) && (!status || status === 'all' || f.status === status));
  }

  function contract() {
    return {
      project: 'CEPV — Companheiros Especialistas com Progresso Validado',
      adapterVersion: VERSION,
      conceptualSequence: ['Versioned Specialist Profile', 'Execution Contract', 'Checks', 'Results', 'Evidence', 'Human Validation', 'Evaluation', 'Validated Progress'],
      checks: CHECKS,
      invariants: INVARIANTS,
      benchmarkRule: 'Baseline and specialist runs stay distinct. The specialist lane uses CHECK-001..CHECK-008. Human adjudication is not exposed as an agent tool.',
      disclosure: 'Coverage must never be presented as accuracy. This WebMCP adapter does not claim CEPV outperforms the baseline.'
    };
  }

  function exportPacket(state) {
    return {
      schema: 'cepv-webmcp-audit-packet-v1',
      exportedAt: new Date().toISOString(),
      sessionId: state.sessionId,
      artifact: clone(state.artifact),
      contract: contract(),
      specialistChecks: clone(state.specialistChecks),
      finalGate: gate(state),
      findings: clone(state.findings),
      trace: clone(state.eventLog)
    };
  }

  function resetState() {
    const state = freshState();
    return saveState(state);
  }

  global.CEPVState = {
    VERSION,
    STORAGE_KEY,
    CHECKS,
    INVARIANTS,
    SEVERITIES,
    CHECK_STATUSES,
    FINDING_STATUSES,
    freshState,
    loadState,
    saveState,
    setArtifact,
    recordCheck,
    submitFinding,
    humanReviewFinding,
    gate,
    listFindings,
    contract,
    exportPacket,
    resetState,
    clone
  };
})(typeof window !== 'undefined' ? window : globalThis);
