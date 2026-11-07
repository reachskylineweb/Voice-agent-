import sys
sys.stdout.reconfigure(encoding="utf-8")
import os
import io
import json
import zipfile
import urllib.request
import xml.etree.ElementTree as ET
from typing import Dict, Any, List, Optional
from fastapi import FastAPI, Request, UploadFile, File
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from backend.tts_engine import TamilVits13Engine

BASE_DIR = r"e:\Ai Voice agent"
FRONTEND_DIR = os.path.join(BASE_DIR, "ui_repo", "frontend")
DB_JSON_PATH = os.path.join(BASE_DIR, "backend", "db_state.json")

app = FastAPI(title="Reach AI Voice — Outbound Campaign & Workflow Server")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

print("Loading Approved Voice #3: AI4Bharat VITS-Rasa-13 Conversational (24kHz)...")
tts_engine = TamilVits13Engine()
print("✅ Tamil VITS-Rasa-13 Engine Ready!")

DEFAULT_CLIENTS_SEED = [
    {
        "id": "client-tata-motors",
        "name": "TATA Motors",
        "industry": "Automobile Dealership Enquiry Verification",
        "callerId": "+91 98400 11223",
        "voiceLanguage": "AI4Bharat VITS-Rasa-13 Conversational (24kHz Approved)",
        "openingGreeting": "வணக்கம் {lead_name} சார், இது ஒரு வெரிபிகேஷன் கால், டாட்டா மோட்டார்ஸ்ல இருந்து பேசுறேன்.",
        "questions": [
            {
                "id": "q1",
                "text": "நீங்க டாட்டா நெக்சான் வண்டி பத்தி விசாரிச்சிருந்தீங்க, நம்ம டீலர் உங்ககிட்ட பேசுனாங்களா?",
            },
            {
                "id": "q2",
                "text": "டீலர் சொன்ன வண்டி விவரம் மற்றும் விலை உங்களுக்கு திருப்தியா இருந்ததா சார்?",
            },
        ],
        "trainer": {
            "persona": "Polite, natural Tamil female customer support executive from TATA Motors.",
            "whatToSpeak": "- Greet the customer by name\n- Verify if the showroom dealer contacted them regarding their TATA vehicle enquiry\n- Ask if they are satisfied with the explanation",
            "forbiddenPhrases": "Do not quote unofficial discounts or ask for OTP",
            "whatNotToSpeak": "- Never promise unauthorized cash discounts\n- Never argue if the customer is busy",
            "positiveKeywords": "ஆமா, ஆமாம், பேசுனாங்க, பேசினாங்க, புரிஞ்சது, திருப்தி, ஓகே, சரி, aama, yes, spoke, satisfied, ok, interested",
            "negativeKeywords": "இல்ல, இல்லை, பேசல, கூப்பிடல, வேண்டாம், திருப்தி இல்ல, illa, no, not called, not interested, busy",
        },
        "leads": [
            {
                "id": "LEAD-TATA-1",
                "name": "ரமேஷ்",
                "phone": "+91 98765 43210",
                "enquiry": "TATA Nexon XZ+",
                "simMode": "qualified",
                "status": "PENDING",
                "answers": {},
                "callSummary": "",
                "calledAt": "",
            },
            {
                "id": "LEAD-TATA-2",
                "name": "சுரேஷ்",
                "phone": "+91 98765 12345",
                "enquiry": "TATA Punch Accomplished",
                "simMode": "not_qualified",
                "status": "PENDING",
                "answers": {},
                "callSummary": "",
                "calledAt": "",
            },
        ],
    },
    {
        "id": "client-healing-earth",
        "name": "Healing Earth",
        "industry": "Wellness & Holistic Healthcare Verification",
        "callerId": "+91 98400 44556",
        "voiceLanguage": "AI4Bharat VITS-Rasa-13 Conversational (24kHz Approved)",
        "openingGreeting": "வணக்கம் {lead_name} சார், இது ஒரு வெரிபிகேஷன் கால், ஹீலிங் எர்த்ல இருந்து பேசுறேன்.",
        "questions": [
            {
                "id": "q1",
                "text": "நீங்க எங்க சர்வீஸ் பத்தி விசாரிச்சிருந்தீங்க, நம்ம டீம் உங்ககிட்ட பேசுனாங்களா?",
            },
            {
                "id": "q2",
                "text": "இந்த வாரம் நேர்ல வந்து கன்சல்டேஷன் அப்பாயின்ட்மென்ட் புக் பண்ணிக்கலாமா சார்?",
            },
        ],
        "trainer": {
            "persona": "Warm, caring Tamil female wellness coordinator from Healing Earth.",
            "whatToSpeak": "- Greet the client warmly\n- Check if our wellness team explained the therapy package\n- Confirm consultation interest",
            "forbiddenPhrases": "Do not give medical prescriptions on the call",
            "whatNotToSpeak": "- Do not diagnose medical conditions over the phone",
            "positiveKeywords": "ஆமா, ஆமாம், பேசுனாங்க, வரேன், ஓகே, புக் பண்ணுங்க, aama, yes, spoke, ok, book",
            "negativeKeywords": "இல்ல, இல்லை, பேசல, வேண்டாம், அப்புறம், illa, no, not interested",
        },
        "leads": [
            {
                "id": "LEAD-HEAL-1",
                "name": "கார்த்திக்",
                "phone": "+91 98401 22334",
                "enquiry": "Ayurveda Wellness Package",
                "simMode": "qualified",
                "status": "PENDING",
                "answers": {},
                "callSummary": "",
                "calledAt": "",
            },
        ],
    },
]


def load_db() -> Dict[str, Any]:
    if os.path.exists(DB_JSON_PATH):
        try:
            with open(DB_JSON_PATH, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data.get("clients"), list) and len(data["clients"]) > 0:
                    return data
        except Exception:
            pass
    initial = {"clients": DEFAULT_CLIENTS_SEED, "groq_api_key": os.environ.get("GROQ_API_KEY", "")}
    save_db(initial)
    return initial


def save_db(data: Dict[str, Any]):
    os.makedirs(os.path.dirname(DB_JSON_PATH), exist_ok=True)
    with open(DB_JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


def parse_xlsx_bytes(file_bytes: bytes) -> List[List[str]]:
    """
    Pure-Python .xlsx Excel reader using zipfile + xml.etree.ElementTree (Zero external dependencies!).
    """
    rows_out = []
    with zipfile.ZipFile(io.BytesIO(file_bytes)) as zf:
        shared_strings = []
        if "xl/sharedStrings.xml" in zf.namelist():
            root_ss = ET.fromstring(zf.read("xl/sharedStrings.xml"))
            for si in root_ss.iter():
                if si.tag.endswith("}si"):
                    texts = [t.text or "" for t in si.iter() if t.tag.endswith("}t")]
                    shared_strings.append("".join(texts))

        sheet_files = sorted([n for n in zf.namelist() if n.startswith("xl/worksheets/sheet") and n.endswith(".xml")])
        if not sheet_files:
            return []
        root_sh = ET.fromstring(zf.read(sheet_files[0]))
        for row_el in root_sh.iter():
            if row_el.tag.endswith("}row"):
                row_vals = []
                for c_el in row_el:
                    if not c_el.tag.endswith("}c"):
                        continue
                    c_type = c_el.attrib.get("t", "")
                    val_str = ""
                    for child in c_el:
                        if child.tag.endswith("}v") and child.text is not None:
                            if c_type == "s":
                                idx = int(child.text)
                                val_str = shared_strings[idx] if idx < len(shared_strings) else ""
                            else:
                                val_str = child.text
                        elif child.tag.endswith("}is"):
                            val_str = "".join([t.text or "" for t in child.iter() if t.tag.endswith("}t")])
                    row_vals.append(val_str.strip())
                if any(row_vals):
                    rows_out.append(row_vals)
    return rows_out


@app.get("/api/clients")
async def get_clients():
    db = load_db()
    return {"clients": db["clients"]}


@app.post("/api/clients")
async def create_client(req: Request):
    body = await req.json()
    db = load_db()
    db["clients"].append(body)
    save_db(db)
    return {"ok": True, "client": body}


@app.put("/api/clients/{client_id}")
async def update_client(client_id: str, req: Request):
    body = await req.json()
    db = load_db()
    for i, c in enumerate(db["clients"]):
        if c.get("id") == client_id:
            db["clients"][i] = body
            save_db(db)
            return {"ok": True, "client": body}
    db["clients"].append(body)
    save_db(db)
    return {"ok": True, "client": body}


@app.delete("/api/clients/{client_id}")
async def delete_client(client_id: str):
    db = load_db()
    db["clients"] = [c for c in db["clients"] if c.get("id") != client_id]
    save_db(db)
    return {"ok": True}


@app.post("/api/clients/{client_id}/leads")
async def add_client_leads(client_id: str, req: Request):
    body = await req.json()
    new_leads = body.get("leads", [])
    db = load_db()
    for c in db["clients"]:
        if c.get("id") == client_id:
            c.setdefault("leads", []).extend(new_leads)
            save_db(db)
            return {"ok": True, "count": len(new_leads)}
    return {"ok": False}


@app.post("/api/clients/{client_id}/leads/{lead_id}/call")
async def save_call_result(client_id: str, lead_id: str, req: Request):
    lead_data = await req.json()
    db = load_db()
    for c in db["clients"]:
        if c.get("id") == client_id:
            leads = c.get("leads", [])
            for i, l in enumerate(leads):
                if l.get("id") == lead_id:
                    leads[i] = lead_data
                    save_db(db)
                    return {"ok": True}
            leads.append(lead_data)
            save_db(db)
            return {"ok": True}
    return {"ok": False}


@app.put("/api/clients/{client_id}/trainer")
async def save_trainer(client_id: str, req: Request):
    trainer_data = await req.json()
    db = load_db()
    for c in db["clients"]:
        if c.get("id") == client_id:
            c["trainer"] = trainer_data
            save_db(db)
            return {"ok": True}
    return {"ok": False}


@app.post("/api/parse-xlsx")
async def parse_xlsx_endpoint(file: UploadFile = File(...)):
    content = await file.read()
    rows = parse_xlsx_bytes(content)
    return {"rows": rows}


@app.post("/api/tts")
async def generate_tts_endpoint(req: Request):
    body = await req.json()
    text = str(body.get("text", "")).strip()
    if not text:
        return JSONResponse({"error": "Empty text"}, status_code=400)
    wav_path = tts_engine.synthesize(text, emotion_id=4, length_scale=1.08)
    return FileResponse(
        wav_path,
        media_type="audio/wav",
        filename=os.path.basename(wav_path),
        headers={"Cache-Control": "no-store, no-cache, must-revalidate, max-age=0"},
    )


@app.get("/api/tts")
async def get_tts_audio(text: str):
    wav_path = tts_engine.synthesize(text, emotion_id=4, length_scale=1.08)
    return FileResponse(
        wav_path,
        media_type="audio/wav",
        filename=os.path.basename(wav_path),
        headers={"Cache-Control": "no-store, no-cache, must-revalidate, max-age=0"},
    )


def get_prewarmed_template(intent: str, client_name: str = "ட்டாட்டா மோட்டார்ஸ்") -> str:
    templates = {
        "QUESTION_WHO": f"வணக்கம் சார், நான் {client_name} கஸ்டமர் சப்போர்ட்ல இருந்து பேசுறேன், உங்க என்கொயரி வெரிபிகேஷனுக்காக கால் பண்ணிருக்கேன்.",
        "QUESTION_WHY": f"சரிங்க சார், நீங்க நம்ம {client_name}ல விசாரிச்சிருந்தீங்க, அது சம்பந்தமா உங்க கருத்தை கேட்டு நோட் பண்ண தான் கால் பண்ணிருக்கேன்.",
        "REPEAT_REQUEST": "மன்னிக்கவும் சார், நான் திரும்பத் தெளிவா சொல்றேன்.",
        "BUSY_CALLBACK": "சரிங்க சார், டிஸ்டர்ப் பண்ணதுக்கு மன்னிக்கவும், நான் அப்புறமா உங்களுக்கு கால் பண்றேன், ரொம்ப நன்றி சார்!",
        "PRICE_QUERY": "சரிங்க சார், விலை மற்றும் ஆஃபர் விவரம் பத்தி நம்ம சீனியர் எக்ஸிகியூட்டிவ் உடனே உங்களுக்கு கால் பண்ணி தெளிவா சொல்லுவாங்க.",
        "CLARIFY": f"வணக்கம் சார், நான் {client_name} வெரிபிகேஷன் டீம்ல இருந்து பேசுறேன்.",
    }
    return templates.get(intent, "")


def call_groq_hybrid_llm(
    reply_text: str,
    client_name: str = "ட்டாட்டா மோட்டார்ஸ்",
    question_text: str = "",
    pos_kw=None,
    neg_kw=None,
) -> Optional[Dict[str, Any]]:
    db = load_db()
    api_key = (db.get("groq_api_key") or os.environ.get("GROQ_API_KEY") or "").strip()
    if not api_key:
        return None

    sys_prompt = (
        "You are a Hybrid NLU + Spoken Tamil Voice Agent Classifier for an outbound customer verification call.\n"
        f"Company: {client_name}\n"
        f"Current Question Asked by Agent: {question_text}\n"
        "Analyze the customer's Tamil/Tanglish/English reply and return ONLY valid JSON with these exact keys:\n"
        "{\n"
        '  "intent": "ANSWER_YES" | "ANSWER_NO" | "BUSY_CALLBACK" | "QUESTION_WHO" | "QUESTION_WHY" | "REPEAT_REQUEST" | "PRICE_QUERY" | "CUSTOM_QUESTION",\n'
        '  "action": "NEXT_QUESTION" | "REPEAT_CURRENT" | "END_CALL_BUSY",\n'
        '  "answer": "YES" | "NO" | "BUSY" | null,\n'
        '  "spokenReply": "Short colloquial spoken Tamil reply (8-12 words max, starting with சரிங்க சார், or வணக்கம் சார்,) ONLY if intent is CUSTOM_QUESTION; empty string otherwise",\n'
        '  "summary": "1-line English CRM summary of what the customer said"\n'
        "}\n"
        "Rules:\n"
        "- Never use formal literary Tamil. Always use natural spoken Tamil (பேசுறேன், சொல்றேன், உங்களுக்கு).\n"
        "- If customer says they are driving/busy/in a meeting -> intent=BUSY_CALLBACK, action=END_CALL_BUSY, answer=BUSY.\n"
        "- If customer asks who is calling -> intent=QUESTION_WHO, action=REPEAT_CURRENT, answer=null.\n"
        "- If customer asks why calling -> intent=QUESTION_WHY, action=REPEAT_CURRENT, answer=null.\n"
        "- If customer asks to repeat / didn't hear -> intent=REPEAT_REQUEST, action=REPEAT_CURRENT, answer=null.\n"
        "- If customer complains about high price or asks for discount -> intent=PRICE_QUERY, action=NEXT_QUESTION, answer=NO."
    )
    payload = {
        "model": "llama-3.3-70b-versatile",
        "messages": [
            {"role": "system", "content": sys_prompt},
            {"role": "user", "content": f"Customer said: \"{reply_text}\""},
        ],
        "temperature": 0.1,
        "max_tokens": 220,
        "response_format": {"type": "json_object"},
    }
    try:
        req = urllib.request.Request(
            "https://api.groq.com/openai/v1/chat/completions",
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
                "User-Agent": "ReachAIVoiceAgent/1.0",
            },
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=2.5) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            content = data["choices"][0]["message"]["content"]
            parsed = json.loads(content)
            intent = parsed.get("intent", "CLARIFY")
            # Use pre-warmed 0ms audio template for standard intents so voice is instant & 100% consistent!
            if intent in ("QUESTION_WHO", "QUESTION_WHY", "REPEAT_REQUEST", "BUSY_CALLBACK", "PRICE_QUERY"):
                parsed["spokenReply"] = get_prewarmed_template(intent, client_name)
            elif intent in ("ANSWER_YES", "ANSWER_NO"):
                parsed["spokenReply"] = ""
            print(f"[HYBRID-LLM] source=GROQ_LLAMA3 | reply=\"{reply_text}\" -> intent={intent} | action={parsed.get('action')}", flush=True)
            return parsed
    except Exception as e:
        print(f"[HYBRID-LLM] Groq fallback to local NLU ({e})", flush=True)
        return None


def analyze_tamil_intent(
    reply_text: str,
    client_name: str = "ட்டாட்டா மோட்டார்ஸ்",
    question_text: str = "",
    pos_kw=None,
    neg_kw=None,
):
    low = str(reply_text or "").strip().lower()
    pos_kw = pos_kw or []
    neg_kw = neg_kw or []

    # 1. WHO ARE YOU / IDENTITY QUESTION ("நீ யாரு", "யாரு பேசுறது", "எங்க இருந்து", "யார் நீங்க")
    who_words = [
        "நீ யாரு", "நீங்க யாரு", "யாரு நீ", "யாரு நீங்க", "யார் நீங்க", "யாரு பேசுற", "யார் பேசுற",
        "எங்க இருந்து", "எந்த கம்பெனி", "யார் கால்", "nee yaaru", "neenga yaaru", "yaaru", "who are you",
        "who is this", "which company", "enga irundhu", "yaru",
    ]
    if any(w in low for w in who_words):
        return {
            "intent": "QUESTION_WHO",
            "action": "REPEAT_CURRENT",
            "answer": None,
            "spokenReply": get_prewarmed_template("QUESTION_WHO", client_name),
            "summary": f"Customer asked who is calling ('{reply_text}') -> AI introduced itself and repeated question.",
            "engine": "HYBRID_FAST_TEMPLATE",
        }

    # 2. WHY CALLING / PURPOSE QUESTION ("எதுக்கு கால்", "என்ன விஷயம்", "ஏன் கூப்பிட்டீங்க")
    why_words = [
        "எதுக்கு", "எதுக்காக", "என்ன விஷயம்", "ஏன் கால்", "ஏன் கூப்பி", "என்ன வேணும்",
        "edhuku", "enna vishayam", "why call", "what for", "purpose",
    ]
    if any(w in low for w in why_words):
        return {
            "intent": "QUESTION_WHY",
            "action": "REPEAT_CURRENT",
            "answer": None,
            "spokenReply": get_prewarmed_template("QUESTION_WHY", client_name),
            "summary": f"Customer asked purpose of call ('{reply_text}') -> AI explained and repeated question.",
            "engine": "HYBRID_FAST_TEMPLATE",
        }

    # 3. REPEAT / DID NOT UNDERSTAND ("புரியல", "கேக்கல", "என்ன சொன்னீங்க", "திரும்ப சொல்லுங்க", "இன்னொரு வாட்டி")
    repeat_words = [
        "புரியல", "புரியவில்லை", "கேக்கல", "கேட்கல", "என்ன சொன்னீங்க", "என்னது", "திரும்ப சொல்லு",
        "இன்னொரு வாட்டி", "மறுபடியும் சொல்லு", "சத்தமா", "puriyala", "kekkala", "repeat", "pardon", "enna sonninga",
    ]
    if any(w in low for w in repeat_words):
        return {
            "intent": "REPEAT_REQUEST",
            "action": "REPEAT_CURRENT",
            "answer": None,
            "spokenReply": get_prewarmed_template("REPEAT_REQUEST", client_name),
            "summary": f"Customer asked to repeat ('{reply_text}').",
            "engine": "HYBRID_FAST_TEMPLATE",
        }

    # 4. BUSY / CALL LATER ("பிஸி", "வேலையா இருக்கேன்", "அப்புறம் கூப்பிடுங்க", "வெளியில இருக்கேன்", "மீட்டிங்")
    busy_words = [
        "பிஸி", "பிசி", "வேலையா இருக்கேன்", "அப்புறம் கூப்பி", "அப்புறமா கூப்பி", "நாளைக்கு கூப்பி",
        "மீட்டிங்", "வண்டியில", "டிரைவிங்", "வெளியில இருக்கேன்", "busy", "call later", "in a meeting", "driving", "appuram",
    ]
    if any(w in low for w in busy_words):
        return {
            "intent": "BUSY_CALLBACK",
            "action": "END_CALL_BUSY",
            "answer": "BUSY",
            "spokenReply": get_prewarmed_template("BUSY_CALLBACK", client_name),
            "summary": f"Customer is busy ('{reply_text}') -> Requested callback later.",
            "engine": "HYBRID_FAST_TEMPLATE",
        }

    # 5. PRICE / DISCOUNT / EMI QUERY ("விலை அதிகமா", "ரேட் ஜாஸ்தி", "டிஸ்கவுண்ட்", "ஆஃபர்", "இஎம்ஐ")
    price_words = [
        "விலை அதிக", "ரேட் அதிக", "ரேட் ஜாஸ்தி", "விலை ஜாஸ்தி", "டிஸ்கவுண்ட்", "ஆஃபர்", "கம்மி பண்ண",
        "price high", "too costly", "discount", "offer",
    ]
    if any(w in low for w in price_words):
        return {
            "intent": "PRICE_QUERY",
            "action": "NEXT_QUESTION",
            "answer": "NO",
            "spokenReply": get_prewarmed_template("PRICE_QUERY", client_name),
            "summary": f"Customer raised price/discount concern ('{reply_text}') -> Escalated to senior executive.",
            "engine": "HYBRID_FAST_TEMPLATE",
        }

    # If the utterance is long/complex (> 6 words), try Tier-2 Groq Hybrid LLM first if API key is configured
    if len(low.split()) > 6:
        llm_res = call_groq_hybrid_llm(reply_text, client_name, question_text, pos_kw, neg_kw)
        if llm_res:
            llm_res["engine"] = "HYBRID_GROQ_LLM"
            return llm_res

    # 6. NEGATIVE ("இல்ல", "இல்லை", "பேசல", "கூப்பிடல", "வேண்டாம்", "திருப்தி இல்ல", "வரல")
    default_neg = [
        "இல்ல", "இல்லை", "பேசல", "கூப்பிடல", "வேண்டாம்", "வேணாம்", "திருப்தி இல்ல", "பிடிக்கல",
        "வரல", "பண்ணல", "illa", "no", "not", "never", "wrong", "venam", "pesala", "koopidala",
    ]
    if any(nk in low for nk in (neg_kw + default_neg) if nk):
        return {
            "intent": "ANSWER_NO",
            "action": "NEXT_QUESTION",
            "answer": "NO",
            "spokenReply": "",
            "summary": f"Customer replied NO ('{reply_text}').",
            "engine": "HYBRID_FAST_NLU",
        }

    # 7. POSITIVE ("ஆமா", "ஆமாம்", "பேசுனாங்க", "சொல்லிட்டாங்க", "திருப்தி", "புரிஞ்சது", "ஓகே", "சரி", "நல்லா")
    default_pos = [
        "ஆமா", "ஆமாம்", "பேசுனாங்க", "பேசினாங்க", "சொல்லிட்டாங்க", "சொன்னாங்க", "கூப்பிட்டாங்க",
        "புரிஞ்சது", "திருப்தி", "ஓகே", "சரி", "வரேன்", "நல்லா", "புக் பண்ணுங்க", "சொல்லுங்க",
        "aama", "yes", "spoke", "called", "ok", "okay", "sure", "satisfied", "good", "fine", "sari", "pesunanga",
    ]
    if any(pk in low for pk in (pos_kw + default_pos) if pk):
        return {
            "intent": "ANSWER_YES",
            "action": "NEXT_QUESTION",
            "answer": "YES",
            "spokenReply": "",
            "summary": f"Customer replied YES ('{reply_text}').",
            "engine": "HYBRID_FAST_NLU",
        }

    # 8. Unclear / Out-of-box question -> Try Tier-2 Groq Hybrid LLM, else polite pre-warmed clarify template
    llm_res = call_groq_hybrid_llm(reply_text, client_name, question_text, pos_kw, neg_kw)
    if llm_res:
        llm_res["engine"] = "HYBRID_GROQ_LLM"
        return llm_res

    return {
        "intent": "CLARIFY",
        "action": "REPEAT_CURRENT",
        "answer": None,
        "spokenReply": get_prewarmed_template("CLARIFY", client_name),
        "summary": f"Customer said '{reply_text}' -> Clarified and repeated question.",
        "engine": "HYBRID_FAST_TEMPLATE",
    }


@app.post("/api/llm/classify")
async def classify_customer_reply(req: Request):
    """
    Hybrid Tamil Conversational NLU + Groq Llama-3.3-70B Classifier:
    - Tier 1 (0ms Fast Path): Instant pre-warmed audio templates for WHO, WHY, REPEAT, BUSY, PRICE, YES, NO.
    - Tier 2 (Smart LLM Path): Groq Llama-3.3-70B for complex/unexpected Tamil & Tanglish customer replies.
    """
    body = await req.json()
    reply_text = str(body.get("replyText", "")).strip()
    client_name = str(body.get("clientName", "ட்டாட்டா மோட்டார்ஸ்")).strip()
    question_text = str(body.get("questionText", "")).strip()
    pos_kw = [k.strip().lower() for k in str(body.get("positiveKeywords", "")).split(",") if k.strip()]
    neg_kw = [k.strip().lower() for k in str(body.get("negativeKeywords", "")).split(",") if k.strip()]

    res = analyze_tamil_intent(
        reply_text,
        client_name=client_name,
        question_text=question_text,
        pos_kw=pos_kw,
        neg_kw=neg_kw,
    )
    return res


@app.post("/api/settings/llm")
async def save_llm_settings(req: Request):
    body = await req.json()
    db = load_db()
    if "groq_api_key" in body:
        db["groq_api_key"] = str(body["groq_api_key"]).strip()
        save_db(db)
    return {"ok": True, "hasKey": bool(db.get("groq_api_key"))}


# ==================== TWILIO LIVE OUTBOUND TELEPHONY BRIDGE ====================
import re
import time
import threading
import subprocess

TUNNEL_PROC = None
TUNNEL_URL = ""
ACTIVE_CALLS: Dict[str, Dict[str, Any]] = {}


def _start_new_tunnel_process(port: int = 8000) -> str:
    global TUNNEL_PROC, TUNNEL_URL
    try:
        if TUNNEL_PROC and TUNNEL_PROC.poll() is None:
            try:
                TUNNEL_PROC.kill()
            except Exception:
                pass
    except Exception:
        pass

    TUNNEL_URL = ""
    proc = subprocess.Popen(
        [
            "ssh",
            "-o", "StrictHostKeyChecking=no",
            "-o", "ServerAliveInterval=20",
            "-o", "ConnectTimeout=8",
            "-R", f"80:127.0.0.1:{port}",
            "nokey@localhost.run",
        ],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        stdin=subprocess.PIPE,
        text=True,
        encoding="utf-8",
        errors="ignore",
    )
    TUNNEL_PROC = proc
    found_event = threading.Event()

    def _drain_stdout():
        global TUNNEL_URL
        try:
            for line in iter(proc.stdout.readline, ""):
                if not line:
                    break
                m = re.search(r"(https://[a-zA-Z0-9.-]+\.lhr\.life)", line)
                if m and not TUNNEL_URL:
                    TUNNEL_URL = m.group(1)
                    print(f"✅ Public Webhook Tunnel Ready: {TUNNEL_URL}", flush=True)
                    found_event.set()
        except Exception:
            pass

    threading.Thread(target=_drain_stdout, daemon=True).start()
    found_event.wait(timeout=12.0)
    return TUNNEL_URL


def ensure_public_tunnel(port: int = 8000) -> str:
    global TUNNEL_PROC, TUNNEL_URL
    if TUNNEL_URL and TUNNEL_PROC and TUNNEL_PROC.poll() is None:
        return TUNNEL_URL
    return _start_new_tunnel_process(port)


# Start tunnel in background thread on server boot
threading.Thread(target=_start_new_tunnel_process, args=(8000,), daemon=True).start()


@app.get("/audio_cache/{fname}")
async def serve_cached_wav(fname: str):
    safe_name = os.path.basename(fname)
    wav_path = os.path.join(BASE_DIR, "backend", "audio_cache", safe_name)
    if not os.path.exists(wav_path):
        return JSONResponse({"error": "Audio file not found"}, status_code=404)
    return FileResponse(
        wav_path,
        media_type="audio/wav",
        filename=safe_name,
        headers={"Cache-Control": "no-store, no-cache, must-revalidate, max-age=0"},
    )


def tts_to_public_wav_url(public_url: str, text: str) -> str:
    wav_path = tts_engine.synthesize(text, emotion_id=4, length_scale=1.08)
    fname = os.path.basename(wav_path)
    return f"{public_url}/audio_cache/{fname}"


@app.get("/api/twilio/config")
async def get_twilio_config():
    db = load_db()
    cfg = db.get("twilio_config", {})
    return {
        "accountSid": cfg.get("accountSid", ""),
        "fromNumber": cfg.get("fromNumber", "+17372508034"),
        "toNumber": cfg.get("toNumber", "+918610057080"),
        "publicUrl": TUNNEL_URL or cfg.get("publicUrl", ""),
        "hasToken": True,
    }


@app.post("/api/twilio/config")
async def save_twilio_config(req: Request):
    body = await req.json()
    db = load_db()
    cfg = db.get("twilio_config", {})
    for k in ["accountSid", "authToken", "fromNumber", "toNumber", "publicUrl"]:
        if k in body and str(body[k]).strip():
            cfg[k] = str(body[k]).strip()
    db["twilio_config"] = cfg
    save_db(db)
    return {"ok": True}


@app.post("/api/twilio/call")
async def trigger_twilio_outbound_call(req: Request):
    """
    Initiates a real outbound phone call via Twilio REST API.
    Plays our Approved AI4Bharat VITS-Rasa-13 (24kHz) Tamil audio & gathers Tamil speech ('ta-IN').
    """
    import urllib.parse
    import base64

    body = await req.json()
    client_id = str(body.get("clientId", "client-tata-motors")).strip()
    lead_id = str(body.get("leadId", "LEAD-TATA-1")).strip()
    to_phone = str(body.get("toPhone", "")).strip()
    if to_phone and not to_phone.startswith("+"):
        to_phone = "+91" + re.sub(r"\D", "", to_phone)[-10:]

    db = load_db()
    cfg = db.get("twilio_config", {})
    account_sid = str(body.get("accountSid") or cfg.get("accountSid") or "").strip()
    auth_token = str(body.get("authToken") or cfg.get("authToken") or "").strip()
    from_number = str(body.get("fromNumber") or cfg.get("fromNumber") or "+17372508034").strip()
    public_url = ensure_public_tunnel(8000) or str(cfg.get("publicUrl", "")).strip().rstrip("/")

    if not public_url:
        return JSONResponse({"ok": False, "error": "Public HTTPS tunnel is still connecting, please retry in 3 seconds."}, status_code=500)

    webhook_url = f"{public_url}/api/twilio/step/{urllib.parse.quote(client_id)}/{urllib.parse.quote(lead_id)}/0"
    twilio_api_url = f"https://api.twilio.com/2010-04-01/Accounts/{account_sid}/Calls.json"
    # IMPORTANT: Only send To, From, Url (do NOT send Method, which Twilio trial sandbox blocks)
    form_data = urllib.parse.urlencode({
        "To": to_phone,
        "From": from_number,
        "Url": webhook_url,
    }).encode("utf-8")

    b64_auth = base64.b64encode(f"{account_sid}:{auth_token}".encode("utf-8")).decode("ascii")
    http_req = urllib.request.Request(
        twilio_api_url,
        data=form_data,
        headers={
            "Authorization": f"Basic {b64_auth}",
            "Content-Type": "application/x-www-form-urlencoded",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(http_req, timeout=15) as resp:
            resp_data = json.loads(resp.read().decode("utf-8"))
            call_sid = resp_data.get("sid", "")
            ACTIVE_CALLS[call_sid] = {
                "callSid": call_sid,
                "clientId": client_id,
                "leadId": lead_id,
                "toPhone": to_phone,
                "status": "RINGING",
                "logs": [f"📞 Dialing {to_phone} via Twilio ({from_number})..."],
                "answers": {},
                "done": False,
                "finalStatus": "PENDING",
            }
            return {"ok": True, "callSid": call_sid, "status": resp_data.get("status"), "publicUrl": public_url}
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8", errors="ignore")
        return JSONResponse({"ok": False, "error": f"Twilio Error ({e.code}): {err_body}"}, status_code=400)
    except Exception as e:
        return JSONResponse({"ok": False, "error": str(e)}, status_code=500)


@app.get("/api/twilio/call-status/{call_sid}")
async def get_twilio_call_status(call_sid: str):
    info = ACTIVE_CALLS.get(call_sid)
    if not info:
        return {"ok": False}
    return {"ok": True, **info}


@app.api_route("/api/twilio/step/{client_id}/{lead_id}/{step}", methods=["GET", "POST"])
async def twilio_step_webhook(req: Request, client_id: str, lead_id: str, step: int):
    from fastapi.responses import Response
    import urllib.parse

    raw_body = (await req.body()).decode("utf-8", errors="ignore")
    params = urllib.parse.parse_qs(raw_body)
    speech_result = str(params.get("SpeechResult", [""])[0]).strip()
    digits = str(params.get("Digits", [""])[0]).strip()
    call_sid = str(params.get("CallSid", [""])[0]).strip()

    db = load_db()
    public_url = TUNNEL_URL or db.get("twilio_config", {}).get("publicUrl", "").rstrip("/")
    if not public_url:
        host = req.headers.get("x-forwarded-host") or req.headers.get("host") or "localhost:8000"
        public_url = f"https://{host}"

    client = next((c for c in db["clients"] if c.get("id") == client_id), db["clients"][0])
    leads = client.get("leads", [])
    lead = next((l for l in leads if l.get("id") == lead_id), {"id": lead_id, "name": "ரமேஷ்", "answers": {}})
    questions = client.get("questions", [])
    trainer = client.get("trainer", {})
    call_track = ACTIVE_CALLS.get(call_sid, {"logs": [], "answers": {}})

    if step == 0:
        call_track.setdefault("logs", []).append("✅ Call Answered! Speaking Tamil Greeting + Q1...")
        call_track["status"] = "IN_PROGRESS"

    if step > 0 and (speech_result or digits):
        prev_q_idx = step - 1
        if prev_q_idx < len(questions):
            prev_q = questions[prev_q_idx]
            reply_raw = speech_result if speech_result else ("ஆமா" if digits == "1" else "இல்ல")
            pos_kw = [k.strip().lower() for k in str(trainer.get("positiveKeywords", "")).split(",") if k.strip()]
            neg_kw = [k.strip().lower() for k in str(trainer.get("negativeKeywords", "")).split(",") if k.strip()]
            nlu = analyze_tamil_intent(
                reply_raw,
                client_name=client.get("name", "ட்டாட்டா மோட்டார்ஸ்"),
                question_text=prev_q.get("text", ""),
                pos_kw=pos_kw,
                neg_kw=neg_kw,
            )

            if nlu["action"] == "END_CALL_BUSY":
                lead["status"] = "NOT_ATTENDED"
                lead["callSummary"] = nlu.get("summary") or f"Customer busy: '{reply_raw}'"
                call_track["done"] = True
                call_track["finalStatus"] = "NOT_ATTENDED"
                call_track.setdefault("logs", []).append(f"⏳ Customer Busy (\"{reply_raw}\") -> Ending call politely.")
                save_db(db)
                busy_reply = nlu.get("spokenReply") or get_prewarmed_template("BUSY_CALLBACK", client.get("name", "ட்டாட்டா மோட்டார்ஸ்"))
                audio_url = tts_to_public_wav_url(public_url, busy_reply)
                twiml = f'<?xml version="1.0" encoding="UTF-8"?><Response><Play>{audio_url}</Play><Hangup/></Response>'
                return Response(content=twiml, media_type="application/xml")

            if nlu["action"] == "REPEAT_CURRENT":
                # Customer asked WHO, WHY, REPEAT, or a custom question -> Speak the reply and re-ask the same question!
                call_track.setdefault("logs", []).append(f"🗣️ Customer Asked (\"{reply_raw}\") ➡️ {nlu['intent']} (Answering & Re-asking Q{prev_q_idx+1})")
                retry_url = f"{public_url}/api/twilio/step/{urllib.parse.quote(client_id)}/{urllib.parse.quote(lead_id)}/{step}"
                ans_url = tts_to_public_wav_url(public_url, nlu.get("spokenReply") or get_prewarmed_template("REPEAT_REQUEST"))
                q_url = tts_to_public_wav_url(public_url, prev_q["text"])
                twiml = (
                    '<?xml version="1.0" encoding="UTF-8"?>'
                    "<Response>"
                    f'<Gather input="speech" language="ta-IN" speechTimeout="auto" timeout="6" action="{retry_url}" method="POST">'
                    f"<Play>{ans_url}</Play>"
                    f"<Play>{q_url}</Play>"
                    "</Gather>"
                    f'<Redirect method="POST">{retry_url}</Redirect>'
                    "</Response>"
                )
                return Response(content=twiml, media_type="application/xml")

            ans_label = "NO" if (digits == "2" or nlu.get("answer") == "NO") else "YES"
            lead.setdefault("answers", {})[prev_q["id"]] = ans_label
            call_track.setdefault("answers", {})[prev_q["id"]] = ans_label
            call_track.setdefault("logs", []).append(f"🗣️ Customer Replied (Q{prev_q_idx+1}): \"{reply_raw}\" ➡️ {ans_label} ({nlu.get('engine', 'HYBRID')})")
            save_db(db)

            if prev_q_idx == 0 and ans_label == "NO":
                lead["status"] = "NOT_QUALIFIED"
                lead["callSummary"] = nlu.get("summary") or f"Customer replied '{reply_raw}' -> NOT_QUALIFIED"
                call_track["done"] = True
                call_track["finalStatus"] = "NOT_QUALIFIED"
                call_track.setdefault("logs", []).append("❌ Lead Marked NOT_QUALIFIED. Speaking Closing...")
                save_db(db)
                closing_no = nlu.get("spokenReply") or "மன்னிக்கவும் சார், நான் உடனே நம்ம டீம் கிட்ட சொல்லி உங்களை கூப்பிட சொல்றேன். நன்றி வணக்கம்."
                audio_url = tts_to_public_wav_url(public_url, closing_no)
                twiml = f'<?xml version="1.0" encoding="UTF-8"?><Response><Play>{audio_url}</Play><Hangup/></Response>'
                return Response(content=twiml, media_type="application/xml")

    if step < len(questions):
        q_text = questions[step]["text"]
        next_url = f"{public_url}/api/twilio/step/{urllib.parse.quote(client_id)}/{urllib.parse.quote(lead_id)}/{step + 1}"
        if step == 0:
            greet = client.get("openingGreeting", "வணக்கம் {lead_name} சார்.").replace("{lead_name}", lead.get("name", "சார்"))
            g_url = tts_to_public_wav_url(public_url, greet)
            q_url = tts_to_public_wav_url(public_url, q_text)
            # Both Greeting & Q1 inside <Gather input="speech"> so customer interruption stops AI immediately even in Greeting!
            twiml = (
                '<?xml version="1.0" encoding="UTF-8"?>'
                "<Response>"
                '<Pause length="1"/>'
                f'<Gather input="speech" language="ta-IN" speechTimeout="auto" timeout="6" action="{next_url}" method="POST">'
                f"<Play>{g_url}</Play>"
                f"<Play>{q_url}</Play>"
                "</Gather>"
                f'<Redirect method="POST">{next_url}</Redirect>'
                "</Response>"
            )
        else:
            call_track.setdefault("logs", []).append(f"🤖 Asking Q{step+1}: {q_text}")
            q_url = tts_to_public_wav_url(public_url, q_text)
            twiml = (
                '<?xml version="1.0" encoding="UTF-8"?>'
                "<Response>"
                f'<Gather input="speech" language="ta-IN" speechTimeout="auto" timeout="6" action="{next_url}" method="POST">'
                f"<Play>{q_url}</Play>"
                "</Gather>"
                f'<Redirect method="POST">{next_url}</Redirect>'
                "</Response>"
            )
        return Response(content=twiml, media_type="application/xml")

    ans_values = list(lead.get("answers", {}).values())
    all_yes = len(ans_values) > 0 and all(str(v).startswith("YES") for v in ans_values)
    final_st = "QUALIFIED" if all_yes else "NOT_QUALIFIED"
    lead["status"] = final_st
    lead["callSummary"] = f"Live Phone Call ({final_st}): " + ", ".join(f"{k}={v}" for k, v in lead.get("answers", {}).items())
    call_track["done"] = True
    call_track["finalStatus"] = final_st
    call_track.setdefault("logs", []).append(f"🎉 Call Completed! Final Status: {final_st}")
    save_db(db)

    closing_yes = "ரொம்ப நன்றி சார், உங்க பதிலை நாங்க நோட் பண்ணிக்கிட்டோம். நல்ல நாளா அமையட்டும், வணக்கம்."
    audio_url = tts_to_public_wav_url(public_url, closing_yes)
    twiml = f'<?xml version="1.0" encoding="UTF-8"?><Response><Play>{audio_url}</Play><Hangup/></Response>'
    return Response(content=twiml, media_type="application/xml")


# Serve Frontend UI directly at root '/'
app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")
