(function () {
  'use strict';

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => Array.from(document.querySelectorAll(selector));
  let webmcpStatus = { supported: false, registered: 0, errors: [] };

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[ch]));
  }

  function pct(value) {
    return value == null ? '—' : `${(value * 100).toFixed(1)}%`;
  }

  function evidenceMetricText(metrics) {
    return `review coverage ${pct(metrics.reviewCoverage)} · EFR ${pct(metrics.evidenceFidelityRate)} · UFR ${pct(metrics.unsupportedFindingRate)} · MIR ${pct(metrics.misinterpretationRate)} · supported ${metrics.supported} · misinterpreted ${metrics.misinterpreted} · unsupported ${metrics.unsupported}`;
  }

  function render() {
    const state = CEPVState.loadState();
    const gate = CEPVState.gate(state);
    const specialistEvidence = CEPVState.evidenceMetrics(state, 'specialist');
    const baselineEvidence = CEPVState.evidenceMetrics(state, 'baseline');
    $('#session-id').textContent = state.sessionId;
    $('#artifact-label').value = state.artifact.label || '';
    $('#artifact-note').value = state.artifact.note || '';
    $('#artifact-fingerprint').textContent = state.artifact.fingerprint || 'not set';

    const webmcpEl = $('#webmcp-status');
    if (!webmcpStatus.supported) {
      webmcpEl.className = 'status warn';
      webmcpEl.textContent = 'WebMCP not detected — human UI still works';
    } else if (webmcpStatus.errors.length) {
      webmcpEl.className = 'status warn';
      webmcpEl.textContent = `WebMCP partial: ${webmcpStatus.registered}/6 tools registered`;
    } else {
      webmcpEl.className = 'status ok';
      webmcpEl.textContent = `WebMCP ready: ${webmcpStatus.registered}/6 tools registered`;
    }

    $('#checks').innerHTML = CEPVState.CHECKS.map(check => {
      if (check.derived) {
        return `<article class="check-card derived"><div><strong>${check.id}</strong><span>${esc(check.label)}</span></div><span class="badge ${gate.status}">${gate.status}</span></article>`;
      }
      const record = state.specialistChecks[check.id];
      return `<article class="check-card"><div><strong>${check.id}</strong><span>${esc(check.label)}</span><small>${esc(record.note || 'No execution recorded')}</small></div><span class="badge ${record.status}">${record.status}</span></article>`;
    }).join('');

    $('#gate').className = `gate ${gate.approvalAllowed ? 'ok' : 'blocked'}`;
    $('#gate-title').textContent = gate.approvalAllowed ? 'CHECK-008 allows approval' : 'CHECK-008 blocks approval';
    $('#gate-reason').textContent = gate.reason;
    $('#gate-counts').textContent = `passed ${gate.counts.passed}/7 · blocked ${gate.counts.blocked} · failed ${gate.counts.failed} · not run ${gate.counts.notRun} · pending ${gate.counts.pendingFindings} · confirmed ${gate.counts.confirmedFindings}`;

    $('#evidence-specialist').textContent = evidenceMetricText(specialistEvidence);
    $('#evidence-baseline').textContent = evidenceMetricText(baselineEvidence);

    const findings = [...state.findings].reverse();
    $('#findings').innerHTML = findings.length ? findings.map(f => {
      const evidenceReview = CEPVState.getEvidenceReview(f.id);
      return `
      <article class="finding ${f.status}">
        <header><div><strong>${esc(f.run.toUpperCase())}${f.checkId ? ` · ${esc(f.checkId)}` : ''}</strong><span class="severity ${esc(f.severity)}">${esc(f.severity)}</span></div><span class="badge ${esc(f.status)}">${esc(f.status)}</span></header>
        <h3>${esc(f.summary)}</h3>
        <p><b>Evidence:</b> ${esc(f.evidence)}</p>
        <p><b>Evidence fidelity:</b> <span class="badge ${esc(evidenceReview.status)}">${esc(evidenceReview.status)}</span>${evidenceReview.note ? ` · ${esc(evidenceReview.note)}` : ''}</p>
        <small>Submitted by ${esc(f.submittedBy)} · ${esc(new Date(f.createdAt).toLocaleString())}</small>
        <div class="review-actions">
          <button class="secondary" data-evidence-review="supported" data-id="${esc(f.id)}">Evidence: supported</button>
          <button class="secondary" data-evidence-review="misinterpreted" data-id="${esc(f.id)}">Evidence: misinterpreted</button>
          <button class="secondary" data-evidence-review="unsupported" data-id="${esc(f.id)}">Evidence: unsupported</button>
        </div>
        ${f.status === 'pending_human_validation' ? `<div class="review-actions"><button data-review="confirmed_issue" data-id="${esc(f.id)}">Human: confirm issue</button><button class="secondary" data-review="rejected" data-id="${esc(f.id)}">Human: reject</button></div>` : ''}
      </article>`;
    }).join('') : '<p class="empty">No findings recorded yet.</p>';

    $$('#findings [data-review]').forEach(btn => btn.addEventListener('click', () => {
      const current = CEPVState.loadState();
      CEPVState.humanReviewFinding(current, btn.dataset.id, btn.dataset.review);
      render();
    }));

    $$('#findings [data-evidence-review]').forEach(btn => btn.addEventListener('click', () => {
      CEPVState.reviewEvidence(btn.dataset.id, btn.dataset.evidenceReview);
      render();
    }));
  }

  async function sha256Text(text) {
    const data = new TextEncoder().encode(text);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  function bind() {
    $('#save-artifact').addEventListener('click', async () => {
      const label = $('#artifact-label').value.trim() || 'Demo artifact';
      const note = $('#artifact-note').value.trim();
      const fingerprint = note ? `sha256:${await sha256Text(note)}` : null;
      const state = CEPVState.loadState();
      CEPVState.setArtifact(state, { label, note, fingerprint });
      render();
    });

    $('#finding-form').addEventListener('submit', (event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const run = form.get('run');
      const state = CEPVState.loadState();
      try {
        CEPVState.submitFinding(state, {
          run,
          checkId: run === 'specialist' ? form.get('check_id') : null,
          summary: form.get('summary'),
          evidence: form.get('evidence'),
          severity: form.get('severity')
        }, 'human');
        event.currentTarget.reset();
        $('#run').value = 'specialist';
        toggleCheckField();
        render();
      } catch (error) {
        alert(error.message);
      }
    });

    $('#run').addEventListener('change', toggleCheckField);
    $('#export').addEventListener('click', () => {
      const packet = CEPVState.exportPacket(CEPVState.loadState());
      const blob = new Blob([JSON.stringify(packet, null, 2)], { type: 'application/json' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `cepv-audit-${packet.sessionId}.json`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    });
    $('#reset').addEventListener('click', () => {
      if (confirm('Reset only this local WebMCP demo session? The pre-existing CEPV project is not affected.')) {
        CEPVState.resetState();
        render();
      }
    });
  }

  function toggleCheckField() {
    const isSpecialist = $('#run').value === 'specialist';
    $('#check-wrap').hidden = !isSpecialist;
    $('#check-id').required = isSpecialist;
  }

  document.addEventListener('DOMContentLoaded', async () => {
    bind();
    toggleCheckField();
    render();
    webmcpStatus = await CEPVWebMCP.registerAll(render);
    render();
  });

  window.addEventListener('beforeunload', () => CEPVWebMCP.unregisterAll());
})();
