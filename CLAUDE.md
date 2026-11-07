# CLAUDE.md

This file provides guidance when working with code in this repository.

## Project Overview

**Reach AI Voice — Outbound Campaign & Workflow Console** is a **Frontend-Only UI** project (`frontend/index.html`, `frontend/style.css`, `frontend/app.js`). Do not create backend servers or database files.

## Strict Project Rules

1. **Frontend & UI Only** (`frontend/` directory).
2. **Outbound Calls ONLY** (No inbound call UI).
3. **Zero Pre-loaded Clients or Dummy Data** (`DEFAULT_CLIENTS = []`).
4. **Color Palette & Font**: `#dba718` (`rgb(219, 167, 24)`) and `#1e1c19` with `Poppins, sans-serif`.
5. **Exact 5 Pages in Sidebar**:
   - **Dashboard**: Global KPIs and active client cards.
   - **Client Workflow**: Saved client workflows list + Popup Modal (`#clientWorkflowModal`) for adding/editing clients and dynamic workflow questions, plus separate **Delete Workflow** (`+ Create New Workflow`) and **Delete Client** options.
   - **Outbound Calls**: Client cards grid -> client campaign workspace with Excel/CSV upload, Google Sheet lead scanner, **Start Calling** & **Stop After Current Call** sequential caller, dynamic question columns + Call Summary, **Qualified / Not Qualified / Not Attended** tabs, and full or per-tab Excel/CSV downloads.
   - **Workflow Script Trainer**: Per-client LLM voice agent training (**What to Speak**, **What NOT to Speak**, persona, and qualification keywords).
   - **Verification Report**: Tracks total leads assigned vs. calls spoken so far and qualification outcomes across clients.
