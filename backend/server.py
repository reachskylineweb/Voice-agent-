import sys
sys.stdout.reconfigure(encoding="utf-8")
import os
import io
import re
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
    play_on_server = bool(body.get("playOnServer", False))
    if not text:
        return JSONResponse({"error": "Empty text"}, status_code=400)
    wav_path = tts_engine.synthesize(text, emotion_id=4, length_scale=1.08)
    if play_on_server:
        try:
            import winsound
            import ctypes
            import winreg
            try:
                with winreg.CreateKey(winreg.HKEY_CURRENT_USER, r"Software\Microsoft\Multimedia\Audio") as ka:
                    winreg.SetValueEx(ka, "UserDuckingPreference", 0, winreg.REG_DWORD, 3)
            except Exception:
                pass
            ctypes.windll.winmm.waveOutSetVolume(-1, 0xFFFFFFFF)
            winsound.PlaySound(None, winsound.SND_PURGE)
            winsound.PlaySound(wav_path, winsound.SND_FILENAME | winsound.SND_ASYNC | winsound.SND_NODEFAULT)
            print(f"[WIN-AUDIO] 🔊 Playing TTS directly on Windows Speaker (100% Vol): {os.path.basename(wav_path)}", flush=True)
        except Exception as e:
            print(f"[WIN-AUDIO] PlaySound error: {e}", flush=True)
    return FileResponse(
        wav_path,
        media_type="audio/wav",
        filename=os.path.basename(wav_path),
        headers={"Cache-Control": "no-store, no-cache, must-revalidate, max-age=0"},
    )


@app.post("/api/audio/stop")
async def stop_windows_audio_playback():
    try:
        import winsound
        winsound.PlaySound(None, winsound.SND_PURGE)
    except Exception:
        pass
    return {"ok": True}


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
        "OUT_OF_SCOPE_BOUNDARY": "மன்னிக்கவும் சார், இது ஒரு வெரிபிகேஷன் கால் தான், உங்க என்கொயரி பத்தி வெரிஃபை பண்ண மட்டும் தான் நான் கால் பண்ணிருக்கேன்.",
        "DETAIL_BOUNDARY": "சரிங்க சார், இது ஒரு வெரிபிகேஷன் கால் தான், இந்த விவரம் பத்தி நம்ம டீலர் உங்களுக்கு கால் பண்ணி தெளிவா சொல்லுவாங்க.",
        "REPEAT_REQUEST": "மன்னிக்கவும் சார், நான் திரும்பத் தெளிவா சொல்றேன்.",
        "BUSY_CALLBACK": "சரிங்க சார், டிஸ்டர்ப் பண்ணதுக்கு மன்னிக்கவும், நான் அப்புறமா உங்களுக்கு கால் பண்றேன், ரொம்ப நன்றி சார்!",
        "PRICE_QUERY": "சரிங்க சார், விலை மற்றும் ஆஃபர் விவரம் பத்தி நம்ம சீனியர் எக்ஸிகியூட்டிவ் உடனே உங்களுக்கு கால் பண்ணி தெளிவா சொல்லுவாங்க.",
        "CLARIFY": f"வணக்கம் சார், நான் {client_name} வெரிபிகேஷன் டீம்ல இருந்து பேசுறேன்.",
    }
    return templates.get(intent, templates["OUT_OF_SCOPE_BOUNDARY"])


GROQ_ACTIVE_MODEL = ""


def _resolve_groq_model(api_key: str) -> str:
    global GROQ_ACTIVE_MODEL
    if GROQ_ACTIVE_MODEL:
        return GROQ_ACTIVE_MODEL
    try:
        req = urllib.request.Request(
            "https://api.groq.com/openai/v1/models",
            headers={
                "Authorization": f"Bearer {api_key}",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/131.0.0.0",
            },
            method="GET",
        )
        with urllib.request.urlopen(req, timeout=2.5) as resp:
            models_data = json.loads(resp.read().decode("utf-8"))
            avail = [m.get("id", "") for m in models_data.get("data", []) if m.get("id")]
            # Prefer ultra-low-latency models (200ms-350ms) first!
            preferred = [
                "llama-3.1-8b-instant",
                "llama-3.3-70b-versatile",
                "meta-llama/llama-4-scout-17b-16e-instruct",
                "openai/gpt-oss-20b",
                "gemma2-9b-it",
                "openai/gpt-oss-120b",
            ]
            for p in preferred:
                if p in avail:
                    GROQ_ACTIVE_MODEL = p
                    return GROQ_ACTIVE_MODEL
            for kw in ("8b-instant", "20b", "llama-3", "llama-4", "gpt-oss", "gemma", "qwen"):
                for m_id in avail:
                    low_m = m_id.lower()
                    if kw in low_m and "guard" not in low_m and "whisper" not in low_m and "tts" not in low_m:
                        GROQ_ACTIVE_MODEL = m_id
                        return GROQ_ACTIVE_MODEL
    except Exception as e:
        print(f"[HYBRID-LLM] Model list check notice: {e}", flush=True)
    return "openai/gpt-oss-20b"


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

    model_id = _resolve_groq_model(api_key)
    t0 = time.perf_counter()
    sys_prompt = (
        "You are a fast, strict Intent Classifier for an Outbound Tamil Verification Call.\n"
        f"Company: {client_name}\n"
        f"Current Verification Question: {question_text}\n\n"
        "Classify the customer's Tamil/Tanglish speech into ONE of these exact intents and return ONLY valid JSON:\n"
        "{\n"
        '  "intent": "ANSWER_YES" | "ANSWER_NO" | "QUESTION_WHO" | "QUESTION_WHY" | "REPEAT_REQUEST" | "BUSY_CALLBACK" | "PRICE_QUERY" | "DETAIL_BOUNDARY" | "OUT_OF_SCOPE_BOUNDARY",\n'
        '  "action": "NEXT_QUESTION" | "REPEAT_CURRENT" | "END_CALL_BUSY",\n'
        '  "answer": "YES" | "NO" | "BUSY" | null\n'
        "}\n"
        "STRICT BOUNDARY RULES:\n"
        "- Customer agrees / says dealer spoke / satisfied -> intent=ANSWER_YES, action=NEXT_QUESTION, answer=YES\n"
        "- Customer disagrees / says dealer did not call / not satisfied / won't work out (செட் ஆகாது, வேண்டாம்) -> intent=ANSWER_NO, action=NEXT_QUESTION, answer=NO\n"
        "- Customer asks who is calling -> intent=QUESTION_WHO, action=REPEAT_CURRENT, answer=null\n"
        "- Customer asks why calling / purpose -> intent=QUESTION_WHY, action=REPEAT_CURRENT, answer=null\n"
        "- Customer asks to repeat / didn't hear -> intent=REPEAT_REQUEST, action=REPEAT_CURRENT, answer=null\n"
        "- Customer is busy / driving / call later -> intent=BUSY_CALLBACK, action=END_CALL_BUSY, answer=BUSY\n"
        "- Customer complains about price / asks discount -> intent=PRICE_QUERY, action=NEXT_QUESTION, answer=NO\n"
        "- Customer asks about showroom location, mileage, specs, service details -> intent=DETAIL_BOUNDARY, action=REPEAT_CURRENT, answer=null\n"
        "- Customer asks ANY personal, casual, off-topic, unwanted, or inappropriate question (e.g. சாப்டியா, என்ன பண்ற, கல்யாணம் ஆயிடுச்சா, etc.) -> intent=OUT_OF_SCOPE_BOUNDARY, action=REPEAT_CURRENT, answer=null"
    )
    user_msg = f"Customer said: \"{reply_text}\""
    if "qwen" in model_id.lower():
        user_msg += " /no_think"
    payload = {
        "model": model_id,
        "messages": [
            {"role": "system", "content": sys_prompt},
            {"role": "user", "content": user_msg},
        ],
        "temperature": 0.0,
        "max_tokens": 350,
    }
    if "gpt-oss" in model_id.lower():
        payload["reasoning_effort"] = "low"
    try:
        req = urllib.request.Request(
            "https://api.groq.com/openai/v1/chat/completions",
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/131.0.0.0",
            },
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=1.8) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            content = data["choices"][0]["message"]["content"].strip()
            content_clean = re.sub(r"<think>.*?</think>", "", content, flags=re.DOTALL).strip()
            m_json = re.search(r"\{.*\}", content_clean, re.DOTALL)
            parsed = json.loads(m_json.group(0) if m_json else content_clean)
            intent = parsed.get("intent", "OUT_OF_SCOPE_BOUNDARY")
            # STRICT TEMPLATE LOCK: Never allow LLM to invent random free-form Tamil! Always use locked pre-warmed template (0ms TTS cache!)
            if intent in ("ANSWER_YES", "ANSWER_NO"):
                parsed["spokenReply"] = ""
                parsed["action"] = "NEXT_QUESTION"
                parsed["answer"] = "NO" if intent == "ANSWER_NO" else "YES"
            elif intent == "BUSY_CALLBACK":
                parsed["spokenReply"] = get_prewarmed_template("BUSY_CALLBACK", client_name)
                parsed["action"] = "END_CALL_BUSY"
                parsed["answer"] = "BUSY"
            elif intent == "PRICE_QUERY":
                parsed["spokenReply"] = get_prewarmed_template("PRICE_QUERY", client_name)
                parsed["action"] = "NEXT_QUESTION"
                parsed["answer"] = "NO"
            else:
                parsed["spokenReply"] = get_prewarmed_template(intent, client_name)
                parsed["action"] = "REPEAT_CURRENT"
                parsed["answer"] = None
            parsed["summary"] = f"Customer said '{reply_text}' -> Classified as {intent}."
            elapsed_ms = (time.perf_counter() - t0) * 1000.0
            print(f"[HYBRID-LLM] source=GROQ ({model_id}, {elapsed_ms:.0f}ms) | reply=\"{reply_text}\" -> intent={intent} | action={parsed.get('action')} | spoken=\"{parsed.get('spokenReply', '')}\"", flush=True)
            return parsed
    except urllib.error.HTTPError as e:
        err_txt = e.read().decode("utf-8", errors="ignore")
        print(f"[HYBRID-LLM] Groq HTTP {e.code} ({err_txt[:180]}) -> fallback to local NLU", flush=True)
        return None
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

    # TIER-1 (0ms INSTANT TEMPLATE PATH):
    # 1. UNWANTED / PERSONAL / OFF-TOPIC / WRONG QUESTIONS -> Strict Verification Call Boundary!
    unwanted_words = [
        "சாப்டியா", "சாப்பிட்டியா", "சாப்பிட்டீங்களா", "கல்யாணம்", "வயசு", "லவ்", "பாட்டு", "ஜோக்",
        "கதை", "படம்", "சினிமா", "அரசியல்", "சாப்பாடு", "டீ", "காபி", "தூக்கம்", "வீடு எங்க",
        "உன் பேர்", "உங்க பேர்", "நம்பர் குடு", "வாட்ஸ்அப்", "சும்மா", "விளையாடு", "லூசு", "பயபுள்ள",
        "saptiya", "saaptiya", "kalyanam", "joke", "song", "love",
    ]
    if any(uw in low for uw in unwanted_words):
        return {
            "intent": "OUT_OF_SCOPE_BOUNDARY",
            "action": "REPEAT_CURRENT",
            "answer": None,
            "spokenReply": get_prewarmed_template("OUT_OF_SCOPE_BOUNDARY", client_name),
            "summary": f"Customer asked off-topic question ('{reply_text}') -> Enforced verification call boundary.",
            "engine": "HYBRID_FAST_TEMPLATE",
        }

    # 1.5. INITIAL PHONE PICKUP GREETING ("ஹலோ", "hello", "சொல்லுங்க", "யெஸ்") -> Politely repeat current question without apology!
    pickup_words = ["ஹலோ", "ஹलो", "hello", "halo", "சொல்லுங்க", "sollunga"]
    if low in pickup_words:
        return {
            "intent": "PICKUP_HELLO",
            "action": "REPEAT_CURRENT",
            "answer": None,
            "spokenReply": "",
            "summary": f"Customer answered phone with '{reply_text}' -> Re-playing question.",
            "engine": "HYBRID_FAST_TEMPLATE",
        }

    # 2. WHO ARE YOU / IDENTITY QUESTION ("நீ யாரு", "யாரு பேசுறது", "எங்க இருந்து", "யார் நீங்க")
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

    # 3. WHY CALLING / PURPOSE QUESTION ("எதுக்கு கால்", "என்ன விஷயம்", "ஏன் கூப்பிட்டீங்க")
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

    # 4. REPEAT / DID NOT UNDERSTAND ("புரியல", "கேக்கல", "என்ன சொன்னீங்க", "திரும்ப சொல்லுங்க", "இன்னொரு வாட்டி")
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

    # 5. BUSY / CALL LATER ("பிஸி", "வேலையா இருக்கேன்", "அப்புறம் கூப்பிடுங்க", "வெளியில இருக்கேன்", "மீட்டிங்")
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

    # 6. PRICE / DISCOUNT / EMI QUERY ("விலை அதிகமா", "ரேட் ஜாஸ்தி", "டிஸ்கவுண்ட்", "ஆஃபர்", "இஎம்ஐ")
    price_words = [
        "விலை", "ரேட்", "டிஸ்கவுண்ட்", "ஆஃபர்", "கம்மி பண்ண", "இஎம்ஐ", "லோன்",
        "price", "costly", "discount", "offer", "emi", "loan",
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

    # 7. SHOWROOM / PRODUCT DETAILS BOUNDARY ("ஷோரூம் எங்க", "மைலேஜ்", "டெஸ்ட் டிரைவ்", "சண்டே ஓப்பனா")
    detail_words = [
        "ஷோரூம்", "மைலேஜ்", "டெஸ்ட் டிரைவ்", "சண்டே", "லொக்கேஷன்", "அட்ரஸ்", "மாடல்", "கலர்", "டெலிவரி",
        "showroom", "mileage", "test drive", "location", "address",
    ]
    if any(w in low for w in detail_words):
        return {
            "intent": "DETAIL_BOUNDARY",
            "action": "REPEAT_CURRENT",
            "answer": None,
            "spokenReply": get_prewarmed_template("DETAIL_BOUNDARY", client_name),
            "summary": f"Customer asked product/showroom detail ('{reply_text}') -> Deferred to dealer & repeated verification question.",
            "engine": "HYBRID_FAST_TEMPLATE",
        }

    # 8. NEGATIVE ("இல்ல", "இல்லை", "பேசல", "கூப்பிடல", "வேண்டாம்", "திருப்தி இல்ல", "வரல", "செட் ஆகாது")
    default_neg = [
        "இல்ல", "இல்லை", "பேசல", "கூப்பிடல", "வேண்டாம்", "வேணாம்", "திருப்தி இல்ல", "பிடிக்கல",
        "வரல", "பண்ணல", "செட் ஆகாது", "முடியாது", "illa", "no", "not", "never", "wrong", "venam", "pesala", "koopidala",
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

    # 9. POSITIVE ("ஆமா", "ஆமாம்", "பேசுனாங்க", "சொல்லிட்டாங்க", "திருப்தி", "புரிஞ்சது", "ஓகே", "சரி", "நல்லா")
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

    # 10. TIER-2 (GROQ FAST CLASSIFIER, 250ms-400ms): For any indirect or unforeseen speech, classify into strict Verification Call Templates!
    llm_res = call_groq_hybrid_llm(reply_text, client_name, question_text, pos_kw, neg_kw)
    if llm_res:
        llm_res["engine"] = "HYBRID_GROQ_LLM"
        return llm_res

    return {
        "intent": "OUT_OF_SCOPE_BOUNDARY",
        "action": "REPEAT_CURRENT",
        "answer": None,
        "spokenReply": get_prewarmed_template("OUT_OF_SCOPE_BOUNDARY", client_name),
        "summary": f"Customer said '{reply_text}' -> Enforced verification call boundary.",
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
            "serveo.net",
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
                m = re.search(r"(https://[a-zA-Z0-9.-]+\.(?:serveousercontent\.com|serveo\.net|lhr\.life))", line)
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


def _verify_groq_on_boot():
    try:
        db = load_db()
        client_names = [c.get("name", "TATA Motors") for c in db.get("clients", [])]
        if "ட்டாட்டா மோட்டார்ஸ்" not in client_names:
            client_names.append("ட்டாட்டா மோட்டார்ஸ்")
        all_intents = [
            "OUT_OF_SCOPE_BOUNDARY",
            "DETAIL_BOUNDARY",
            "QUESTION_WHO",
            "QUESTION_WHY",
            "REPEAT_REQUEST",
            "BUSY_CALLBACK",
            "PRICE_QUERY",
            "CLARIFY",
        ]
        for cname in client_names:
            for it in all_intents:
                tmpl = get_prewarmed_template(it, cname)
                if tmpl:
                    tts_engine.synthesize(tmpl, emotion_id=4, length_scale=1.28)
        print("✅ All Verification Call Boundary Templates Pre-Warmed in 0ms Audio Cache!", flush=True)
    except Exception as e:
        print(f"[PREWARM] Notice: {e}", flush=True)

    res = call_groq_hybrid_llm("எல்லாம் செட் ஆகாது வேண்டாம்", "TATA Motors", "நம்ம டீலர் உங்ககிட்ட பேசுனாங்களா?")
    if res:
        print(f"✅ Groq Hybrid LLM Ready! Active Model={GROQ_ACTIVE_MODEL} | Intent={res.get('intent')}", flush=True)


# Start tunnel and verify Groq Hybrid LLM in background thread on server boot
threading.Thread(target=_start_new_tunnel_process, args=(8000,), daemon=True).start()
threading.Thread(target=_verify_groq_on_boot, daemon=True).start()


# ==================== USB ANDROID PHONE (HARDWARE MODEM COM PORT + ADB) AUTO-DIALER ====================
import ctypes
from ctypes import wintypes
import base64
import struct

ADB_EXE = os.path.join(BASE_DIR, "platform-tools", "adb.exe")
ADB_KEY_PRIV = os.path.join(BASE_DIR, "platform-tools", "adbkey")
ADB_KEY_PUB = os.path.join(BASE_DIR, "platform-tools", "adbkey.pub")


class SP_DEVINFO_DATA(ctypes.Structure):
    _fields_ = [
        ("cbSize", wintypes.DWORD),
        ("ClassGuid", ctypes.c_byte * 16),
        ("DevInst", wintypes.DWORD),
        ("Reserved", ctypes.c_void_p),
    ]


class USB_INTERFACE_DESCRIPTOR(ctypes.Structure):
    _fields_ = [
        ("bLength", ctypes.c_ubyte),
        ("bDescriptorType", ctypes.c_ubyte),
        ("bInterfaceNumber", ctypes.c_ubyte),
        ("bAlternateSetting", ctypes.c_ubyte),
        ("bNumEndpoints", ctypes.c_ubyte),
        ("bInterfaceClass", ctypes.c_ubyte),
        ("bInterfaceSubClass", ctypes.c_ubyte),
        ("bInterfaceProtocol", ctypes.c_ubyte),
        ("iInterface", ctypes.c_ubyte),
    ]


class WINUSB_PIPE_INFORMATION(ctypes.Structure):
    _fields_ = [
        ("PipeType", ctypes.c_int),
        ("PipeId", ctypes.c_ubyte),
        ("MaximumPacketSize", ctypes.c_ushort),
        ("Interval", ctypes.c_ubyte),
    ]


def _parse_der_tlv(data: bytes, idx: int = 0):
    tag = data[idx]
    idx += 1
    length = data[idx]
    idx += 1
    if length & 0x80:
        nbytes = length & 0x7F
        length = int.from_bytes(data[idx : idx + nbytes], "big")
        idx += nbytes
    val = data[idx : idx + length]
    return tag, val, idx + length


def _parse_single_adb_rsa_key(priv_path: str, pub_path: str):
    if not os.path.exists(priv_path):
        return None
    try:
        pem = open(priv_path, "r", encoding="utf-8").read()
        b64 = "".join(ln.strip() for ln in pem.splitlines() if not ln.startswith("-----"))
        der = base64.b64decode(b64)
        _, seq_val, _ = _parse_der_tlv(der, 0)
        idx = 0
        _, _ver, idx = _parse_der_tlv(seq_val, idx)
        _, _alg, idx = _parse_der_tlv(seq_val, idx)
        _, pk_octet, idx = _parse_der_tlv(seq_val, idx)
        _, rsa_seq, _ = _parse_der_tlv(pk_octet, 0)
        ridx = 0
        _, _rver, ridx = _parse_der_tlv(rsa_seq, ridx)
        _, n_bytes, ridx = _parse_der_tlv(rsa_seq, ridx)
        _, e_bytes, ridx = _parse_der_tlv(rsa_seq, ridx)
        _, d_bytes, ridx = _parse_der_tlv(rsa_seq, ridx)
        n = int.from_bytes(n_bytes, "big")
        d = int.from_bytes(d_bytes, "big")
        pub = open(pub_path, "rb").read().strip() + b"\x00" if os.path.exists(pub_path) else b""
        return (n, d, pub)
    except Exception:
        return None


def _load_adb_rsa_keys():
    keys = []
    user_android_dir = os.path.join(os.path.expanduser("~"), ".android")
    candidates = [
        (os.path.join(user_android_dir, "adbkey"), os.path.join(user_android_dir, "adbkey.pub")),
        (ADB_KEY_PRIV, ADB_KEY_PUB),
    ]
    for priv_p, pub_p in candidates:
        parsed = _parse_single_adb_rsa_key(priv_p, pub_p)
        if parsed:
            keys.append(parsed)
    return keys


def _load_adb_rsa_key():
    keys = _load_adb_rsa_keys()
    if keys:
        return keys[0]
    return None, None, None


def _sign_adb_sha1_token(token_20: bytes, n: int, d: int) -> bytes:
    asn1_sha1 = b"\x30\x21\x30\x09\x06\x05\x2b\x0e\x03\x02\x1a\x05\x00\x04\x14" + token_20
    pad_len = 256 - 3 - len(asn1_sha1)
    em = b"\x00\x01" + (b"\xff" * pad_len) + b"\x00" + asn1_sha1
    return pow(int.from_bytes(em, "big"), d, n).to_bytes(256, "big")


class _WinUsbAdbSession:
    """
    Persistent Direct WinUSB ADB Client for Samsung / Android USB phones where Windows binds
    generic winusb.inf without DeviceInterfaceGUIDs. Keeps the USB handle open so the
    'Allow USB debugging?' dialog stays active on the phone screen until authorized.
    """
    def __init__(self):
        self.lock = threading.Lock()
        self.hdev = None
        self.ihandle = None
        self.bulk_in = 0
        self.bulk_out = 0
        self.pdo = ""
        self.model = "Samsung Galaxy M34 5G"
        self.authorized = False
        self.waiting_auth = False
        self.local_id = 10
        self.n, self.d, self.pub = _load_adb_rsa_key()

    def _close_unlocked(self):
        winusb = ctypes.windll.winusb
        k32 = ctypes.windll.kernel32
        if self.ihandle:
            try:
                winusb.WinUsb_Free(self.ihandle)
            except Exception:
                pass
            self.ihandle = None
        if self.hdev and self.hdev not in (-1, 0xFFFFFFFF, 0xFFFFFFFFFFFFFFFF):
            try:
                k32.CloseHandle(self.hdev)
            except Exception:
                pass
            self.hdev = None
        self.authorized = False
        self.waiting_auth = False
        self.pdo = ""

    def _find_adb_pdo_unlocked(self) -> str:
        setupapi = ctypes.windll.setupapi
        setupapi.SetupDiGetClassDevsW.restype = ctypes.c_void_p
        setupapi.SetupDiEnumDeviceInfo.argtypes = [ctypes.c_void_p, wintypes.DWORD, ctypes.POINTER(SP_DEVINFO_DATA)]
        setupapi.SetupDiGetDeviceRegistryPropertyW.argtypes = [
            ctypes.c_void_p, ctypes.POINTER(SP_DEVINFO_DATA), wintypes.DWORD,
            ctypes.POINTER(wintypes.DWORD), ctypes.c_void_p, wintypes.DWORD, ctypes.POINTER(wintypes.DWORD)
        ]
        hdev_list = setupapi.SetupDiGetClassDevsW(None, "USB", None, 0x02 | 0x04)
        if not hdev_list or hdev_list == -1:
            return ""
        try:
            devinfo = SP_DEVINFO_DATA()
            devinfo.cbSize = ctypes.sizeof(SP_DEVINFO_DATA)
            i = 0
            while setupapi.SetupDiEnumDeviceInfo(hdev_list, i, ctypes.byref(devinfo)):
                i += 1
                fname = ctypes.create_unicode_buffer(512)
                setupapi.SetupDiGetDeviceRegistryPropertyW(hdev_list, ctypes.byref(devinfo), 0x0C, None, fname, 1024, None)
                hwid = ctypes.create_unicode_buffer(512)
                setupapi.SetupDiGetDeviceRegistryPropertyW(hdev_list, ctypes.byref(devinfo), 0x01, None, hwid, 1024, None)
                if "ADB" in fname.value.upper() or ("MI_03" in hwid.value.upper() and "04E8" in hwid.value.upper()):
                    pdo = ctypes.create_unicode_buffer(512)
                    if setupapi.SetupDiGetDeviceRegistryPropertyW(hdev_list, ctypes.byref(devinfo), 0x0E, None, pdo, 1024, None):
                        return pdo.value
        finally:
            setupapi.SetupDiDestroyDeviceInfoList(wintypes.HANDLE(hdev_list))
        return ""

    def _send_pkt_unlocked(self, cmd_bytes: bytes, arg0: int, arg1: int, data: bytes = b"") -> bool:
        winusb = ctypes.windll.winusb
        cmd = int.from_bytes(cmd_bytes, "little")
        magic = cmd ^ 0xFFFFFFFF
        chksum = sum(data) & 0xFFFFFFFF
        hdr = struct.pack("<6I", cmd, arg0, arg1, len(data), chksum, magic)
        written = wintypes.ULONG(0)
        ok1 = winusb.WinUsb_WritePipe(self.ihandle, self.bulk_out, hdr, len(hdr), ctypes.byref(written), None)
        if not ok1:
            return False
        if data:
            ok2 = winusb.WinUsb_WritePipe(self.ihandle, self.bulk_out, data, len(data), ctypes.byref(written), None)
            if not ok2:
                return False
        return True

    def _recv_pkt_unlocked(self, timeout_ms: int = 1200):
        winusb = ctypes.windll.winusb
        timeout = wintypes.ULONG(timeout_ms)
        winusb.WinUsb_SetPipePolicy(self.ihandle, self.bulk_in, 3, ctypes.sizeof(timeout), ctypes.byref(timeout))
        rbuf = ctypes.create_string_buffer(65536)
        read_len = wintypes.ULONG(0)
        ok = winusb.WinUsb_ReadPipe(self.ihandle, self.bulk_in, rbuf, 24, ctypes.byref(read_len), None)
        if not ok or read_len.value != 24:
            return None, 0, 0, b""
        rcmd, rarg0, rarg1, rlen, rchk, rmag = struct.unpack("<6I", rbuf.raw[:24])
        cmd_bytes = rbuf.raw[:4]
        payload = b""
        while len(payload) < rlen:
            ok2 = winusb.WinUsb_ReadPipe(self.ihandle, self.bulk_in, rbuf, rlen - len(payload), ctypes.byref(read_len), None)
            if not ok2 or read_len.value == 0:
                break
            payload += rbuf.raw[:read_len.value]
        return cmd_bytes, rarg0, rarg1, payload

    def check_status(self, wait_for_user_ms: int = 600) -> Dict[str, Any]:
        with self.lock:
            current_pdo = self._find_adb_pdo_unlocked()
            if not current_pdo:
                self._close_unlocked()
                return {"connected": False, "state": "none", "deviceId": "", "model": ""}

            if self.pdo != current_pdo or not self.ihandle:
                self._close_unlocked()
                k32 = ctypes.windll.kernel32
                winusb = ctypes.windll.winusb
                hdev = k32.CreateFileW(
                    f"\\\\.\\GLOBALROOT{current_pdo}",
                    0x80000000 | 0x40000000,
                    1 | 2,
                    None,
                    3,
                    0x40000000,
                    None,
                )
                if hdev in (-1, 0xFFFFFFFF, 0xFFFFFFFFFFFFFFFF):
                    return {"connected": False, "state": "none", "deviceId": "", "model": ""}
                ihandle = ctypes.c_void_p()
                if not winusb.WinUsb_Initialize(wintypes.HANDLE(hdev), ctypes.byref(ihandle)):
                    k32.CloseHandle(hdev)
                    return {"connected": False, "state": "none", "deviceId": "", "model": ""}
                idesc = USB_INTERFACE_DESCRIPTOR()
                winusb.WinUsb_QueryInterfaceSettings(ihandle, 0, ctypes.byref(idesc))
                bulk_in = bulk_out = 0
                for i in range(idesc.bNumEndpoints):
                    pinfo = WINUSB_PIPE_INFORMATION()
                    winusb.WinUsb_QueryPipe(ihandle, 0, i, ctypes.byref(pinfo))
                    if pinfo.PipeId & 0x80:
                        bulk_in = pinfo.PipeId
                    else:
                        bulk_out = pinfo.PipeId
                self.hdev = hdev
                self.ihandle = ihandle
                self.bulk_in = bulk_in
                self.bulk_out = bulk_out
                self.pdo = current_pdo
                wtimeout = wintypes.ULONG(2000)
                winusb.WinUsb_SetPipePolicy(self.ihandle, self.bulk_out, 3, ctypes.sizeof(wtimeout), ctypes.byref(wtimeout))

                # Initiate ADB CNXN handshake
                self._send_pkt_unlocked(b"CNXN", 0x01000000, 4096, b"host::\x00")
                cmd, arg0, arg1, data = self._recv_pkt_unlocked(1500)
                if cmd == b"CNXN":
                    self.authorized = True
                    self.waiting_auth = False
                elif cmd == b"AUTH" and arg0 == 1:
                    all_keys = _load_adb_rsa_keys()
                    cur_token = data
                    for k_n, k_d, k_pub in all_keys:
                        sig = _sign_adb_sha1_token(cur_token, k_n, k_d)
                        self._send_pkt_unlocked(b"AUTH", 2, 0, sig)
                        cmd2, arg0_2, arg1_2, data2 = self._recv_pkt_unlocked(1500)
                        if cmd2 == b"CNXN":
                            print(f"[WINUSB-ADB] ✅ USB Phone AUTHORIZED with existing RSA key: {data2[:60]}", flush=True)
                            self.authorized = True
                            self.waiting_auth = False
                            break
                        elif cmd2 == b"AUTH" and arg0_2 == 1:
                            cur_token = data2
                    if not self.authorized and self.pub:
                        print("[WINUSB-ADB] Sent RSA Public Key to phone -> Waiting for user to tap 'Allow' on phone screen!", flush=True)
                        self._send_pkt_unlocked(b"AUTH", 3, 0, self.pub)
                        self.waiting_auth = True
                        self.auth_sent_at = time.time()

                        def _wait_user_allow_bg():
                            for _ in range(18):
                                if not self.ihandle or not self.waiting_auth or self.authorized:
                                    return
                                c_bg, _, _, d_bg = self._recv_pkt_unlocked(10000)
                                if c_bg == b"CNXN":
                                    print(f"[WINUSB-ADB] ✅ User tapped 'Allow' on phone screen! USB Phone AUTHORIZED: {d_bg[:60]}", flush=True)
                                    self.authorized = True
                                    self.waiting_auth = False
                                    return
                            self.waiting_auth = False

                        threading.Thread(target=_wait_user_allow_bg, daemon=True).start()

            if self.authorized:
                return {
                    "connected": True,
                    "state": "device",
                    "deviceId": self.pdo,
                    "model": self.model,
                    "mode": "WINUSB_ADB",
                }
            return {
                "connected": False,
                "state": "unauthorized",
                "deviceId": self.pdo,
                "model": self.model,
                "mode": "WINUSB_ADB",
            }

    def run_shell(self, shell_cmd: str, timeout_ms: int = 2500) -> str:
        st = self.check_status(wait_for_user_ms=1500)
        if not st.get("connected"):
            return ""
        with self.lock:
            self.local_id += 1
            lid = self.local_id
            payload = f"shell:{shell_cmd}\x00".encode("utf-8")
            if not self._send_pkt_unlocked(b"OPEN", lid, 0, payload):
                self._close_unlocked()
                return ""
            out_chunks = []
            deadline = time.time() + (timeout_ms / 1000.0)
            while time.time() < deadline:
                c, a0, a1, p = self._recv_pkt_unlocked(600)
                if c is None:
                    break
                if c == b"WRTE":
                    out_chunks.append(p.decode("utf-8", errors="ignore"))
                    self._send_pkt_unlocked(b"OKAY", lid, a0, b"")
                elif c == b"CLSE":
                    self._send_pkt_unlocked(b"CLSE", lid, a0, b"")
                    break
            return "".join(out_chunks)


WINUSB_ADB = _WinUsbAdbSession()
threading.Thread(target=lambda: WINUSB_ADB.check_status(), daemon=True).start()


class _SOCKADDR_BTH(ctypes.Structure):
    _pack_ = 1
    _fields_ = [
        ("addressFamily", ctypes.c_ushort),
        ("btAddr", ctypes.c_ulonglong),
        ("serviceClassId", ctypes.c_ubyte * 16),
        ("port", ctypes.c_ulong),
    ]


class _DirectBluetoothHfpEngine:
    """
    100% Direct Bluetooth Hands-Free Profile (HFP 1.7) Engine over standard Windows Bluetooth RFCOMM
    (Winsock AF_BTH / Python socket.AF_BLUETOOTH) — NO 'Phone Link' / 'Link to Windows' app required!
    - Connects directly to Samsung Galaxy M34 5G HFP Audio Gateway (0000111f-0000-1000-8000-00805f9b34fb)
    - Completes standard AT Service Level Connection (AT+BRSF, AT+CIND=?, AT+CIND?, AT+CMER=3,0,0,1)
    - Dials numbers directly via ATD+91...;
    - Polls exact customer pickup state via AT+CLCC (+CLCC stat=0 -> ACTIVE, stat=2/3 -> DIALING)
    - Hangs up via AT+CHUP
    """
    def __init__(self):
        self.lock = threading.Lock()
        self.sock = None
        self.connected = False
        self.bt_mac_str = "CC:F9:F0:1C:0A:39"
        self.bt_addr_int = 0xCCF9F01C0A39
        self.device_name = "Samsung Galaxy M34 5G"
        self.channel = 0
        self.live_call_state = "IDLE"
        self.last_state_ts = 0.0
        self._discover_paired_phone_from_registry()
        threading.Thread(target=self._background_ciev_listener, daemon=True).start()

    def _discover_paired_phone_from_registry(self):
        try:
            import winreg
            base_key = r"SYSTEM\CurrentControlSet\Enum\BTHENUM"
            with winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, base_key) as root:
                i = 0
                while True:
                    try:
                        sub = winreg.EnumKey(root, i)
                        i += 1
                        if "0000111f" in sub.lower():
                            with winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, f"{base_key}\\{sub}") as k111f:
                                j = 0
                                while True:
                                    try:
                                        inst = winreg.EnumKey(k111f, j)
                                        j += 1
                                        m = re.search(r"&([0-9A-Fa-f]{12})_", inst)
                                        if m:
                                            hex_mac = m.group(1).upper()
                                            with winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, f"{base_key}\\{sub}\\{inst}") as kinst:
                                                fname, _ = winreg.QueryValueEx(kinst, "FriendlyName")
                                                if "galaxy" in str(fname).lower() or "m34" in str(fname).lower() or self.bt_addr_int == 0:
                                                    self.bt_addr_int = int(hex_mac, 16)
                                                    self.bt_mac_str = ":".join(hex_mac[k:k+2] for k in range(0, 12, 2))
                                    except OSError:
                                        break
                    except OSError:
                        break
        except Exception:
            pass

    def _close_unlocked(self):
        if self.sock is not None:
            try:
                self.sock.close()
            except Exception:
                pass
            self.sock = None
        self.connected = False

    def _parse_ciev_and_clcc(self, text: str):
        if not text:
            return
        # Check unsolicited HFP indicators pushed immediately by Samsung phone:
        # +CIEV: 1,1 -> Call Active (Attended!)
        # +CIEV: 1,0 -> Call Ended (Idle)
        # +CIEV: 2,2 / +CIEV: 2,3 -> Outgoing Dialing / Ringing
        # +CIEV: 2,0 -> Call Setup ended
        for ind, val in re.findall(r"\+CIEV:\s*(\d+)\s*,\s*(\d+)", text):
            if ind == "1":
                if val == "1":
                    self.live_call_state = "ACTIVE"
                    self.last_state_ts = time.time()
                    print("[BT-HFP-EVENT] ✅ +CIEV: 1,1 -> CALL ATTENDED (ACTIVE) INSTANTLY!", flush=True)
                elif val == "0":
                    self.live_call_state = "IDLE"
                    self.last_state_ts = time.time()
                    print("[BT-HFP-EVENT] 📴 +CIEV: 1,0 -> CALL ENDED (IDLE)!", flush=True)
            elif ind == "2":
                if val in ("2", "3"):
                    if self.live_call_state != "ACTIVE":
                        self.live_call_state = "DIALING"
                        self.last_state_ts = time.time()
                        print(f"[BT-HFP-EVENT] 🔔 +CIEV: 2,{val} -> DIALING / RINGING", flush=True)
                elif val == "0" and self.live_call_state != "ACTIVE":
                    # If call setup finished (2,0) and call was not answered within 0.3s, check if rejected
                    pass

        clcc_stats = re.findall(r"\+CLCC:\s*\d+\s*,\s*\d+\s*,\s*(\d+)", text)
        if "0" in clcc_stats:
            self.live_call_state = "ACTIVE"
            self.last_state_ts = time.time()
        elif "2" in clcc_stats or "3" in clcc_stats:
            if self.live_call_state != "ACTIVE":
                self.live_call_state = "DIALING"
                self.last_state_ts = time.time()
        elif "4" in clcc_stats or "5" in clcc_stats:
            self.live_call_state = "RINGING"
            self.last_state_ts = time.time()

    def _background_ciev_listener(self):
        """
        Continuously reads unsolicited +CIEV events from the Bluetooth HFP socket in real-time (20ms loop)
        WITHOUT flooding the phone with AT+CLCC commands, so '+CIEV: 1,1' (Call Attended) is detected in <50ms!
        """
        import socket
        while True:
            time.sleep(0.04)
            if not self.connected or not self.sock:
                continue
            if self.lock.locked():
                continue
            with self.lock:
                if not self.connected or not self.sock:
                    continue
                try:
                    self.sock.settimeout(0.02)
                    data = self.sock.recv(1024)
                    if data:
                        txt = data.decode("utf-8", errors="ignore")
                        self._parse_ciev_and_clcc(txt)
                    elif data == b"":
                        # Socket closed by remote
                        self._close_unlocked()
                except socket.timeout:
                    pass
                except BlockingIOError:
                    pass
                except Exception:
                    pass

    def _drain_unsolicited_unlocked(self) -> str:
        if not self.sock:
            return ""
        drained = []
        try:
            self.sock.settimeout(0.02)
            while True:
                data = self.sock.recv(1024)
                if not data:
                    break
                txt = data.decode("utf-8", errors="ignore")
                self._parse_ciev_and_clcc(txt)
                drained.append(txt)
        except Exception:
            pass
        return "".join(drained)

    def _send_at_unlocked(self, cmd: str, wait_sec: float = 0.8) -> str:
        if not self.sock:
            return ""
        try:
            pre = self._drain_unsolicited_unlocked()
            self.sock.settimeout(wait_sec)
            self.sock.sendall((cmd.strip() + "\r").encode("ascii"))
            chunks = [pre] if pre else []
            deadline = time.time() + wait_sec
            while time.time() < deadline:
                try:
                    data = self.sock.recv(1024)
                    if not data:
                        break
                    txt = data.decode("utf-8", errors="ignore")
                    self._parse_ciev_and_clcc(txt)
                    chunks.append(txt)
                    full_now = "".join(chunks)
                    if cmd.strip().upper() == "AT+CLCC":
                        # For AT+CLCC, make sure we read until the OK following +CLCC (or +CIEV: 1,1)
                        if "+CIEV: 1,1" in full_now or ("+CLCC:" in full_now and "OK" in full_now.split("+CLCC:")[-1]):
                            break
                        if "OK" in full_now and "+CLCC:" not in full_now and (time.time() + 0.25 < deadline):
                            continue
                    if "OK" in txt or "ERROR" in txt or "+CME ERROR" in txt or "NO CARRIER" in txt or "BUSY" in txt:
                        break
                except Exception:
                    break
            resp = "".join(chunks)
            return resp
        except Exception as e:
            print(f"[BT-HFP] AT command '{cmd}' error: {e}", flush=True)
            self._close_unlocked()
            return ""

    def ensure_connected(self) -> Dict[str, Any]:
        with self.lock:
            if self.connected and self.sock is not None:
                return {
                    "connected": True,
                    "mac": self.bt_mac_str,
                    "channel": self.channel,
                    "model": self.device_name,
                }

            import socket
            import uuid
            ws2 = ctypes.windll.ws2_32
            s = socket.socket(socket.AF_BLUETOOTH, socket.SOCK_STREAM, socket.BTPROTO_RFCOMM)
            addr = _SOCKADDR_BTH()
            addr.addressFamily = 32  # AF_BTH
            addr.btAddr = self.bt_addr_int
            guid_bytes = uuid.UUID("0000111f-0000-1000-8000-00805f9b34fb").bytes_le
            addr.serviceClassId = (ctypes.c_ubyte * 16)(*guid_bytes)
            addr.port = 0  # BT_PORT_ANY -> SDP lookup by UUID

            rc = ws2.connect(wintypes.HANDLE(s.fileno()), ctypes.byref(addr), ctypes.sizeof(addr))
            connected_sock = None
            if rc == 0:
                connected_sock = s
                self.channel = 0
                print(f"[BT-HFP] ✅ Connected via SDP UUID (0x111F HFP-AG) to {self.bt_mac_str}!", flush=True)
            else:
                wsa_err = ws2.WSAGetLastError()
                print(f"[BT-HFP] SDP UUID (0x111F) connect rc={rc} wsa_err={wsa_err}, probing RFCOMM channels...", flush=True)
                try:
                    s.close()
                except Exception:
                    pass
                for ch in (3, 4, 1, 2, 5, 6, 7, 8, 9, 10):
                    try:
                        s_ch = socket.socket(socket.AF_BLUETOOTH, socket.SOCK_STREAM, socket.BTPROTO_RFCOMM)
                        s_ch.settimeout(1.8)
                        s_ch.connect((self.bt_mac_str, ch))
                        s_ch.settimeout(1.0)
                        s_ch.sendall(b"AT+BRSF=255\r")
                        probe_resp = s_ch.recv(512).decode("utf-8", errors="ignore")
                        if "BRSF" in probe_resp or "OK" in probe_resp or "ERROR" in probe_resp:
                            connected_sock = s_ch
                            self.channel = ch
                            print(f"[BT-HFP] ✅ Found HFP-AG on {self.bt_mac_str} RFCOMM channel {ch}! Probe={probe_resp.strip()!r}", flush=True)
                            break
                        s_ch.close()
                    except Exception:
                        try:
                            s_ch.close()
                        except Exception:
                            pass

            if not connected_sock:
                return {
                    "connected": False,
                    "mac": self.bt_mac_str,
                    "channel": 0,
                    "model": self.device_name,
                }

            self.sock = connected_sock
            # Standard HFP Service Level Connection (SLC) WITHOUT AT+BAC=1,2 so we don't trigger +BCS buffer pollution
            r_brsf = self._send_at_unlocked("AT+BRSF=39", wait_sec=0.8)
            r_cind1 = self._send_at_unlocked("AT+CIND=?", wait_sec=0.8)
            r_cind2 = self._send_at_unlocked("AT+CIND?", wait_sec=0.8)
            r_cmer = self._send_at_unlocked("AT+CMER=3,0,0,1", wait_sec=0.8)
            r_chld = self._send_at_unlocked("AT+CHLD=?", wait_sec=0.6)
            self._send_at_unlocked("AT+CMEE=1", wait_sec=0.4)
            self._send_at_unlocked("AT+VGS=15", wait_sec=0.4)
            self._send_at_unlocked("AT+VGM=15", wait_sec=0.4)
            print(
                f"[BT-HFP] ✅ HFP SLC Handshake Complete! BRSF={r_brsf.strip()!r} CMER={r_cmer.strip()!r}",
                flush=True,
            )
            self.connected = True
            return {
                "connected": True,
                "mac": self.bt_mac_str,
                "channel": self.channel,
                "model": self.device_name,
            }

    def dial(self, dial_num: str) -> bool:
        st = self.ensure_connected()
        if not st.get("connected"):
            return False
        with self.lock:
            self.live_call_state = "DIALING"
            self.last_state_ts = time.time()
            resp = self._send_at_unlocked(f"ATD{dial_num};", wait_sec=1.2)
            self._parse_ciev_and_clcc(resp)
            print(f"[BT-HFP-DIAL] ATD{dial_num}; -> {resp.strip()!r} (state={self.live_call_state})", flush=True)
            return ("OK" in resp) or (resp != "" and "ERROR" not in resp)

    def get_call_state(self) -> Optional[str]:
        with self.lock:
            if not self.connected or not self.sock:
                return None
            # Drain any incoming +CIEV events immediately (0ms, no AT+CLCC spam!)
            self._drain_unsolicited_unlocked()
            return self.live_call_state

    def hangup(self) -> bool:
        if not self.connected or not self.sock:
            self.ensure_connected()
        with self.lock:
            self.live_call_state = "IDLE"
            if not self.connected or not self.sock:
                return False
            resp = self._send_at_unlocked("AT+CHUP", wait_sec=1.0)
            self._parse_ciev_and_clcc(resp)
            print(f"[BT-HFP-HANGUP] AT+CHUP -> {resp.strip()!r}", flush=True)
            return True


BT_HFP = _DirectBluetoothHfpEngine()
# Do NOT auto-connect Bluetooth HFP on boot when using Twilio Cloud Telephony,
# so the laptop never hijacks the phone's earpiece audio during incoming Twilio calls!


def _run_adb_cmd(args: List[str], timeout_sec: float = 4.0) -> str:
    if len(args) >= 2 and args[0] == "shell":
        shell_str = " ".join(args[1:])
        out = WINUSB_ADB.run_shell(shell_str, timeout_ms=int(timeout_sec * 1000))
        if out:
            return out
    if not os.path.exists(ADB_EXE):
        return ""
    try:
        res = subprocess.run(
            [ADB_EXE] + args,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="ignore",
            timeout=timeout_sec,
        )
        return (res.stdout or "") + "\n" + (res.stderr or "")
    except Exception as e:
        return f"ERROR: {e}"


@app.get("/api/adb/status")
async def get_adb_usb_phone_status():
    """
    Checks if the Samsung phone is connected via Direct Bluetooth HFP or Direct WinUSB ADB.
    """
    bt_st = BT_HFP.ensure_connected()
    if bt_st.get("connected"):
        return {
            "connected": True,
            "state": "device",
            "deviceId": bt_st.get("mac", ""),
            "model": f"{bt_st.get('model', 'Samsung Galaxy M34 5G')} (Bluetooth)",
            "mode": "BLUETOOTH_HFP",
        }

    st = WINUSB_ADB.check_status(wait_for_user_ms=500)
    if st.get("state") in ("device", "unauthorized"):
        return st

    out = _run_adb_cmd(["devices", "-l"], timeout_sec=3.0)
    lines = [ln.strip() for ln in out.splitlines() if ln.strip() and not ln.startswith("List of devices") and not ln.startswith("*")]
    if not lines:
        return {"connected": False, "state": "none", "deviceId": "", "model": ""}
    first = lines[0]
    parts = first.split()
    dev_id = parts[0] if parts else ""
    state = parts[1] if len(parts) > 1 else "unknown"
    model_match = re.search(r"model:(\S+)", first)
    model_name = model_match.group(1) if model_match else dev_id
    return {
        "connected": state == "device",
        "state": state,
        "deviceId": dev_id,
        "model": model_name,
        "mode": "ADB",
    }


@app.post("/api/adb/dial")
async def adb_dial_phone_number(req: Request):
    """
    Dials a customer phone number directly on the connected Samsung phone SIM card
    via Direct Bluetooth HFP (ATD+91...;) and/or Direct WinUSB ADB.
    Accepts BOTH normal 10-digit numbers (e.g. 9876543210) AND numbers with country code (+919876543210).
    """
    body = await req.json()
    raw_phone = str(body.get("phone", "")).strip()
    digits = re.sub(r"\D", "", raw_phone)
    if not digits or len(digits) < 10:
        return JSONResponse({"ok": False, "error": "Please enter a valid 10-digit mobile number"}, status_code=400)
    dial_num = f"+91{digits[-10:]}"

    # 1. Try dialing directly over Bluetooth HFP (ATD+91...;) first — works without USB debugging popup or Phone Link!
    if BT_HFP.dial(dial_num):
        # Also trigger ADB call in background if USB ADB happens to be authorized
        st_usb = WINUSB_ADB.check_status(wait_for_user_ms=200)
        if st_usb.get("connected"):
            WINUSB_ADB.run_shell(f"input keyevent 224; am start -a android.intent.action.CALL -d tel:{dial_num}", timeout_ms=2000)
        return {"ok": True, "dialedNumber": dial_num, "model": "Samsung Galaxy M34 5G (Bluetooth)"}

    # 2. Fallback: Direct WinUSB ADB
    st = WINUSB_ADB.check_status(wait_for_user_ms=4000)
    if not st.get("connected"):
        if st.get("state") == "unauthorized":
            return JSONResponse({
                "ok": False,
                "state": "unauthorized",
                "error": "உங்க போன்ல Bluetooth ON-ல இருக்கான்னு பாருங்க, அல்லது போன் ஸ்கிரீனை Unlock பண்ணி 'Allow USB debugging?' பாப்-அப்ல 'Allow' கொடுங்க!",
            }, status_code=400)
        return JSONResponse({
            "ok": False,
            "state": st.get("state", "none"),
            "error": "Phone not connected via Bluetooth or USB. Please turn ON Bluetooth on your Samsung phone.",
        }, status_code=400)

    dial_out = WINUSB_ADB.run_shell(f"input keyevent 224; am start -a android.intent.action.CALL -d tel:{dial_num}", timeout_ms=3000)
    print(f"[ADB-DIAL] Dialed {dial_num} on USB Phone ({st.get('model')}): {dial_out.strip()}", flush=True)
    return {"ok": True, "dialedNumber": dial_num, "model": st.get("model", "")}


@app.get("/api/adb/call-state")
async def get_adb_call_state():
    """
    Returns precise live SIM call state using Direct Bluetooth HFP (AT+CLCC) or USB ADB (telephony.registry):
    - ACTIVE: Customer on the other end PICKED UP / ANSWERED the call!
    - DIALING: Outgoing call is dialing or ringing/alerting at the customer's end.
    - RINGING: Incoming call ringing.
    - IDLE: No call active (hung up / rejected / idle).
    """
    # 1. Check Direct Bluetooth HFP AT+CLCC first
    bt_call_state = BT_HFP.get_call_state()
    if bt_call_state in ("ACTIVE", "DIALING", "RINGING", "IDLE"):
        return {"ok": True, "callState": bt_call_state}

    # 2. Fallback: Check USB ADB telephony.registry
    out = WINUSB_ADB.run_shell(
        "dumpsys telephony.registry | grep -E 'mCallState|mForegroundCallState|Foreground call state'",
        timeout_ms=1800,
    )
    if not out or not out.strip():
        return {"ok": True, "callState": "DIALING"}

    fg_states = re.findall(r"(?:mForegroundCallState=|Foreground call state:\s*)(\d+)", out)
    call_states = re.findall(r"mCallState=(\d+)", out)
    print(f"[CALL-STATE-DEBUG] mCallState={call_states} fg={fg_states}", flush=True)

    if "1" in fg_states:
        return {"ok": True, "callState": "ACTIVE"}
    if "3" in fg_states or "4" in fg_states or "2" in call_states:
        return {"ok": True, "callState": "DIALING"}
    if "1" in call_states:
        return {"ok": True, "callState": "RINGING"}
    if "0" in call_states:
        return {"ok": True, "callState": "IDLE"}

    return {"ok": True, "callState": "DIALING"}


@app.post("/api/adb/hangup")
async def adb_hangup_call():
    """
    Ends the current phone call via Direct Bluetooth HFP (AT+CHUP) and/or USB ADB.
    """
    BT_HFP.hangup()
    WINUSB_ADB.run_shell("input keyevent 6", timeout_ms=1500)
    print("[PHONE-HANGUP] Hung up active phone call via Bluetooth HFP / USB.", flush=True)
    return {"ok": True}


@app.post("/api/bt/sync")
async def sync_bluetooth_audio_and_calls():
    """
    Connects Laptop (Z14-55N) <-> Samsung Galaxy M34 5G directly over Bluetooth (HFP Calls + A2DP Audio)
    WITHOUT opening or needing 'Phone Link' / 'Link to Windows'!
    """
    bt_res = BT_HFP.ensure_connected()
    hfp_calls_connected = bool(bt_res.get("connected"))
    a2dp_connected = True  # Kept Opened by bt_keepalive.ps1 AudioPlaybackConnection

    adb_info = WINUSB_ADB.check_status(wait_for_user_ms=1000)
    return {
        "ok": True,
        "a2dpAudioConnected": a2dp_connected,
        "hfpCallsConnected": hfp_calls_connected,
        "btMac": bt_res.get("mac", ""),
        "btChannel": bt_res.get("channel", 0),
        "adbConnected": bool(adb_info.get("connected")),
        "adbStatus": adb_info.get("state", "disconnected"),
        "phoneAction": "direct_bluetooth_hfp",
    }


TELEPHONY_WAV_MEM_CACHE: Dict[str, bytes] = {}


def _get_or_build_telephony_wav_bytes(safe_name: str, wav_path: str) -> bytes:
    cached = TELEPHONY_WAV_MEM_CACHE.get(safe_name)
    if cached:
        return cached
    tel_path = os.path.join(BASE_DIR, "backend", "audio_cache", f"tel8k_{safe_name}")
    try:
        import wave
        import numpy as np
        with wave.open(wav_path, "rb") as wf:
            sr = wf.getframerate()
            pcm = np.frombuffer(wf.readframes(wf.getnframes()), dtype=np.int16)
        if sr == 24000:
            pcm8k = pcm[::3]
        else:
            idx = np.linspace(0, len(pcm) - 1, int(len(pcm) * 8000 / sr)).astype(np.int32)
            pcm8k = pcm[idx]
        # Trim excessive trailing silence down to 120ms so <Gather> starts listening immediately after speech ends
        abs_pcm = np.abs(pcm8k)
        non_silent = np.where(abs_pcm > 250)[0]
        if len(non_silent) > 0:
            end_idx = min(len(pcm8k), int(non_silent[-1]) + int(8000 * 0.12))
            pcm8k = pcm8k[:end_idx]
        buf = io.BytesIO()
        with wave.open(buf, "wb") as wf_out:
            wf_out.setnchannels(1)
            wf_out.setsampwidth(2)
            wf_out.setframerate(8000)
            wf_out.writeframes(pcm8k.tobytes())
        raw_bytes = buf.getvalue()
        with open(tel_path, "wb") as f_out:
            f_out.write(raw_bytes)
        TELEPHONY_WAV_MEM_CACHE[safe_name] = raw_bytes
        return raw_bytes
    except Exception as e:
        print(f"[TELEPHONY-WAV] Downsample error: {e}", flush=True)
        with open(wav_path, "rb") as f_in:
            return f_in.read()


@app.get("/audio_cache/{fname}")
async def serve_cached_wav(fname: str, telephony: int = 0):
    from fastapi.responses import Response
    safe_name = os.path.basename(fname)
    wav_path = os.path.join(BASE_DIR, "backend", "audio_cache", safe_name)
    if not os.path.exists(wav_path):
        return JSONResponse({"error": "Audio file not found"}, status_code=404)
    if telephony == 1:
        raw_bytes = _get_or_build_telephony_wav_bytes(safe_name, wav_path)
        return Response(
            content=raw_bytes,
            media_type="audio/x-wav",
            headers={
                "Content-Length": str(len(raw_bytes)),
                "Cache-Control": "public, max-age=3600",
            },
        )
    return FileResponse(
        wav_path,
        media_type="audio/wav",
        filename=safe_name,
        headers={"Cache-Control": "no-store, no-cache, must-revalidate, max-age=0"},
    )


def tts_to_public_wav_url(public_url: str, text: str) -> str:
    wav_path = tts_engine.synthesize(text, emotion_id=4, length_scale=1.08)
    fname = os.path.basename(wav_path)
    _get_or_build_telephony_wav_bytes(fname, wav_path)
    return f"{public_url}/audio_cache/{fname}?telephony=1"


@app.get("/api/twilio/config")
async def get_twilio_config():
    db = load_db()
    cfg = db.get("twilio_config", {})
    return {
        "accountSid": cfg.get("accountSid", os.environ.get("TWILIO_ACCOUNT_SID", "")),
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
    account_sid = str(body.get("accountSid") or cfg.get("accountSid") or os.environ.get("TWILIO_ACCOUNT_SID", "")).strip()
    auth_token = str(body.get("authToken") or cfg.get("authToken") or os.environ.get("TWILIO_AUTH_TOKEN", "")).strip()
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
    print(f"[TWILIO-STEP] step={step} | CallSid={call_sid} | SpeechResult={speech_result!r} | Digits={digits!r}", flush=True)

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
                # Customer asked WHO, WHY, REPEAT, or said Hello -> Speak the reply (if any) and re-ask the same question!
                call_track.setdefault("logs", []).append(f"🗣️ Customer Said (\"{reply_raw}\") ➡️ {nlu['intent']} (Answering & Re-asking Q{prev_q_idx+1})")
                retry_url = f"{public_url}/api/twilio/step/{urllib.parse.quote(client_id)}/{urllib.parse.quote(lead_id)}/{step}"
                spoken_rep = nlu.get("spokenReply")
                if spoken_rep is None:
                    spoken_rep = get_prewarmed_template("REPEAT_REQUEST")
                q_url = tts_to_public_wav_url(public_url, prev_q["text"])
                outer_play = ""
                if spoken_rep:
                    ans_url = tts_to_public_wav_url(public_url, spoken_rep)
                    outer_play = f"<Play>{ans_url}</Play>"
                twiml = (
                    '<?xml version="1.0" encoding="UTF-8"?>'
                    "<Response>"
                    f"{outer_play}"
                    f'<Gather input="speech dtmf" language="ta-IN" speechTimeout="auto" timeout="8" action="{retry_url}" method="POST">'
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
        retry_same_url = f"{public_url}/api/twilio/step/{urllib.parse.quote(client_id)}/{urllib.parse.quote(lead_id)}/{step}"
        if step == 0:
            greet = client.get("openingGreeting", "வணக்கம் {lead_name} சார்.").replace("{lead_name}", lead.get("name", "சார்"))
            g_url = tts_to_public_wav_url(public_url, greet)
            q_url = tts_to_public_wav_url(public_url, q_text)
            twiml = (
                '<?xml version="1.0" encoding="UTF-8"?>'
                "<Response>"
                f"<Play>{g_url}</Play>"
                f'<Gather input="speech dtmf" language="ta-IN" speechTimeout="auto" timeout="8" action="{next_url}" method="POST">'
                f"<Play>{q_url}</Play>"
                "</Gather>"
                f'<Redirect method="POST">{retry_same_url}</Redirect>'
                "</Response>"
            )
        else:
            call_track.setdefault("logs", []).append(f"🤖 Asking Q{step+1}: {q_text}")
            q_url = tts_to_public_wav_url(public_url, q_text)
            twiml = (
                '<?xml version="1.0" encoding="UTF-8"?>'
                "<Response>"
                f'<Gather input="speech dtmf" language="ta-IN" speechTimeout="auto" timeout="8" action="{next_url}" method="POST">'
                f"<Play>{q_url}</Play>"
                "</Gather>"
                f'<Redirect method="POST">{retry_same_url}</Redirect>'
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
