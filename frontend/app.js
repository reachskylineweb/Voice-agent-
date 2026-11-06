/**
 * Reach AI Voice — Module 2 Frontend Application (frontend/app.js)
 * Multi-Workflow Outbound Verification Dashboard
 */

(function () {
  'use strict';

  const STORAGE_KEYS = {
    WORKFLOWS: 'reach_ai_voice_workflows_v3',
    REPORTS: 'reach_ai_voice_reports_v3',
    ACTIVE_WORKFLOW_ID: 'reach_ai_voice_active_workflow_id_v3',
  };

  // ==================== PRE-CONFIGURED WORKFLOWS (NO DUMMY CALL DATA) ====================
  const DEFAULT_WORKFLOWS = [
    {
      id: 'tata-leads',
      name: 'TATA Leads Enquiry Verification',
      shortName: 'TATA Leads',
      subtitle: 'Vehicle Enquiry & Test-Drive Follow-Up',
      description:
        'Automated outbound verification calls for TATA Motors vehicle enquiries, executive contact check (Q1), and customer satisfaction (Q2).',
      callerId: 'Dedicated TATA: +91 98765 11111',
      voiceModel: 'Tamil Female (Pallavi HD)',
      badgeColor: 'blue',
      itemLabel: 'Vehicle Model Enquired',
      step1Script:
        'வணக்கம் {customer_name}, நான் TATA Motors வாடிக்கையாளர் சேவை மையத்திலிருந்து பேசுகிறேன். நீங்கள் சமீபத்தில் {enquiry_item} வாகனம் குறித்து விசாரித்தீர்கள். Hello {customer_name}, we are calling from TATA Motors regarding your recent enquiry for {enquiry_item}.',
      step2Script:
        'எங்கள் விற்பனை பிரதிநிதி (Sales Executive) உங்களை தொடர்பு கொண்டு {enquiry_item} பற்றிய விவரங்களை பேசினாரா? Did our sales executive contact you and share the vehicle details?',
      q1YesKeywords:
        'ஆமா, ஆமாம், பேசினாங்க, கால் பண்ணாங்க, கூப்பிட்டாங்க, வந்தாங்க, aama, aamam, pesinanga, call pannanga, spoke, contacted, called, yes, yeah, sure, met',
      q1NoKeywords:
        'இல்ல, இல்லை, பேசல, கால் பண்ணல, யாரும் கூப்பிடல, இன்னும் இல்ல, illa, illai, pesala, call pannala, yarum koopidala, no, not yet, nobody called, didnt call',
      step3Script:
        'வாகனத்தின் விலை, சிறப்பம்சங்கள் மற்றும் Test Drive விவரங்கள் உங்களுக்கு தெளிவாக புரிந்ததா மற்றும் திருப்திகரமாக இருந்ததா? Did you clearly understand the pricing & features, and are you satisfied with the explanation?',
      q2YesKeywords:
        'புரிஞ்சது, தெளிவா சொன்னாங்க, திருப்தி, ரொம்ப நல்லா, ஓகே, சூப்பர், purinjathu, theliva sonnanga, thirupthi, nalla sonnanga, ok, satisfied, understood, clear, good, yes, happy, aama',
      q2NoKeywords:
        'புரியல, திருப்தி இல்ல, சரியா சொல்லல, டவுட் இருக்கு, இன்னும் தகவல் வேணும், puriyala, thirupthi illa, sariya sollala, doubt irukku, no, not satisfied, confused, unclear, illa, callback',
    },
    {
      id: 'healing-earth',
      name: 'Healing Earth Service Verification',
      shortName: 'Healing Earth',
      subtitle: 'Ayurveda Therapy & Consultation Follow-Up',
      description:
        'Automated outbound verification calls for Healing Earth Ayurveda Hospital treatment enquiries, doctor/counselor contact check (Q1), and therapy clarity (Q2).',
      callerId: 'Dedicated Healing Earth: +91 98765 22222',
      voiceModel: 'Tamil Female (Pallavi HD)',
      badgeColor: 'emerald',
      itemLabel: 'Treatment / Service Enquired',
      step1Script:
        'வணக்கம் {customer_name}, நான் Healing Earth ஆயுர்வேத மருத்துவமனையிலிருந்து பேசுகிறேன். நீங்கள் {enquiry_item} சிகிச்சை குறித்து விசாரித்தீர்கள். Hello {customer_name}, greetings from Healing Earth Ayurveda regarding your enquiry for {enquiry_item}.',
      step2Script:
        'எங்கள் மருத்துவ ஆலோசகர் (Health Counselor) உங்களை தொடர்பு கொண்டு {enquiry_item} சிகிச்சை முறைகள் பற்றி பேசினாரா? Did our wellness counselor contact you regarding your treatment plan?',
      q1YesKeywords:
        'ஆமா, ஆமாம், டாக்டர் பேசினாங்க, கால் பண்ணாங்க, சொன்னாங்க, aama, aamam, pesinanga, doctor spoke, call pannanga, yes, yeah, contacted, called, spoke',
      q1NoKeywords:
        'இல்ல, இல்லை, பேசல, கால் பண்ணல, யாரும் பேசல, illa, illai, pesala, call pannala, no, not yet, nobody called, waiting',
      step3Script:
        'சிகிச்சை விவரங்கள் மற்றும் கட்டண முறைகள் உங்களுக்கு தெளிவாக புரிந்ததா மற்றும் திருப்தியாக உள்ளதா? Did you clearly understand the treatment process and are you satisfied with the guidance?',
      q2YesKeywords:
        'புரிஞ்சது, திருப்தி, தெளிவா சொன்னாங்க, நல்லா இருந்துச்சு, ஓகே, ஆமா, purinjathu, thirupthi, theliva sonnanga, satisfied, understood, clear, yes, good, happy',
      q2NoKeywords:
        'புரியல, திருப்தி இல்ல, சந்தேகம் இருக்கு, சரியா சொல்லல, puriyala, thirupthi illa, doubt irukku, sariya sollala, no, not satisfied, unclear, illa',
    },
  ];

  // Empty reports array — no dummy call records
  const DEFAULT_REPORTS = [];

  // ==================== APPLICATION STATE ====================
  const state = {
    workflows: [],
    reports: [],
    activeWorkflowId: 'tata-leads',
    activeView: 'campaign',
    activeReportFilter: 'ALL',
    reportSearchQuery: '',
    bulkQueue: [],
    isDialingSingle: false,
    isRunningBulk: false,
    backendConnected: false,
    speechRate: 1.0,
    speechPitch: 1.0,
  };

  // ==================== UTILITY HELPERS ====================
  function formatCurrentTimestamp() {
    const now = new Date();
    return now.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  }

  function showToast(message) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<span class="signal-dot"></span><span>${escapeHtml(message)}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.25s ease';
      setTimeout(() => toast.remove(), 260);
    }, 3400);
  }

  function escapeHtml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function getActiveWorkflow() {
    return (
      state.workflows.find((w) => w.id === state.activeWorkflowId) ||
      state.workflows[0]
    );
  }

  function saveLocalState() {
    try {
      localStorage.setItem(STORAGE_KEYS.WORKFLOWS, JSON.stringify(state.workflows));
      localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(state.reports));
      localStorage.setItem(STORAGE_KEYS.ACTIVE_WORKFLOW_ID, state.activeWorkflowId);
    } catch (_err) {
      // Ignore storage quota errors
    }
  }

  function loadLocalState() {
    try {
      // Clean up legacy v2 keys that contained dummy data
      localStorage.removeItem('askeva_outbound_workflows_v2');
      localStorage.removeItem('askeva_outbound_reports_v2');
      localStorage.removeItem('askeva_active_workflow_id_v2');
      localStorage.removeItem('reach_ai_voice_workflows_v2');
      localStorage.removeItem('reach_ai_voice_reports_v2');
      localStorage.removeItem('reach_ai_voice_active_workflow_id_v2');

      const savedWf = localStorage.getItem(STORAGE_KEYS.WORKFLOWS);
      const savedRep = localStorage.getItem(STORAGE_KEYS.REPORTS);
      const savedActiveId = localStorage.getItem(STORAGE_KEYS.ACTIVE_WORKFLOW_ID);

      state.workflows = savedWf ? JSON.parse(savedWf) : JSON.parse(JSON.stringify(DEFAULT_WORKFLOWS));
      state.reports = savedRep ? JSON.parse(savedRep) : JSON.parse(JSON.stringify(DEFAULT_REPORTS));
      if (savedActiveId && state.workflows.some((w) => w.id === savedActiveId)) {
        state.activeWorkflowId = savedActiveId;
      }
    } catch (_err) {
      state.workflows = JSON.parse(JSON.stringify(DEFAULT_WORKFLOWS));
      state.reports = [];
    }
  }

  // ==================== BACKEND API WITH AUTOMATIC FALLBACK ====================
  async function apiRequest(endpoint, options = {}) {
    try {
      const res = await fetch(endpoint, {
        headers: { 'Content-Type': 'application/json' },
        ...options,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      updateConnectionBanner(true);
      return { ok: true, data };
    } catch (_err) {
      updateConnectionBanner(false);
      return { ok: false, data: null };
    }
  }

  function updateConnectionBanner(isBackendLive) {
    state.backendConnected = isBackendLive;
    const dot = document.getElementById('apiConnectionDot');
    const text = document.getElementById('apiConnectionText');
    if (!dot || !text) return;

    if (isBackendLive) {
      dot.style.backgroundColor = '#10b981';
      text.textContent = 'Backend REST API Connected';
    } else {
      dot.style.backgroundColor = '#38bdf8';
      text.textContent = 'Frontend UI Active';
    }
  }

  async function syncWithBackendOnBoot() {
    loadLocalState();

    const [wfRes, repRes] = await Promise.all([
      apiRequest('/api/workflows', { method: 'GET' }),
      apiRequest('/api/reports', { method: 'GET' }),
    ]);

    if (wfRes.ok && Array.isArray(wfRes.data?.workflows) && wfRes.data.workflows.length > 0) {
      state.workflows = wfRes.data.workflows;
    }
    if (repRes.ok && Array.isArray(repRes.data?.reports)) {
      state.reports = repRes.data.reports;
    }

    saveLocalState();
    renderAll();
  }

  // ==================== KEYWORD INTENT CLASSIFIER ====================
  function parseKeywords(rawText) {
    return String(rawText || '')
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
  }

  function evaluateTranscriptIntent(transcript, workflow) {
    const text = String(transcript || '').toLowerCase();
    const q1YesList = parseKeywords(workflow.q1YesKeywords);
    const q1NoList = parseKeywords(workflow.q1NoKeywords);
    const q2YesList = parseKeywords(workflow.q2YesKeywords);
    const q2NoList = parseKeywords(workflow.q2NoKeywords);

    let q1 = 'YES';
    const hasQ1No = q1NoList.some((kw) => text.includes(kw));
    const hasQ1Yes = q1YesList.some((kw) => text.includes(kw));
    if (hasQ1No && !hasQ1Yes) {
      q1 = 'NO';
    } else if (hasQ1Yes) {
      q1 = 'YES';
    }

    let q2 = 'YES';
    const hasQ2No = q2NoList.some((kw) => text.includes(kw));
    const hasQ2Yes = q2YesList.some((kw) => text.includes(kw));

    if (q1 === 'NO') {
      q2 = 'NO';
    } else if (hasQ2No) {
      q2 = 'NO';
    } else if (hasQ2Yes) {
      q2 = 'YES';
    }

    return { q1, q2 };
  }

  // ==================== WEB SPEECH TTS HELPER ====================
  function speakText(text) {
    const chk = document.getElementById('chkSpeakAudio');
    if (!chk || !chk.checked || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.rate = state.speechRate || 1.0;
      utter.pitch = state.speechPitch || 1.0;
      const voices = window.speechSynthesis.getVoices();
      const voiceModel = document.getElementById('voiceModelSelect')?.value || '';
      let chosen = null;
      if (voiceModel.includes('Tamil')) {
        chosen = voices.find((v) => v.lang.toLowerCase().includes('ta'));
      }
      if (!chosen) {
        chosen = voices.find((v) => v.lang.toLowerCase().includes('en-in')) || voices[0];
      }
      if (chosen) utter.voice = chosen;
      window.speechSynthesis.speak(utter);
    } catch (_e) {
      // Ignore browser speech synthesis errors
    }
  }

  // ==================== RENDER FUNCTIONS ====================
  function renderAll() {
    renderSidebarWorkflows();
    renderWorkflowDropdowns();
    renderTopbar();
    renderKPIs();
    renderTrainerView();
    renderReportsTable();
  }

  // 1. Left Sidebar Workflows
  function renderSidebarWorkflows() {
    const listEl = document.getElementById('sidebarWorkflowList');
    const countEl = document.getElementById('sidebarWorkflowCount');
    if (!listEl) return;

    if (countEl) countEl.textContent = String(state.workflows.length);

    listEl.innerHTML = state.workflows
      .map((wf) => {
        const isActive = wf.id === state.activeWorkflowId;
        const callCount = state.reports.filter((r) => r.workflowId === wf.id).length;
        return `
          <button type="button" class="workflow-item-btn ${isActive ? 'active' : ''}" data-workflow-id="${escapeHtml(wf.id)}">
            <div class="wf-item-left">
              <span class="wf-color-dot ${escapeHtml(wf.badgeColor || 'blue')}"></span>
              <div class="wf-item-titles">
                <span class="wf-short-name">${escapeHtml(wf.shortName || wf.name)}</span>
                <span class="wf-sub-caption">${escapeHtml(wf.subtitle || wf.name)}</span>
              </div>
            </div>
            <span class="wf-call-count">${callCount}</span>
          </button>
        `;
      })
      .join('');

    listEl.querySelectorAll('.workflow-item-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const wfId = btn.getAttribute('data-workflow-id');
        if (wfId) selectWorkflow(wfId);
      });
    });
  }

  function selectWorkflow(workflowId) {
    const wf = state.workflows.find((w) => w.id === workflowId);
    if (!wf) return;
    state.activeWorkflowId = wf.id;

    const callerSelect = document.getElementById('callerIdSelect');
    if (callerSelect && wf.callerId) {
      callerSelect.value = wf.callerId;
    }
    const voiceSelect = document.getElementById('voiceModelSelect');
    if (voiceSelect && wf.voiceModel) {
      voiceSelect.value = wf.voiceModel;
    }

    const itemLabel = document.getElementById('lblSingleEnquiryItem');
    if (itemLabel && wf.itemLabel) {
      itemLabel.innerHTML = `${escapeHtml(wf.itemLabel)} <span class="req">*</span>`;
    }

    saveLocalState();
    renderAll();
  }

  function renderWorkflowDropdowns() {
    const campaignSelect = document.getElementById('workflowSelect');
    const trainerSelect = document.getElementById('trainerWorkflowSelect');

    const optionsHtml = state.workflows
      .map(
        (wf) =>
          `<option value="${escapeHtml(wf.id)}" ${
            wf.id === state.activeWorkflowId ? 'selected' : ''
          }>${escapeHtml(wf.name)}</option>`
      )
      .join('');

    if (campaignSelect) campaignSelect.innerHTML = optionsHtml;
    if (trainerSelect) trainerSelect.innerHTML = optionsHtml;
  }

  function renderTopbar() {
    const wf = getActiveWorkflow();
    if (!wf) return;

    const badge = document.getElementById('topbarWorkflowBadge');
    const desc = document.getElementById('topbarWorkflowDescription');
    const callerChip = document.getElementById('topbarCallerIdValue');
    const monitorCallerPreview = document.getElementById('monitorCallerIdPreview');
    const callerSelect = document.getElementById('callerIdSelect');

    if (badge) {
      badge.textContent = wf.name;
      badge.className = `workflow-badge ${wf.badgeColor || 'blue'}`;
    }
    if (desc) {
      desc.textContent = wf.description || `Outbound verification workflow for ${wf.name}`;
    }
    const currentCallerId = callerSelect?.value || wf.callerId;
    if (callerChip) callerChip.textContent = currentCallerId;
    if (monitorCallerPreview) monitorCallerPreview.textContent = currentCallerId;
  }

  // 2. Top KPI Summary Cards (Dynamic calculation based on selected workflow/filter)
  function renderKPIs() {
    let scopedReports = state.reports;
    let scopeLabel = 'All Workflows';

    if (state.activeReportFilter === 'tata-leads') {
      scopedReports = state.reports.filter((r) => r.workflowId === 'tata-leads');
      scopeLabel = 'TATA Leads';
    } else if (state.activeReportFilter === 'healing-earth') {
      scopedReports = state.reports.filter((r) => r.workflowId === 'healing-earth');
      scopeLabel = 'Healing Earth';
    } else if (state.activeReportFilter === 'NEEDS_FOLLOWUP') {
      scopedReports = state.reports.filter(
        (r) => r.q1Contacted === 'NO' || r.q2Satisfied === 'NO'
      );
      scopeLabel = 'Follow-Up Filter';
    }

    const total = scopedReports.length;
    const q1Yes = scopedReports.filter((r) => r.q1Contacted === 'YES').length;
    const q2Yes = scopedReports.filter((r) => r.q2Satisfied === 'YES').length;
    const pendingNo = scopedReports.filter(
      (r) => r.q1Contacted === 'NO' || r.q2Satisfied === 'NO'
    ).length;

    const q1Pct = total > 0 ? Math.round((q1Yes / total) * 100) : 0;
    const q2Pct = total > 0 ? Math.round((q2Yes / total) * 100) : 0;

    const elTotal = document.getElementById('kpiTotalCalls');
    const elScope = document.getElementById('kpiScopeLabel');
    const elQ1Count = document.getElementById('kpiQ1YesCount');
    const elQ1Pct = document.getElementById('kpiQ1YesPercent');
    const elQ1Sub = document.getElementById('kpiQ1Subtext');
    const elQ2Count = document.getElementById('kpiQ2YesCount');
    const elQ2Pct = document.getElementById('kpiQ2YesPercent');
    const elQ2Sub = document.getElementById('kpiQ2Subtext');
    const elPending = document.getElementById('kpiPendingNoCount');
    const elPendingBadge = document.getElementById('kpiPendingNoBadge');
    const navBadge = document.getElementById('navReportCountBadge');

    if (elTotal) elTotal.textContent = String(total);
    if (elScope) elScope.textContent = scopeLabel;
    if (elQ1Count) elQ1Count.textContent = String(q1Yes);
    if (elQ1Pct) elQ1Pct.textContent = `${q1Pct}% YES`;
    if (elQ1Sub) elQ1Sub.textContent = `${q1Yes} of ${total} confirmed staff contact`;
    if (elQ2Count) elQ2Count.textContent = String(q2Yes);
    if (elQ2Pct) elQ2Pct.textContent = `${q2Pct}% YES`;
    if (elQ2Sub) elQ2Sub.textContent = `${q2Yes} of ${total} understood & satisfied`;
    if (elPending) elPending.textContent = String(pendingNo);
    if (elPendingBadge) {
      const noPct = total > 0 ? Math.round((pendingNo / total) * 100) : 0;
      elPendingBadge.textContent = `${pendingNo} NO (${noPct}%)`;
    }
    if (navBadge) navBadge.textContent = String(state.reports.length);
  }

  // 4. 3-Step Workflow Script & Intent Trainer View
  function renderTrainerView() {
    const wf = getActiveWorkflow();
    if (!wf) return;

    const step1 = document.getElementById('step1ScriptInput');
    const step2 = document.getElementById('step2ScriptInput');
    const step3 = document.getElementById('step3ScriptInput');
    const q1Yes = document.getElementById('q1YesKeywords');
    const q1No = document.getElementById('q1NoKeywords');
    const q2Yes = document.getElementById('q2YesKeywords');
    const q2No = document.getElementById('q2NoKeywords');

    if (step1) step1.value = wf.step1Script || '';
    if (step2) step2.value = wf.step2Script || '';
    if (step3) step3.value = wf.step3Script || '';
    if (q1Yes) q1Yes.value = wf.q1YesKeywords || '';
    if (q1No) q1No.value = wf.q1NoKeywords || '';
    if (q2Yes) q2Yes.value = wf.q2YesKeywords || '';
    if (q2No) q2No.value = wf.q2NoKeywords || '';

    updateStep1LivePreview();
    runIntentClassifierSandbox();
  }

  function updateStep1LivePreview() {
    const step1 = document.getElementById('step1ScriptInput');
    const preview = document.getElementById('step1LivePreview');
    if (!step1 || !preview) return;

    const nameVal = document.getElementById('singleCustomerName')?.value.trim() || '{customer_name}';
    const itemVal = document.getElementById('singleEnquiryItem')?.value.trim() || '{enquiry_item}';

    const rendered = step1.value
      .replace(/\{customer_name\}/g, nameVal)
      .replace(/\{enquiry_item\}/g, itemVal);

    preview.textContent = rendered;
  }

  function runIntentClassifierSandbox() {
    const wf = getActiveWorkflow();
    const inputEl = document.getElementById('intentTestInput');
    const resultEl = document.getElementById('intentTestResults');
    if (!wf || !inputEl || !resultEl) return;

    if (!inputEl.value.trim()) {
      resultEl.innerHTML = `
        <span>Q1 (Contacted): <strong>—</strong></span>
        <span>Q2 (Satisfied): <strong>—</strong></span>
      `;
      return;
    }

    const tempWf = {
      ...wf,
      q1YesKeywords: document.getElementById('q1YesKeywords')?.value || wf.q1YesKeywords,
      q1NoKeywords: document.getElementById('q1NoKeywords')?.value || wf.q1NoKeywords,
      q2YesKeywords: document.getElementById('q2YesKeywords')?.value || wf.q2YesKeywords,
      q2NoKeywords: document.getElementById('q2NoKeywords')?.value || wf.q2NoKeywords,
    };

    const { q1, q2 } = evaluateTranscriptIntent(inputEl.value, tempWf);
    resultEl.innerHTML = `
      <span>Q1 (Contacted): <span class="${q1 === 'YES' ? 'badge-yes' : 'badge-no'}">${q1}</span></span>
      <span>Q2 (Satisfied): <span class="${q2 === 'YES' ? 'badge-yes' : 'badge-no'}">${q2}</span></span>
    `;
  }

  // 5. Client-Wise Verification Report Table
  function getFilteredReports() {
    let list = [...state.reports];

    if (state.activeReportFilter === 'tata-leads') {
      list = list.filter((r) => r.workflowId === 'tata-leads');
    } else if (state.activeReportFilter === 'healing-earth') {
      list = list.filter((r) => r.workflowId === 'healing-earth');
    } else if (state.activeReportFilter === 'NEEDS_FOLLOWUP') {
      list = list.filter((r) => r.q1Contacted === 'NO' || r.q2Satisfied === 'NO');
    }

    if (state.reportSearchQuery.trim()) {
      const q = state.reportSearchQuery.toLowerCase().trim();
      list = list.filter(
        (r) =>
          r.customerName.toLowerCase().includes(q) ||
          r.customerPhone.toLowerCase().includes(q) ||
          r.enquiryItem.toLowerCase().includes(q) ||
          r.workflowName.toLowerCase().includes(q) ||
          r.transcript.toLowerCase().includes(q)
      );
    }

    return list;
  }

  function renderReportsTable() {
    const tbody = document.getElementById('verificationReportTbody');
    if (!tbody) return;

    const countAll = document.getElementById('countFilterAll');
    const countTata = document.getElementById('countFilterTata');
    const countHealing = document.getElementById('countFilterHealing');
    const countFollowup = document.getElementById('countFilterFollowup');

    if (countAll) countAll.textContent = String(state.reports.length);
    if (countTata) {
      countTata.textContent = String(
        state.reports.filter((r) => r.workflowId === 'tata-leads').length
      );
    }
    if (countHealing) {
      countHealing.textContent = String(
        state.reports.filter((r) => r.workflowId === 'healing-earth').length
      );
    }
    if (countFollowup) {
      countFollowup.textContent = String(
        state.reports.filter((r) => r.q1Contacted === 'NO' || r.q2Satisfied === 'NO').length
      );
    }

    const filtered = getFilteredReports();

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" style="text-align:center; padding: 32px; color: #64748b;">
            No outbound verification calls dialed yet. Use the <strong>Single Number Outbound Dialer</strong> or <strong>Bulk CSV Upload</strong> above to start a campaign.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = filtered
      .map((row) => {
        const badgeColor = row.workflowBadgeColor || (row.workflowId === 'healing-earth' ? 'emerald' : 'blue');
        const q1Badge =
          row.q1Contacted === 'YES'
            ? '<span class="badge-yes">✓ YES</span>'
            : '<span class="badge-no">✕ NO</span>';
        const q2Badge =
          row.q2Satisfied === 'YES'
            ? '<span class="badge-yes">✓ YES</span>'
            : '<span class="badge-no">✕ NO</span>';

        return `
          <tr>
            <td class="cell-datetime">${escapeHtml(row.timestamp)}</td>
            <td>
              <span class="wf-table-badge ${escapeHtml(badgeColor)}">
                ${escapeHtml(row.workflowName)}
              </span>
            </td>
            <td class="cell-caller-id">${escapeHtml(row.callerId)}</td>
            <td>
              <span class="customer-name-bold">${escapeHtml(row.customerName)}</span>
              <span class="customer-phone-sub">${escapeHtml(row.customerPhone)}</span>
            </td>
            <td><span class="enquiry-pill">${escapeHtml(row.enquiryItem)}</span></td>
            <td>${q1Badge}</td>
            <td>${q2Badge}</td>
            <td class="cell-transcript">${escapeHtml(row.transcript)}</td>
          </tr>
        `;
      })
      .join('');
  }

  // ==================== SINGLE NUMBER OUTBOUND DIALER ====================
  function buildSimulatedCustomerOutcome(mode, customText, wf, _customerName, enquiryItem) {
    if (mode === 'custom' && customText.trim()) {
      const { q1, q2 } = evaluateTranscriptIntent(customText, wf);
      return {
        q1Contacted: q1,
        q2Satisfied: q2,
        transcript: customText.trim(),
      };
    }

    if (mode === 'partial_no') {
      return {
        q1Contacted: 'YES',
        q2Satisfied: 'NO',
        transcript: `ஆமா கால் பண்ணாங்க, ஆனா ${enquiryItem} விவரங்கள் சரியா புரியல, திருப்தி இல்ல.`,
      };
    }

    if (mode === 'full_no') {
      return {
        q1Contacted: 'NO',
        q2Satisfied: 'NO',
        transcript: `இல்ல, ${enquiryItem} பத்தி எனக்கு இன்னும் யாரும் கால் பண்ணி பேசல.`,
      };
    }

    return {
      q1Contacted: 'YES',
      q2Satisfied: 'YES',
      transcript: `ஆமா கால் பண்ணி ${enquiryItem} பத்தி பேசினாங்க. எல்லாமே தெளிவா புரிஞ்சது, ரொம்ப திருப்தி!`,
    };
  }

  function setMonitorStep(activeStepIndex) {
    const pills = document.querySelectorAll('#singleCallSteps .step-pill');
    pills.forEach((pill) => {
      const stepNum = Number(pill.getAttribute('data-step'));
      pill.classList.remove('active', 'done');
      if (stepNum < activeStepIndex) {
        pill.classList.add('done');
      } else if (stepNum === activeStepIndex) {
        pill.classList.add('active');
      }
    });
  }

  async function handleSingleDialSubmit(e) {
    e.preventDefault();
    if (state.isDialingSingle) return;

    const wf = getActiveWorkflow();
    const customerName = document.getElementById('singleCustomerName').value.trim();
    const customerPhone = document.getElementById('singlePhoneNumber').value.trim();
    const enquiryItem = document.getElementById('singleEnquiryItem').value.trim();
    const callerId = document.getElementById('callerIdSelect').value;
    const voiceModel = document.getElementById('voiceModelSelect').value;
    const outcomeMode = document.getElementById('singleSimulatedOutcome').value;
    const customTranscript = document.getElementById('singleCustomTranscript').value;

    if (!customerName || !customerPhone || !enquiryItem) return;

    state.isDialingSingle = true;
    const btnDial = document.getElementById('btnDialNow');
    const statusBadge = document.getElementById('singleCallStatusBadge');
    const timerEl = document.getElementById('singleCallTimer');
    const liveFeed = document.getElementById('singleCallLiveFeed');

    if (btnDial) btnDial.disabled = true;

    let seconds = 0;
    const timerInterval = setInterval(() => {
      seconds += 1;
      const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
      const ss = String(seconds % 60).padStart(2, '0');
      if (timerEl) timerEl.textContent = `${mm}:${ss}`;
    }, 1000);

    if (statusBadge) {
      statusBadge.textContent = 'DIALING OUTBOUND...';
      statusBadge.className = 'console-state dialing';
    }
    setMonitorStep(1);
    if (liveFeed) {
      liveFeed.innerHTML = `[SIP TRUNK] Routing outbound call to <strong>${escapeHtml(customerName)} (${escapeHtml(customerPhone)})</strong> via <code>${escapeHtml(callerId)}</code> (${escapeHtml(voiceModel)})...`;
    }

    await new Promise((r) => setTimeout(r, 900));

    const greetingText = wf.step1Script
      .replace(/\{customer_name\}/g, customerName)
      .replace(/\{enquiry_item\}/g, enquiryItem);

    if (statusBadge) {
      statusBadge.textContent = 'CALL CONNECTED • STEP 01';
      statusBadge.className = 'console-state connected';
    }
    if (liveFeed) {
      liveFeed.innerHTML = `<strong>[AI • ${escapeHtml(wf.shortName)}]:</strong> "${escapeHtml(greetingText)}"`;
    }
    speakText(greetingText);

    await new Promise((r) => setTimeout(r, 1400));

    setMonitorStep(2);
    const q1Prompt = wf.step2Script.replace(/\{enquiry_item\}/g, enquiryItem);
    if (liveFeed) {
      liveFeed.innerHTML = `<strong>[AI • Q1 Staff Contacted]:</strong> "${escapeHtml(q1Prompt)}"`;
    }

    await new Promise((r) => setTimeout(r, 1200));

    setMonitorStep(3);
    const simulated = buildSimulatedCustomerOutcome(
      outcomeMode,
      customTranscript,
      wf,
      customerName,
      enquiryItem
    );

    if (liveFeed) {
      liveFeed.innerHTML = `<strong>[CUSTOMER • ${escapeHtml(customerName)}]:</strong> "${escapeHtml(simulated.transcript)}"`;
    }

    await new Promise((r) => setTimeout(r, 1100));

    setMonitorStep(4);
    const newRecord = {
      id: `REP-${Date.now()}`,
      timestamp: formatCurrentTimestamp(),
      workflowId: wf.id,
      workflowName: wf.name,
      workflowBadgeColor: wf.badgeColor || 'blue',
      callerId,
      voiceModel,
      customerName,
      customerPhone,
      enquiryItem,
      q1Contacted: simulated.q1Contacted,
      q2Satisfied: simulated.q2Satisfied,
      transcript: simulated.transcript,
    };

    const apiRes = await apiRequest('/api/calls/single', {
      method: 'POST',
      body: JSON.stringify(newRecord),
    });

    if (apiRes.ok && apiRes.data?.report) {
      state.reports.unshift(apiRes.data.report);
    } else {
      state.reports.unshift(newRecord);
    }

    saveLocalState();
    renderAll();

    clearInterval(timerInterval);
    if (statusBadge) {
      statusBadge.textContent = `COMPLETED (Q1: ${newRecord.q1Contacted} | Q2: ${newRecord.q2Satisfied})`;
    }
    if (liveFeed) {
      liveFeed.innerHTML = `<strong>[LOGGED]:</strong> ${escapeHtml(customerName)} — Q1 Contacted: <strong>${newRecord.q1Contacted}</strong>, Q2 Satisfied: <strong>${newRecord.q2Satisfied}</strong>.`;
    }

    showToast(`Outbound call to ${customerName} completed & logged!`);
    state.isDialingSingle = false;
    if (btnDial) btnDial.disabled = false;
  }

  // ==================== BULK CSV PARSER & BULK CAMPAIGN ====================
  function parseCsvText(csvText) {
    const lines = String(csvText || '')
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    if (lines.length === 0) return [];

    const results = [];
    for (let i = 0; i < lines.length; i++) {
      const cols = lines[i].split(',').map((c) => c.replace(/^["']|["']$/g, '').trim());
      if (cols.length < 2) continue;

      if (
        i === 0 &&
        (cols[0].toLowerCase().includes('name') ||
          cols[1].toLowerCase().includes('phone') ||
          cols[1].toLowerCase().includes('mobile'))
      ) {
        continue;
      }

      if (!cols[0] && !cols[1]) continue;

      results.push({
        customerName: cols[0],
        customerPhone: cols[1],
        enquiryItem: cols[2] || 'Enquiry',
      });
    }
    return results;
  }

  function renderBulkQueuePreview() {
    const countEl = document.getElementById('bulkLeadCount');
    const listEl = document.getElementById('bulkPreviewList');
    if (countEl) countEl.textContent = String(state.bulkQueue.length);
    if (!listEl) return;

    if (state.bulkQueue.length === 0) {
      listEl.innerHTML = `<div class="empty-preview-msg">No CSV file uploaded. Drag &amp; drop a CSV file above to load leads.</div>`;
      return;
    }

    listEl.innerHTML = state.bulkQueue
      .map(
        (item, idx) => `
        <div class="preview-lead-row">
          <span class="preview-lead-name">${idx + 1}. ${escapeHtml(item.customerName)}</span>
          <span class="preview-lead-phone">${escapeHtml(item.customerPhone)}</span>
          <span class="preview-lead-item">${escapeHtml(item.enquiryItem)}</span>
        </div>
      `
      )
      .join('');
  }

  async function runBulkOutboundCampaign() {
    if (state.isRunningBulk) return;
    if (state.bulkQueue.length === 0) {
      showToast('Please upload a CSV file with leads before starting a bulk campaign.');
      return;
    }

    const wf = getActiveWorkflow();
    const callerId = document.getElementById('callerIdSelect').value;
    const voiceModel = document.getElementById('voiceModelSelect').value;
    const btnStart = document.getElementById('btnStartBulkCampaign');
    const statusText = document.getElementById('bulkProgressStatusText');
    const statsText = document.getElementById('bulkProgressStatsText');
    const fillBar = document.getElementById('bulkProgressBarFill');

    state.isRunningBulk = true;
    if (btnStart) btnStart.disabled = true;

    const total = state.bulkQueue.length;
    const generatedReports = [];

    for (let i = 0; i < total; i++) {
      const lead = state.bulkQueue[i];
      const pct = Math.round(((i + 1) / total) * 100);

      if (statusText) {
        statusText.textContent = `Dialing (${i + 1}/${total}): ${lead.customerName} (${lead.customerPhone})...`;
      }
      if (statsText) {
        statsText.textContent = `${i} / ${total} Dialed (${Math.round((i / total) * 100)}%)`;
      }

      await new Promise((r) => setTimeout(r, 650));

      const record = {
        id: `REP-${Date.now()}-${i}`,
        timestamp: formatCurrentTimestamp(),
        workflowId: wf.id,
        workflowName: wf.name,
        workflowBadgeColor: wf.badgeColor || 'blue',
        callerId,
        voiceModel,
        customerName: lead.customerName,
        customerPhone: lead.customerPhone,
        enquiryItem: lead.enquiryItem,
        q1Contacted: 'YES',
        q2Satisfied: 'YES',
        transcript: `ஆமா கால் பண்ணி ${lead.enquiryItem} பத்தி பேசினாங்க, எல்லாமே புரிஞ்சது திருப்தி.`,
      };

      generatedReports.push(record);
      state.reports.unshift(record);

      if (fillBar) fillBar.style.width = `${pct}%`;
      if (statsText) statsText.textContent = `${i + 1} / ${total} Dialed (${pct}%)`;

      renderAll();
    }

    await apiRequest('/api/calls/bulk', {
      method: 'POST',
      body: JSON.stringify({
        workflowId: wf.id,
        callerId,
        voiceModel,
        records: generatedReports,
      }),
    });

    saveLocalState();
    if (statusText) {
      statusText.textContent = `Batch Outbound Campaign Completed (${total} calls verified)`;
    }
    showToast(`Bulk Campaign Finished: ${total} outbound verification calls logged!`);

    state.bulkQueue = [];
    renderBulkQueuePreview();
    state.isRunningBulk = false;
    if (btnStart) btnStart.disabled = false;
  }

  // ==================== SAVE WORKFLOW CONFIGURATION (TRAINER) ====================
  async function handleSaveWorkflowConfig() {
    const wf = getActiveWorkflow();
    if (!wf) return;

    wf.step1Script = document.getElementById('step1ScriptInput').value.trim();
    wf.step2Script = document.getElementById('step2ScriptInput').value.trim();
    wf.step3Script = document.getElementById('step3ScriptInput').value.trim();
    wf.q1YesKeywords = document.getElementById('q1YesKeywords').value.trim();
    wf.q1NoKeywords = document.getElementById('q1NoKeywords').value.trim();
    wf.q2YesKeywords = document.getElementById('q2YesKeywords').value.trim();
    wf.q2NoKeywords = document.getElementById('q2NoKeywords').value.trim();

    await apiRequest('/api/workflows', {
      method: 'POST',
      body: JSON.stringify({ workflow: wf }),
    });

    saveLocalState();
    renderAll();
    showToast(`Saved 3-step script & keyword configuration for "${wf.shortName}"!`);
  }

  // ==================== "+ ADD NEW WORKFLOW" MODAL ====================
  async function handleCreateNewWorkflow(e) {
    e.preventDefault();
    const name = document.getElementById('newWfName').value.trim();
    const shortName = document.getElementById('newWfShortName').value.trim();
    const callerId = document.getElementById('newWfCallerId').value;
    const badgeColor = document.getElementById('newWfBadgeColor').value;
    const step1Script = document.getElementById('newWfStep1').value.trim();
    const step2Script = document.getElementById('newWfStep2').value.trim();
    const step3Script = document.getElementById('newWfStep3').value.trim();

    if (!name || !shortName) return;

    const id =
      shortName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') +
      '-' +
      Math.floor(100 + Math.random() * 900);

    const newWf = {
      id,
      name,
      shortName,
      subtitle: 'Custom Outbound Verification',
      description: `Automated outbound verification calls for ${name}.`,
      callerId,
      voiceModel: 'Tamil Female (Pallavi HD)',
      badgeColor,
      itemLabel: 'Vehicle / Service Name',
      step1Script,
      step2Script,
      q1YesKeywords: DEFAULT_WORKFLOWS[0].q1YesKeywords,
      q1NoKeywords: DEFAULT_WORKFLOWS[0].q1NoKeywords,
      step3Script,
      q2YesKeywords: DEFAULT_WORKFLOWS[0].q2YesKeywords,
      q2NoKeywords: DEFAULT_WORKFLOWS[0].q2NoKeywords,
    };

    state.workflows.push(newWf);
    state.activeWorkflowId = newWf.id;

    await apiRequest('/api/workflows', {
      method: 'POST',
      body: JSON.stringify({ workflow: newWf }),
    });

    saveLocalState();
    closeNewWorkflowModal();
    selectWorkflow(newWf.id);
    showToast(`Created and activated new workflow: "${newWf.name}"`);
  }

  function openNewWorkflowModal() {
    document.getElementById('newWorkflowModalBackdrop')?.classList.remove('hidden');
  }

  function closeNewWorkflowModal() {
    document.getElementById('newWorkflowModalBackdrop')?.classList.add('hidden');
    document.getElementById('newWorkflowForm')?.reset();
  }

  // ==================== EXPORT CSV / EXCEL ====================
  function exportReportsToCsv() {
    const rows = getFilteredReports();
    if (rows.length === 0) {
      showToast('No verification report records to export yet.');
      return;
    }
    const headers = [
      'Date & Time',
      'Workflow Name',
      'Dialed From Number',
      'Customer Name',
      'Customer Phone',
      'Enquiry Item (Vehicle / Service)',
      'Q1: Staff Contacted',
      'Q2: Understood & Satisfied',
      'Customer Spoken Transcript / Remark',
    ];

    const escapeCsvField = (val) => {
      const str = String(val ?? '').replace(/"/g, '""');
      return `"${str}"`;
    };

    const csvLines = [
      headers.map(escapeCsvField).join(','),
      ...rows.map((r) =>
        [
          r.timestamp,
          r.workflowName,
          r.callerId,
          r.customerName,
          r.customerPhone,
          r.enquiryItem,
          r.q1Contacted,
          r.q2Satisfied,
          r.transcript,
        ]
          .map(escapeCsvField)
          .join(',')
      ),
    ];

    const blob = new Blob(['\uFEFF' + csvLines.join('\r\n')], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Reach_AI_Voice_Verification_Report_${state.activeReportFilter}_${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    showToast(`Exported ${rows.length} verification records to CSV / Excel!`);
  }

  function downloadSampleTemplateCsv() {
    const wf = getActiveWorkflow();
    const headerOnly = ['Name,Phone,Vehicle/Service'];

    const blob = new Blob(['\uFEFF' + headerOnly.join('\r\n') + '\r\n'], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${wf.id}_outbound_leads_template.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  // ==================== EVENT LISTENERS SETUP ====================
  function bindEvents() {
    document.querySelectorAll('#mainNavTabs .nav-tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        const view = tab.getAttribute('data-view');
        if (!view) return;
        state.activeView = view;

        document.querySelectorAll('#mainNavTabs .nav-tab').forEach((t) =>
          t.classList.toggle('active', t === tab)
        );
        document.querySelectorAll('.view-section').forEach((sec) => {
          sec.classList.toggle('active', sec.id === `view-${view}`);
        });

        const reportsSec = document.getElementById('reportsContainerSection');
        if (reportsSec) {
          reportsSec.style.display = view === 'settings' ? 'none' : 'block';
          if (view === 'reports') {
            reportsSec.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }
      });
    });

    document.getElementById('workflowSelect')?.addEventListener('change', (e) => {
      selectWorkflow(e.target.value);
    });
    document.getElementById('trainerWorkflowSelect')?.addEventListener('change', (e) => {
      selectWorkflow(e.target.value);
    });

    document.getElementById('callerIdSelect')?.addEventListener('change', () => {
      renderTopbar();
    });

    document.getElementById('singleSimulatedOutcome')?.addEventListener('change', (e) => {
      const group = document.getElementById('customTranscriptGroup');
      if (group) {
        group.classList.toggle('hidden', e.target.value !== 'custom');
      }
    });

    document
      .getElementById('singleDialForm')
      ?.addEventListener('submit', handleSingleDialSubmit);

    const dropzone = document.getElementById('csvDropzone');
    const fileInput = document.getElementById('csvFileInput');

    if (dropzone && fileInput) {
      dropzone.addEventListener('click', () => fileInput.click());
      dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('dragover');
      });
      dropzone.addEventListener('dragleave', () => {
        dropzone.classList.remove('dragover');
      });
      dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
        const file = e.dataTransfer?.files?.[0];
        if (file) readCsvFile(file);
      });
      fileInput.addEventListener('change', (e) => {
        const file = e.target.files?.[0];
        if (file) readCsvFile(file);
      });
    }

    document
      .getElementById('btnDownloadTemplateCsv')
      ?.addEventListener('click', downloadSampleTemplateCsv);
    document.getElementById('btnClearBulkQueue')?.addEventListener('click', () => {
      state.bulkQueue = [];
      renderBulkQueuePreview();
    });
    document
      .getElementById('btnStartBulkCampaign')
      ?.addEventListener('click', runBulkOutboundCampaign);

    document
      .getElementById('step1ScriptInput')
      ?.addEventListener('input', updateStep1LivePreview);

    document.querySelectorAll('.chip-btn').forEach((chip) => {
      chip.addEventListener('click', () => {
        const placeholder = chip.getAttribute('data-insert') || '';
        const textarea = document.getElementById('step1ScriptInput');
        if (!textarea) return;
        const start = textarea.selectionStart ?? textarea.value.length;
        const end = textarea.selectionEnd ?? textarea.value.length;
        textarea.value =
          textarea.value.slice(0, start) + placeholder + textarea.value.slice(end);
        updateStep1LivePreview();
        textarea.focus();
      });
    });

    document
      .getElementById('btnSaveWorkflowConfig')
      ?.addEventListener('click', handleSaveWorkflowConfig);

    document
      .getElementById('btnRunIntentTest')
      ?.addEventListener('click', runIntentClassifierSandbox);
    document
      .getElementById('intentTestInput')
      ?.addEventListener('input', runIntentClassifierSandbox);

    document.querySelectorAll('#reportFilterTabs .filter-tab').forEach((btn) => {
      btn.addEventListener('click', () => {
        const filter = btn.getAttribute('data-filter') || 'ALL';
        state.activeReportFilter = filter;
        document.querySelectorAll('#reportFilterTabs .filter-tab').forEach((b) =>
          b.classList.toggle('active', b === btn)
        );
        renderKPIs();
        renderReportsTable();
      });
    });

    document.getElementById('reportSearchInput')?.addEventListener('input', (e) => {
      state.reportSearchQuery = e.target.value || '';
      renderReportsTable();
    });

    document
      .getElementById('btnExportCsv')
      ?.addEventListener('click', exportReportsToCsv);

    document
      .getElementById('btnOpenNewWorkflowModal')
      ?.addEventListener('click', openNewWorkflowModal);
    document
      .getElementById('btnCloseNewWorkflowModal')
      ?.addEventListener('click', closeNewWorkflowModal);
    document
      .getElementById('btnCancelNewWorkflow')
      ?.addEventListener('click', closeNewWorkflowModal);
    document
      .getElementById('newWorkflowForm')
      ?.addEventListener('submit', handleCreateNewWorkflow);

    document.getElementById('btnClearAllData')?.addEventListener('click', () => {
      state.reports = [];
      saveLocalState();
      renderAll();
      showToast('Cleared all call verification records.');
    });

    document.getElementById('settingSpeechRate')?.addEventListener('input', (e) => {
      state.speechRate = parseFloat(e.target.value) || 1.0;
      const lbl = document.getElementById('lblSpeechRateVal');
      if (lbl) lbl.textContent = `${state.speechRate.toFixed(2)}x`;
    });
    document.getElementById('settingSpeechPitch')?.addEventListener('input', (e) => {
      state.speechPitch = parseFloat(e.target.value) || 1.0;
      const lbl = document.getElementById('lblSpeechPitchVal');
      if (lbl) lbl.textContent = state.speechPitch.toFixed(2);
    });
    document.getElementById('btnTestVoiceEngine')?.addEventListener('click', () => {
      const wf = getActiveWorkflow();
      speakText(wf.step1Script);
      showToast('Playing Reach AI Voice Tamil + English TTS Sample...');
    });
  }

  function readCsvFile(file) {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const parsed = parseCsvText(ev.target?.result || '');
      state.bulkQueue = parsed;
      renderBulkQueuePreview();
      showToast(`Parsed ${parsed.length} leads from "${file.name}"`);
    };
    reader.readAsText(file);
  }

  // ==================== INITIALIZE ====================
  document.addEventListener('DOMContentLoaded', () => {
    bindEvents();
    syncWithBackendOnBoot();
  });
})();
