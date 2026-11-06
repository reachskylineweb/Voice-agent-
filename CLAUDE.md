# CLAUDE.md

This file provides guidance to Claude Code (`claude.ai/code`) when working with code in this repository.

## Project Overview

**Gym AI Voice Receptionist & Front-Desk Kiosk** (`gym-ai-receptionist`) is a TypeScript + Express web application that provides an interactive voice-enabled front-desk receptionist and real-time management dashboard for gyms.

## Common Commands

- **Install dependencies**: `npm install`
- **Run in development mode**: `npm run dev` (uses `ts-node src/server.ts`, defaults to `http://localhost:4500`)
- **Build TypeScript**: `npm run build` (compiles `src/` into `dist/`)
- **Run production build**: `npm start` (runs `node dist/server.js`)

## Environment Setup

Copy `.env.example` to `.env`:
```env
GEMINI_API_KEY=your_api_key_here
PORT=4500
```
- The server also supports setting the API key at runtime via `POST /api/config/apikey` from the dashboard UI.
- If no API key is set, the server automatically falls back to a built-in rule-based receptionist (`runSmartFallback` in `src/server.ts`) so the kiosk and tool actions remain functional in demo mode.

## Architecture & Key Files

- **`src/server.ts`**: Express server, REST API routes, LLM integration (`gemini-2.5-flash` / `gemini-2.0-flash` with function calling), smart local fallback logic, and JSON database persistence.
  - **Function-calling tools (`executeTool`)**:
    - `bookFreeTrial`: Schedules a complimentary trial session and records visitor details in `db.trialBookings`.
    - `checkInMember`: Looks up an existing member by name, phone, or ID (`MEM-xxx`), updates `lastCheckIn`, and appends to `db.checkIns`.
    - `manageMembershipRequest`: Logs membership freeze, unfreeze, renewal, or upgrade requests in `db.membershipRequests` and updates member status when applicable.
  - **API Endpoints**:
    - `GET /api/dashboard`: Returns full database state (`gymConfig`, `members`, `trialBookings`, `checkIns`, `membershipRequests`) and `hasApiKey`.
    - `POST /api/chat`: Processes user voice/text turns, runs function calls, updates `data/db.json`, and returns `{ reply, actions, mode, updatedDb }`.
    - `POST /api/config/apikey`: Updates the runtime API key.
    - `POST /api/config/gym`: Updates white-label gym settings (`gymName`, `receptionistName`, `timings`, `address`, `phone`).
- **`public/index.html`**: Single-page frontend containing the Voice Kiosk UI (Web Speech API for Speech-to-Text and Text-to-Speech, multi-language selector, audio visualizer) and the live Front-Desk Admin Dashboard.
- **`data/db.json`**: Local JSON datastore containing `gymConfig`, `members`, `trialBookings`, `checkIns`, and `membershipRequests`.
