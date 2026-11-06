# Reach AI Voice — Multi-Workflow Outbound Verification Suite

Outbound-only AI Voice Verification Dashboard & REST API Backend supporting multi-client workflows (**TATA Leads Enquiry Verification**, **Healing Earth Service Verification**, and custom workflows).

---

## Project Folder Structure

```text
Voice-agent-/
├── frontend/                  # Frontend UI (HTML5, CSS3, Vanilla JS)
│   ├── index.html             # Reach AI Voice Outbound Dashboard UI
│   ├── style.css              # Dashboard Stylesheet
│   └── app.js                 # Frontend logic, CSV parser, NLU intent classifier & local fallback
│
├── backend/                   # Backend Server (Node.js, Express, TypeScript)
│   ├── src/
│   │   └── server.ts          # REST API (/api/workflows, /api/calls/single, /api/calls/bulk, /api/reports)
│   ├── data/
│   │   └── db.json            # Persistent JSON database (pre-populated workflows & verification reports)
│   ├── package.json           # Backend dependencies & scripts
│   ├── tsconfig.json          # TypeScript configuration
│   └── .env.example           # Environment template
│
├── package.json               # Root helper scripts (runs backend from root)
├── CLAUDE.md                  # Architecture guide for Claude Code
└── README.md                  # Documentation
```

---

## Quick Start

### Option 1: Run Full Stack (Frontend + Backend API)
```bash
# Install backend dependencies
cd backend
npm install

# Start development server (serves frontend + REST APIs at http://localhost:4500)
npm run dev
```
*(Or from the root folder, simply run `npm run dev`)*

### Option 2: Open Frontend Directly in Chrome (Zero-Backend Mode)
Open `frontend/index.html` directly in Google Chrome. The frontend includes an automatic local state & mock data fallback (`localStorage`) so all 5 dashboard components work out of the box.
