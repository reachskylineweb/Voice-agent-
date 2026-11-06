# CLAUDE.md

This file provides guidance to Claude Code (`claude.ai/code`) when working with code in this repository.

## Project Overview

**Reach AI Voice — Multi-Workflow Outbound Verification Dashboard** is a **Frontend-Only UI** project (`frontend/index.html`, `frontend/style.css`, `frontend/app.js`). Do not create backend servers or database files.

## Strict Project Rules

1. **Frontend & UI Only** (`frontend/` directory).
2. **Outbound Calls ONLY** (No inbound call UI).
3. **Multi-Workflow Architecture** supporting pre-loaded workflows (`"TATA Leads Enquiry Verification"` and `"Healing Earth Service Verification"`) plus a working `"+ Add New Workflow"` modal.
4. **Zero-Dependency Browser Execution**: Works immediately when `frontend/index.html` is opened in Chrome using local state (`localStorage` + pre-populated sample data), while keeping optional REST fetch hooks (`/api/workflows`, `/api/calls/single`, `/api/calls/bulk`, `/api/reports`) with automatic local fallback.

## Key Files

- **`frontend/index.html`**: Complete Dashboard UI layout containing:
  1. Left Sidebar Navigation (`Active Client Workflows` + `+ New Workflow` button + Main Navigation Tabs: `Outbound Campaign`, `Workflow Script Trainer`, `Verification Reports`, `Voice Engine Settings`).
  2. Top KPI Summary Cards (`Total Outbound Calls Dialed`, `Q1: Staff Contacted (YES Count & %)`, `Q2: Understood & Satisfied (YES Count & %)`, `Pending / Needs Follow-Up (NO Count)`).
  3. Outbound Campaign Launcher View (3 synced configuration dropdowns, Single Number Outbound Dialer with live progress monitor, Bulk CSV/Excel drag-and-drop uploader with progress bar).
  4. 3-Step Workflow Script & Intent Trainer View (Bilingual `{customer_name}` & `{enquiry_item}` templates, Tamil/Tanglish/English YES/NO keyword lists, live Intent Classifier Sandbox).
  5. Client-Wise Verification Report Table (Filter tabs, search, CSV/Excel export, and exact 8 columns).
- **`frontend/style.css`**: Complete styling for the Reach AI Voice Outbound Dashboard.
- **`frontend/app.js`**: Frontend state management, CSV parser, live outbound dialer simulation, NLU keyword matcher, and CSV/Excel exporter.
