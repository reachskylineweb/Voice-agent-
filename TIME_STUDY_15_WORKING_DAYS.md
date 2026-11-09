# ⏱️ AI VOICE AGENT — 15 WORKING DAYS TIME STUDY REPORT
**Team Members:** Ramkumar (Backend) & Kousic (Frontend) + Joint AI Voice/Brain Module  
**Duration:** Minimum 15 Working Days (3 Weeks × 5 Working Days/Week)  
**Working Hours Assumption:** 8 Hours / Working Day per Person (Total: 120 Hours each = **240 Total Man-Hours**)

---

## 1. Module-Wise Effort & Man-Hours Summary

| Module | Assigned To | Working Days | Ramkumar Hours | Kousic Hours | Total Man-Hours |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **Module 1: Backend, Telephony & CRM API** | **Ramkumar** (Parallel with Module 2) | Days 1 – 6 & Days 11 – 13 | 72 hrs | — | **72 hrs** |
| **Module 2: Frontend UI, Dialer & Dashboard** | **Kousic** (Parallel with Module 1) | Days 1 – 6 & Days 11 – 13 | — | 72 hrs | **72 hrs** |
| **Module 3: AI Voice (STT/TTS) & AI Brain Engine** | **Ramkumar + Kousic (Joint)** | Days 7 – 10 & Days 14 – 15 | 48 hrs | 48 hrs | **96 hrs** |
| **TOTAL (15 Working Days)** | **2 Developers** | **15 Working Days** | **120 hrs** | **120 hrs** | **240 hrs** |

---

## 2. Detailed Day-by-Day Time Study (Working Day 1 to Working Day 15)

### 📅 WEEK 1 (Working Days 1 – 5): Core Backend (Module 1) & Frontend UI (Module 2)

| Working Day | Module | Ramkumar (Backend — 8 hrs/day) | Kousic (Frontend — 8 hrs/day) | Daily Deliverable / Output |
| :---: | :---: | :--- | :--- | :--- |
| **Day 1** | M1 & M2 | **Architecture & Server Setup (8h):**<br>• Node.js & Express server setup (`server.js`) (3h)<br>• Project folder structure, CORS, env config & health-check APIs (3h)<br>• REST API contract definition with Frontend (2h) | **UI Wireframe & Base Layout (8h):**<br>• Dashboard shell & navigation layout (`index.html`) (3h)<br>• Responsive dark-theme CSS styling (`style.css`) (3h)<br>• Tab routing (Live Call, Dialer, CRM, Settings) (2h) | Running Node.js server + Base Dashboard UI shell |
| **Day 2** | M1 & M2 | **Local CRM Database Engine (8h):**<br>• Design schema for Calls, Leads, Bookings & Campaigns (2h)<br>• Build `services/database.js` CRUD methods (4h)<br>• Write `/api/crm/leads` & `/api/crm/calls` endpoints (2h) | **Live Phone Call Screen UI (8h):**<br>• Phone-style caller card & call timer UI (3h)<br>• Animated Voice Wave Orb (Listening / Thinking / Speaking states) (3h)<br>• Mute, End Call & Language Switch (`ta-IN` / `en-IN`) controls (2h) | Working Local Database APIs + Interactive Phone Call Screen |
| **Day 3** | M1 & M2 | **Config & CSV Export Backend (8h):**<br>• Build `config/agentConfig.json` loader & update APIs (3h)<br>• Build CSV/Excel generator for Leads & Call Logs (`/api/crm/export`) (3h)<br>• API validation & error handling middleware (2h) | **CRM Tables & Filter UI (8h):**<br>• Captured Leads & Booked Appointments data tables (3h)<br>• Call History transcript viewer modal (3h)<br>• Search, status filter & 1-click CSV download trigger (2h) | Live CRM Dashboard connected to Backend DB & CSV export |
| **Day 4** | M1 & M2 | **Single Outbound & Inbound Webhook Core (8h):**<br>• Build `services/telephony.js` base structure (2h)<br>• Inbound call webhook (`/twilio/incoming`) & TwiML generator (3h)<br>• Single number dial API (`/api/call/single`) (3h) | **Single Dialer & AI Trainer UI (8h):**<br>• Quick Dial Box (`+91` number input + Call Status badge) (4h)<br>• AI Knowledge Trainer form (Company Name, Greeting, FAQs editor) (4h) | Single Outbound/Inbound Backend routes + Quick Dialer & Trainer UI |
| **Day 5** | M1 & M2 | **Bulk Campaign Queue Manager (8h):**<br>• Build sequential call queue engine (`/api/call/bulk`) (4h)<br>• Call status tracker (`Queued`, `Ringing`, `Completed`, `Failed`) (2h)<br>• Pause / Resume / Cancel campaign controls (2h) | **Bulk Campaign Uploader UI (8h):**<br>• Multi-number paste box & CSV file parser (3h)<br>• Live Campaign Progress Bar & real-time status table (3h)<br>• Connect Module 1 & Module 2 REST APIs (2h) | Complete Backend + Frontend integration for Dialer & CRM |

---

### 📅 WEEK 2 (Working Days 6 – 10): Module 3 — AI Voice (STT/TTS) & AI Brain (Joint Work)

| Working Day | Module | Ramkumar + Kousic Joint Tasks (8 hrs each = 16 Man-Hours/Day) | Role Split Inside Joint Work | Daily Deliverable / Output |
| :---: | :---: | :--- | :--- | :--- |
| **Day 6** | **M3 (Voice)** | **Speech-to-Text (Ears) & Mic Stream Pipeline:**<br>• Browser `webkitSpeechRecognition` continuous listening loop<br>• Language code-switching support (`en-IN` & `ta-IN` Tamil/Tanglish)<br>• Silence detection & auto-submit after user finishes speaking | **Ramkumar:** Backend `/api/voice/chat` endpoint & session memory<br>**Kousic:** Frontend Mic capture, live captions & interim transcript UI | Real-time Speech-to-Text (Tamil + English) flowing from UI to Server |
| **Day 7** | **M3 (Voice)** | **Free Neural Text-to-Speech (Mouth) Engine:**<br>• Build `services/freeTts.js` using Microsoft Neural Voices (`ta-IN-PallaviNeural` & `en-IN-NeerjaNeural`)<br>• Audio stream buffer & browser fallback voice engine<br>• Sub-second audio playback synchronization | **Ramkumar:** Server-side neural audio stream generation (`/api/voice/tts`)<br>**Kousic:** Frontend audio player queue & voice waveform sync | Natural Tamil & Indian English AI Voice speaking back in <1s |
| **Day 8** | **M3 (Voice)** | **Barge-In (Interruption Handling) & Turn-Taking:**<br>• Detect when caller speaks while AI is still talking<br>• Immediately stop AI audio playback and switch to Listening state<br>• Handle background noise & empty speech retries | **Ramkumar:** Cancel active response state on server<br>**Kousic:** Audio interrupt detector & instant state transition in `app.js` | Hands-free human-like conversation with natural interruption support |
| **Day 9** | **M3 (Brain)** | **Smart AI Brain & FAQ Knowledge Engine (`aiBrain.js`):**<br>• Intent detection (Greeting, Pricing, Services, Timing, Booking, Human Transfer)<br>• Bilingual Tamil/Tanglish & English FAQ matching engine<br>• Context memory across multi-turn conversations | **Ramkumar:** Core `aiBrain.js` scoring & conversation state machine<br>**Kousic:** Live FAQ trainer integration & test script curation | AI Brain accurately answering business questions in Tamil & English |
| **Day 10** | **M3 (Brain)** | **Automated Lead & Appointment Extraction + LLM Integration:**<br>• Entity extractor for **Caller Name, Phone Number, Service & Preferred Date/Time**<br>• Auto-save extracted leads/appointments into CRM Database during call<br>• Plug-and-play **Google Gemini Free Tier / Local Ollama** connector | **Ramkumar:** Entity regex/LLM parser & DB auto-save trigger<br>**Kousic:** Real-time Lead/Booking pop-up notification on Dashboard | AI automatically books appointments & saves leads during live voice chat |

---

### 📅 WEEK 3 (Working Days 11 – 15): Live Telephony Bridge, Bulk Campaign Execution & QA

| Working Day | Module | Ramkumar (Backend — 8 hrs/day) | Kousic (Frontend — 8 hrs/day) | Daily Deliverable / Output |
| :---: | :---: | :--- | :--- | :--- |
| **Day 11** | M1 & M2 | **Twilio Virtual Number & Tunnel Setup (8h):**<br>• Configure Twilio account SID, Auth Token & `+91` Caller ID (3h)<br>• Setup `cloudflared` / `ngrok` HTTPS webhook tunnel (2h)<br>• Connect `/twilio/incoming` & `/twilio/gather` to `aiBrain.js` (3h) | **Telephony Settings & Live Monitor UI (8h):**<br>• Settings UI to save Twilio / SIM Modem credentials from browser (4h)<br>• Live active-call indicator & webhook connection status panel (4h) | Live Phone Number connected to PC Server |
| **Day 12** | M1 & M2 | **Real Mobile Call Loop (Inbound & Single Outbound) (8h):**<br>• End-to-end Twilio `<Gather input="speech">` + `<Say>` loop (4h)<br>• Auto-log phone call transcripts & call duration into `crm_db.json` (4h) | **Single Call Live Transcript & Status UI (8h):**<br>• Real-time polling/refresh of active phone call transcript on Dashboard (4h)<br>• Call outcome badges (`Answered`, `Booked`, `Busy`, `No Answer`) (4h) | Working Inbound & Single Outbound real mobile calls |
| **Day 13** | M1 & M2 | **Local SIM / ADB Android Bridge & Bulk Queue Tuning (8h):**<br>• Add USB ADB / Serial Modem dialer option (`adb shell am start`) (4h)<br>• Rate-limiting & retry logic for Bulk Outbound Campaign calls (4h) | **Bulk Campaign Analytics & Summary Cards (8h):**<br>• Total Calls, Answered %, Leads Captured & Bookings KPI cards (4h)<br>• Campaign report export & filter by campaign batch (4h) | Dual telephony support (Virtual Number + SIM Bridge) + Bulk Analytics |
| **Day 14** | **M3 (Joint)** | **Joint Stress Testing & Voice Latency Optimization (8h):**<br>• Optimize TTS & AI Brain response time to `< 800ms`<br>• Test 20+ Tamil, Tanglish & English noisy-environment voice prompts | **Joint UI/UX Polish & Edge-Case Testing (8h):**<br>• Cross-browser & mobile responsive testing<br>• Verify Barge-In, Bulk CSV upload (50+ numbers) & Excel export formatting | Fully optimized, bug-free AI Voice Agent (<800ms latency) |
| **Day 15** | **M3 (Joint)** | **Final System Integration, Documentation & Live Demo Prep (8h):**<br>• Final end-to-end dry run (Web Call + Inbound + Single Dial + Bulk Dial) | **Final Project Report & Demo Walkthrough (8h):**<br>• Capture final UI screenshots, call logs & sign-off documentation | **100% Completed Production-Ready AI Voice Agent System** |

---

## 3. Time Study Breakdown by Activity Type

| Activity Category | Ramkumar (Hours) | Kousic (Hours) | Total Hours | % of Project |
| :--- | :---: | :---: | :---: | :---: |
| **1. System Design & Environment Setup** | 8 hrs | 8 hrs | 16 hrs | 6.7% |
| **2. Module 1 (Backend, DB & Telephony APIs)** | 56 hrs | — | 56 hrs | 23.3% |
| **3. Module 2 (Frontend UI, Dialer & CRM Screens)** | — | 56 hrs | 56 hrs | 23.3% |
| **4. Module 3 (AI Voice STT/TTS & AI Brain — Joint)** | 40 hrs | 40 hrs | 80 hrs | 33.3% |
| **5. Integration, QA Testing & Final Documentation** | 16 hrs | 16 hrs | 32 hrs | 13.4% |
| **TOTAL** | **120 Hours** | **120 Hours** | **240 Hours** | **100%** |
