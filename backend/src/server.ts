import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4500;

app.use(cors());
app.use(express.json());

// Serve static frontend files from ../frontend (relative to backend/dist or backend/src)
const FRONTEND_DIR = path.resolve(__dirname, '../../frontend');
app.use(express.static(FRONTEND_DIR));

const DB_PATH = path.resolve(__dirname, '../data/db.json');

export interface WorkflowConfig {
  id: string;
  name: string;
  shortName: string;
  subtitle: string;
  description: string;
  callerId: string;
  voiceModel: string;
  badgeColor: string;
  defaultSampleCustomer: string;
  defaultSamplePhone: string;
  defaultSampleItem: string;
  itemLabel: string;
  step1Script: string;
  step2Script: string;
  q1YesKeywords: string;
  q1NoKeywords: string;
  step3Script: string;
  q2YesKeywords: string;
  q2NoKeywords: string;
}

export interface VerificationReport {
  id: string;
  timestamp: string;
  workflowId: string;
  workflowName: string;
  workflowBadgeColor: string;
  callerId: string;
  voiceModel?: string;
  customerName: string;
  customerPhone: string;
  enquiryItem: string;
  q1Contacted: 'YES' | 'NO';
  q2Satisfied: 'YES' | 'NO';
  transcript: string;
}

interface ReachVoiceDatabase {
  workflows: WorkflowConfig[];
  reports: VerificationReport[];
}

function readDb(): ReachVoiceDatabase {
  if (!fs.existsSync(DB_PATH)) {
    return { workflows: [], reports: [] };
  }
  const raw = fs.readFileSync(DB_PATH, 'utf-8');
  return JSON.parse(raw);
}

function writeDb(data: ReachVoiceDatabase): void {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

function formatNow(): string {
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

// ==================== REACH AI VOICE REST API ROUTES ====================

// 1. Get all client workflows
app.get('/api/workflows', (_req: Request, res: Response) => {
  const db = readDb();
  res.json({ workflows: Array.isArray(db.workflows) ? db.workflows : [] });
});

// 2. Create or update a client workflow (3-Step Script & Keywords or "+ Add New Workflow")
app.post('/api/workflows', (req: Request, res: Response) => {
  const db = readDb();
  if (!Array.isArray(db.workflows)) db.workflows = [];

  const wf: WorkflowConfig = req.body?.workflow || req.body;
  if (!wf || !wf.id) {
    res.status(400).json({ error: 'Workflow object with id is required' });
    return;
  }

  const idx = db.workflows.findIndex((item) => item.id === wf.id);
  if (idx >= 0) {
    db.workflows[idx] = { ...db.workflows[idx], ...wf };
  } else {
    db.workflows.push(wf);
  }

  writeDb(db);
  res.json({ success: true, workflow: wf, workflows: db.workflows });
});

// 3. Get all outbound verification call reports
app.get('/api/reports', (_req: Request, res: Response) => {
  const db = readDb();
  res.json({ reports: Array.isArray(db.reports) ? db.reports : [] });
});

// 4. Trigger & log a single outbound verification call
app.post('/api/calls/single', (req: Request, res: Response) => {
  const db = readDb();
  if (!Array.isArray(db.reports)) db.reports = [];

  const report: VerificationReport = {
    id: req.body?.id || `REP-${Date.now()}`,
    timestamp: req.body?.timestamp || formatNow(),
    workflowId: req.body?.workflowId || 'tata-leads',
    workflowName: req.body?.workflowName || 'TATA Leads Enquiry Verification',
    workflowBadgeColor: req.body?.workflowBadgeColor || 'blue',
    callerId: req.body?.callerId || 'Dedicated TATA: +91 98765 11111',
    voiceModel: req.body?.voiceModel || 'Tamil Female (Pallavi HD)',
    customerName: req.body?.customerName || 'Guest Customer',
    customerPhone: req.body?.customerPhone || '+91 98400 00000',
    enquiryItem: req.body?.enquiryItem || 'Nexon EV',
    q1Contacted: req.body?.q1Contacted === 'NO' ? 'NO' : 'YES',
    q2Satisfied: req.body?.q2Satisfied === 'NO' ? 'NO' : 'YES',
    transcript:
      req.body?.transcript ||
      'ஆமா சார் கால் பண்ணி பேசினாங்க, எல்லாமே தெளிவா புரிஞ்சது, ரொம்ப திருப்தி.',
  };

  db.reports.unshift(report);
  writeDb(db);
  res.json({ success: true, report });
});

// 5. Trigger & log a bulk CSV outbound campaign
app.post('/api/calls/bulk', (req: Request, res: Response) => {
  const db = readDb();
  if (!Array.isArray(db.reports)) db.reports = [];

  const records: VerificationReport[] = Array.isArray(req.body?.records)
    ? req.body.records
    : [];

  for (let i = records.length - 1; i >= 0; i--) {
    db.reports.unshift(records[i]);
  }

  writeDb(db);
  res.json({ success: true, added: records.length, reports: db.reports });
});

// Serve frontend/index.html for root route
app.get('/', (_req: Request, res: Response) => {
  res.sendFile(path.join(FRONTEND_DIR, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n📞 Reach AI Voice — Outbound Verification Server running at http://localhost:${PORT}`);
});
