# Reach AI Voice — Outbound Campaign & Workflow Console (Frontend UI)

Frontend UI for **Reach AI Voice**, an Outbound-Only AI Voice Platform with client workflow management, Excel/Google Sheet lead scanning, sequential one-by-one calling with Start/Stop controls, LLM Script Trainer, and Verification Reporting.

---

## Project Structure

```text
Voice-agent-/
├── frontend/                  # Frontend UI (HTML5, CSS3, Vanilla JS)
│   ├── index.html             # 5-page dashboard & popup client workflow modal
│   ├── style.css              # Poppins typography & #dba718 / #1e1c19 theme
│   ├── app.js                 # Frontend state, CSV/Google Sheet scanner, call runner & REST API hooks
│   └── package.json           # Local dev server (http://localhost:4500)
│
├── package.json               # Root dev script runner
├── CLAUDE.md                  # Frontend architecture guide
└── README.md                  # Documentation
```

---

## Pages Included

1. **Dashboard**: Global KPIs (Total Clients, Leads Assigned, Calls Spoken, Qualified, Not Qualified, Not Attended) and active client cards.
2. **Client Workflow**: Displays saved client workflows and opens a **Popup Modal** (`+ Add New Client` / `Edit Workflow`) to configure client info and dynamic call questions.
3. **Outbound Calls**: Client cards grid that opens each client's dedicated campaign workspace with Excel/CSV upload, Google Sheet lead scanner, **Start Calling** & **Stop After Current Call** controls, dynamic question columns + Call Summary, **Qualified / Not Qualified / Not Attended** tabs, and full or per-tab Excel/CSV downloads.
4. **Workflow Script Trainer**: Train the LLM voice agent per client on **What to Speak**, **What NOT to Speak**, persona, and qualification keywords.
5. **Verification Report**: Tracks total leads assigned vs. calls spoken so far and qualification outcomes across clients.

---

## How to Run

```powershell
cd frontend
npm run dev
```

Then open `http://localhost:4500` in your browser.
