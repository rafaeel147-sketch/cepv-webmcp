(function (global) {
  'use strict';

  const STORAGE_KEY = 'cepv-evidence-fidelity-v1';
  const EVIDENCE_STATUSES = Object.freeze(['unreviewed', 'supported', 'misinterpreted', 'unsupported']);

  function blankReview() {
    return { status: 'unreviewed', note: '', reviewedAt: null };
  }

  function loadReviews() {
    try {
      const raw = global.localStorage && global.localStorage.getItem(STORAGE_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
      const clean = {};
      for (const [findingId, review] of Object.entries(parsed)) {
        if (!review || typeof review !== 'object') continue;
        const status = EVIDENCE_STATUSES.includes(review.status) ? review.status : 'unreviewed';
        clean[String(findingId)] = {
          status,
          note: typeof review.note === 'string' ? review.note.slice(0, 2000) : '',
          reviewedAt: typeof review.reviewedAt === 'string' ? review.reviewedAt : null
        };
      }
      return clean;
    } catch (_) {
      return {};
    }
  }

  function saveReviews(reviews) {
    if (global.localStorage) global.localStorage.setItem(STORAGE_KEY, JSON.stringify(reviews));
    return reviews;
  }

  function getEvidenceReview(findingId) {
    const reviews = loadReviews();
    return reviews[String(findingId)] || blankReview();
  }

  function reviewEvidence(findingId, status, note) {
    if (!findingId) throw new Error('finding_id is required.');
    if (!EVIDENCE_STATUSES.includes(status) || status === 'unreviewed') {
      throw new Error('Evidence status must be supported, misinterpreted, or unsupported.');
    }
    const reviews = loadReviews();
    reviews[String(findingId)] = {
      status,
      note: String(note || '').slice(0, 2000),
      reviewedAt: new Date().toISOString()
    };
    saveReviews(reviews);
    return reviews[String(findingId)];
  }

  function clearEvidenceReview(findingId) {
    const reviews = loadReviews();
    delete reviews[String(findingId)];
    return saveReviews(reviews);
  }

  function evidenceMetrics(state, run) {
    const selectedRun = run === 'baseline' ? 'baseline' : 'specialist';
    const findings = Array.isArray(state && state.findings)
      ? state.findings.filter(f => f.run === selectedRun)
      : [];
    const reviews = loadReviews();
    const counts = { supported: 0, misinterpreted: 0, unsupported: 0, unreviewed: 0 };

    for (const finding of findings) {
      const status = reviews[String(finding.id)] && EVIDENCE_STATUSES.includes(reviews[String(finding.id)].status)
        ? reviews[String(finding.id)].status
        : 'unreviewed';
      counts[status] += 1;
    }

    const reviewed = counts.supported + counts.misinterpreted + counts.unsupported;
    const total = findings.length;
    const ratio = (num, den) => den > 0 ? num / den : null;

    return {
      run: selectedRun,
      totalFindings: total,
      reviewedFindings: reviewed,
      unreviewedFindings: counts.unreviewed,
      supported: counts.supported,
      misinterpreted: counts.misinterpreted,
      unsupported: counts.unsupported,
      reviewCoverage: ratio(reviewed, total),
      evidenceFidelityRate: ratio(counts.supported, reviewed),
      unsupportedFindingRate: ratio(counts.unsupported, reviewed),
      misinterpretationRate: ratio(counts.misinterpreted, reviewed),
      locatableEvidenceRate: ratio(counts.supported + counts.misinterpreted, reviewed)
    };
  }

  function install() {
    if (!global.CEPVState || global.CEPVState.__evidenceFidelityInstalled) return;
    const S = global.CEPVState;
    const originalContract = S.contract.bind(S);
    const originalExportPacket = S.exportPacket.bind(S);
    const originalResetState = S.resetState.bind(S);

    S.contract = function () {
      const contract = originalContract();
      return Object.assign({}, contract, {
        candidateCapabilities: [
          {
            id: 'MAC-013',
            name: 'Evidence Fidelity / Grounding',
            status: 'CANDIDATE',
            rule: 'Every finding must be human-adjudicable as supported, misinterpreted, or unsupported against the source artifact.'
          }
        ],
        evidenceFidelity: {
          status: 'CANDIDATE',
          humanOnlyAdjudication: true,
          metrics: {
            EFR: 'supported / reviewed findings',
            UFR: 'unsupported / reviewed findings',
            MIR: 'misinterpreted / reviewed findings',
            reviewCoverage: 'reviewed findings / total findings'
          },
          disclosure: 'This candidate measurement is not accuracy and does not yet modify CHECK-008 automatically.'
        }
      });
    };

    S.exportPacket = function (state) {
      const packet = originalExportPacket(state);
      packet.contract = S.contract();
      packet.evidenceFidelity = {
        specialist: evidenceMetrics(state, 'specialist'),
        baseline: evidenceMetrics(state, 'baseline'),
        reviews: loadReviews()
      };
      return packet;
    };

    S.resetState = function () {
      if (global.localStorage) global.localStorage.removeItem(STORAGE_KEY);
      return originalResetState();
    };

    Object.assign(S, {
      EVIDENCE_STORAGE_KEY: STORAGE_KEY,
      EVIDENCE_STATUSES,
      getEvidenceReview,
      reviewEvidence,
      clearEvidenceReview,
      evidenceMetrics,
      __evidenceFidelityInstalled: true
    });
  }

  install();
})(typeof window !== 'undefined' ? window : globalThis);
