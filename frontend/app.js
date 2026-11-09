/**
 * Reach AI Voice — Outbound Campaign & Workflow Console (frontend/app.js)
 *
 * Designed for seamless Backend REST API integration:
 * Set API_CONFIG.BASE_URL when the backend is ready. While offline/frontend-only,
 * all operations automatically persist to localStorage so the entire UI works out of the box.
 */

(function () {
  'use strict';

  // ==================== BACKEND INTEGRATION CONFIGURATION ====================
  const API_CONFIG = {
    BASE_URL: window.location.protocol === 'file:' ? 'http://localhost:8000/api' : '/api', // Change to e.g. 'http://localhost:5000/api' when backend is deployed
    ENDPOINTS: {
      CLIENTS: '/clients', // GET all, POST new, PUT /:id, DELETE /:id
      CLIENT_LEADS: (clientId) => `/clients/${clientId}/leads`, // POST upload/scan leads
      CALL_RESULT: (clientId, leadId) => `/clients/${clientId}/leads/${leadId}/call`, // POST call outcome
      TRAINER: (clientId) => `/clients/${clientId}/trainer`, // PUT LLM trainer rules
      REPORTS: '/reports', // GET overall verification report
    },
  };

  const STORAGE_KEY = 'reach_ai_voice_vits13_approved_v3';

  // ==================== CLEAN INITIAL STATE (0 CLIENTS, 0 DUMMY DATA) ====================
  const DEFAULT_CLIENTS = [
    {
      id: 'client-tata-motors',
      name: 'TATA Motors',
      industry: 'Automobile Dealership Enquiry Verification',
      callerId: '+91 98400 11223',
      voiceLanguage: 'AI4Bharat VITS-Rasa-13 Conversational (24kHz Approved)',
      openingGreeting: 'வணக்கம் {lead_name} சார், இது ஒரு வெரிபிகேஷன் கால், டாட்டா மோட்டார்ஸ்ல இருந்து பேசுறேன்.',
      questions: [
        {
          id: 'q1',
          text: 'நீங்க டாட்டா நெக்சான் வண்டி பத்தி விசாரிச்சிருந்தீங்க, நம்ம டீலர் உங்ககிட்ட பேசுனாங்களா?',
        },
        {
          id: 'q2',
          text: 'டீலர் சொன்ன வண்டி விவரம் மற்றும் விலை உங்களுக்கு திருப்தியா இருந்ததா சார்?',
        },
      ],
      trainer: {
        persona: 'Polite, natural Tamil female customer support executive from TATA Motors.',
        whatToSpeak: '- Greet the customer by name\n- Verify if the showroom dealer contacted them regarding their TATA vehicle enquiry\n- Ask if they are satisfied with the explanation',
        forbiddenPhrases: 'Do not quote unofficial discounts or ask for OTP',
        whatNotToSpeak: '- Never promise unauthorized cash discounts\n- Never argue if the customer is busy',
        positiveKeywords: 'ஆமா, ஆமாம், பேசுனாங்க, பேசினாங்க, புரிஞ்சது, திருப்தி, ஓகே, சரி, aama, yes, spoke, satisfied, ok, interested',
        negativeKeywords: 'இல்ல, இல்லை, பேசல, கூப்பிடல, வேண்டாம், திருப்தி இல்ல, illa, no, not called, not interested, busy',
      },
      leads: [
        {
          id: 'LEAD-TATA-1',
          name: 'ரமேஷ்',
          phone: '+918610057080',
          enquiry: 'TATA Nexon XZ+',
          simMode: 'qualified',
          status: 'PENDING',
          answers: {},
          callSummary: '',
          calledAt: '',
        },
        {
          id: 'LEAD-TATA-2',
          name: 'சுரேஷ்',
          phone: '+91 98765 12345',
          enquiry: 'TATA Punch Accomplished',
          simMode: 'not_qualified',
          status: 'PENDING',
          answers: {},
          callSummary: '',
          calledAt: '',
        },
      ],
    },
    {
      id: 'client-healing-earth',
      name: 'Healing Earth',
      industry: 'Wellness & Holistic Healthcare Verification',
      callerId: '+91 98400 44556',
      voiceLanguage: 'AI4Bharat VITS-Rasa-13 Conversational (24kHz Approved)',
      openingGreeting: 'வணக்கம் {lead_name} சார், இது ஒரு வெரிபிகேஷன் கால், ஹீலிங் எர்த்ல இருந்து பேசுறேன்.',
      questions: [
        {
          id: 'q1',
          text: 'நீங்க எங்க சர்வீஸ் பத்தி விசாரிச்சிருந்தீங்க, நம்ம டீம் உங்ககிட்ட பேசுனாங்களா?',
        },
        {
          id: 'q2',
          text: 'இந்த வாரம் நேர்ல வந்து கன்சல்டேஷன் அப்பாயின்ட்மென்ட் புக் பண்ணிக்கலாமா சார்?',
        },
      ],
      trainer: {
        persona: 'Warm, caring Tamil female wellness coordinator from Healing Earth.',
        whatToSpeak: '- Greet the client warmly\n- Check if our wellness team explained the therapy package\n- Confirm consultation interest',
        forbiddenPhrases: 'Do not give medical prescriptions on the call',
        whatNotToSpeak: '- Do not diagnose medical conditions over the phone',
        positiveKeywords: 'ஆமா, ஆமாம், பேசுனாங்க, வரேன், ஓகே, புக் பண்ணுங்க, aama, yes, spoke, ok, book',
        negativeKeywords: 'இல்ல, இல்லை, பேசல, வேண்டாம், அப்புறம், illa, no, not interested',
      },
      leads: [
        {
          id: 'LEAD-HEAL-1',
          name: 'கார்த்திக்',
          phone: '+91 98401 22334',
          enquiry: 'Ayurveda Wellness Package',
          simMode: 'qualified',
          status: 'PENDING',
          answers: {},
          callSummary: '',
          calledAt: '',
        },
      ],
    },
  ];

  // ==================== APPLICATION STATE ====================
  const state = {
    clients: [],
    activeView: 'dashboard', // 'dashboard' | 'workflows' | 'outbound' | 'trainer' | 'reports'
    selectedOutboundClientId: null, // null = show client cards grid; string = show client campaign page
    activeClientLeadTab: 'ALL', // 'ALL' | 'QUALIFIED' | 'NOT_QUALIFIED' | 'NOT_ATTENDED'
    activeReportClientFilter: 'ALL',
    activeReportStatusFilter: 'ALL',
    editingQuestionsDraft: [],
    // Call runner state
    isCallingActive: false,
    stopAfterCurrentCall: false,
    currentlyCallingLeadId: null,
  };

  // ==================== STORAGE & API SERVICE ====================
  function loadState() {
    try {
      // Remove any legacy keys from older sessions that contained sample/dummy data
      [
        'reach_ai_voice_platform_state_v4',
        'reach_ai_voice_state_v1',
        'reach_ai_voice_state_v2',
        'reach_ai_voice_state_v3',
      ].forEach((k) => localStorage.removeItem(k));

      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.clients)) {
          state.clients = parsed.clients;
          return;
        }
      }
    } catch (_e) {
      // ignore storage errors
    }
    state.clients = JSON.parse(JSON.stringify(DEFAULT_CLIENTS));
  }

  function saveState() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          clients: state.clients,
        })
      );
    } catch (_e) {
      // ignore storage errors
    }
  }

  async function tryApiCall(path, options = {}) {
    try {
      const res = await fetch(`${API_CONFIG.BASE_URL}${path}`, {
        headers: { 'Content-Type': 'application/json' },
        ...options,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (_err) {
      // Frontend-only mode: silently use local state
      return null;
    }
  }

  // ==================== UTILITIES ====================
  function escapeHtml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function formatNow() {
    return new Date().toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  }

  function showToast(msg) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const el = document.createElement('div');
    el.className = 'toast';
    el.innerHTML = `<span class="status-dot"></span><span>${escapeHtml(msg)}</span>`;
    container.appendChild(el);
    setTimeout(() => {
      el.style.opacity = '0';
      el.style.transition = 'opacity 0.25s ease';
      setTimeout(() => el.remove(), 250);
    }, 3200);
  }

  function getClientById(clientId) {
    return state.clients.find((c) => c.id === clientId) || null;
  }

  function computeClientStats(client) {
    const leads = Array.isArray(client.leads) ? client.leads : [];
    const assigned = leads.length;
    const qualified = leads.filter((l) => l.status === 'QUALIFIED').length;
    const notQualified = leads.filter((l) => l.status === 'NOT_QUALIFIED').length;
    const notAttended = leads.filter((l) => l.status === 'NOT_ATTENDED').length;
    const pending = leads.filter((l) => l.status === 'PENDING').length;
    const spoken = qualified + notQualified + notAttended;

    return {
      assigned,
      spoken,
      pending,
      qualified,
      notQualified,
      notAttended,
    };
  }

  function computeGlobalStats(filterClientId = 'ALL') {
    const targetClients =
      filterClientId === 'ALL'
        ? state.clients
        : state.clients.filter((c) => c.id === filterClientId);

    const totals = {
      clientsCount: state.clients.length,
      assigned: 0,
      spoken: 0,
      pending: 0,
      qualified: 0,
      notQualified: 0,
      notAttended: 0,
    };

    targetClients.forEach((c) => {
      const s = computeClientStats(c);
      totals.assigned += s.assigned;
      totals.spoken += s.spoken;
      totals.pending += s.pending;
      totals.qualified += s.qualified;
      totals.notQualified += s.notQualified;
      totals.notAttended += s.notAttended;
    });

    return totals;
  }

  // ==================== NAVIGATION ====================
  function switchView(viewName) {
    state.activeView = viewName;

    document.querySelectorAll('#mainNavTabs .nav-tab').forEach((btn) => {
      btn.classList.toggle('active', btn.getAttribute('data-view') === viewName);
    });

    document.querySelectorAll('.view-section').forEach((sec) => {
      sec.classList.toggle('active', sec.id === `view-${viewName}`);
    });

    renderAll();
  }

  function openClientOutboundCampaign(clientId) {
    state.selectedOutboundClientId = clientId;
    state.activeClientLeadTab = 'ALL';
    switchView('outbound');
  }

  function openClientWorkflowModal() {
    const modal = document.getElementById('clientWorkflowModal');
    if (modal) {
      modal.classList.remove('hidden');
      setTimeout(() => document.getElementById('wfClientName')?.focus(), 50);
    }
  }

  function closeClientWorkflowModal() {
    const modal = document.getElementById('clientWorkflowModal');
    if (modal) {
      modal.classList.add('hidden');
    }
  }

  async function deleteClientWorkflowOnly(clientId) {
    const client = getClientById(clientId);
    if (!client) return;

    client.openingGreeting = '';
    client.questions = [];
    saveState();
    await tryApiCall(`${API_CONFIG.ENDPOINTS.CLIENTS}/${clientId}`, {
      method: 'PUT',
      body: JSON.stringify(client),
    });
    renderAll();
    showToast(
      `Deleted workflow for "${client.name}". Click "+ Create New Workflow" to add a new workflow.`
    );
  }

  async function deleteClientCompletely(clientId) {
    const client = getClientById(clientId);
    if (!client) return;
    const clientName = client.name;

    state.clients = state.clients.filter((c) => c.id !== clientId);
    if (state.selectedOutboundClientId === clientId) {
      state.selectedOutboundClientId = null;
    }
    saveState();
    await tryApiCall(`${API_CONFIG.ENDPOINTS.CLIENTS}/${clientId}`, {
      method: 'DELETE',
    });
    renderAll();
    showToast(`Deleted client "${clientName}" completely.`);
  }

  async function deleteSingleWorkflowQuestion(clientId, questionIndex) {
    const client = getClientById(clientId);
    if (!client || !Array.isArray(client.questions)) return;
    client.questions.splice(questionIndex, 1);
    saveState();
    await tryApiCall(`${API_CONFIG.ENDPOINTS.CLIENTS}/${clientId}`, {
      method: 'PUT',
      body: JSON.stringify(client),
    });
    renderAll();
    showToast(`Removed question Q${questionIndex + 1} from "${client.name}".`);
  }

  function loadClientIntoWorkflowEditor(clientId) {
    const client = getClientById(clientId);
    if (!client) return;

    document.getElementById('wfClientId').value = client.id;
    document.getElementById('wfClientName').value = client.name;
    document.getElementById('wfIndustry').value = client.industry || '';
    document.getElementById('wfCallerId').value = client.callerId || '';
    document.getElementById('wfVoiceLanguage').value =
      client.voiceLanguage || 'Tamil + English (Pallavi HD)';
    document.getElementById('wfOpeningGreeting').value = client.openingGreeting || '';

    const hasExistingWorkflow =
      Array.isArray(client.questions) && client.questions.length > 0;

    document.getElementById('wfFormHeading').textContent = hasExistingWorkflow
      ? `Edit Workflow: ${client.name}`
      : `Create New Workflow: ${client.name}`;
    document.getElementById('wfFormModeBadge').textContent = hasExistingWorkflow
      ? 'Editing Workflow'
      : 'New Workflow for Client';

    const editDeleteActions = document.getElementById('modalEditDeleteActions');
    if (editDeleteActions) {
      editDeleteActions.classList.remove('hidden');
    }

    state.editingQuestionsDraft = hasExistingWorkflow
      ? JSON.parse(JSON.stringify(client.questions))
      : [{ id: 'q1', text: '' }];
    renderQuestionsBuilderRows();
    openClientWorkflowModal();
  }

  function resetWorkflowEditorToNew() {
    document.getElementById('wfClientId').value = '';
    document.getElementById('wfClientName').value = '';
    document.getElementById('wfIndustry').value = '';
    document.getElementById('wfCallerId').value = '';
    document.getElementById('wfOpeningGreeting').value = '';

    document.getElementById('wfFormHeading').textContent = 'Add New Client & Workflow';
    document.getElementById('wfFormModeBadge').textContent = 'New Client';

    const editDeleteActions = document.getElementById('modalEditDeleteActions');
    if (editDeleteActions) {
      editDeleteActions.classList.add('hidden');
    }

    state.editingQuestionsDraft = [
      {
        id: 'q1',
        text: '',
      },
    ];
    renderQuestionsBuilderRows();
  }

  // ==================== RENDER ALL VIEWS ====================
  function renderAll() {
    const globalStats = computeGlobalStats('ALL');

    // Update topbar & sidebar counters
    const navBadge = document.getElementById('navClientCountBadge');
    const topClientCount = document.getElementById('topbarClientCount');
    if (navBadge) navBadge.textContent = String(state.clients.length);
    if (topClientCount) topClientCount.textContent = String(state.clients.length);

    renderDashboardView(globalStats);
    renderWorkflowsView();
    renderOutboundView();
    renderTrainerView();
    renderReportsView();
  }

  // -------------------- PAGE 1: DASHBOARD --------------------
  function renderDashboardView(stats) {
    document.getElementById('dashTotalClients').textContent = String(stats.clientsCount);
    document.getElementById('dashTotalLeads').textContent = String(stats.assigned);
    document.getElementById('dashCallsSpoken').textContent = String(stats.spoken);
    document.getElementById('dashPendingCallsFoot').textContent = `${stats.pending} pending calls`;
    document.getElementById('dashQualifiedCount').textContent = String(stats.qualified);
    document.getElementById('dashNotQualifiedCount').textContent = String(stats.notQualified);
    document.getElementById('dashNotAttendedCount').textContent = String(stats.notAttended);

    const grid = document.getElementById('dashboardClientCardsGrid');
    if (!grid) return;

    grid.innerHTML = buildClientCardsHtml();
    bindClientCardEvents(grid);
  }

  function buildClientCardsHtml() {
    if (state.clients.length === 0) {
      return `<div style="padding: 24px; color: #706b63;">No clients added yet. Click "+ Add Client Workflow" to create your first client.</div>`;
    }

    return state.clients
      .map((client) => {
        const s = computeClientStats(client);
        const qCount = (client.questions || []).length;
        return `
          <div class="client-card" data-open-client-id="${escapeHtml(client.id)}">
            <div class="client-card-top">
              <div>
                <div class="client-card-name">${escapeHtml(client.name)}</div>
                <div class="client-card-category">${escapeHtml(client.industry)}</div>
              </div>
              <span class="client-card-badge">${qCount > 0 ? `${qCount} Questions` : 'No Workflow'}</span>
            </div>

            <div class="client-card-stats">
              <div>
                <span class="stat-mini-val">${s.assigned}</span>
                <span class="stat-mini-lbl">Assigned</span>
              </div>
              <div>
                <span class="stat-mini-val text-positive">${s.qualified}</span>
                <span class="stat-mini-lbl">Qualified</span>
              </div>
              <div>
                <span class="stat-mini-val text-negative">${s.notQualified}</span>
                <span class="stat-mini-lbl">Not Qual.</span>
              </div>
              <div>
                <span class="stat-mini-val text-warning">${s.notAttended}</span>
                <span class="stat-mini-lbl">Unattended</span>
              </div>
            </div>

            <div class="client-card-footer" style="flex-wrap: wrap;">
              <div style="display:flex; gap:6px; flex-wrap:wrap;">
                <button type="button" class="btn-ghost btn-xs" data-edit-wf-id="${escapeHtml(client.id)}">
                  ${qCount > 0 ? 'Edit Workflow' : '+ New Workflow'}
                </button>
                ${
                  qCount > 0
                    ? `<button type="button" class="btn-danger-outline btn-xs" data-del-wf-only-id="${escapeHtml(client.id)}">Delete Workflow</button>`
                    : ''
                }
                <button type="button" class="btn-danger btn-xs" data-del-client-id="${escapeHtml(client.id)}">
                  Delete Client
                </button>
              </div>
              <button type="button" class="btn-solid btn-xs" data-open-client-btn="${escapeHtml(client.id)}">
                Open Calls →
              </button>
            </div>
          </div>
        `;
      })
      .join('');
  }

  function bindClientCardEvents(container) {
    container.querySelectorAll('[data-edit-wf-id]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        loadClientIntoWorkflowEditor(btn.getAttribute('data-edit-wf-id'));
      });
    });

    container.querySelectorAll('[data-del-wf-only-id]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteClientWorkflowOnly(btn.getAttribute('data-del-wf-only-id'));
      });
    });

    container.querySelectorAll('[data-del-client-id]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteClientCompletely(btn.getAttribute('data-del-client-id'));
      });
    });

    container.querySelectorAll('[data-open-client-id]').forEach((card) => {
      card.addEventListener('click', () => {
        openClientOutboundCampaign(card.getAttribute('data-open-client-id'));
      });
    });
  }

  // -------------------- PAGE 2: CLIENT WORKFLOW BUILDER --------------------
  function renderQuestionsBuilderRows() {
    const listEl = document.getElementById('wfQuestionsList');
    if (!listEl) return;

    listEl.innerHTML = state.editingQuestionsDraft
      .map(
        (q, idx) => `
        <div class="question-item-row" data-q-index="${idx}">
          <div class="question-row-top">
            <span class="question-badge">Question Q${idx + 1}</span>
            ${
              state.editingQuestionsDraft.length > 1
                ? `<button type="button" class="btn-remove-question" data-remove-q="${idx}">Remove</button>`
                : ''
            }
          </div>
          <input
            type="text"
            class="field-input question-text-input"
            data-q-input="${idx}"
            value="${escapeHtml(q.text)}"
            placeholder="Enter the question the voice agent should ask (Yes / No question)"
            required
          />
        </div>
      `
      )
      .join('');

    listEl.querySelectorAll('.question-text-input').forEach((inp) => {
      inp.addEventListener('input', (e) => {
        const i = Number(inp.getAttribute('data-q-input'));
        if (state.editingQuestionsDraft[i]) {
          state.editingQuestionsDraft[i].text = e.target.value;
        }
      });
    });

    listEl.querySelectorAll('[data-remove-q]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const i = Number(btn.getAttribute('data-remove-q'));
        state.editingQuestionsDraft.splice(i, 1);
        renderQuestionsBuilderRows();
      });
    });
  }

  function renderWorkflowsView() {
    const container = document.getElementById('savedWorkflowsListContainer');
    if (!container) return;

    if (state.clients.length === 0) {
      container.innerHTML = `<div style="padding: 24px; color: #706b63;">No clients saved yet. Click "+ Add New Client" to open the popup form and add a client workflow.</div>`;
      return;
    }

    container.innerHTML = state.clients
      .map((client) => {
        const qList = Array.isArray(client.questions) ? client.questions : [];
        const hasWorkflow = qList.length > 0;

        const workflowBodyHtml = hasWorkflow
          ? `
            ${
              client.openingGreeting
                ? `<div class="wf-greeting-preview"><strong>Greeting:</strong> ${escapeHtml(client.openingGreeting)}</div>`
                : ''
            }
            <ul class="saved-wf-questions">
              ${qList
                .map(
                  (q, idx) => `
                  <li class="wf-question-item">
                    <span><strong>Q${idx + 1}:</strong> ${escapeHtml(q.text)}</span>
                    <button
                      type="button"
                      class="btn-remove-question"
                      title="Delete this question"
                      data-del-single-q-client="${escapeHtml(client.id)}"
                      data-del-single-q-idx="${idx}"
                    >
                      Delete Q${idx + 1}
                    </button>
                  </li>
                `
                )
                .join('')}
            </ul>
          `
          : `
            <div class="wf-empty-notice">
              Workflow was deleted for this client. Click <strong>"+ Create New Workflow"</strong> below to configure a new workflow.
            </div>
          `;

        return `
          <div class="saved-wf-card">
            <div class="saved-wf-top">
              <div>
                <div class="saved-wf-title">${escapeHtml(client.name)}</div>
                <div class="saved-wf-sub">${escapeHtml(client.industry)} • Caller ID: ${escapeHtml(client.callerId)}</div>
              </div>
              <span class="mode-pill">${hasWorkflow ? `${qList.length} Questions` : 'No Workflow'}</span>
            </div>

            ${workflowBodyHtml}

            <div class="saved-wf-actions">
              <button type="button" class="btn-solid btn-xs" data-wf-open-calls="${escapeHtml(client.id)}">
                Open Outbound Calls
              </button>
              <button type="button" class="${hasWorkflow ? 'btn-ghost' : 'btn-solid'} btn-xs" data-wf-edit="${escapeHtml(client.id)}">
                ${hasWorkflow ? 'Edit Workflow & Questions' : '+ Create New Workflow'}
              </button>
              ${
                hasWorkflow
                  ? `<button type="button" class="btn-danger-outline btn-xs" data-wf-delete-only="${escapeHtml(client.id)}">
                      Delete Workflow
                    </button>`
                  : ''
              }
              <button type="button" class="btn-danger btn-xs" data-wf-delete-client="${escapeHtml(client.id)}">
                Delete Client
              </button>
            </div>
          </div>
        `;
      })
      .join('');

    container.querySelectorAll('[data-wf-edit]').forEach((btn) => {
      btn.addEventListener('click', () =>
        loadClientIntoWorkflowEditor(btn.getAttribute('data-wf-edit'))
      );
    });

    container.querySelectorAll('[data-wf-open-calls]').forEach((btn) => {
      btn.addEventListener('click', () =>
        openClientOutboundCampaign(btn.getAttribute('data-wf-open-calls'))
      );
    });

    container.querySelectorAll('[data-wf-delete-only]').forEach((btn) => {
      btn.addEventListener('click', () =>
        deleteClientWorkflowOnly(btn.getAttribute('data-wf-delete-only'))
      );
    });

    container.querySelectorAll('[data-wf-delete-client]').forEach((btn) => {
      btn.addEventListener('click', () =>
        deleteClientCompletely(btn.getAttribute('data-wf-delete-client'))
      );
    });

    container.querySelectorAll('[data-del-single-q-client]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const cId = btn.getAttribute('data-del-single-q-client');
        const qIdx = Number(btn.getAttribute('data-del-single-q-idx'));
        deleteSingleWorkflowQuestion(cId, qIdx);
      });
    });
  }

  // -------------------- PAGE 3: OUTBOUND CALLS --------------------
  function renderOutboundView() {
    const gridView = document.getElementById('outboundClientsGridView');
    const detailView = document.getElementById('outboundClientDetailView');
    const cardsContainer = document.getElementById('outboundClientCardsContainer');

    if (!gridView || !detailView || !cardsContainer) return;

    const selectedClient = getClientById(state.selectedOutboundClientId);

    if (!selectedClient) {
      gridView.classList.remove('hidden');
      detailView.classList.add('hidden');
      cardsContainer.innerHTML = buildClientCardsHtml();
      bindClientCardEvents(cardsContainer);
      return;
    }

    // Show particular client's campaign & leads page
    gridView.classList.add('hidden');
    detailView.classList.remove('hidden');

    document.getElementById('activeClientPageTitle').textContent = `${selectedClient.name} — Outbound Calls & Leads`;
    document.getElementById('activeClientPageMeta').textContent = `Category: ${selectedClient.industry} | Caller ID: ${selectedClient.callerId} | Workflow Questions: ${(selectedClient.questions || []).length}`;

    const stats = computeClientStats(selectedClient);
    document.getElementById('tabCountAll').textContent = String(stats.assigned);
    document.getElementById('tabCountQualified').textContent = String(stats.qualified);
    document.getElementById('tabCountNotQualified').textContent = String(stats.notQualified);
    document.getElementById('tabCountNotAttended').textContent = String(stats.notAttended);
    document.getElementById('clientLiveProgressCount').textContent = `${stats.spoken} / ${stats.assigned} Called`;

    renderClientLeadsTable(selectedClient);
  }

  function getFilteredClientLeads(client) {
    const leads = Array.isArray(client.leads) ? client.leads : [];
    if (state.activeClientLeadTab === 'QUALIFIED') {
      return leads.filter((l) => l.status === 'QUALIFIED');
    }
    if (state.activeClientLeadTab === 'NOT_QUALIFIED') {
      return leads.filter((l) => l.status === 'NOT_QUALIFIED');
    }
    if (state.activeClientLeadTab === 'NOT_ATTENDED') {
      return leads.filter((l) => l.status === 'NOT_ATTENDED');
    }
    return leads;
  }

  function renderClientLeadsTable(client) {
    const thead = document.getElementById('clientLeadsThead');
    const tbody = document.getElementById('clientLeadsTbody');
    if (!thead || !tbody) return;

    const questions = client.questions || [];

    // Dynamic question columns header
    const questionThs = questions
      .map(
        (q, i) =>
          `<th title="${escapeHtml(q.text)}">Q${i + 1}: ${escapeHtml(
            q.text.length > 28 ? q.text.slice(0, 28) + '…' : q.text
          )}</th>`
      )
      .join('');

    thead.innerHTML = `
      <tr>
        <th>#</th>
        <th>Lead Name</th>
        <th>Phone Number</th>
        <th>Enquiry / Details</th>
        ${questionThs}
        <th>Qualification Status</th>
        <th>Call Summary</th>
      </tr>
    `;

    const filteredLeads = getFilteredClientLeads(client);

    if (filteredLeads.length === 0) {
      const colSpan = 6 + questions.length;
      tbody.innerHTML = `
        <tr>
          <td colspan="${colSpan}" style="text-align:center; padding: 32px; color: #706b63;">
            No leads in this tab yet. Upload an Excel / CSV sheet, scan a Google Sheet, or add a lead above.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = filteredLeads
      .map((lead, idx) => {
        const isCalling = state.currentlyCallingLeadId === lead.id;

        const qCells = questions
          .map((q) => {
            const ans = lead.answers?.[q.id] || '—';
            if (ans === 'YES') return `<td><span class="badge-yes">YES</span></td>`;
            if (ans === 'NO') return `<td><span class="badge-no">NO</span></td>`;
            return `<td><span class="badge-pending">—</span></td>`;
          })
          .join('');

        let statusBadge = `<span class="badge-pending">Pending Call</span>`;
        if (isCalling) {
          statusBadge = `<span class="badge-warn">Calling Now...</span>`;
        } else if (lead.status === 'QUALIFIED') {
          statusBadge = `<span class="badge-yes">Qualified</span>`;
        } else if (lead.status === 'NOT_QUALIFIED') {
          statusBadge = `<span class="badge-no">Not Qualified</span>`;
        } else if (lead.status === 'NOT_ATTENDED') {
          statusBadge = `<span class="badge-warn">Not Attended</span>`;
        }

        return `
          <tr class="${isCalling ? 'calling-row' : ''}">
            <td>${idx + 1}</td>
            <td><strong>${escapeHtml(lead.name)}</strong></td>
            <td>${escapeHtml(lead.phone)}</td>
            <td>${escapeHtml(lead.enquiry || 'General Enquiry')}</td>
            ${qCells}
            <td>${statusBadge}</td>
            <td>${escapeHtml(lead.callSummary || 'Waiting to dial')}</td>
          </tr>
        `;
      })
      .join('');
  }

  // -------------------- EXCEL / CSV & GOOGLE SHEET LEAD PARSER --------------------
  function parseRowsIntoLeads(rawText) {
    const lines = String(rawText || '')
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    if (lines.length === 0) return [];

    const parsed = [];
    const modes = ['qualified', 'qualified', 'not_qualified', 'not_attended'];

    for (let i = 0; i < lines.length; i++) {
      // Support both comma-separated (.csv) and tab-separated (copied from Excel / Google Sheets)
      const delimiter = lines[i].includes('\t') ? '\t' : ',';
      const cols = lines[i]
        .split(delimiter)
        .map((c) => c.replace(/^["']|["']$/g, '').trim());

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

      parsed.push({
        id: `LEAD-${Date.now()}-${i}-${Math.floor(Math.random() * 1000)}`,
        name: cols[0] || `Lead ${i + 1}`,
        phone: cols[1] || '',
        enquiry: cols[2] || 'Enquiry',
        simMode: modes[i % modes.length],
        status: 'PENDING',
        answers: {},
        callSummary: '',
        calledAt: '',
      });
    }
    return parsed;
  }

  async function handleScanGoogleSheet() {
    const client = getClientById(state.selectedOutboundClientId);
    const inputEl = document.getElementById('googleSheetUrlInput');
    if (!client || !inputEl) return;

    const rawVal = inputEl.value.trim();
    if (!rawVal) {
      showToast('Please paste a Google Sheet link or copied rows first.');
      return;
    }

    // Case 1: User pasted multi-line or comma/tab rows directly
    if (rawVal.includes('\n') || (!rawVal.startsWith('http') && rawVal.includes(','))) {
      const leads = parseRowsIntoLeads(rawVal);
      if (leads.length > 0) {
        client.leads.push(...leads);
        saveState();
        renderAll();
        inputEl.value = '';
        showToast(`Scanned and added ${leads.length} leads to ${client.name}!`);
        return;
      }
    }

    // Case 2: Google Sheet URL — extract spreadsheet ID and fetch CSV export
    const match = rawVal.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (match && match[1]) {
      const sheetId = match[1];
      const csvExportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv`;
      showToast('Scanning Google Sheet...');

      try {
        const res = await fetch(csvExportUrl);
        if (res.ok) {
          const csvText = await res.text();
          const leads = parseRowsIntoLeads(csvText);
          if (leads.length > 0) {
            client.leads.push(...leads);
            saveState();
            await tryApiCall(API_CONFIG.ENDPOINTS.CLIENT_LEADS(client.id), {
              method: 'POST',
              body: JSON.stringify({ leads }),
            });
            renderAll();
            inputEl.value = '';
            showToast(`Scanned ${leads.length} leads from Google Sheet!`);
            return;
          }
        }
      } catch (_err) {
        // Fallback if Google Sheet is private / CORS restricted in browser
      }

      showToast(
        'Note: Make sure the Google Sheet is set to "Anyone with the link can view", or copy & paste the rows directly into the box.'
      );
      return;
    }

    showToast('Please enter a valid Google Sheet link or "Name, Phone, Enquiry" rows.');
  }

  // -------------------- SMART SPEECH-ONLY BARGE-IN ENGINE (IGNORES NOISE & SPEAKER ECHO) --------------------
  let activeAudioPlayer = null;
  let activeAudioTimer = null;
  let activeAudioResolve = null;
  let currentSpeechGenId = 0;

  function stopActiveAudioImmediately() {
    if (activeAudioTimer) {
      clearTimeout(activeAudioTimer);
      activeAudioTimer = null;
    }
    if (activeAudioPlayer) {
      try {
        activeAudioPlayer.pause();
        activeAudioPlayer.currentTime = 0;
      } catch (_e) {}
      activeAudioPlayer = null;
    }
    fetch(API_CONFIG.BASE_URL + '/audio/stop', { method: 'POST' }).catch(() => {});
    if (typeof activeAudioResolve === 'function') {
      const fn = activeAudioResolve;
      activeAudioResolve = null;
      fn({ interrupted: true });
    }
  }

  let activeBargeInHandler = null;

  /**
   * Checks if recognized mic words while AI speaker is playing are just acoustic echo from the laptop speaker.
   */
  function isEchoOfAiPrompt(spokenStr, aiPromptText) {
    const cleanSpoken = String(spokenStr || '').trim();
    if (!cleanSpoken) return true;
    const cleanPrompt = String(aiPromptText || '').replace(/[.,?!]/g, '');
    // Customer interruption words that immediately prove a real human is speaking:
    const customerTriggers = [
      'ஹலோ', 'சொல்லுங்க', 'ஆமா', 'ஆமாம்', 'இல்ல', 'இல்லை', 'பேசல', 'கூப்பிடல',
      'சரி', 'ஓகே', 'வெயிட்', 'நிறுத்து', 'கேக்குதா', 'கேக்குது', 'புரியல', 'கேக்கல',
      'யாரு', 'யார்', 'எதுக்கு', 'என்ன', 'விஷயம்', 'பிஸி', 'வேண்டாம்', 'அப்புறம்',
      'விலை', 'ரேட்', 'ஷோரூம்', 'மைலேஜ்', 'சாப்டியா', 'சாப்பிட்டீங்களா', 'மேடம்', 'ஹாய்',
      'hello', 'yes', 'no', 'wait', 'stop', 'ok', 'aama', 'illa', 'yaaru', 'edhuku', 'busy'
    ];
    for (const kw of customerTriggers) {
      if (cleanSpoken.toLowerCase().includes(kw) && !cleanPrompt.toLowerCase().includes(kw)) {
        return false;
      }
    }
    const words = cleanSpoken.split(/\s+/).filter((w) => w.length >= 2);
    // Single isolated word while speaker is blasting (that isn't in customerTriggers above, e.g. "இந்த", "வேற") is speaker echo
    if (words.length < 2) return true;
    // Check word or 2-character Tamil stem overlap against AI prompt
    const nonEchoWords = words.filter((w) => {
      if (cleanPrompt.includes(w)) return false;
      const stem = w.slice(0, 3);
      if (stem.length >= 3 && cleanPrompt.includes(stem)) return false;
      return true;
    });
    return nonEchoWords.length < 2;
  }

  /**
   * Speaks Tamil text using Sir-Approved VITS-Rasa-13.
   * Prevents any overlapping or concurrent playback across utterances using currentSpeechGenId.
   */
  async function speakUtterance(text, forceSpeak = false, enableBargeIn = true) {
    const chk = document.getElementById('chkLiveTts');
    // Always speak when forceSpeak is true OR when a real SIM/Bluetooth call is active!
    if (window.__usbSimCallActive && chk && !chk.checked) {
      chk.checked = true;
    }
    if (!forceSpeak && !window.__usbSimCallActive && (!chk || !chk.checked)) {
      await new Promise((r) => setTimeout(r, 700));
      return { interrupted: false, customerSpeech: '' };
    }

    const myGenId = ++currentSpeechGenId;
    stopActiveAudioImmediately();

    let wavDurationMs = 4500;
    let okTts = false;
    try {
      const res = await fetch(API_CONFIG.BASE_URL + '/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' },
        body: JSON.stringify({ text, playOnServer: true }),
      });
      if (res.ok) {
        const blob = await res.blob();
        // 24kHz 16-bit mono WAV = 48,000 bytes per second
        if (blob && blob.size > 44) {
          wavDurationMs = Math.max(1200, Math.round(((blob.size - 44) / 48000) * 1000) + 150);
        }
        okTts = true;
      }
    } catch (_err) {}
    if (!okTts) return { interrupted: false, customerSpeech: '' };

    // If another utterance was requested while fetch('/api/tts') was in flight, abort this older audio!
    if (myGenId !== currentSpeechGenId) {
      stopActiveAudioImmediately();
      return { interrupted: true, customerSpeech: '' };
    }

    let wasInterrupted = false;
    let capturedSpeech = '';
    let rec = null;
    let speechFinishedResolve = null;

    const speechFinishedPromise = new Promise((resolveSpeech) => {
      speechFinishedResolve = resolveSpeech;
    });

    let finalTranscript = '';
    let interimTranscript = '';
    let silenceTimer = null;
    let doneSpeech = false;

    const finishCustomerTurn = (overrideText) => {
      if (doneSpeech) return;
      doneSpeech = true;
      activeBargeInHandler = null;
      if (silenceTimer) clearTimeout(silenceTimer);
      try {
        if (rec) {
          rec.onend = null;
          rec.onerror = null;
          rec.onresult = null;
          rec.abort();
        }
      } catch (_e) {}
      if (speechFinishedResolve) {
        const resultText = overrideText !== undefined ? overrideText : (finalTranscript + ' ' + interimTranscript).trim();
        speechFinishedResolve(resultText);
      }
    };

    const triggerVerifiedSpeechBargeIn = (detectedWords, isManualInstant = false) => {
      const sp = document.getElementById('liveMicHeardSpan');
      if (sp) sp.textContent = `🎙️ Hearing: "${detectedWords}" (Listening completely...)`;
      if (!wasInterrupted) {
        wasInterrupted = true;
        stopActiveAudioImmediately();
        // Reset transcript to only what customer is saying now (discarding earlier speaker echo)
        const msgEl = document.getElementById('clientLiveCallMessage');
        if (msgEl) {
          msgEl.innerHTML += `<div style="color:#f59e0b;font-weight:600;margin-top:4px;">⏸️ Customer Interrupted ("${escapeHtml(detectedWords)}") — AI Stopped &amp; Listening Completely...</div>`;
        }
      }
      if (silenceTimer) clearTimeout(silenceTimer);
      if (isManualInstant) {
        finishCustomerTurn(detectedWords);
      } else {
        // Wait 1.25s after final word (or 1.65s after interim word) so the customer can finish their FULL sentence!
        const waitPauseMs = (finalTranscript.trim() && !interimTranscript.trim()) ? 1250 : 1650;
        silenceTimer = setTimeout(() => finishCustomerTurn(), waitPauseMs);
      }
    };

    if (enableBargeIn) {
      activeBargeInHandler = (manualWords) => {
        triggerVerifiedSpeechBargeIn(manualWords, true);
      };
      const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRec) {
        try {
          rec = new SpeechRec();
          rec.lang = 'ta-IN';
          rec.continuous = true;
          rec.interimResults = true;
          rec.maxAlternatives = 1;
          // ONLY trigger when real spoken words are recognized and are NOT speaker echo!
          rec.onresult = (ev) => {
            interimTranscript = '';
            for (let i = ev.resultIndex; i < ev.results.length; i++) {
              const t = ev.results[i][0].transcript;
              if (ev.results[i].isFinal) finalTranscript += ' ' + t;
              else interimTranscript += t;
            }
            const combined = (finalTranscript + ' ' + interimTranscript).trim();
            if (wasInterrupted) {
              // Already interrupted AI -> keep extending silenceTimer on every word until user finishes full sentence!
              triggerVerifiedSpeechBargeIn(combined, false);
            } else if (combined.length >= 2 && !isEchoOfAiPrompt(combined, text)) {
              triggerVerifiedSpeechBargeIn(combined, false);
            }
          };
          rec.onerror = () => {};
          rec.onend = () => {
            // If user interrupted and silenceTimer hasn't finished yet, keep mic open in case user paused briefly mid-sentence!
            if (wasInterrupted && !doneSpeech) {
              try { rec.start(); } catch (_e) {
                finishCustomerTurn();
              }
            }
          };
          rec.start();
        } catch (_e) {}
      }
    }

    await new Promise((resolveAudio) => {
      activeAudioResolve = (resObj) => {
        if (activeAudioTimer) {
          clearTimeout(activeAudioTimer);
          activeAudioTimer = null;
        }
        resolveAudio(resObj);
      };
      activeAudioTimer = setTimeout(() => {
        activeAudioTimer = null;
        if (activeAudioResolve) {
          const fn = activeAudioResolve;
          activeAudioResolve = null;
          fn({ interrupted: false });
        }
      }, wavDurationMs);
    });

    if (wasInterrupted) {
      capturedSpeech = await speechFinishedPromise;
    } else {
      // Close the speaker-playback mic session immediately so room reverb from the end of AI speech isn't mistaken for user speech
      finishCustomerTurn('');
    }

    return { interrupted: wasInterrupted, customerSpeech: capturedSpeech };
  }

  async function startClientOutboundCalling() {
    if (state.isCallingActive) return;
    const client = getClientById(state.selectedOutboundClientId);
    if (!client) return;

    if (!Array.isArray(client.questions) || client.questions.length === 0) {
      showToast('Please create a workflow and add call questions for this client first.');
      loadClientIntoWorkflowEditor(client.id);
      return;
    }

    // Auto-reset leads if all were already called ("2 / 2 Called") so "▶ Start Calling" ALWAYS works immediately!
    let pendingLeads = (client.leads || []).filter((l) => l.status === 'PENDING');
    if (pendingLeads.length === 0 && Array.isArray(client.leads) && client.leads.length > 0) {
      client.leads.forEach((l) => {
        l.status = 'PENDING';
        l.answers = {};
        l.callSummary = '';
      });
      pendingLeads = client.leads.slice();
      saveState();
      renderAll();
    }
    if (pendingLeads.length === 0) {
      showToast('No leads in list. Add a lead or click Call Phone Now.');
      return;
    }

    state.isCallingActive = true;
    state.stopAfterCurrentCall = false;

    const btnStart = document.getElementById('btnStartClientCalling');
    const btnStop = document.getElementById('btnStopClientCalling');
    const liveBadge = document.getElementById('clientLiveStateBadge');
    const liveMsg = document.getElementById('clientLiveCallMessage');
    const topAgentStatus = document.getElementById('topbarAgentStatus');

    if (btnStart) btnStart.disabled = true;
    if (btnStop) btnStop.disabled = false;
    if (topAgentStatus) topAgentStatus.textContent = `Calling (${client.name})`;

    for (let i = 0; i < pendingLeads.length; i++) {
      const lead = pendingLeads[i];
      state.currentlyCallingLeadId = lead.id;
      renderOutboundView();

      if (liveBadge) liveBadge.textContent = `🎙️ Live Call (${i + 1}/${pendingLeads.length}): ${lead.name}`;
      const greeting = (client.openingGreeting || '')
        .replace(/\{lead_name\}/g, lead.name)
        .replace(/\{customer_name\}/g, lead.name)
        .replace(/\{client_name\}/g, client.name)
        .replace(/\{enquiry_item\}/g, lead.enquiry || 'your enquiry');

      const callLogs = [];
      let liveHeardText = '';

      const renderInteractivePanel = () => {
        if (!liveMsg) return;
        const micBar = `
          <div style="margin-top:8px;padding-top:8px;border-top:1px solid rgba(255,255,255,0.14);">
            <div style="font-size:12px;color:#e5e7eb;">
              🎙️ <strong>Live Voice Status:</strong>
              <span id="liveMicHeardSpan" style="color:#fbbf24;font-weight:600;margin-left:6px;">${liveHeardText ? escapeHtml(liveHeardText) : 'Ready'}</span>
            </div>
          </div>`;
        liveMsg.innerHTML = callLogs.map((l) => `<div style="margin-bottom:4px;">${l}</div>`).join('') + micBar;
      };

      const addCallLog = (htmlLine) => {
        callLogs.push(htmlLine);
        renderInteractivePanel();
      };

      // Check if Phone (Bluetooth HFP / USB) is connected to dial real SIM calls!
      let usbConnected = false;
      let usbModel = '';
      let usbCallRejected = false;
      try {
        const adbStRes = await fetch(`${API_CONFIG.BASE_URL}/adb/status`);
        if (adbStRes.ok) {
          const adbSt = await adbStRes.json();
          usbConnected = Boolean(adbSt.connected);
          usbModel = adbSt.model || adbSt.deviceId || 'Samsung Phone';
        }
      } catch (_e) {}

      window.__usbSimCallActive = usbConnected;
      if (usbConnected) {
        addCallLog(`📱 <strong>[${escapeHtml(usbModel)}]</strong> Dialing (${i + 1}/${pendingLeads.length}): <strong>${escapeHtml(lead.name)} (${escapeHtml(lead.phone)})</strong>...`);
        try {
          const dRes = await fetch(`${API_CONFIG.BASE_URL}/adb/dial`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: lead.phone }),
          });
          if (dRes.ok) {
            addCallLog(`🔔 <strong style="color:#f59e0b;">Ringing ${escapeHtml(lead.phone)}...</strong> Waiting for call to be attended...`);
            // Poll every 350ms so the EXACT instant the call is attended (ACTIVE), we show "Call Attended!" and speak immediately!
            let sawDialing = false;
            let callAnswered = false;
            for (let w = 0; w < 110; w++) {
              if (state.stopAfterCurrentCall) break;
              await new Promise((r) => setTimeout(r, 350));
              const csRes = await fetch(`${API_CONFIG.BASE_URL}/adb/call-state`);
              if (csRes.ok) {
                const cs = await csRes.json();
                if (cs.callState === 'ACTIVE') {
                  callAnswered = true;
                  if (liveBadge) liveBadge.textContent = `✅ Call Attended: ${lead.name} (${lead.phone})`;
                  addCallLog(`✅ <strong style="color:#10b981;">Call Attended (${escapeHtml(lead.phone)})!</strong> AI is speaking now...`);
                  break;
                } else if (cs.callState === 'DIALING' || cs.callState === 'OFFHOOK' || cs.callState === 'RINGING') {
                  sawDialing = true;
                } else if (sawDialing && w >= 6 && cs.callState === 'IDLE') {
                  usbCallRejected = true;
                  break;
                }
              }
            }
            if (!callAnswered && !state.stopAfterCurrentCall) {
              usbCallRejected = true;
            }
          }
        } catch (_e) {}
      }

      if (usbCallRejected || (!usbConnected && lead.simMode === 'not_attended')) {
        lead.status = 'NOT_ATTENDED';
        lead.answers = {};
        (client.questions || []).forEach((q) => {
          lead.answers[q.id] = '—';
        });
        lead.callSummary = usbCallRejected
          ? 'USB Phone Call Not Attended / Rejected by Customer.'
          : 'Call Not Attended — Customer did not pick up / phone ringing no answer.';
        lead.calledAt = formatNow();
        addCallLog(`📵 <strong>Call Not Attended (${escapeHtml(lead.phone)})</strong> — Moving to next number...`);
      } else {
        addCallLog(`🔊 <strong>Speaking Greeting to ${escapeHtml(lead.name)} (${escapeHtml(lead.phone)}):</strong> "${escapeHtml(greeting)}"`);
        const greetRes = await speakUtterance(greeting, true, true);
        let earlyBusyExit = false;

        // Wait 3.0s after greeting (listening on mic) so the first sentence pauses naturally and catches any greeting reply completely!
        let greetCustomerSpeech = greetRes?.interrupted ? (greetRes.customerSpeech || '') : '';
        if (!greetCustomerSpeech && typeof window.__listenForCustomerReplyClean === 'function') {
          liveHeardText = 'Listening after Greeting...';
          renderInteractivePanel();
          greetCustomerSpeech = await window.__listenForCustomerReplyClean((heard) => {
            liveHeardText = heard;
            const sp = document.getElementById('liveMicHeardSpan');
            if (sp) sp.textContent = `🎙️ Hearing: "${heard}" (Listening completely...)`;
          }, 3000);
          liveHeardText = '';
          renderInteractivePanel();
        }

        // If customer interrupted or spoke right after greeting (e.g. asked "நீ யாரு?", "சாப்டியா?"), think with Groq LLM & answer them first!
        let greetTurns = 0;
        while (greetCustomerSpeech && !earlyBusyExit && greetTurns < 3) {
          greetTurns++;
          let gIntent = window.__classifyTamilIntent ? window.__classifyTamilIntent(greetCustomerSpeech, client.name) : { intent: 'QUESTION_WHO', action: 'REPEAT_CURRENT', spokenReply: `வணக்கம் சார், நான் ${client.name} கஸ்டமர் சப்போர்ட்ல இருந்து பேசுறேன்.` };
          try {
            const gRes = await fetch(`${API_CONFIG.BASE_URL}/llm/classify`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                replyText: greetCustomerSpeech,
                clientName: client.name,
                questionText: greeting,
                positiveKeywords: client.trainer?.positiveKeywords || '',
                negativeKeywords: client.trainer?.negativeKeywords || '',
              }),
            });
            if (gRes.ok) gIntent = await gRes.json();
          } catch (_e) {}
          addCallLog(`🗣️ <strong>Customer Spoke on Greeting:</strong> "${escapeHtml(greetCustomerSpeech)}" ➡️ <strong>${escapeHtml(gIntent.intent)}</strong>`);
          if (gIntent.action === 'END_CALL_BUSY') {
            earlyBusyExit = true;
            lead.status = 'NOT_ATTENDED';
            lead.callSummary = `Customer busy during greeting: "${greetCustomerSpeech}"`;
            lead.calledAt = formatNow();
            if (gIntent.spokenReply) {
              addCallLog(`🔊 <strong>AI:</strong> "${escapeHtml(gIntent.spokenReply)}"`);
              await speakUtterance(gIntent.spokenReply, true, false);
            }
            break;
          }
          if (gIntent.spokenReply) {
            addCallLog(`🔊 <strong>AI (Groq LLM Reply):</strong> "${escapeHtml(gIntent.spokenReply)}"`);
            const followUpRes = await speakUtterance(gIntent.spokenReply, true, true);
            greetCustomerSpeech = followUpRes?.interrupted ? (followUpRes.customerSpeech || '') : '';
            await new Promise((r) => setTimeout(r, 450));
          } else {
            greetCustomerSpeech = '';
          }
        }

        if (!earlyBusyExit) {
          lead.answers = {};
          const questions = client.questions || [];
          let earlyNoExit = false;

          for (let qIdx = 0; qIdx < questions.length; qIdx++) {
            const q = questions[qIdx];
            let answeredThisQ = false;
            let attempts = 0;
            let questionTurns = 0;

            while (!answeredThisQ && attempts < 3 && questionTurns < 6) {
              attempts++;
              questionTurns++;
              addCallLog(`🔊 <strong>Asking Q${qIdx + 1}:</strong> "${escapeHtml(q.text)}"`);
              const qRes = await speakUtterance(q.text, true, true);

              let customerSpeech = '';
              if (qRes?.interrupted && qRes.customerSpeech) {
                customerSpeech = qRes.customerSpeech;
              } else if (typeof window.__listenForCustomerReplyClean === 'function') {
                liveHeardText = 'Listening on Mic (Speak your full sentence)...';
                renderInteractivePanel();
                customerSpeech = await window.__listenForCustomerReplyClean((heard) => {
                  liveHeardText = heard;
                  const sp = document.getElementById('liveMicHeardSpan');
                  if (sp) sp.textContent = `🎙️ Hearing: "${heard}" (Listening completely...)`;
                }, 10000);
                liveHeardText = '';
              }

              const isLiveTtsOn = document.getElementById('chkLiveTts')?.checked !== false || usbConnected;
              if (!customerSpeech) {
                if (isLiveTtsOn && attempts < 3) {
                  addCallLog(`⚠️ <em>No mic speech heard in 10s — repeating Q${qIdx + 1}...</em>`);
                  continue;
                }
                const defaultAns = lead.simMode !== 'not_qualified' ? 'ஆமா சார் பேசுனாங்க' : 'இல்ல இன்னும் கூப்பிடல';
                customerSpeech = defaultAns;
                addCallLog(`ℹ️ <em>(No mic speech detected — using lead simulation: "${escapeHtml(customerSpeech)}")</em>`);
              }

              let nlu = window.__classifyTamilIntent
                ? window.__classifyTamilIntent(customerSpeech, client.name)
                : { intent: 'ANSWER_YES', action: 'NEXT_QUESTION', answer: 'YES', spokenReply: '' };

              try {
                const apiRes = await fetch(`${API_CONFIG.BASE_URL}/llm/classify`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    replyText: customerSpeech,
                    clientName: client.name,
                    questionText: q.text,
                    positiveKeywords: client.trainer?.positiveKeywords || '',
                    negativeKeywords: client.trainer?.negativeKeywords || '',
                  }),
                });
                if (apiRes.ok) {
                  nlu = await apiRes.json();
                }
              } catch (_e) {}

              addCallLog(`🗣️ <strong>Customer Said:</strong> "${escapeHtml(customerSpeech)}" ➡️ <strong>${escapeHtml(nlu.intent)}</strong>`);

              if (nlu.action === 'END_CALL_BUSY') {
                earlyBusyExit = true;
                answeredThisQ = true;
                lead.status = 'NOT_ATTENDED';
                lead.callSummary = nlu.summary || `Customer busy: "${customerSpeech}"`;
                addCallLog(`🔊 <strong>AI (Closing - Busy):</strong> "${escapeHtml(nlu.spokenReply)}"`);
                await speakUtterance(nlu.spokenReply, true, false);
                break;
              }

              if (nlu.action === 'REPEAT_CURRENT') {
                // Customer asked a question or made a comment -> Speak Groq LLM's smart Tamil answer and then re-ask current question!
                if (attempts > 0) attempts--; // Don't penalize customer for asking questions!
                if (nlu.spokenReply) {
                  addCallLog(`🔊 <strong>AI (Groq LLM Reply):</strong> "${escapeHtml(nlu.spokenReply)}"`);
                  await speakUtterance(nlu.spokenReply, true, true);
                  await new Promise((r) => setTimeout(r, 450));
                }
                continue;
              }

              // Even when moving to NEXT_QUESTION, if Groq LLM generated a spokenReply to a customer comment, speak it first!
              if (nlu.spokenReply) {
                addCallLog(`🔊 <strong>AI (Groq LLM Reply):</strong> "${escapeHtml(nlu.spokenReply)}"`);
                await speakUtterance(nlu.spokenReply, true, true);
                await new Promise((r) => setTimeout(r, 350));
              }

              const ansLabel = nlu.answer === 'NO' ? 'NO' : 'YES';
              lead.answers[q.id] = ansLabel;
              answeredThisQ = true;

              if (qIdx === 0 && ansLabel === 'NO') {
                earlyNoExit = true;
                lead.status = 'NOT_QUALIFIED';
                lead.callSummary = `Customer responded NO ("${customerSpeech}") regarding ${lead.enquiry}. Marked as Not Qualified.`;
                const closeNo = 'சரிங்க சார், நான் இப்பவே நம்ம டீலர்கிட்ட சொல்லி, இன்னைக்கே உங்களுக்கு கால் பண்ண சொல்றேன். ரொம்ப நன்றி சார்!';
                addCallLog(`🔊 <strong>AI (Closing):</strong> "${escapeHtml(closeNo)}"`);
                await speakUtterance(closeNo, true, false);
                break;
              }
            }

            if (earlyBusyExit || earlyNoExit) break;
          }

          if (!earlyBusyExit && !earlyNoExit) {
            const allYes = Object.values(lead.answers).length > 0 && Object.values(lead.answers).every((v) => v === 'YES');
            if (allYes) {
              lead.status = 'QUALIFIED';
              lead.callSummary = `Customer answered YES to all ${client.questions.length} questions regarding ${lead.enquiry}.`;
              const closeYes = 'ரொம்ப நன்றி சார், உங்க பொன்னான நேரத்துக்கு மிக்க நன்றி, வணக்கம்!';
              addCallLog(`🔊 <strong>AI (Closing):</strong> "${escapeHtml(closeYes)}"`);
              await speakUtterance(closeYes, true, false);
            } else {
              lead.status = 'NOT_QUALIFIED';
              lead.callSummary = `Customer responded NO / Needs follow-up regarding ${lead.enquiry}.`;
              const closeNo = 'சரிங்க சார், நான் இப்பவே நம்ம டீலர்கிட்ட சொல்லி, இன்னைக்கே உங்களுக்கு கால் பண்ண சொல்றேன். ரொம்ப நன்றி சார்!';
              addCallLog(`🔊 <strong>AI (Closing):</strong> "${escapeHtml(closeNo)}"`);
              await speakUtterance(closeNo, true, false);
            }
          }
          lead.calledAt = formatNow();
        }
      }

      // If calling via USB Android Phone, automatically hang up current call before dialing next number in the 70-80 list!
      if (usbConnected) {
        try {
          await fetch(`${API_CONFIG.BASE_URL}/adb/hangup`, { method: 'POST' });
          addCallLog(`📴 <em>USB Phone Call Ended (${escapeHtml(lead.phone)}) — Preparing next number in 3s...</em>`);
        } catch (_e) {}
      }

      await tryApiCall(API_CONFIG.ENDPOINTS.CALL_RESULT(client.id, lead.id), {
        method: 'POST',
        body: JSON.stringify(lead),
      });

      state.currentlyCallingLeadId = null;
      saveState();
      renderAll();

      if (state.stopAfterCurrentCall) {
        if (liveBadge) liveBadge.textContent = 'Stopped by User';
        if (liveMsg) {
          liveMsg.innerHTML = `Stopped cleanly after finishing call with <strong>${escapeHtml(lead.name)}</strong>.`;
        }
        showToast('Voice agent stopped after finishing the current call.');
        break;
      }

      if (usbConnected && i < pendingLeads.length - 1) {
        await new Promise((r) => setTimeout(r, 3000));
      }
    }

    if (!state.stopAfterCurrentCall) {
      if (liveBadge) liveBadge.textContent = 'Campaign Completed';
      showToast(`Completed outbound calls for ${client.name}!`);
    }

    window.__usbSimCallActive = false;
    state.isCallingActive = false;
    state.stopAfterCurrentCall = false;
    state.currentlyCallingLeadId = null;
    if (btnStart) btnStart.disabled = false;
    if (btnStop) btnStop.disabled = true;
    if (topAgentStatus) topAgentStatus.textContent = 'Idle / Ready';
    renderAll();
  }

  function requestStopAfterCurrentCall() {
    if (!state.isCallingActive) return;
    state.stopAfterCurrentCall = true;
    const liveBadge = document.getElementById('clientLiveStateBadge');
    const btnStop = document.getElementById('btnStopClientCalling');
    if (liveBadge) liveBadge.textContent = 'Stopping After Current Call...';
    if (btnStop) btnStop.disabled = true;
    showToast('Will stop automatically once the current call finishes.');
  }

  // -------------------- PAGE 4: WORKFLOW SCRIPT TRAINER --------------------
  function renderTrainerView() {
    const selectEl = document.getElementById('trainerClientSelect');
    if (!selectEl) return;

    if (state.clients.length === 0) {
      selectEl.innerHTML = `<option value="">No clients added yet</option>`;
      document.getElementById('trainerPersonaInput').value = '';
      document.getElementById('trainerWhatToSpeak').value = '';
      document.getElementById('trainerForbiddenPhrases').value = '';
      document.getElementById('trainerWhatNotToSpeak').value = '';
      document.getElementById('trainerPositiveKeywords').value = '';
      document.getElementById('trainerNegativeKeywords').value = '';
      const previewList = document.getElementById('trainerQuestionsPreviewList');
      if (previewList) {
        previewList.innerHTML = `<div style="padding: 18px; color: #706b63;">No clients added yet. Add a client in Client Workflow first.</div>`;
      }
      return;
    }

    const currentVal = selectEl.value || state.clients[0]?.id;
    selectEl.innerHTML = state.clients
      .map(
        (c) =>
          `<option value="${escapeHtml(c.id)}" ${
            c.id === currentVal ? 'selected' : ''
          }>${escapeHtml(c.name)} (${escapeHtml(c.industry)})</option>`
      )
      .join('');

    const client = getClientById(selectEl.value) || state.clients[0];
    if (!client) return;

    const trainer = client.trainer || {};
    document.getElementById('trainerPersonaInput').value = trainer.persona || '';
    document.getElementById('trainerWhatToSpeak').value = trainer.whatToSpeak || '';
    document.getElementById('trainerForbiddenPhrases').value = trainer.forbiddenPhrases || '';
    document.getElementById('trainerWhatNotToSpeak').value = trainer.whatNotToSpeak || '';
    document.getElementById('trainerPositiveKeywords').value = trainer.positiveKeywords || '';
    document.getElementById('trainerNegativeKeywords').value = trainer.negativeKeywords || '';

    const previewList = document.getElementById('trainerQuestionsPreviewList');
    if (previewList) {
      previewList.innerHTML = (client.questions || [])
        .map(
          (q, idx) => `
          <div class="question-item-row">
            <div><span class="question-badge">Step Q${idx + 1}</span></div>
            <div>${escapeHtml(q.text)}</div>
          </div>
        `
        )
        .join('');
    }
  }

  // -------------------- PAGE 5: VERIFICATION REPORT --------------------
  function renderReportsView() {
    const clientSelect = document.getElementById('reportClientFilterSelect');
    if (clientSelect) {
      const prev = state.activeReportClientFilter;
      clientSelect.innerHTML =
        `<option value="ALL">All Clients</option>` +
        state.clients
          .map(
            (c) =>
              `<option value="${escapeHtml(c.id)}" ${
                c.id === prev ? 'selected' : ''
              }>${escapeHtml(c.name)}</option>`
          )
          .join('');
    }

    const stats = computeGlobalStats(state.activeReportClientFilter);
    document.getElementById('repTotalAssigned').textContent = String(stats.assigned);
    document.getElementById('repTotalSpoken').textContent = String(stats.spoken);
    document.getElementById('repTotalPending').textContent = String(stats.pending);
    document.getElementById('repTotalQualified').textContent = String(stats.qualified);
    document.getElementById('repTotalNotQualified').textContent = String(stats.notQualified);
    document.getElementById('repTotalNotAttended').textContent = String(stats.notAttended);

    // Client-wise breakdown table
    const summaryTbody = document.getElementById('reportClientSummaryTbody');
    if (summaryTbody) {
      if (state.clients.length === 0) {
        summaryTbody.innerHTML = `
          <tr>
            <td colspan="9" style="text-align:center; padding: 28px; color: #706b63;">
              No clients added yet. Create a client workflow to track campaigns.
            </td>
          </tr>
        `;
      } else {
        summaryTbody.innerHTML = state.clients
          .map((c) => {
            const s = computeClientStats(c);
            return `
              <tr>
                <td><strong>${escapeHtml(c.name)}</strong></td>
                <td>${escapeHtml(c.callerId)}</td>
                <td><strong>${s.assigned}</strong></td>
                <td><strong>${s.spoken}</strong></td>
                <td>${s.pending}</td>
                <td><span class="badge-yes">${s.qualified}</span></td>
                <td><span class="badge-no">${s.notQualified}</span></td>
                <td><span class="badge-warn">${s.notAttended}</span></td>
                <td>
                  <button type="button" class="btn-ghost btn-xs" data-export-client-id="${escapeHtml(c.id)}">
                    Download Excel/CSV
                  </button>
                </td>
              </tr>
            `;
          })
          .join('');

        summaryTbody.querySelectorAll('[data-export-client-id]').forEach((btn) => {
          btn.addEventListener('click', () => {
            const c = getClientById(btn.getAttribute('data-export-client-id'));
            if (c) exportClientLeadsToCsv(c, 'ALL');
          });
        });
      }
    }

    // Detailed Call Verification Logs
    const logsTbody = document.getElementById('reportDetailedLogsTbody');
    if (!logsTbody) return;

    const targetClients =
      state.activeReportClientFilter === 'ALL'
        ? state.clients
        : state.clients.filter((c) => c.id === state.activeReportClientFilter);

    const allCalledLeads = [];
    targetClients.forEach((client) => {
      (client.leads || []).forEach((lead) => {
        if (lead.status !== 'PENDING') {
          if (
            state.activeReportStatusFilter === 'ALL' ||
            lead.status === state.activeReportStatusFilter
          ) {
            allCalledLeads.push({ client, lead });
          }
        }
      });
    });

    if (allCalledLeads.length === 0) {
      logsTbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align:center; padding: 28px; color: #706b63;">
            No calls spoken yet for the selected filter. Start calling leads from the Outbound Calls page.
          </td>
        </tr>
      `;
      return;
    }

    logsTbody.innerHTML = allCalledLeads
      .map(({ client, lead }) => {
        const qSummary = (client.questions || [])
          .map((q, i) => `Q${i + 1}: ${lead.answers?.[q.id] || '—'}`)
          .join(' | ');

        let statusBadge = `<span class="badge-yes">Qualified</span>`;
        if (lead.status === 'NOT_QUALIFIED') {
          statusBadge = `<span class="badge-no">Not Qualified</span>`;
        } else if (lead.status === 'NOT_ATTENDED') {
          statusBadge = `<span class="badge-warn">Not Attended</span>`;
        }

        return `
          <tr>
            <td>${escapeHtml(lead.calledAt || '—')}</td>
            <td><strong>${escapeHtml(client.name)}</strong></td>
            <td><strong>${escapeHtml(lead.name)}</strong><br/><span style="font-size:13px;color:#706b63;">${escapeHtml(lead.phone)}</span></td>
            <td>${escapeHtml(lead.enquiry)}</td>
            <td>${escapeHtml(qSummary)}</td>
            <td>${statusBadge}</td>
            <td>${escapeHtml(lead.callSummary)}</td>
          </tr>
        `;
      })
      .join('');
  }

  // ==================== EXCEL / CSV DOWNLOAD HELPERS ====================
  function exportClientLeadsToCsv(client, filterTab = 'ALL') {
    let leads = Array.isArray(client.leads) ? client.leads : [];
    if (filterTab === 'QUALIFIED') {
      leads = leads.filter((l) => l.status === 'QUALIFIED');
    } else if (filterTab === 'NOT_QUALIFIED') {
      leads = leads.filter((l) => l.status === 'NOT_QUALIFIED');
    } else if (filterTab === 'NOT_ATTENDED') {
      leads = leads.filter((l) => l.status === 'NOT_ATTENDED');
    }

    if (leads.length === 0) {
      showToast('No leads in this view to export.');
      return;
    }

    const questions = client.questions || [];
    const headers = [
      'Client Name',
      'Lead Name',
      'Phone Number',
      'Enquiry / Details',
      ...questions.map((q, i) => `Q${i + 1}: ${q.text}`),
      'Qualification Status',
      'Call Summary',
      'Called Date & Time',
    ];

    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

    const lines = [
      headers.map(esc).join(','),
      ...leads.map((l) =>
        [
          client.name,
          l.name,
          l.phone,
          l.enquiry,
          ...questions.map((q) => l.answers?.[q.id] || '—'),
          l.status,
          l.callSummary || '',
          l.calledAt || '',
        ]
          .map(esc)
          .join(',')
      ),
    ];

    const blob = new Blob(['\uFEFF' + lines.join('\r\n')], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${client.name.replace(/\s+/g, '_')}_${filterTab}_Leads.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast(`Downloaded ${leads.length} leads (${filterTab}) as Excel/CSV!`);
  }

  function exportOverallVerificationReportCsv() {
    const headers = [
      'Client Name',
      'Caller ID',
      'Leads Assigned',
      'Calls Spoken',
      'Pending Calls',
      'Qualified Leads',
      'Not Qualified Leads',
      'Not Attended Calls',
    ];
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const lines = [
      headers.map(esc).join(','),
      ...state.clients.map((c) => {
        const s = computeClientStats(c);
        return [
          c.name,
          c.callerId,
          s.assigned,
          s.spoken,
          s.pending,
          s.qualified,
          s.notQualified,
          s.notAttended,
        ]
          .map(esc)
          .join(',');
      }),
    ];

    const blob = new Blob(['\uFEFF' + lines.join('\r\n')], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Reach_AI_Voice_Verification_Report.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast('Exported Verification Report to Excel / CSV!');
  }

  // ==================== EVENT BINDINGS ====================
  function bindEvents() {
    // Sidebar navigation
    document.querySelectorAll('#mainNavTabs .nav-tab').forEach((btn) => {
      btn.addEventListener('click', () => {
        const v = btn.getAttribute('data-view');
        if (v === 'outbound') state.selectedOutboundClientId = null;
        if (v) switchView(v);
      });
    });

    // Topbar, Dashboard & Client Workflow Page "+ Add New Client" Popup Modal buttons
    document.getElementById('btnQuickAddClientTop')?.addEventListener('click', () => {
      resetWorkflowEditorToNew();
      openClientWorkflowModal();
    });
    document.getElementById('btnDashGoToAddClient')?.addEventListener('click', () => {
      resetWorkflowEditorToNew();
      openClientWorkflowModal();
    });
    document.getElementById('btnOpenNewClientModal')?.addEventListener('click', () => {
      resetWorkflowEditorToNew();
      openClientWorkflowModal();
    });

    // Close / Cancel Client Workflow Popup Modal
    document
      .getElementById('btnCloseClientModal')
      ?.addEventListener('click', closeClientWorkflowModal);
    document
      .getElementById('btnCancelClientModal')
      ?.addEventListener('click', closeClientWorkflowModal);
    document
      .getElementById('clientWorkflowModal')
      ?.addEventListener('click', (e) => {
        if (e.target.id === 'clientWorkflowModal') {
          closeClientWorkflowModal();
        }
      });

    // Add Question Row in Client Workflow Form
    document.getElementById('btnAddQuestionRow')?.addEventListener('click', () => {
      const nextNum = state.editingQuestionsDraft.length + 1;
      state.editingQuestionsDraft.push({
        id: `q${Date.now()}_${nextNum}`,
        text: '',
      });
      renderQuestionsBuilderRows();
    });

    // Save Client Workflow Form
    document
      .getElementById('clientWorkflowForm')
      ?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const existingId = document.getElementById('wfClientId').value.trim();
        const name = document.getElementById('wfClientName').value.trim();
        const industry = document.getElementById('wfIndustry').value.trim();
        const callerId = document.getElementById('wfCallerId').value.trim();
        const voiceLanguage = document.getElementById('wfVoiceLanguage').value;
        const openingGreeting = document
          .getElementById('wfOpeningGreeting')
          .value.trim();

        const cleanedQuestions = state.editingQuestionsDraft
          .map((q, i) => ({
            id: q.id || `q${i + 1}`,
            text: String(q.text || '').trim(),
          }))
          .filter((q) => q.text.length > 0);

        if (!name || cleanedQuestions.length === 0) {
          showToast('Please enter client name and at least one question.');
          return;
        }

        if (existingId) {
          const client = getClientById(existingId);
          if (client) {
            client.name = name;
            client.industry = industry;
            client.callerId = callerId;
            client.voiceLanguage = voiceLanguage;
            client.openingGreeting = openingGreeting;
            client.questions = cleanedQuestions;
            await tryApiCall(`${API_CONFIG.ENDPOINTS.CLIENTS}/${existingId}`, {
              method: 'PUT',
              body: JSON.stringify(client),
            });
            showToast(`Updated workflow for "${name}"!`);
          }
        } else {
          const newClient = {
            id: `client-${Date.now()}`,
            name,
            industry,
            callerId,
            voiceLanguage,
            openingGreeting,
            questions: cleanedQuestions,
            trainer: {
              persona: '',
              whatToSpeak: '',
              forbiddenPhrases: '',
              whatNotToSpeak: '',
              positiveKeywords: '',
              negativeKeywords: '',
            },
            leads: [],
          };
          state.clients.push(newClient);
          await tryApiCall(API_CONFIG.ENDPOINTS.CLIENTS, {
            method: 'POST',
            body: JSON.stringify(newClient),
          });
          showToast(`Created new client workflow: "${name}"!`);
          resetWorkflowEditorToNew();
        }

        saveState();
        closeClientWorkflowModal();
        renderAll();
      });

    // Outbound Calls Detail Page buttons
    document.getElementById('btnBackToClientCards')?.addEventListener('click', () => {
      state.selectedOutboundClientId = null;
      renderOutboundView();
    });

    document
      .getElementById('btnEditThisClientWorkflow')
      ?.addEventListener('click', () => {
        if (state.selectedOutboundClientId) {
          loadClientIntoWorkflowEditor(state.selectedOutboundClientId);
        }
      });

    document
      .getElementById('btnDeleteThisClientWorkflow')
      ?.addEventListener('click', () => {
        if (state.selectedOutboundClientId) {
          deleteClientWorkflowOnly(state.selectedOutboundClientId);
        }
      });

    document
      .getElementById('btnDeleteThisClient')
      ?.addEventListener('click', () => {
        if (state.selectedOutboundClientId) {
          deleteClientCompletely(state.selectedOutboundClientId);
        }
      });

    // Popup Modal Footer Delete Workflow / Delete Client buttons
    document
      .getElementById('btnModalDeleteWorkflow')
      ?.addEventListener('click', async () => {
        const existingId = document.getElementById('wfClientId')?.value?.trim();
        if (existingId) {
          await deleteClientWorkflowOnly(existingId);
          closeClientWorkflowModal();
        }
      });

    document
      .getElementById('btnModalDeleteClient')
      ?.addEventListener('click', async () => {
        const existingId = document.getElementById('wfClientId')?.value?.trim();
        if (existingId) {
          await deleteClientCompletely(existingId);
          closeClientWorkflowModal();
        }
      });

    // Excel / CSV File Upload Dropzone
    const dropzone = document.getElementById('clientLeadDropzone');
    const fileInput = document.getElementById('clientLeadFileInput');
    if (dropzone && fileInput) {
      dropzone.addEventListener('click', () => fileInput.click());
      dropzone.addEventListener('dragover', (e) => e.preventDefault());
      dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        const file = e.dataTransfer?.files?.[0];
        if (file) handleLeadFileUpload(file);
      });
      fileInput.addEventListener('change', (e) => {
        const file = e.target.files?.[0];
        if (file) handleLeadFileUpload(file);
        fileInput.value = '';
      });
    }

    // Download Blank CSV Template
    document
      .getElementById('btnDownloadLeadTemplate')
      ?.addEventListener('click', () => {
        const blob = new Blob(['\uFEFFName,Phone,Enquiry/Details\r\n'], {
          type: 'text/csv;charset=utf-8;',
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'Client_Leads_Upload_Template.csv';
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      });

    // Scan Google Sheet Button
    document
      .getElementById('btnScanGoogleSheet')
      ?.addEventListener('click', handleScanGoogleSheet);

    // Quick Add Single Lead Form
    document.getElementById('quickAddLeadForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const client = getClientById(state.selectedOutboundClientId);
      if (!client) return;

      const name = document.getElementById('quickLeadName').value.trim();
      const phone = document.getElementById('quickLeadPhone').value.trim();
      const enquiry =
        document.getElementById('quickLeadEnquiry').value.trim() || 'Enquiry';
      const simMode = document.getElementById('quickLeadSimMode').value;

      if (!name || !phone) return;

      client.leads.push({
        id: `LEAD-${Date.now()}`,
        name,
        phone,
        enquiry,
        simMode,
        status: 'PENDING',
        answers: {},
        callSummary: '',
        calledAt: '',
      });

      document.getElementById('quickLeadName').value = '';
      document.getElementById('quickLeadPhone').value = '';
      document.getElementById('quickLeadEnquiry').value = '';

      saveState();
      renderAll();
      showToast(`Added lead "${name}" to ${client.name}.`);
    });

    // Start & Stop Calling Buttons
    document
      .getElementById('btnStartClientCalling')
      ?.addEventListener('click', startClientOutboundCalling);
    document
      .getElementById('btnStopClientCalling')
      ?.addEventListener('click', requestStopAfterCurrentCall);

    // Client Lead Qualification Tabs (All, Qualified, Not Qualified, Not Attended)
    document.querySelectorAll('#clientLeadTabs .filter-tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        state.activeClientLeadTab = tab.getAttribute('data-lead-tab') || 'ALL';
        document.querySelectorAll('#clientLeadTabs .filter-tab').forEach((t) =>
          t.classList.toggle('active', t === tab)
        );
        renderOutboundView();
      });
    });

    // Download Current Tab vs Full Client Sheet
    document
      .getElementById('btnDownloadCurrentTabCsv')
      ?.addEventListener('click', () => {
        const client = getClientById(state.selectedOutboundClientId);
        if (client) exportClientLeadsToCsv(client, state.activeClientLeadTab);
      });
    document
      .getElementById('btnDownloadAllClientLeadsCsv')
      ?.addEventListener('click', () => {
        const client = getClientById(state.selectedOutboundClientId);
        if (client) exportClientLeadsToCsv(client, 'ALL');
      });
    document.getElementById('btnClearClientLeads')?.addEventListener('click', () => {
      const client = getClientById(state.selectedOutboundClientId);
      if (!client) return;
      client.leads = [];
      saveState();
      renderAll();
      showToast(`Cleared leads for ${client.name}.`);
    });

    // Trainer Page Events
    document
      .getElementById('trainerClientSelect')
      ?.addEventListener('change', renderTrainerView);

    document
      .getElementById('btnSaveTrainerConfig')
      ?.addEventListener('click', async () => {
        const clientId = document.getElementById('trainerClientSelect')?.value;
        const client = getClientById(clientId);
        if (!client) return;

        client.trainer = {
          persona: document.getElementById('trainerPersonaInput').value.trim(),
          whatToSpeak: document.getElementById('trainerWhatToSpeak').value.trim(),
          forbiddenPhrases: document
            .getElementById('trainerForbiddenPhrases')
            .value.trim(),
          whatNotToSpeak: document
            .getElementById('trainerWhatNotToSpeak')
            .value.trim(),
          positiveKeywords: document
            .getElementById('trainerPositiveKeywords')
            .value.trim(),
          negativeKeywords: document
            .getElementById('trainerNegativeKeywords')
            .value.trim(),
        };

        saveState();
        await tryApiCall(API_CONFIG.ENDPOINTS.TRAINER(client.id), {
          method: 'PUT',
          body: JSON.stringify(client.trainer),
        });
        showToast(`Saved LLM Trainer instructions for "${client.name}"!`);
      });

    // Verification Report Page Events
    document
      .getElementById('reportClientFilterSelect')
      ?.addEventListener('change', (e) => {
        state.activeReportClientFilter = e.target.value || 'ALL';
        renderReportsView();
      });

    document.querySelectorAll('#reportStatusFilterTabs .filter-tab').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.activeReportStatusFilter = btn.getAttribute('data-rep-status') || 'ALL';
        document
          .querySelectorAll('#reportStatusFilterTabs .filter-tab')
          .forEach((b) => b.classList.toggle('active', b === btn));
        renderReportsView();
      });
    });

    document
      .getElementById('btnExportVerificationReport')
      ?.addEventListener('click', exportOverallVerificationReportCsv);
  }

  async function handleLeadFileUpload(file) {
    const client = getClientById(state.selectedOutboundClientId);
    if (!client) return;

    if (file.name.toLowerCase().endsWith('.xlsx')) {
      try {
        const fd = new FormData();
        fd.append('file', file);
        const res = await fetch(`${API_CONFIG.BASE_URL}/parse-xlsx`, { method: 'POST', body: fd });
        if (res.ok) {
          const data = await res.json();
          const csvText = (data.rows || []).map((r) => r.join('\t')).join('\n');
          const leads = parseRowsIntoLeads(csvText);
          if (leads.length > 0) {
            client.leads.push(...leads);
            saveState();
            await tryApiCall(API_CONFIG.ENDPOINTS.CLIENT_LEADS(client.id), {
              method: 'POST',
              body: JSON.stringify({ leads }),
            });
            renderAll();
            showToast(`Uploaded ${leads.length} leads from Excel "${file.name}" to ${client.name}!`);
            return;
          }
        }
      } catch (_e) {
        // fallback
      }
    }

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const leads = parseRowsIntoLeads(ev.target?.result || '');
      if (leads.length === 0) {
        showToast('No valid rows found in file. Use columns: Name, Phone, Enquiry.');
        return;
      }
      client.leads.push(...leads);
      saveState();
      await tryApiCall(API_CONFIG.ENDPOINTS.CLIENT_LEADS(client.id), {
        method: 'POST',
        body: JSON.stringify({ leads }),
      });
      renderAll();
      showToast(`Uploaded ${leads.length} leads from "${file.name}" to ${client.name}!`);
    };
    reader.readAsText(file);
  }

  // ==================== BOOTSTRAP ====================
  document.addEventListener('DOMContentLoaded', async () => {
    loadState();
    try {
      const res = await fetch(`${API_CONFIG.BASE_URL}/clients`);
      if (res.ok) {
        if (window.location.protocol === 'file:') {
          window.location.replace('http://localhost:8000');
          return;
        }
        const data = await res.json();
        if (Array.isArray(data.clients) && data.clients.length > 0 && state.clients.length === 0) {
          state.clients = data.clients;
          saveState();
        }
        const dot = document.getElementById('apiConnectionDot');
        const txt = document.getElementById('apiConnectionText');
        if (dot) dot.style.background = '#10b981';
        if (txt) txt.textContent = 'Voice Engine & Backend Connected';
      }
    } catch (_e) {}
    if (state.clients.length === 0) {
      state.clients = JSON.parse(JSON.stringify(DEFAULT_CLIENTS));
      saveState();
    }
    resetWorkflowEditorToNew();
    bindEvents();
    document.getElementById('btnTestApprovedVoice')?.addEventListener('click', async () => {
      const greet = document.getElementById('wfOpeningGreeting')?.value.trim() ||
        'வணக்கம் ரமேஷ் சார், இது ஒரு வெரிபிகேஷன் கால், டாட்டா மோட்டார்ஸ்ல இருந்து பேசுறேன். நீங்க டாட்டா நெக்சான் வண்டி பத்தி விசாரிச்சிருந்தீங்க, நம்ம டீலர் உங்ககிட்ட பேசுனாங்களா?';
      showToast('🔊 Playing Approved Voice #3 (VITS-Rasa-13 Conversational)...');
      await speakUtterance(greet.replace(/\{lead_name\}/g, 'ரமேஷ்'), true);
    });

    document.getElementById('btnSyncBluetoothCalls')?.addEventListener('click', async () => {
      const msgEl = document.getElementById('clientLiveCallMessage');
      const badgeEl = document.getElementById('clientLiveStateBadge');
      if (badgeEl) badgeEl.textContent = 'Connecting Bluetooth...';
      if (msgEl) msgEl.innerHTML = `🔵 <strong>Connecting Laptop (Z14-55N) ↔ Samsung Galaxy M34 5G Directly via Bluetooth (No Link to Phone needed)...</strong>`;
      try {
        const res = await fetch(`${API_CONFIG.BASE_URL}/bt/sync`, { method: 'POST' });
        const data = await res.json();
        if (data.hfpCallsConnected) {
          if (badgeEl) badgeEl.textContent = 'Direct Bluetooth Ready ✅';
          if (msgEl) {
            msgEl.innerHTML =
              `✅ <strong style="color:#10b981;">Direct Bluetooth (Calls + Audio) லேப்டாப் (Z14-55N) ↔ Samsung Galaxy M34 5G கூட நேரடியா கனெக்ட் ஆகிடுச்சு! (Link to Phone தேவையில்லை)</strong><br>` +
              `<span style="font-size:12px;color:#a7f3d0;">இப்போ நீங்க <strong>📲 Call Phone Now</strong> அல்லது <strong>▶ Start Calling</strong> தாராளமா அழுத்தலாம்!</span>`;
          }
          showToast('✅ Direct Bluetooth Calls + Audio Connected!');
          return;
        }

        if (badgeEl) badgeEl.textContent = 'Check Phone Bluetooth';
        if (msgEl) {
          msgEl.innerHTML =
            `⚠️ <strong style="color:#fbbf24;">உங்க Samsung போன்ல Bluetooth ON-ல இருக்கான்னு மட்டும் பாருங்க!</strong><br>` +
            `<span style="font-size:12px;color:#cbd5e1;">போன்ல Bluetooth ON பண்ணிட்டு திரும்ப <strong>🔵 Connect Bluetooth</strong> கிளிக் பண்ணுங்க (Link to Phone ஆப் தேவையே இல்லை!).</span>`;
        }
        showToast('⚠️ Please turn ON Bluetooth on your Samsung phone');
      } catch (err) {
        if (msgEl) msgEl.innerHTML = `❌ Bluetooth Sync Error: ${escapeHtml(err.message)}`;
      }
    });

    document.getElementById('btnDialLivePhoneNow')?.addEventListener('click', async () => {
      const phoneEl = document.getElementById('livePhoneDialInput');
      const rawInput = (phoneEl?.value || '').trim();
      const digits = rawInput.replace(/\D/g, '');
      const msgEl = document.getElementById('clientLiveCallMessage');
      const badgeEl = document.getElementById('clientLiveStateBadge');

      if (digits.length < 10) {
        if (msgEl) msgEl.innerHTML = `⚠️ <strong style="color:#ef4444;">தயவுசெய்து 10 இலக்க மொபைல் நம்பரை டைப் பண்ணுங்க (உதாரணம்: 8610057080)!</strong>`;
        showToast('⚠️ Please enter a 10-digit mobile number!');
        return;
      }

      const toPhone = `+91${digits.slice(-10)}`;
      const client = getClientById(state.selectedOutboundClientId) || state.clients[0];
      if (!client) return;

      const lead = (client.leads && client.leads[0]) || { id: 'LEAD-TATA-1', name: 'ரமேஷ்', phone: toPhone, enquiry: 'Enquiry' };
      lead.phone = toPhone;

      if (badgeEl) badgeEl.textContent = '📞 Dialing via Twilio Cloud...';
      if (msgEl) msgEl.innerHTML = `☁️ <strong>Dialing ${escapeHtml(toPhone)} via Twilio Cloud Telephony (100% Digital Audio, No Laptop Speaker)...</strong>`;

      try {
        const res = await fetch(`${API_CONFIG.BASE_URL}/twilio/call`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientId: client.id,
            leadId: lead.id,
            toPhone: toPhone,
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.ok) {
          if (badgeEl) badgeEl.textContent = 'Twilio Dial Error';
          if (msgEl) msgEl.innerHTML = `❌ <strong style="color:#ef4444;">Twilio Error:</strong> ${escapeHtml(data.error || 'Failed to initiate call')}`;
          showToast('❌ Twilio Call Failed');
          return;
        }

        const callSid = data.callSid;
        if (badgeEl) badgeEl.textContent = `🔔 Ringing ${toPhone}...`;
        showToast(`📞 Calling ${toPhone} via Twilio Cloud!`);

        const pollTimer = setInterval(async () => {
          try {
            const stRes = await fetch(`${API_CONFIG.BASE_URL}/twilio/call-status/${callSid}`);
            if (!stRes.ok) return;
            const stData = await stRes.json();
            if (!stData.ok) return;

            if (Array.isArray(stData.logs) && msgEl) {
              msgEl.innerHTML = stData.logs.map((l) => `<div style="margin-bottom:4px;">${escapeHtml(l)}</div>`).join('');
            }
            if (stData.status && badgeEl) {
              badgeEl.textContent = stData.done ? `✅ ${stData.finalStatus}` : `🎙️ ${stData.status} (${toPhone})`;
            }
            if (stData.done) {
              clearInterval(pollTimer);
              lead.status = stData.finalStatus || 'QUALIFIED';
              lead.answers = stData.answers || {};
              lead.calledAt = formatNow();
              saveState();
              renderAll();
              showToast(`🎉 Call Completed: ${lead.status}`);
            }
          } catch (_e) {}
        }, 1000);
      } catch (err) {
        if (msgEl) msgEl.innerHTML = `⚠️ Error connecting to http://localhost:8000: ${escapeHtml(err.message)}`;
      }
    });
    // ==================== LIVE 2-WAY INTERACTIVE MIC CALL (WITH SMART TAMIL NLU & BARGE-IN) ====================
    let manualCustomerOverrideResolver = null;
    let pendingManualUtterance = '';

    window.__sendLiveCustomerUtterance = function (utteranceText) {
      const clean = String(utteranceText || '').trim();
      if (!clean) return;
      if (typeof activeBargeInHandler === 'function') {
        const fn = activeBargeInHandler;
        activeBargeInHandler = null;
        fn(clean);
        return;
      }
      stopActiveAudioImmediately();
      if (typeof manualCustomerOverrideResolver === 'function') {
        const fn = manualCustomerOverrideResolver;
        manualCustomerOverrideResolver = null;
        fn(clean);
      } else {
        pendingManualUtterance = clean;
      }
    };

    window.__classifyTamilIntent = classifyTamilIntentLocal;
    function classifyTamilIntentLocal(replyText, clientName) {
      const low = String(replyText || '').trim().toLowerCase();
      const whoWords = ['நீ யாரு', 'நீங்க யாரு', 'யாரு நீ', 'யாரு நீங்க', 'யார் நீங்க', 'யாரு பேசுற', 'யார் பேசுற', 'எங்க இருந்து', 'எந்த கம்பெனி', 'nee yaaru', 'neenga yaaru', 'yaaru', 'who are you', 'who is this', 'yaru'];
      if (whoWords.some((w) => low.includes(w))) {
        return {
          intent: 'QUESTION_WHO',
          action: 'REPEAT_CURRENT',
          answer: null,
          spokenReply: `வணக்கம் சார் நான் ${clientName} கஸ்டமர் சப்போர்ட்ல இருந்து பேசுறேன், உங்க என்கொயரி வெரிபிகேஷனுக்காக கால் பண்ணிருக்கேன்.`,
        };
      }
      const whyWords = ['எதுக்கு', 'எதுக்காக', 'என்ன விஷயம்', 'ஏன் கால்', 'ஏன் கூப்பி', 'என்ன வேணும்', 'edhuku', 'enna vishayam', 'why call'];
      if (whyWords.some((w) => low.includes(w))) {
        return {
          intent: 'QUESTION_WHY',
          action: 'REPEAT_CURRENT',
          answer: null,
          spokenReply: `நீங்க நம்ம ${clientName}ல விசாரிச்சிருந்தீங்க சார், அது சம்பந்தமா உங்க கருத்தை கேட்டு நோட் பண்ண தான் கால் பண்ணிருக்கேன்.`,
        };
      }
      const repeatWords = ['புரியல', 'புரியவில்லை', 'கேக்கல', 'கேட்கல', 'என்ன சொன்னீங்க', 'என்னது', 'திரும்ப சொல்லு', 'இன்னொரு வாட்டி', 'puriyala', 'kekkala', 'repeat', 'enna sonninga'];
      if (repeatWords.some((w) => low.includes(w))) {
        return {
          intent: 'REPEAT_REQUEST',
          action: 'REPEAT_CURRENT',
          answer: null,
          spokenReply: 'மன்னிக்கவும் சார் நான் திரும்பத் தெளிவா சொல்றேன்.',
        };
      }
      const busyWords = ['பிஸி', 'பிசி', 'வேலையா இருக்கேன்', 'அப்புறம் கூப்பி', 'அப்புறமா கூப்பி', 'மீட்டிங்', 'வண்டியில', 'டிரைவிங்', 'busy', 'call later', 'appuram'];
      if (busyWords.some((w) => low.includes(w))) {
        return {
          intent: 'BUSY_CALLBACK',
          action: 'END_CALL_BUSY',
          answer: 'BUSY',
          spokenReply: 'சரிங்க சார் டிஸ்டர்ப் பண்ணதுக்கு மன்னிக்கவும், நான் அப்புறமா உங்களுக்கு கால் பண்றேன், ரொம்ப நன்றி சார்!',
        };
      }
      const negWords = ['இல்ல', 'இல்லை', 'பேசல', 'கூப்பிடல', 'வேண்டாம்', 'வேணாம்', 'திருப்தி இல்ல', 'பிடிக்கல', 'வரல', 'illa', 'no', 'not', 'pesala', 'koopidala', 'venam'];
      if (negWords.some((w) => low.includes(w))) {
        return {
          intent: 'ANSWER_NO',
          action: 'NEXT_QUESTION',
          answer: 'NO',
          spokenReply: '',
        };
      }
      const posWords = ['ஆமா', 'ஆமாம்', 'பேசுனாங்க', 'பேசினாங்க', 'சொல்லிட்டாங்க', 'சொன்னாங்க', 'கூப்பிட்டாங்க', 'புரிஞ்சது', 'திருப்தி', 'ஓகே', 'சரி', 'வரேன்', 'நல்லா', 'aama', 'yes', 'spoke', 'ok', 'okay', 'satisfied', 'sari', 'pesunanga'];
      if (posWords.some((w) => low.includes(w))) {
        return {
          intent: 'ANSWER_YES',
          action: 'NEXT_QUESTION',
          answer: 'YES',
          spokenReply: '',
        };
      }
      return {
        intent: 'CLARIFY',
        action: 'REPEAT_CURRENT',
        answer: null,
        spokenReply: `வணக்கம் சார் நான் ${clientName} வெரிபிகேஷன் டீம்ல இருந்து பேசுறேன்.`,
      };
    }

    window.__listenForCustomerReplyClean = listenForCustomerReplyClean;
    function listenForCustomerReplyClean(onLiveInterimUpdate, timeoutMs = 10000) {
      return new Promise((resolve) => {
        let finished = false;
        let rec = null;
        let silenceTimer = null;
        let maxTimer = null;
        let finalStr = '';
        if (pendingManualUtterance) {
          const p = pendingManualUtterance;
          pendingManualUtterance = '';
          resolve(p);
          return;
        }
        let interimStr = '';

        const done = (val) => {
          if (finished) return;
          finished = true;
          manualCustomerOverrideResolver = null;
          if (silenceTimer) clearTimeout(silenceTimer);
          if (maxTimer) clearTimeout(maxTimer);
          try {
            if (rec) {
              rec.onend = null;
              rec.onerror = null;
              rec.onresult = null;
              rec.abort();
            }
          } catch (_e) {}
          resolve(String(val || '').trim());
        };

        manualCustomerOverrideResolver = (manualText) => {
          done(manualText);
        };

        maxTimer = setTimeout(() => {
          done((finalStr + ' ' + interimStr).trim());
        }, timeoutMs);

        const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRec) return;

        // Wait 200ms after speaker audio ends so previous SpeechRecognition abort() releases mic cleanly
        setTimeout(() => {
          if (finished) return;
          try {
            rec = new SpeechRec();
            rec.lang = 'ta-IN';
            rec.continuous = true;
            rec.interimResults = true;
            rec.maxAlternatives = 1;

            rec.onresult = (ev) => {
              interimStr = '';
              for (let i = ev.resultIndex; i < ev.results.length; i++) {
                const t = ev.results[i][0].transcript;
                if (ev.results[i].isFinal) finalStr += ' ' + t;
                else interimStr += t;
              }
              const currentHeard = (finalStr + ' ' + interimStr).trim();
              if (typeof onLiveInterimUpdate === 'function') {
                onLiveInterimUpdate(currentHeard);
              }
              if (currentHeard.length > 0) {
                // Once customer starts speaking, NEVER let maxTimer cut them off! Extend maxTimer by 12s from latest word.
                if (maxTimer) clearTimeout(maxTimer);
                maxTimer = setTimeout(() => {
                  done((finalStr + ' ' + interimStr).trim());
                }, 12000);

                // Wait 1.25s after final word (or 1.65s after interim word) so customer can finish their FULL sentence!
                if (silenceTimer) clearTimeout(silenceTimer);
                const pauseMs = (finalStr.trim() && !interimStr.trim()) ? 1250 : 1650;
                silenceTimer = setTimeout(() => {
                  done((finalStr + ' ' + interimStr).trim());
                }, pauseMs);
              }
            };
            rec.onerror = () => {
              if (!finished) {
                setTimeout(() => {
                  if (!finished) {
                    try { rec.start(); } catch (_e) {}
                  }
                }, 140);
              }
            };
            rec.onend = () => {
              // If customer paused briefly mid-sentence and silenceTimer hasn't finished yet, restart rec so we hear the rest of their sentence!
              if (!finished) {
                setTimeout(() => {
                  if (!finished) {
                    try { rec.start(); } catch (_e) {}
                  }
                }, 100);
              }
            };
            rec.start();
          } catch (_e) {}
        }, 200);
      });
    }

    document.getElementById('btnStartLiveMicCall')?.addEventListener('click', async () => {
      const client = getClientById(state.selectedOutboundClientId) || state.clients[0];
      if (!client) return;
      const lead = client.leads[0] || { id: 'LEAD-MIC-1', name: 'ரமேஷ்', phone: '+918610057080', enquiry: 'TATA Nexon' };
      const msgEl = document.getElementById('clientLiveCallMessage');
      const badgeEl = document.getElementById('clientLiveStateBadge');

      const logs = [];
      let liveHeardText = '';

      const renderLiveCallPanel = () => {
        if (!msgEl) return;
        const quickPillsHtml = `
          <div style="margin-top:8px;padding-top:8px;border-top:1px solid rgba(255,255,255,0.12);">
            <div style="font-size:11px;color:#9ca3af;margin-bottom:5px;">
              🎙️ <strong>Speak in Tamil into Mic</strong> (or click/type below to test any customer question/interruption):
              <span id="liveMicHeardSpan" style="color:#fbbf24;font-weight:600;margin-left:6px;">${liveHeardText ? 'Hearing: "' + escapeHtml(liveHeardText) + '"' : ''}</span>
            </div>
            <div style="display:flex;flex-wrap:wrap;gap:5px;margin-bottom:6px;">
              <button type="button" onclick="window.__sendLiveCustomerUtterance('நீ யாரு எங்க இருந்து பேசுறீங்க?')" style="background:#374151;color:#fff;border:1px solid #4b5563;border-radius:4px;padding:3px 8px;font-size:11px;cursor:pointer;">❓ "நீ யாரு?"</button>
              <button type="button" onclick="window.__sendLiveCustomerUtterance('எதுக்கு கால் பண்ணீங்க?')" style="background:#374151;color:#fff;border:1px solid #4b5563;border-radius:4px;padding:3px 8px;font-size:11px;cursor:pointer;">❓ "எதுக்கு கால் பண்ணீங்க?"</button>
              <button type="button" onclick="window.__sendLiveCustomerUtterance('புரியல இன்னொரு வாட்டி சொல்லுங்க')" style="background:#374151;color:#fff;border:1px solid #4b5563;border-radius:4px;padding:3px 8px;font-size:11px;cursor:pointer;">🔁 "புரியல திரும்ப சொல்லுங்க"</button>
              <button type="button" onclick="window.__sendLiveCustomerUtterance('ஆமா சார் பேசுனாங்க திருப்தியா இருந்தது')" style="background:#065f46;color:#fff;border:1px solid #10b981;border-radius:4px;padding:3px 8px;font-size:11px;cursor:pointer;">✅ "ஆமா பேசுனாங்க"</button>
              <button type="button" onclick="window.__sendLiveCustomerUtterance('இல்ல இன்னும் யாரும் கூப்பிடல')" style="background:#7f1d1d;color:#fff;border:1px solid #ef4444;border-radius:4px;padding:3px 8px;font-size:11px;cursor:pointer;">❌ "இல்ல கூப்பிடல"</button>
              <button type="button" onclick="window.__sendLiveCustomerUtterance('இப்போ பிஸியா இருக்கேன் அப்புறம் கூப்பிடுங்க')" style="background:#78350f;color:#fff;border:1px solid #f59e0b;border-radius:4px;padding:3px 8px;font-size:11px;cursor:pointer;">⏳ "பிஸியா இருக்கேன்"</button>
            </div>
          </div>`;
        msgEl.innerHTML = logs.map((l) => `<div style="margin-bottom:4px;">${l}</div>`).join('') + quickPillsHtml;
      };

      const updateLogs = (line) => {
        logs.push(line);
        renderLiveCallPanel();
      };

      if (badgeEl) badgeEl.textContent = '🎙️ Live 2-Way Call Active';
      const greet = (client.openingGreeting || 'வணக்கம் {lead_name} சார்.')
        .replace(/\{lead_name\}/g, lead.name);

      updateLogs(`🔊 <strong>AI (Greeting):</strong> "${escapeHtml(greet)}"`);
      const greetRes = await speakUtterance(greet, true, true);
      let greetSpeech = greetRes?.interrupted ? (greetRes.customerSpeech || '') : '';
      if (!greetSpeech) {
        liveHeardText = 'Listening after Greeting...';
        renderLiveCallPanel();
        greetSpeech = await listenForCustomerReplyClean((heard) => {
          liveHeardText = heard;
          const sp = document.getElementById('liveMicHeardSpan');
          if (sp) sp.textContent = `🎙️ Hearing: "${heard}" (Listening completely...)`;
        }, 3000);
        liveHeardText = '';
        renderLiveCallPanel();
      }
      let greetTurns = 0;
      while (greetSpeech && greetTurns < 3) {
        greetTurns++;
        let gIntent = classifyTamilIntentLocal(greetSpeech, client.name);
        try {
          const gRes = await fetch(`${API_CONFIG.BASE_URL}/llm/classify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              replyText: greetSpeech,
              clientName: client.name,
              questionText: greet,
              positiveKeywords: client.trainer?.positiveKeywords || '',
              negativeKeywords: client.trainer?.negativeKeywords || '',
            }),
          });
          if (gRes.ok) gIntent = await gRes.json();
        } catch (_e) {}
        updateLogs(`🗣️ <strong>Customer Spoke on Greeting:</strong> "${escapeHtml(greetSpeech)}" ➡️ <em>${gIntent.intent}</em>`);
        if (gIntent.action === 'END_CALL_BUSY') {
          updateLogs(`🔊 <strong>AI:</strong> "${escapeHtml(gIntent.spokenReply)}"`);
          await speakUtterance(gIntent.spokenReply, true, false);
          lead.status = 'NOT_ATTENDED';
          lead.callSummary = `Customer busy during greeting ("${greetSpeech}").`;
          lead.calledAt = formatNow();
          if (badgeEl) badgeEl.textContent = 'NOT_ATTENDED';
          saveState();
          renderAll();
          return;
        }
        if (gIntent.spokenReply) {
          updateLogs(`🔊 <strong>AI (Groq LLM Reply):</strong> "${escapeHtml(gIntent.spokenReply)}"`);
          const followRes = await speakUtterance(gIntent.spokenReply, true, true);
          greetSpeech = followRes?.interrupted ? (followRes.customerSpeech || '') : '';
          await new Promise((r) => setTimeout(r, 450));
        } else {
          greetSpeech = '';
        }
      }

      lead.answers = {};
      const questions = client.questions || [];
      let earlyExit = false;

      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        let questionAnswered = false;
        let attempts = 0;
        let questionTurns = 0;

        while (!questionAnswered && attempts < 3 && questionTurns < 6) {
          attempts++;
          questionTurns++;
          updateLogs(`🤖 <strong>AI (Q${i + 1}):</strong> "${escapeHtml(q.text)}"`);

          const qRes = await speakUtterance(q.text, true, true);
          let customerSpeech = '';
          if (qRes?.interrupted && qRes.customerSpeech) {
            customerSpeech = qRes.customerSpeech;
          } else {
            liveHeardText = 'Listening on Mic (Speak your full sentence)...';
            renderLiveCallPanel();
            customerSpeech = await listenForCustomerReplyClean((heard) => {
              liveHeardText = heard;
              const sp = document.getElementById('liveMicHeardSpan');
              if (sp) sp.textContent = `🎙️ Hearing: "${heard}" (Listening completely...)`;
            }, 10000);
            liveHeardText = '';
          }

          if (!customerSpeech) {
            updateLogs(`⚠️ <em>No speech heard on Mic. Repeating Q${i + 1}...</em>`);
            continue;
          }

          // Classify Customer's Tamil Intent via Backend API (Groq Hybrid LLM + local fallback)
          let nlu = classifyTamilIntentLocal(customerSpeech, client.name);
          try {
            const apiRes = await fetch(`${API_CONFIG.BASE_URL}/llm/classify`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                replyText: customerSpeech,
                clientName: client.name,
                questionText: q.text,
                positiveKeywords: client.trainer?.positiveKeywords || '',
                negativeKeywords: client.trainer?.negativeKeywords || '',
              }),
            });
            if (apiRes.ok) {
              nlu = await apiRes.json();
            }
          } catch (_e) {}

          updateLogs(`🗣️ <strong>Customer Said:</strong> "${escapeHtml(customerSpeech)}" ➡️ <strong>${escapeHtml(nlu.intent)}</strong>`);

          if (nlu.action === 'END_CALL_BUSY') {
            earlyExit = true;
            questionAnswered = true;
            lead.status = 'NOT_ATTENDED';
            lead.callSummary = nlu.summary || `Customer busy: "${customerSpeech}"`;
            updateLogs(`🔊 <strong>AI (Closing - Busy):</strong> "${escapeHtml(nlu.spokenReply)}"`);
            await speakUtterance(nlu.spokenReply, true, false);
            break;
          }

          if (nlu.action === 'REPEAT_CURRENT') {
            // Customer asked a question or made a comment -> Speak Groq LLM's smart Tamil explanation and THEN re-ask current question!
            if (attempts > 0) attempts--;
            if (nlu.spokenReply) {
              updateLogs(`🔊 <strong>AI (Groq LLM Reply):</strong> "${escapeHtml(nlu.spokenReply)}"`);
              await speakUtterance(nlu.spokenReply, true, true);
              await new Promise((r) => setTimeout(r, 450));
            }
            continue;
          }

          // Even when moving to NEXT_QUESTION, if Groq LLM generated a spokenReply to a customer comment, speak it first!
          if (nlu.spokenReply) {
            updateLogs(`🔊 <strong>AI (Groq LLM Reply):</strong> "${escapeHtml(nlu.spokenReply)}"`);
            await speakUtterance(nlu.spokenReply, true, true);
            await new Promise((r) => setTimeout(r, 350));
          }

          // Customer answered YES or NO!
          const ansLabel = nlu.answer === 'NO' ? 'NO' : 'YES';
          lead.answers[q.id] = ansLabel;
          questionAnswered = true;

          if (i === 0 && ansLabel === 'NO') {
            earlyExit = true;
            lead.status = 'NOT_QUALIFIED';
            lead.callSummary = `Live Call: Customer replied "${customerSpeech}" -> NOT_QUALIFIED`;
            const closeNo = 'சரிங்க சார், நான் இப்பவே நம்ம டீலர்கிட்ட சொல்லி, இன்னைக்கே உங்களுக்கு கால் பண்ண சொல்றேன். ரொம்ப நன்றி சார்!';
            updateLogs(`🔊 <strong>AI (Closing):</strong> "${escapeHtml(closeNo)}"`);
            await speakUtterance(closeNo, true, false);
            break;
          }
        }

        if (earlyExit) break;
      }

      if (!earlyExit) {
        const allYes = Object.values(lead.answers).length > 0 && Object.values(lead.answers).every((v) => v === 'YES');
        lead.status = allYes ? 'QUALIFIED' : 'NOT_QUALIFIED';
        lead.callSummary = `Live Call (${lead.status}): ` + Object.entries(lead.answers).map(([k, v]) => `${k}=${v}`).join(', ');
        const closeYes = 'ரொம்ப நன்றி சார், உங்க பொன்னான நேரத்துக்கு மிக்க நன்றி, வணக்கம்!';
        updateLogs(`🔊 <strong>AI (Closing):</strong> "${escapeHtml(closeYes)}"`);
        await speakUtterance(closeYes, true, false);
      }

      lead.calledAt = formatNow();
      if (badgeEl) badgeEl.textContent = lead.status;
      saveState();
      renderAll();
      showToast(`🎉 Call Finished: ${lead.status}`);
    });
    renderAll();
  });
})();