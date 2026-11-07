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
    BASE_URL: '/api', // Change to e.g. 'http://localhost:5000/api' when backend is deployed
    ENDPOINTS: {
      CLIENTS: '/clients', // GET all, POST new, PUT /:id, DELETE /:id
      CLIENT_LEADS: (clientId) => `/clients/${clientId}/leads`, // POST upload/scan leads
      CALL_RESULT: (clientId, leadId) => `/clients/${clientId}/leads/${leadId}/call`, // POST call outcome
      TRAINER: (clientId) => `/clients/${clientId}/trainer`, // PUT LLM trainer rules
      REPORTS: '/reports', // GET overall verification report
    },
  };

  const STORAGE_KEY = 'reach_ai_voice_clean_v1';

  // ==================== CLEAN INITIAL STATE (0 CLIENTS, 0 DUMMY DATA) ====================
  const DEFAULT_CLIENTS = [];

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

  // -------------------- START & STOP SEQUENTIAL VOICE AGENT CALLER --------------------
  function speakUtterance(text) {
    const chk = document.getElementById('chkLiveTts');
    if (!chk || !chk.checked || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.rate = 1.0;
      window.speechSynthesis.speak(utter);
    } catch (_e) {
      // ignore browser TTS errors
    }
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

    const pendingLeads = (client.leads || []).filter((l) => l.status === 'PENDING');
    if (pendingLeads.length === 0) {
      showToast('No pending leads to call. Upload leads first.');
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

      if (liveBadge) liveBadge.textContent = `Calling Lead ${i + 1} of ${pendingLeads.length}`;
      const greeting = (client.openingGreeting || '')
        .replace(/\{lead_name\}/g, lead.name)
        .replace(/\{customer_name\}/g, lead.name)
        .replace(/\{client_name\}/g, client.name)
        .replace(/\{enquiry_item\}/g, lead.enquiry || 'your enquiry');

      if (liveMsg) {
        liveMsg.innerHTML = `Dialing <strong>${escapeHtml(lead.name)} (${escapeHtml(lead.phone)})</strong> — Speaking Greeting: "${escapeHtml(greeting)}"`;
      }
      speakUtterance(greeting);

      await new Promise((r) => setTimeout(r, 1100));

      // Check simulated response mode for this lead
      if (lead.simMode === 'not_attended') {
        lead.status = 'NOT_ATTENDED';
        lead.answers = {};
        (client.questions || []).forEach((q) => {
          lead.answers[q.id] = '—';
        });
        lead.callSummary = 'Call Not Attended — Customer did not pick up / phone ringing no answer.';
        lead.calledAt = formatNow();
      } else {
        // Ask each configured workflow question sequentially
        const isPositiveLead = lead.simMode !== 'not_qualified';
        lead.answers = {};

        for (let qIdx = 0; qIdx < (client.questions || []).length; qIdx++) {
          const q = client.questions[qIdx];
          if (liveMsg) {
            liveMsg.innerHTML = `Asking <strong>${escapeHtml(lead.name)}</strong> — Q${qIdx + 1}: "${escapeHtml(q.text)}"`;
          }
          await new Promise((r) => setTimeout(r, 900));
          lead.answers[q.id] = isPositiveLead ? 'YES' : 'NO';
        }

        if (isPositiveLead) {
          lead.status = 'QUALIFIED';
          lead.callSummary = `Customer answered YES to all ${client.questions.length} questions. Interested and satisfied regarding ${lead.enquiry}.`;
        } else {
          lead.status = 'NOT_QUALIFIED';
          lead.callSummary = `Customer responded NO / Not Interested regarding ${lead.enquiry}. Marked as Not Qualified.`;
        }
        lead.calledAt = formatNow();
      }

      await tryApiCall(API_CONFIG.ENDPOINTS.CALL_RESULT(client.id, lead.id), {
        method: 'POST',
        body: JSON.stringify(lead),
      });

      state.currentlyCallingLeadId = null;
      saveState();
      renderAll();

      // If user clicked "Stop After Current Call", break cleanly right after finishing this call!
      if (state.stopAfterCurrentCall) {
        if (liveBadge) liveBadge.textContent = 'Stopped by User';
        if (liveMsg) {
          liveMsg.innerHTML = `Stopped cleanly after finishing call with <strong>${escapeHtml(lead.name)}</strong>.`;
        }
        showToast('Voice agent stopped after finishing the current call.');
        break;
      }
    }

    if (!state.stopAfterCurrentCall) {
      if (liveBadge) liveBadge.textContent = 'Campaign Completed';
      if (liveMsg) {
        liveMsg.innerHTML = `Finished calling all pending leads for <strong>${escapeHtml(client.name)}</strong>.`;
      }
      showToast(`Completed outbound calls for ${client.name}!`);
    }

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

  function handleLeadFileUpload(file) {
    const client = getClientById(state.selectedOutboundClientId);
    if (!client) return;

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
  document.addEventListener('DOMContentLoaded', () => {
    loadState();
    resetWorkflowEditorToNew();
    bindEvents();
    renderAll();
  });
})();
