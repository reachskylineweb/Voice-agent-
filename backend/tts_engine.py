import os
import re
import wave
import time
import hashlib
import numpy as np
import onnxruntime as ort
from scipy.ndimage import uniform_filter1d

BASE_DIR = r"e:\Ai Voice agent"
VITS_DIR = os.path.join(BASE_DIR, "models", "vits_rasa_13_onnx")
CACHE_DIR = os.path.join(BASE_DIR, "backend", "audio_cache")
os.makedirs(CACHE_DIR, exist_ok=True)

TAMIL_PHONETIC_MAP = [
    ("TATA", "ட்டாட்டா"),
    ("Tata", "ட்டாட்டா"),
    ("tata", "ட்டாட்டா"),
    ("டாடா", "ட்டாட்டா"),
    ("டாட்டா", "ட்டாட்டா"),
    ("Motors", "மோட்டார்ஸ்"),
    ("motors", "மோட்டார்ஸ்"),
    ("Nexon", "நெக்சான்"),
    ("nexon", "நெக்சான்"),
    ("நெக்ஸான்", "நெக்சான்"),
    ("Punch", "பஞ்ச்"),
    ("punch", "பஞ்ச்"),
    ("Harrier", "ஹாரியர்"),
    ("harrier", "ஹாரியர்"),
    ("Safari", "சஃபாரி"),
    ("safari", "சஃபாரி"),
    ("Curvv", "கர்வ்"),
    ("curvv", "கர்வ்"),
    ("Tiago", "டியாகோ"),
    ("tiago", "டியாகோ"),
    ("Tigor", "டிகோர்"),
    ("tigor", "டிகோர்"),
    ("Altroz", "அல்ட்ராஸ்"),
    ("altroz", "அல்ட்ராஸ்"),
    ("EV", "ஈவி"),
    ("Healing Earth", "ஹீலிங் எர்த்"),
    ("healing earth", "ஹீலிங் எர்த்"),
    ("Reach Skyline", "ரீச் ஸ்கைலைன்"),
    ("Verification", "வெரிபிகேஷன்"),
    ("verification", "வெரிபிகேஷன்"),
    ("Enquiry", "என்கொயரி"),
    ("enquiry", "என்கொயரி"),
    ("Service", "சர்வீஸ்"),
    ("service", "சர்வீஸ்"),
    ("Showroom", "ஷோரூம்"),
    ("showroom", "ஷோரூம்"),
    ("Test Drive", "டெஸ்ட் டிரைவ்"),
    ("test drive", "டெஸ்ட் டிரைவ்"),
    ("Booking", "புக்கிங்"),
    ("booking", "புக்கிங்"),
    ("Price", "விலை"),
    ("price", "விலை"),
    ("Discount", "டிஸ்கவுண்ட்"),
    ("discount", "டிஸ்கவுண்ட்"),
    ("Offer", "ஆஃபர்"),
    ("offer", "ஆஃபர்"),
    ("Loan", "லோன்"),
    ("loan", "லோன்"),
    ("EMI", "இஎம்ஐ"),
    ("Dealer", "டீலர்"),
    ("dealer", "டீலர்"),
    ("Team", "டீம்"),
    ("team", "டீம்"),
    ("Executive", "எக்ஸிகியூட்டிவ்"),
    ("executive", "எக்ஸிகியூட்டிவ்"),
    ("Manager", "மேனேஜர்"),
    ("manager", "மேனேஜர்"),
    ("Appointment", "அப்பாயிண்ட்மெண்ட்"),
    ("appointment", "அப்பாயிண்ட்மெண்ட்"),
    ("Consultation", "கன்சல்டேஷன்"),
    ("consultation", "கன்சல்டேஷன்"),
    ("Package", "பேக்கேஜ்"),
    ("package", "பேக்கேஜ்"),
    ("Customer", "கஸ்டமர்"),
    ("customer", "கஸ்டமர்"),
    ("Support", "சப்போர்ட்"),
    ("support", "சப்போர்ட்"),
    ("Call", "கால்"),
    ("call", "கால்"),
    ("Sir", "சார்"),
    ("sir", "சார்"),
    ("Madam", "மேடம்"),
    ("madam", "மேடம்"),
    ("Ramesh", "ரமேஷ்"),
    ("ramesh", "ரமேஷ்"),
    ("Suresh", "சுரேஷ்"),
    ("suresh", "சுரேஷ்"),
    ("Karthik", "கார்த்திக்"),
    ("karthik", "கார்த்திக்"),
    ("Ramkumar", "ராம்குமார்"),
    ("ramkumar", "ராம்குமார்"),
    ("Kousic", "கௌசிக்"),
    ("kousic", "கௌசிக்"),
    ("Arun", "அருண்"),
    ("arun", "அருண்"),
    ("Vikram", "விக்ரம்"),
    ("vikram", "விக்ரம்"),
    ("Priya", "பிரியா"),
    ("priya", "பிரியா"),
    ("Anand", "ஆனந்த்"),
    ("anand", "ஆனந்த்"),
    ("Kumar", "குமார்"),
    ("kumar", "குமார்"),
    ("Rajesh", "ராஜேஷ்"),
    ("rajesh", "ராஜேஷ்"),
    ("Dinesh", "தினேஷ்"),
    ("dinesh", "தினேஷ்"),
    ("Ganesh", "கணேஷ்"),
    ("ganesh", "கணேஷ்"),
    ("Prakash", "பிரகாஷ்"),
    ("prakash", "பிரகாஷ்"),
    ("Senthil", "செந்தில்"),
    ("senthil", "செந்தில்"),
    ("Saravanan", "சரவணன்"),
    ("saravanan", "சரவணன்"),
    ("Vijay", "விஜய்"),
    ("vijay", "விஜய்"),
    ("Ajith", "அஜித்"),
    ("ajith", "அஜித்"),
    ("Surya", "சூர்யா"),
    ("surya", "சூர்யா"),
    # Rejoin any artificially split Tamil postpositions/suffixes so VITS never treats suffixes as isolated words
    ("மோட்டார்ஸ் ல", "மோட்டார்ஸ்ல"),
    ("சப்போர்ட் ல", "சப்போர்ட்ல"),
    ("எர்த் ல", "எர்த்ல"),
    ("ஷோரூம் ல", "ஷோரூம்ல"),
    ("டீம் ல", "டீம்ல"),
    ("வெரிபிகேஷன் காக", "வெரிபிகேஷனுக்காக"),
    ("பண்ணி கலாமா", "பண்ணிக்கலாமா"),
    ("பண்ணி கிட்டோம்", "பண்ணிக்கிட்டோம்"),
    ("டீம் கிட்ட", "டீம்கிட்ட"),
    ("டீலர் கிட்ட", "டீலர்கிட்ட"),
    ("உங்க கிட்ட", "உங்ககிட்ட"),
]


class TamilVits13Engine:
    """
    Single-Voice Deterministic AI4Bharat VITS-Rasa-13 Engine (models/vits_rasa_13_onnx/model.onnx):
    - Locked speaker identity: sid=18 (Tamil Female), emotion_id=4, noise_scale=0.20, noise_scale_w=0.0, length_scale=1.08.
    - Smart Comma Prefix Merger: Merges any <4 word opening prefix ('சார்,', 'சரிங்க சார்,', 'ரொம்ப நன்றி சார்,', 'மன்னிக்கவும் சார்,')
      into the following clause so the VITS Transformer encoder never drops post-comma clauses into a 155-165 Hz chest register.
    - Zero-Phase Syllabic RMS Envelope Leveler: Smoothly levels 180ms syllabic energy across the sentence so mid-sentence
      clauses never drop 50-70% in loudness, without any FFT EQ or spectral warping.
    - Comprehensive per-call [TTS-DEBUG] telemetry logging.
    """

    MODEL_NAME = "ai4bharat/vits_rasa_13 (models/vits_rasa_13_onnx/model.onnx)"
    LOCKED_SID = 18
    LOCKED_EMOTION_ID = 4
    LOCKED_LENGTH_SCALE = 1.28
    LOCKED_NOISE_SCALE = 0.20
    LOCKED_NOISE_SCALE_W = 0.0

    def __init__(self):
        self.sr = 24000
        self.onnx_path = os.path.join(VITS_DIR, "model.onnx")
        self.tokens_path = os.path.join(VITS_DIR, "tokens.txt")

        sess_opts = ort.SessionOptions()
        sess_opts.intra_op_num_threads = max(4, os.cpu_count() or 4)
        sess_opts.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL

        self.sess = ort.InferenceSession(self.onnx_path, sess_options=sess_opts, providers=["CPUExecutionProvider"])
        self.token_map = {}
        with open(self.tokens_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.rstrip("\r\n")
                if not line:
                    continue
                if line.startswith("  "):
                    self.token_map[" "] = int(line.strip())
                else:
                    parts = line.rsplit(" ", 1)
                    if len(parts) == 2:
                        self.token_map[parts[0]] = int(parts[1])

    def normalize_tamil_text(self, text: str) -> str:
        out = text.strip()
        for eng, tam in TAMIL_PHONETIC_MAP:
            out = out.replace(eng, tam)
        out = re.sub(r"(?:ட்)+டாட்டா", "ட்டாட்டா", out)
        out = re.sub(r"\s+ல\s+", "ல ", out)
        out = re.sub(r"[A-Za-z]+", "", out)
        out = re.sub(r"\s*[,;]+\s*", ", ", out).strip()
        out = re.sub(r"\s*[.?!]+\s*", "! ", out).strip()
        out = re.sub(r"(?:[,!]\s*)+$", "", out).strip()
        out = re.sub(r"\s+", " ", out).strip()
        if not out:
            return ""

        # If sentence starts with 1-word 'சார்,' turn it into 'வணக்கம் சார்,' so it has a natural 2-word opening greeting
        if out.startswith("சார்,") or out.startswith("சார்!"):
            out = "வணக்கம் சார்," + out[5:]

        # Ensure opening greetings ('வணக்கம் ... சார்', 'சரிங்க சார்', 'மன்னிக்கவும் சார்', 'ரொம்ப நன்றி சார்')
        # always have a comma pause after 'சார்' so the voice pauses calmly right after greeting the customer!
        out = re.sub(r"^(வணக்கம்(?:\s+\S+)?\s+சார்|சரிங்க\s+சார்|மன்னிக்கவும்\s+சார்|ரொம்ப\s+நன்றி\s+சார்)[,!]?\s+", r"\1, ", out)

        no_break_after = {"ட்டாட்டா", "டெஸ்ட்", "ஹீலிங்", "கஸ்டமர்", "கால்", "புக்", "நோட்", "உங்க", "நம்ம", "எங்க", "ஒரு", "இந்த", "மற்றும்"}
        sentences = [s.strip() for s in out.split("!") if s.strip()]
        out_sentences = []
        for sent in sentences:
            clauses = [c.strip() for c in sent.split(",") if c.strip()]
            merged = []
            carry = ""
            for c in clauses:
                cur = (carry + " " + c).strip() if carry else c
                if len(cur.split()) <= 1:
                    carry = cur
                else:
                    merged.append(cur)
                    carry = ""
            if carry:
                if merged:
                    merged[-1] = (merged[-1] + " " + carry).strip()
                else:
                    merged.append(carry)

            balanced = []
            for c in merged:
                words = c.split()
                if len(words) > 8:
                    mid = len(words) // 2
                    while mid < len(words) - 2 and words[mid - 1] in no_break_after:
                        mid += 1
                    balanced.append(" ".join(words[:mid]))
                    balanced.append(" ".join(words[mid:]))
                else:
                    balanced.append(" ".join(words))
            out_sentences.append(", ".join(balanced).strip())

        final_txt = "! ".join(out_sentences).strip()
        return final_txt + "!"

    def text_to_ids(self, txt: str) -> np.ndarray:
        ids = [0]
        for ch in txt:
            if ch in self.token_map:
                ids.append(self.token_map[ch])
                ids.append(0)
        return np.array([ids], dtype=np.int64)

    def level_syllabic_rms(self, wav: np.ndarray, target_rms: float = 0.145) -> np.ndarray:
        """
        Zero-phase time-domain syllabic automatic gain control (180ms window, 80ms smoothing).
        Prevents VITS mid-sentence volume drops while leaving breath pauses and harmonic timbre untouched.
        """
        if len(wav) < int(0.10 * self.sr):
            return wav
        win = int(0.180 * self.sr)
        sq = wav.astype(np.float64) ** 2
        env = np.sqrt(np.maximum(uniform_filter1d(sq, size=win), 1e-8))
        gain = np.ones_like(env)
        active = env > 0.022
        gain[active] = np.clip(target_rms / env[active], 0.60, 2.25)
        gain = uniform_filter1d(gain, size=int(0.080 * self.sr))
        out = (wav * gain).astype(np.float32)
        pk = float(np.max(np.abs(out)))
        if pk > 1e-4:
            out = out * (0.82 / pk)
        return out

    def expand_natural_comma_pauses(self, raw_wav: np.ndarray, target_pause_sec: float = 0.38) -> np.ndarray:
        """
        Finds true comma/sentence silence valleys (>= 130ms at env < 0.010, never triggered by 50-80ms Tamil
        geminate stop consonants) inside the raw single-pass VITS waveform, levels each clause independently
        with level_syllabic_rms, and inserts a calm 0.48s opening greeting pause and 0.38s clause pause.
        """
        win = int(0.030 * self.sr)
        sq = raw_wav.astype(np.float64) ** 2
        env = np.sqrt(np.maximum(uniform_filter1d(sq, size=win), 1e-9))
        is_sil = env < 0.010
        diffs = np.diff(is_sil.astype(np.int32))
        starts = np.where(diffs == 1)[0]
        ends = np.where(diffs == -1)[0]
        if len(starts) == 0 or len(ends) == 0:
            return self.level_syllabic_rms(raw_wav, target_rms=0.145)
        if ends[0] < starts[0]:
            ends = ends[1:]
        n_pairs = min(len(starts), len(ends))
        starts, ends = starts[:n_pairs], ends[:n_pairs]

        valid_pauses = []
        for s, e in zip(starts, ends):
            if s > int(0.25 * self.sr) and e < len(raw_wav) - int(0.25 * self.sr) and (e - s) >= int(0.130 * self.sr):
                valid_pauses.append((s, e))
        if not valid_pauses:
            return self.level_syllabic_rms(raw_wav, target_rms=0.145)

        pieces = []
        fade_len = int(0.015 * self.sr)
        prev_idx = 0
        for idx, (s, e) in enumerate(valid_pauses):
            clause = self.level_syllabic_rms(raw_wav[prev_idx:s].copy(), target_rms=0.145)
            if len(clause) > fade_len * 2:
                clause[-fade_len:] *= np.linspace(1.0, 0.0, fade_len, dtype=np.float32)
                if prev_idx > 0:
                    clause[:fade_len] *= np.linspace(0.0, 1.0, fade_len, dtype=np.float32)
            pieces.append(clause)
            # Calm 0.48s pause ("நிறுத்தி நிதானமா") right after the opening greeting clause ("வணக்கம் ரமேஷ் சார்,")
            pause_dur = 0.48 if idx == 0 else target_pause_sec
            pieces.append(np.zeros(int(pause_dur * self.sr), dtype=np.float32))
            prev_idx = e

        tail = self.level_syllabic_rms(raw_wav[prev_idx:].copy(), target_rms=0.145)
        if len(tail) > fade_len * 2:
            tail[:fade_len] *= np.linspace(0.0, 1.0, fade_len, dtype=np.float32)
        pieces.append(tail)
        out = np.concatenate(pieces)
        pk = float(np.max(np.abs(out)))
        if pk > 0.84:
            out = out * (0.84 / pk)
        return out

    def compute_audio_diagnostics(self, wav: np.ndarray) -> dict:
        w = int(0.04 * self.sr)
        hop = int(0.01 * self.sr)
        f0s, cents, rmss = [], [], []
        for j in range(0, max(1, len(wav) - w), hop):
            fr = wav[j : j + w]
            if len(fr) < w:
                break
            r = float(np.sqrt(np.mean(fr ** 2)))
            if r < 0.025:
                continue
            rmss.append(r)
            spec = np.abs(np.fft.rfft(fr * np.hanning(w)))
            freqs = np.fft.rfftfreq(w, 1.0 / self.sr)
            cents.append(float(np.sum(freqs * spec) / (np.sum(spec) + 1e-9)))
            c = np.correlate(fr, fr, mode="full")[w - 1 :]
            l1, l2 = int(self.sr / 400), int(self.sr / 85)
            if l2 < len(c):
                pk = l1 + int(np.argmax(c[l1:l2]))
                if c[pk] / (c[0] + 1e-9) > 0.35:
                    f0s.append(float(self.sr / pk))
        f0_arr = np.array(f0s) if f0s else np.array([0.0])
        cent_arr = np.array(cents) if cents else np.array([0.0])
        rms_arr = np.array(rmss) if rmss else np.array([0.0])
        return {
            "dur_s": round(len(wav) / self.sr, 2),
            "f0_med": round(float(np.median(f0_arr)), 1),
            "f0_p10": round(float(np.percentile(f0_arr, 10)), 1),
            "f0_p90": round(float(np.percentile(f0_arr, 90)), 1),
            "f0_std": round(float(np.std(f0_arr)), 1),
            "cent_med": round(float(np.median(cent_arr)), 1),
            "rms_med": round(float(np.median(rms_arr)), 3),
        }

    def synthesize(self, text: str, emotion_id: int = 4, length_scale: float = 1.08) -> str:
        t0 = time.perf_counter()
        norm = self.normalize_tamil_text(text)
        key_str = (
            f"vits13_locked_v14_sid{self.LOCKED_SID}_emo{self.LOCKED_EMOTION_ID}_"
            f"ns{self.LOCKED_NOISE_SCALE}_ls{self.LOCKED_LENGTH_SCALE}_{norm}"
        )
        file_hash = hashlib.md5(key_str.encode("utf-8")).hexdigest()[:16]
        out_wav_path = os.path.join(CACHE_DIR, f"tts_{file_hash}.wav")

        if os.path.exists(out_wav_path):
            with wave.open(out_wav_path, "rb") as wf:
                pcm = np.frombuffer(wf.readframes(wf.getnframes()), dtype=np.int16).astype(np.float32) / 32768.0
            diag = self.compute_audio_diagnostics(pcm)
            print(
                f"[TTS-DEBUG] source=CACHE_HIT | file={os.path.basename(out_wav_path)} | "
                f"model={self.MODEL_NAME} | sid={self.LOCKED_SID} | emotion_id={self.LOCKED_EMOTION_ID} | "
                f"noise_scale={self.LOCKED_NOISE_SCALE} | noise_scale_w={self.LOCKED_NOISE_SCALE_W} | "
                f"length_scale={self.LOCKED_LENGTH_SCALE} | sr={self.sr}Hz | "
                f"dur={diag['dur_s']}s | F0={diag['f0_med']}Hz [{diag['f0_p10']}..{diag['f0_p90']}Hz, std={diag['f0_std']}] | "
                f"Cent={diag['cent_med']}Hz | RMS={diag['rms_med']} | text=\"{norm}\"",
                flush=True,
            )
            return out_wav_path

        x = self.text_to_ids(norm)
        if x.shape[1] <= 2:
            empty_pcm = np.zeros(int(0.2 * self.sr), dtype=np.int16)
            with wave.open(out_wav_path, "wb") as wf:
                wf.setnchannels(1)
                wf.setsampwidth(2)
                wf.setframerate(self.sr)
                wf.writeframes(empty_pcm.tobytes())
            return out_wav_path

        x_length = np.array([x.shape[1]], dtype=np.int64)
        feed = {
            "x": x,
            "x_length": x_length,
            "noise_scale": np.array(self.LOCKED_NOISE_SCALE, dtype=np.float32),
            "length_scale": np.array(self.LOCKED_LENGTH_SCALE, dtype=np.float32),
            "noise_scale_w": np.array(self.LOCKED_NOISE_SCALE_W, dtype=np.float32),
            "sid": np.array([self.LOCKED_SID], dtype=np.int64),
            "emotion_id": np.array([self.LOCKED_EMOTION_ID], dtype=np.int64),
        }

        raw_wav = self.sess.run(None, feed)[0].squeeze().astype(np.float32)
        active = np.where(np.abs(raw_wav) > 0.010)[0]
        if len(active) > 0:
            s_idx = max(0, active[0] - int(0.015 * self.sr))
            e_idx = min(len(raw_wav), active[-1] + int(0.025 * self.sr))
            raw_wav = raw_wav[s_idx:e_idx]

        wav = self.expand_natural_comma_pauses(raw_wav, target_pause_sec=0.38)

        fi = min(len(wav), int(0.012 * self.sr))
        fo = min(len(wav), int(0.020 * self.sr))
        if fi > 0:
            wav[:fi] *= np.linspace(0.0, 1.0, fi, dtype=np.float32)
        if fo > 0:
            wav[-fo:] *= np.linspace(1.0, 0.0, fo, dtype=np.float32)

        pad_head = np.zeros(int(0.05 * self.sr), dtype=np.float32)
        pad_tail = np.zeros(int(0.15 * self.sr), dtype=np.float32)
        full = np.concatenate([pad_head, wav, pad_tail])
        int_pcm = np.clip(full * 32767.0, -32768, 32767).astype(np.int16)

        with wave.open(out_wav_path, "wb") as wf:
            wf.setnchannels(1)
            wf.setsampwidth(2)
            wf.setframerate(self.sr)
            wf.writeframes(int_pcm.tobytes())

        diag = self.compute_audio_diagnostics(full)
        elapsed_ms = round((time.perf_counter() - t0) * 1000.0, 1)
        print(
            f"[TTS-DEBUG] source=ONNX_GENERATED ({elapsed_ms}ms) | file={os.path.basename(out_wav_path)} | "
            f"model={self.MODEL_NAME} | sid={self.LOCKED_SID} | emotion_id={self.LOCKED_EMOTION_ID} | "
            f"noise_scale={self.LOCKED_NOISE_SCALE} | noise_scale_w={self.LOCKED_NOISE_SCALE_W} | "
            f"length_scale={self.LOCKED_LENGTH_SCALE} | sr={self.sr}Hz | "
            f"dur={diag['dur_s']}s | F0={diag['f0_med']}Hz [{diag['f0_p10']}..{diag['f0_p90']}Hz, std={diag['f0_std']}] | "
            f"Cent={diag['cent_med']}Hz | RMS={diag['rms_med']} | text=\"{norm}\"",
            flush=True,
        )

        return out_wav_path
