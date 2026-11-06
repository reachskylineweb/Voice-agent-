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
app.use(express.static(path.join(__dirname, '../public')));

const DB_PATH = path.join(__dirname, '../data/db.json');

// Runtime API key (can be set via .env or via the Dashboard UI)
let runtimeGeminiKey: string = process.env.GEMINI_API_KEY || '';

interface GymDatabase {
  gymConfig: {
    gymName: string;
    receptionistName: string;
    address: string;
    phone: string;
    timings: string;
    plans: Array<{ name: string; price: string; features: string }>;
    trainers: Array<{ name: string; specialty: string; shift: string }>;
    facilities: string[];
  };
  members: Array<{
    id: string;
    name: string;
    phone: string;
    plan: string;
    status: string;
    expiryDate: string;
    lastCheckIn: string;
  }>;
  trialBookings: Array<{
    id: string;
    name: string;
    phone: string;
    fitnessGoal: string;
    preferredDate: string;
    preferredTime: string;
    trainerPreference: string;
    status: string;
    createdAt: string;
  }>;
  checkIns: Array<{
    id: string;
    memberId: string;
    memberName: string;
    plan: string;
    status: string;
    timestamp: string;
  }>;
  membershipRequests: Array<{
    id: string;
    memberName: string;
    phone: string;
    requestType: string;
    details: string;
    status: string;
    createdAt: string;
  }>;
}

function readDb(): GymDatabase {
  const raw = fs.readFileSync(DB_PATH, 'utf-8');
  return JSON.parse(raw);
}

function writeDb(data: GymDatabase): void {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

function formatNow(): string {
  const now = new Date();
  return now.toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

// Tool Execution Functions
function executeTool(
  toolName: string,
  args: Record<string, any>,
  db: GymDatabase
): { result: any; actionSummary: string } {
  if (toolName === 'bookFreeTrial') {
    const newBooking = {
      id: `TRL-0${db.trialBookings.length + 1}`,
      name: args.name || 'Guest Visitor',
      phone: args.phone || 'Not provided',
      fitnessGoal: args.fitnessGoal || 'General Fitness',
      preferredDate: args.preferredDate || 'Tomorrow',
      preferredTime: args.preferredTime || '6:00 PM',
      trainerPreference: args.trainerPreference || 'Any Available Coach',
      status: 'Scheduled',
      createdAt: formatNow(),
    };
    db.trialBookings.unshift(newBooking);
    writeDb(db);
    return {
      result: { success: true, booking: newBooking },
      actionSummary: `Booked Free Trial for ${newBooking.name} (${newBooking.preferredDate} at ${newBooking.preferredTime})`,
    };
  }

  if (toolName === 'checkInMember') {
    const q = String(args.identifier || '').toLowerCase().trim();
    const member = db.members.find(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.phone.includes(q) ||
        m.id.toLowerCase() === q
    );

    if (!member) {
      return {
        result: {
          success: false,
          message: `No existing member found matching "${args.identifier}". Available demo members: Rahul Sharma (9876543210), Priya Nair (9123456780), David Miller (5550192831).`,
        },
        actionSummary: `Member lookup failed for "${args.identifier}"`,
      };
    }

    const timestamp = formatNow();
    member.lastCheckIn = timestamp;
    const newCheckIn = {
      id: `CHK-0${db.checkIns.length + 1}`,
      memberId: member.id,
      memberName: member.name,
      plan: member.plan,
      status: member.status,
      timestamp,
    };
    db.checkIns.unshift(newCheckIn);
    writeDb(db);

    return {
      result: {
        success: true,
        member,
        checkIn: newCheckIn,
        note:
          member.status === 'Frozen'
            ? 'Warning: Member account is currently Frozen. Ask if they want to unfreeze it today.'
            : member.status === 'Expiring Soon'
            ? `Reminder: Membership expires on ${member.expiryDate}. Mention our 10% early renewal discount!`
            : 'Membership is Active. Welcome them to their workout!',
      },
      actionSummary: `Checked in ${member.name} (${member.id} - ${member.status})`,
    };
  }

  if (toolName === 'manageMembershipRequest') {
    const reqType = String(args.requestType || 'General Request');
    const newReq = {
      id: `REQ-0${db.membershipRequests.length + 1}`,
      memberName: args.memberName || 'Gym Member',
      phone: args.phone || 'On File',
      requestType: reqType,
      details: args.details || `${reqType} requested via AI Receptionist`,
      status: 'Pending Action',
      createdAt: formatNow(),
    };
    db.membershipRequests.unshift(newReq);

    // Also update member status if matching member found for Freeze/Unfreeze
    const qName = String(args.memberName || '').toLowerCase();
    const member = db.members.find(
      (m) =>
        (qName && m.name.toLowerCase().includes(qName)) ||
        (args.phone && m.phone.includes(String(args.phone)))
    );
    if (member) {
      if (reqType.toLowerCase().includes('freeze') && !reqType.toLowerCase().includes('unfreeze')) {
        member.status = 'Frozen';
      } else if (reqType.toLowerCase().includes('unfreeze') || reqType.toLowerCase().includes('resume')) {
        member.status = 'Active';
      }
    }

    writeDb(db);
    return {
      result: { success: true, request: newReq, updatedMember: member || null },
      actionSummary: `Logged ${reqType} request for ${newReq.memberName}`,
    };
  }

  return {
    result: { error: `Unknown tool: ${toolName}` },
    actionSummary: `Unknown tool ${toolName}`,
  };
}

// Gemini Tool Declarations
const geminiTools = [
  {
    functionDeclarations: [
      {
        name: 'bookFreeTrial',
        description:
          'Books a free gym trial session or gym tour for a new visitor/lead and saves their contact details.',
        parameters: {
          type: 'OBJECT',
          properties: {
            name: {
              type: 'STRING',
              description: 'Full name of the visitor/caller',
            },
            phone: {
              type: 'STRING',
              description: 'Phone number of the visitor',
            },
            fitnessGoal: {
              type: 'STRING',
              description: 'Their fitness goal (e.g., Weight Loss, Muscle Gain, Strength, Yoga, General Fitness)',
            },
            preferredDate: {
              type: 'STRING',
              description: 'Preferred date or day for the free trial (e.g., Tomorrow, Monday, 2026-11-06)',
            },
            preferredTime: {
              type: 'STRING',
              description: 'Preferred time slot (e.g., 7:00 AM, 6:30 PM)',
            },
            trainerPreference: {
              type: 'STRING',
              description: 'Optional preferred trainer name if mentioned',
            },
          },
          required: ['name', 'phone'],
        },
      },
      {
        name: 'checkInMember',
        description:
          'Checks in an existing gym member at the front desk using their name, phone number, or Member ID (e.g. MEM-101) and checks their membership status.',
        parameters: {
          type: 'OBJECT',
          properties: {
            identifier: {
              type: 'STRING',
              description: 'Member name, phone number, or Member ID (such as Rahul, Priya, David, MEM-101, 9876543210)',
            },
          },
          required: ['identifier'],
        },
      },
      {
        name: 'manageMembershipRequest',
        description:
          'Submits a membership Freeze, Unfreeze, Renewal, or Plan Upgrade request for an existing member.',
        parameters: {
          type: 'OBJECT',
          properties: {
            memberName: {
              type: 'STRING',
              description: 'Name of the member requesting the change',
            },
            phone: {
              type: 'STRING',
              description: 'Phone number of the member (if provided)',
            },
            requestType: {
              type: 'STRING',
              description: 'Type of request: Freeze, Unfreeze, Renewal, or Upgrade',
            },
            details: {
              type: 'STRING',
              description: 'Details such as freeze duration, reason, or desired new plan',
            },
          },
          required: ['memberName', 'requestType', 'details'],
        },
      },
    ],
  },
];

function buildSystemInstruction(db: GymDatabase, languageHint: string): string {
  const { gymConfig, members } = db;
  return `You are ${gymConfig.receptionistName}, a warm, energetic, human-like AI Front-Desk Receptionist at "${gymConfig.gymName}".
You are speaking directly to gym visitors and members via voice, so keep your responses natural, conversational, concise (2 to 4 sentences max), and friendly—never robotic or overly long, and avoid markdown bullet lists so Text-to-Speech sounds like a real human receptionist!

LANGUAGE INSTRUCTION:
The user's selected/preferred language mode is: ${languageHint || 'Auto-detect (English + local language)'}.
Always reply naturally in the SAME language or mix (e.g., English, Hindi/Hinglish, Tamil, Spanish, Arabic, etc.) that the user speaks to you!

GYM INFORMATION:
- Gym Name: ${gymConfig.gymName}
- Address: ${gymConfig.address}
- Phone: ${gymConfig.phone}
- Timings: ${gymConfig.timings}
- Membership Plans:
${gymConfig.plans.map((p) => `  * ${p.name}: ${p.price} (${p.features})`).join('\n')}
- Coaches / Trainers:
${gymConfig.trainers.map((t) => `  * ${t.name} - Specialty: ${t.specialty} (Shift: ${t.shift})`).join('\n')}
- Facilities: ${gymConfig.facilities.join(', ')}

EXISTING DEMO MEMBERS ON FILE (for check-in / freeze / renewal):
${members.map((m) => `- ${m.name} (ID: ${m.id}, Phone: ${m.phone}, Plan: ${m.plan}, Status: ${m.status}, Expires: ${m.expiryDate})`).join('\n')}

YOUR CORE RESPONSIBILITIES & TOOL USAGE:
1. Answer FAQs warmly and accurately (plans, timings, coaches, facilities). After answering a question from a new visitor, proactively offer to book them a Free 1-Day Trial!
2. Book Free Trials: When someone wants to book a trial or tour, ask for their Name, Phone Number, Fitness Goal, and Preferred Day/Time if you don't have them yet. Once they provide at least their Name and Phone (or if they give all details at once), IMMEDIATELY call the \`bookFreeTrial\` tool!
3. Member Check-In: When a member says they are here to work out or wants to check in (e.g. "Hi I'm Rahul checking in" or gives their phone/ID), IMMEDIATELY call \`checkInMember\`. Mention their status or expiry reminder warmly.
4. Membership Freeze / Unfreeze / Renewal / Upgrade: When a member wants to freeze, unfreeze, renew, or upgrade their membership, call \`manageMembershipRequest\` and confirm it has been logged for them.`;
}

async function callGeminiAPI(
  apiKey: string,
  contents: any[],
  systemInstruction: string
): Promise<any> {
  const models = ['gemini-2.5-flash', 'gemini-2.0-flash'];
  let lastError: any = null;

  for (const model of models) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: systemInstruction }],
        },
        contents,
        tools: geminiTools,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 350,
        },
      }),
    });

    if (response.ok) {
      return await response.json();
    } else {
      const errText = await response.text();
      lastError = new Error(`Gemini API (${model}) HTTP ${response.status}: ${errText}`);
      // If invalid key, don't retry another model
      if (response.status === 400 || response.status === 403) {
        break;
      }
    }
  }
  throw lastError;
}

// Built-in Smart Fallback Receptionist (works before the user adds their free Gemini API key!)
function runSmartFallback(
  userMessage: string,
  db: GymDatabase
): { reply: string; actions: string[] } {
  const msg = userMessage.toLowerCase();
  const { gymConfig } = db;
  const actions: string[] = [];

  // 1. Check-in detection
  if (
    msg.includes('check in') ||
    msg.includes('check-in') ||
    msg.includes('checking in') ||
    msg.includes('rahul') ||
    msg.includes('priya') ||
    msg.includes('david') ||
    msg.includes('mem-')
  ) {
    let identifier = '';
    if (msg.includes('rahul')) identifier = 'Rahul';
    else if (msg.includes('priya')) identifier = 'Priya';
    else if (msg.includes('david')) identifier = 'David';
    else {
      const match = msg.match(/(mem-\d+|\d{10})/i);
      if (match) identifier = match[1];
    }

    if (identifier && (msg.includes('check') || msg.includes('here') || msg.includes('hi') || msg.includes('hello') || msg.includes('workout'))) {
      const { result, actionSummary } = executeTool('checkInMember', { identifier }, db);
      actions.push(actionSummary);
      if (result.success) {
        const m = result.member;
        return {
          reply: `Welcome back to ${gymConfig.gymName}, ${m.name}! I've checked you in on your ${m.plan} plan. ${result.note}`,
          actions,
        };
      }
    }
  }

  // 2. Freeze / Renewal request detection
  if (msg.includes('freeze') || msg.includes('renew') || msg.includes('upgrade')) {
    let memberName = 'Gym Member';
    if (msg.includes('rahul')) memberName = 'Rahul Sharma';
    else if (msg.includes('priya')) memberName = 'Priya Nair';
    else if (msg.includes('david')) memberName = 'David Miller';

    const requestType = msg.includes('unfreeze')
      ? 'Unfreeze'
      : msg.includes('freeze')
      ? 'Freeze'
      : msg.includes('renew')
      ? 'Renewal'
      : 'Plan Upgrade';

    const { actionSummary } = executeTool(
      'manageMembershipRequest',
      {
        memberName,
        phone: 'On File',
        requestType,
        details: userMessage,
      },
      db
    );
    actions.push(actionSummary);
    return {
      reply: `Got it! I have processed your ${requestType.toLowerCase()} request for ${memberName} and updated our front-desk dashboard right away. Is there anything else I can help you with today?`,
      actions,
    };
  }

  // 3. Free trial booking with phone number detection
  const phoneMatch = userMessage.match(/\b\d{8,12}\b/);
  if (
    phoneMatch &&
    (msg.includes('trial') ||
      msg.includes('book') ||
      msg.includes('name is') ||
      msg.includes('i am ') ||
      msg.includes("i'm ") ||
      msg.includes('tomorrow') ||
      msg.includes('morning') ||
      msg.includes('evening') ||
      msg.includes('pm') ||
      msg.includes('am'))
  ) {
    const nameMatch = userMessage.match(/(?:name is|i am|i'm|this is)\s+([a-zA-Z\s]{2,25})/i);
    const visitorName = nameMatch ? nameMatch[1].trim() : 'Valued Guest';
    const goal =
      msg.includes('weight') || msg.includes('fat')
        ? 'Weight Loss'
        : msg.includes('muscle') || msg.includes('strength')
        ? 'Muscle Gain'
        : 'Fitness & Conditioning';
    const timeMatch = userMessage.match(/\b(\d{1,2}(?::\d{2})?\s*(?:am|pm))\b/i);

    const { actionSummary } = executeTool(
      'bookFreeTrial',
      {
        name: visitorName,
        phone: phoneMatch[0],
        fitnessGoal: goal,
        preferredDate: msg.includes('today') ? 'Today' : 'Tomorrow',
        preferredTime: timeMatch ? timeMatch[1].toUpperCase() : '6:00 PM',
        trainerPreference: 'Coach Vikram / Coach Neha',
      },
      db
    );
    actions.push(actionSummary);
    return {
      reply: `Awesome, ${visitorName}! I've booked your free trial session at ${gymConfig.gymName} for ${
        timeMatch ? timeMatch[1].toUpperCase() : '6:00 PM'
      } and registered your number ${phoneMatch[0]}. Just bring a pair of indoor gym shoes and a water bottle—we can't wait to see you!`,
      actions,
    };
  }

  // 4. Ask to book a trial (when phone isn't given yet)
  if (msg.includes('trial') || msg.includes('tour') || msg.includes('join')) {
    return {
      reply: `We'd love to host you for a complimentary 1-day trial at ${gymConfig.gymName}! Just tell me your name, phone number, your main fitness goal, and what time works best for you.`,
      actions,
    };
  }

  // 5. Membership Plans & Pricing FAQ
  if (
    msg.includes('price') ||
    msg.includes('plan') ||
    msg.includes('cost') ||
    msg.includes('fee') ||
    msg.includes('membership') ||
    msg.includes('kitna')
  ) {
    const planSummary = gymConfig.plans.map((p) => `${p.name} at ${p.price}`).join(', ');
    return {
      reply: `At ${gymConfig.gymName}, we offer three flexible plans: ${planSummary}. Our Quarterly Pro and Annual Elite plans also include group classes like Zumba and HIIT plus complimentary personal training sessions! Would you like to book a free trial to check out the gym first?`,
      actions,
    };
  }

  // 6. Timings & Hours FAQ
  if (msg.includes('time') || msg.includes('timing') || msg.includes('open') || msg.includes('hour') || msg.includes('sunday')) {
    return {
      reply: `Our gym timings are ${gymConfig.timings}. We are located at ${gymConfig.address}. What time do you usually like to work out?`,
      actions,
    };
  }

  // 7. Trainers / Personal Training FAQ
  if (msg.includes('trainer') || msg.includes('coach') || msg.includes('pt') || msg.includes('personal')) {
    const coachSummary = gymConfig.trainers
      .map((t) => `${t.name} who specializes in ${t.specialty} (${t.shift})`)
      .join('; ');
    return {
      reply: `We have certified head coaches on the floor all day: ${coachSummary}. Would you like me to book a free trial session with one of them?`,
      actions,
    };
  }

  // Default greeting
  return {
    reply: `Hi there! I'm ${gymConfig.receptionistName}, the AI Receptionist at ${gymConfig.gymName}. I can help you with membership plans and timings, book a free trial session, check you in for your workout, or handle membership renewals and freezes. How can I help you today?`,
    actions,
  };
}

// API Routes

// Get full dashboard state
app.get('/api/dashboard', (_req: Request, res: Response) => {
  const db = readDb();
  res.json({
    ...db,
    hasApiKey: Boolean(runtimeGeminiKey && runtimeGeminiKey.trim().length > 10),
  });
});

// Set Gemini API Key at runtime
app.post('/api/config/apikey', (req: Request, res: Response) => {
  const { apiKey } = req.body;
  runtimeGeminiKey = String(apiKey || '').trim();
  res.json({
    success: true,
    hasApiKey: Boolean(runtimeGeminiKey.length > 10),
  });
});

// Update Gym White-Label Config (so user can pitch different gyms!)
app.post('/api/config/gym', (req: Request, res: Response) => {
  const db = readDb();
  const { gymName, receptionistName, timings, address, phone } = req.body;
  if (gymName) db.gymConfig.gymName = gymName;
  if (receptionistName) db.gymConfig.receptionistName = receptionistName;
  if (timings) db.gymConfig.timings = timings;
  if (address) db.gymConfig.address = address;
  if (phone) db.gymConfig.phone = phone;
  writeDb(db);
  res.json({ success: true, gymConfig: db.gymConfig });
});

// Main Receptionist Chat & Voice Turn Endpoint
app.post('/api/chat', async (req: Request, res: Response) => {
  try {
    const { message, history = [], languageHint = 'Auto-detect' } = req.body;
    const db = readDb();

    if (!message || !String(message).trim()) {
      res.status(400).json({ error: 'Message is required' });
      return;
    }

    // If no Gemini API key is configured yet, use Smart Local Fallback so demo works out of the box
    if (!runtimeGeminiKey || runtimeGeminiKey.length < 10) {
      const fallback = runSmartFallback(String(message), db);
      res.json({
        reply: fallback.reply,
        actions: fallback.actions,
        mode: 'demo-fallback',
        updatedDb: readDb(),
      });
      return;
    }

    const systemInstruction = buildSystemInstruction(db, languageHint);

    // Format conversation history for Gemini
    const contents: any[] = [];
    for (const turn of history.slice(-10)) {
      contents.push({
        role: turn.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: String(turn.content) }],
      });
    }
    contents.push({
      role: 'user',
      parts: [{ text: String(message) }],
    });

    const actionsExecuted: string[] = [];
    let geminiResponse = await callGeminiAPI(runtimeGeminiKey, contents, systemInstruction);

    let candidate = geminiResponse.candidates?.[0];
    let modelParts = candidate?.content?.parts || [];

    // Check if Gemini decided to call one or more functions
    const functionCalls = modelParts.filter((p: any) => p.functionCall);

    if (functionCalls.length > 0) {
      // Add the model's functionCall turn
      contents.push({
        role: 'model',
        parts: modelParts,
      });

      const functionResponseParts: any[] = [];
      for (const part of functionCalls) {
        const fc = part.functionCall;
        const { result, actionSummary } = executeTool(fc.name, fc.args || {}, db);
        actionsExecuted.push(actionSummary);
        functionResponseParts.push({
          functionResponse: {
            name: fc.name,
            response: result,
          },
        });
      }

      // Send tool execution results back to Gemini for final spoken response
      contents.push({
        role: 'user',
        parts: functionResponseParts,
      });

      geminiResponse = await callGeminiAPI(runtimeGeminiKey, contents, systemInstruction);
      candidate = geminiResponse.candidates?.[0];
      modelParts = candidate?.content?.parts || [];
    }

    const replyText =
      modelParts
        .map((p: any) => p.text || '')
        .join(' ')
        .trim() ||
      `I've updated that for you at ${db.gymConfig.gymName}! How else can I help you today?`;

    res.json({
      reply: replyText,
      actions: actionsExecuted,
      mode: 'gemini-live',
      updatedDb: readDb(),
    });
  } catch (error: any) {
    console.error('Chat error:', error?.message || error);
    const db = readDb();
    const fallback = runSmartFallback(String(req.body?.message || ''), db);
    res.json({
      reply: fallback.reply,
      actions: fallback.actions,
      mode: 'demo-fallback',
      warning: error?.message || 'Used fallback receptionist due to API error.',
      updatedDb: readDb(),
    });
  }
});

app.listen(PORT, () => {
  console.log(`\n🏋️  Gym AI Receptionist Server running at http://localhost:${PORT}`);
});
