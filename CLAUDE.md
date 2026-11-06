# CLAUDE.md

This file provides guidance to Claude Code (`claude.ai/code`) when working with code in this repository.

## Project Overview

**Reach AI Voice — Multi-Workflow Outbound Verification Dashboard** is an Outbound-Only Voice AI Verification platform supporting multiple client workflows (**TATA Leads Enquiry Verification**, **Healing Earth Service Verification**, plus custom client workflows).

## Folder Structure

- **`frontend/`**: Contains the complete Frontend Dashboard UI:
  - `frontend/index.html`: 5-component Outbound Dashboard layout (Left Sidebar Navigation, Top KPI Summary Cards, Outbound Campaign Launcher, 3-Step Workflow Script & Intent Trainer, Client-Wise Verification Report Table, plus `+ Add New Workflow` modal).
  - `frontend/style.css`: Dashboard styling.
  - `frontend/app.js`: Frontend state management, REST API client (`/api/workflows`, `/api/calls/single`, `/api/calls/bulk`, `/api/reports`) with automatic local state / mock data fallback, CSV drag-and-drop parser, Tamil/Tanglish/English NLU keyword matcher, and CSV/Excel exporter.
- **`backend/`**: Contains the Express + TypeScript Backend REST API:
  - `backend/src/server.ts`: Express server serving static files from `../frontend` and implementing `GET/POST /api/workflows`, `POST /api/calls/single`, `POST /api/calls/bulk`, and `GET /api/reports`.
  - `backend/data/db.json`: Pre-populated workflows and sample verification report records.
  - `backend/package.json` & `backend/tsconfig.json`: Backend build and runtime config.

## Common Commands

- **Install dependencies**: `cd backend && npm install` (or `npm run install:backend` from root)
- **Run dev server**: `npm run dev` (starts `backend/src/server.ts` on `http://localhost:4500`)
- **Build TypeScript**: `npm run build` (compiles `backend/src` to `backend/dist`)
- **Start production server**: `npm start`
