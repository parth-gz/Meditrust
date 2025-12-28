# app.py (cleaned, deduped) - Appointments start as PENDING
import os
import datetime
import json
import base64
import traceback
from functools import wraps

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from werkzeug.utils import secure_filename
from werkzeug.security import generate_password_hash, check_password_hash
import jwt
from sqlalchemy import text

from dotenv import load_dotenv
load_dotenv()

# Optional Gemini import (only used if GEMINI_API_KEY present)
try:
    import google.generativeai as genai
    GEMINI_AVAILABLE = True
except Exception:
    GEMINI_AVAILABLE = False

# ---------- CONFIG ----------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_FOLDER = os.path.join(BASE_DIR, "uploads")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

SECRET_KEY = os.environ.get("MEDITRUST_SECRET", "change_this_in_production")
DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "mysql+pymysql://root:mysql_password@localhost/meditrust_plus"
)

JWT_EXP_SECONDS = 60 * 60 * 24 * 7  # 7 days
GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")

# configure gemini if available and key present
if GEMINI_AVAILABLE and GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

# ---------- APP & DB ----------
app = Flask(__name__, static_folder=None)
CORS(
    app,
    origins=[
        "http://localhost:8080",
        "http://127.0.0.1:8080",
        "http://10.213.240.44:8080",
    ],
    supports_credentials=True,
    allow_headers="*",
    methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
)





app.config["SQLALCHEMY_DATABASE_URI"] = DATABASE_URL
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER
app.config["SECRET_KEY"] = SECRET_KEY

db = SQLAlchemy(app)

# ---------- MODELS (Match your MySQL DDL exactly) ----------
class User(db.Model):
    __tablename__ = "users"

    user_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(150), unique=True, nullable=False)
    phone = db.Column(db.String(20))
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.Enum('patient', 'doctor'), nullable=False, default='patient')
    city = db.Column(db.String(100))
    pincode = db.Column(db.String(10))
    location_source = db.Column(db.Enum('user_input', 'ip', 'browser', 'map'), default='user_input')
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    def to_dict(self):
        return {
            "user_id": self.user_id,
            "name": self.name,
            "email": self.email,
            "phone": self.phone,
            "city": self.city,
            "pincode": self.pincode,
            "role": self.role
        }

class Doctor(db.Model):
    __tablename__ = "doctors"
    doctor_id = db.Column(db.Integer, db.ForeignKey("users.user_id"), primary_key=True)
    specialization = db.Column(db.String(100), nullable=False)
    years_experience = db.Column(db.Integer, default=0)
    rating = db.Column(db.Float, default=0.0)
    bio = db.Column(db.Text)
    clinic_address = db.Column(db.Text)
    languages = db.Column(db.JSON)  # MySQL JSON
    consultation_fee = db.Column(db.Numeric(10,2))
    verified = db.Column(db.Boolean, default=False)

class Upload(db.Model):
    __tablename__ = "uploads"
    upload_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.user_id"), nullable=False)
    file_path = db.Column(db.Text, nullable=False)
    upload_type = db.Column(db.Enum('prescription', 'report'), nullable=False)
    consent_cloud_ocr = db.Column(db.Boolean, default=False)
    ocr_text = db.Column(db.Text)
    ocr_provider = db.Column(db.Enum('gemini', 'local'))
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)

class MedicalEntity(db.Model):
    __tablename__ = "medical_entities"
    entity_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    upload_id = db.Column(db.Integer, db.ForeignKey("uploads.upload_id"), nullable=False)
    type = db.Column(db.Enum('DRUG','DOSAGE','FREQUENCY','DURATION','CONDITION'), nullable=False)
    text = db.Column(db.String(255), nullable=False)
    normalized_value = db.Column(db.String(255))
    confidence = db.Column(db.Float)
    source = db.Column(db.Enum('med7','bioclinicalbert','regex','gemini'))
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)

class Summary(db.Model):
    __tablename__ = "summaries"
    summary_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    upload_id = db.Column(db.Integer, db.ForeignKey("uploads.upload_id"), nullable=False, unique=True)
    summary_text = db.Column(db.Text, nullable=False)  # JSON string
    llm_model_used = db.Column(db.String(100))
    recommended_specialist = db.Column(db.String(100))
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)

class DoctorRecommendation(db.Model):
    __tablename__ = "doctor_recommendations"
    rec_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.user_id"), nullable=False)
    user_condition = db.Column(db.String(255))
    city = db.Column(db.String(100))
    recommended_doctors = db.Column(db.JSON)
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)

class DoctorSlot(db.Model):
    __tablename__ = "doctor_slots"
    slot_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    doctor_id = db.Column(db.Integer, db.ForeignKey("doctors.doctor_id"), nullable=False)
    slot_start = db.Column(db.DateTime, nullable=False)
    slot_end = db.Column(db.DateTime, nullable=False)
    is_booked = db.Column(db.Boolean, default=False)

class Appointment(db.Model):
    __tablename__ = "appointments"
    appointment_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    patient_id = db.Column(db.Integer, db.ForeignKey("users.user_id"), nullable=False)
    doctor_id = db.Column(db.Integer, db.ForeignKey("doctors.doctor_id"), nullable=False)
    slot_id = db.Column(db.Integer, db.ForeignKey("doctor_slots.slot_id"), nullable=False)
    status = db.Column(db.Enum('pending','confirmed','cancelled','completed'), default='pending')
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

class Notification(db.Model):
    __tablename__ = "notifications"
    notif_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.user_id"), nullable=False)
    appointment_id = db.Column(db.Integer, db.ForeignKey("appointments.appointment_id"))
    message = db.Column(db.Text)
    status = db.Column(db.Enum('pending','sent','failed'), default='pending')
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)

# ---------- AUTH UTILITIES ----------
def create_token(user):
    """
    Always store numeric user_id in sub (int) so lookups are consistent.
    """
    sub = str(user.user_id)
    payload = {
        "sub": sub,
        "role": user.role,
        "exp": datetime.datetime.utcnow() + datetime.timedelta(seconds=JWT_EXP_SECONDS),
    }
    token = jwt.encode(payload, app.config["SECRET_KEY"], algorithm="HS256")
    # PyJWT returns str on modern versions
    if isinstance(token, bytes):
        token = token.decode("utf-8")
    return token

def decode_token(token):
    try:
        payload = jwt.decode(token, app.config["SECRET_KEY"], algorithms=["HS256"])
        return payload
    except Exception:
        return None

def auth_required(roles=None):
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            header = request.headers.get("Authorization", "")

            # Normalize potential line breaks or weird spacing
            header = header.replace("\n", " ").replace("\r", " ").strip()

            parts = header.split()

            if len(parts) != 2 or parts[0] != "Bearer":
                return jsonify({"message": "Missing or invalid auth header"}), 401

            token = parts[1]
            payload = decode_token(token)

            if not payload:
                return jsonify({"message": "Invalid or expired token"}), 401

            sub_lookup = payload.get("sub")
            if isinstance(sub_lookup, str) and sub_lookup.isdigit():
                sub_lookup = int(sub_lookup)

            user = User.query.get(sub_lookup)
            if not user:
                return jsonify({"message": "User not found"}), 401

            if roles and user.role not in roles:
                return jsonify({"message": "Forbidden"}), 403

            request.current_user = user
            return f(*args, **kwargs)
        return decorated
    return decorator

def user_has_medical_profile(user_id: int) -> bool:
    allergy_count = db.session.execute(
        text("SELECT COUNT(*) FROM user_allergies WHERE user_id = :uid"),
        {"uid": user_id}
    ).scalar()

    condition_count = db.session.execute(
        text("SELECT COUNT(*) FROM user_conditions WHERE user_id = :uid"),
        {"uid": user_id}
    ).scalar()

    return (allergy_count or 0) > 0 or (condition_count or 0) > 0

# ---------- OCR / Gemini helpers (optional, run only if GEMINI_API_KEY present) ----------
def clean_json_text(text: str) -> dict:
    """
    Try to parse a response into JSON. Will attempt a few heuristics.
    """
    # naive: find first { and last } and json.loads
    try:
        start = text.find('{')
        end = text.rfind('}')
        if start != -1 and end != -1 and end > start:
            snippet = text[start:end+1]
            return json.loads(snippet)
    except Exception:
        pass

    # fallback: simple wrapped response
    try:
        return json.loads(text)
    except Exception:
        return {"raw": text}

def run_gemini_pipeline(image_path: str) -> (str, dict):
    """
    Returns (ocr_text, analysis_json).
    Requires GEMINI_API_KEY present and google.generativeai installed.
    This is intentionally simple — adapt prompts/model as needed.
    """
    if not GEMINI_AVAILABLE or not GEMINI_API_KEY:
        raise RuntimeError("Gemini not configured on server (GEMINI_API_KEY missing or package unavailable)")

    model = genai.GenerativeModel(GEMINI_MODEL)

    # read image bytes
    with open(image_path, "rb") as f:
        img_bytes = f.read()

    image_b64 = base64.b64encode(img_bytes).decode("utf-8")

    # 1) extract text
    prompt_extract = (
        "Extract the printed/handwritten text exactly from the following image. Return plain text only."
    )
    extract_resp = model.generate_content(
        contents=[
            {
                "role": "user",
                "parts": [
                    {"text": prompt_extract},
                    {"inline_data": {"mime_type": "image/jpeg", "data": image_b64}}
                ],
            }
        ],
    )
    ocr_text = extract_resp.text.strip() if hasattr(extract_resp, "text") else str(extract_resp)

    # 2) analyze and create a structured JSON
    prompt_analyze = f"""
You are a clinical assistant. Given the OCR text below from a prescription or report, return strict JSON with fields:
- condition: short string or empty
- medicines: list of objects {{ name, dosage, frequency, instructions (optional) }}
- explanation: patient-friendly short instructions
- recommended_specialist: the medical specialist type needed based on the condition. 
Examples:
    - fungal infection → Dermatologist
    - fever → General Physician
    - chest pain → Cardiologist
    - ear pain → ENT Specialist
Return strictly JSON only.
OCR_TEXT:
\"\"\"{ocr_text}\"\"\"
"""

    analyze_contents = [
        {
            "role": "user",
            "parts": [
                {"text": prompt_analyze}
            ]
        }
    ]

    analyze_resp = model.generate_content(contents=analyze_contents)

    analysis_text = analyze_resp.text if hasattr(analyze_resp, "text") else str(analyze_resp)
    analysis_json = clean_json_text(analysis_text)
    return ocr_text, analysis_json

# ---------- ROUTES ----------
from flask import Blueprint
api = Blueprint('api', __name__)

@api.route("/signup", methods=["OPTIONS"])
def signup_options():
    return jsonify({"status": "ok"}), 200

@api.route("/signup", methods=["POST"])
def signup():
    data = request.json or {}
    required = ["name", "email", "password", "role"]
    missing = [r for r in required if not data.get(r)]
    if missing:
        return jsonify({"message": f"Missing fields: {', '.join(missing)}"}), 400

    if data["role"] not in ("patient", "doctor"):
        return jsonify({"message": "Invalid role"}), 400

    if User.query.filter_by(email=data["email"]).first():
        return jsonify({"message": "Email already registered"}), 400

    pw_hash = generate_password_hash(data["password"])
    user = User(
        name=data["name"],
        email=data["email"],
        phone=data.get("phone"),
        city=data.get("city"),
        pincode=data.get("pincode"),
        password_hash=pw_hash,
        role=data["role"]
    )
    db.session.add(user)
    db.session.commit()

    # If role is doctor, create a doctors row placeholder so FK relationships work
    if user.role == "doctor":
        doc = Doctor(doctor_id=user.user_id, specialization=data.get("specialization","General"))
        db.session.add(doc)
        db.session.commit()

    return jsonify({"message": "Account created", "user": user.to_dict()}), 201

@api.route("/login", methods=["POST"])
def login():
    data = request.json or {}
    if not data.get("email") or not data.get("password"):
        return jsonify({"message": "email and password required"}), 400
    user = User.query.filter_by(email=data["email"]).first()
    if not user or not check_password_hash(user.password_hash, data["password"]):
        return jsonify({"message": "Invalid credentials"}), 401
    token = create_token(user)
    return jsonify({
    "access_token": token,
    "user": user.to_dict(),
    "needs_medical_profile": not user_has_medical_profile(user.user_id)
    }), 200

@api.route("/allergies", methods=["GET"])
def get_all_allergies():
    rows = db.session.execute(
        text("SELECT allergy_id, name FROM allergies ORDER BY name")
    ).mappings().all()

    allergies = [dict(row) for row in rows]

    return jsonify(allergies), 200



@api.route("/me/allergies", methods=["GET"])
@auth_required(roles=["patient"])
def get_my_allergies():
    rows = db.session.execute(
        text("""
            SELECT a.allergy_id, a.name
            FROM user_allergies ua
            JOIN allergies a ON a.allergy_id = ua.allergy_id
            WHERE ua.user_id = :uid
        """),
        {"uid": request.current_user.user_id}
    ).mappings().all()
    return jsonify(rows), 200


@api.route("/me/allergies", methods=["POST"])
@auth_required(roles=["patient"])
def set_my_allergies():
    data = request.json or {}
    allergy_ids = data.get("allergy_ids", [])
    uid = request.current_user.user_id

    db.session.execute(
        text("DELETE FROM user_allergies WHERE user_id = :uid"),
        {"uid": uid}
    )

    for aid in allergy_ids:
        db.session.execute(
            text("""
                INSERT INTO user_allergies (user_id, allergy_id)
                VALUES (:uid, :aid)
            """),
            {"uid": uid, "aid": aid}
        )

    db.session.commit()
    return jsonify({"message": "Allergies updated"}), 200


@api.route("/me/conditions", methods=["GET"])
@auth_required(roles=["patient"])
def get_my_conditions():
    rows = db.session.execute(
        text("""
            SELECT conditn
            FROM user_conditions
            WHERE user_id = :uid
        """),
        {"uid": request.current_user.user_id}
    ).scalars().all()
    return jsonify(rows), 200


@api.route("/me/conditions", methods=["POST"])
@auth_required(roles=["patient"])
def set_my_conditions():
    data = request.json or {}
    conditions = data.get("conditions", [])
    uid = request.current_user.user_id

    db.session.execute(
        text("DELETE FROM user_conditions WHERE user_id = :uid"),
        {"uid": uid}
    )

    for c in conditions:
        c = c.strip()
        if c:
            db.session.execute(
                text("""
                    INSERT INTO user_conditions (user_id, conditn)
                    VALUES (:uid, :cond)
                """),
                {"uid": uid, "cond": c}
            )

    db.session.commit()
    return jsonify({"message": "Conditions updated"}), 200

# -------------------------
# Save complete medical profile (allergies + conditions)
# -------------------------
@api.route("/medical-profile", methods=["POST"])
@auth_required(roles=["patient"])
def save_medical_profile():
    data = request.json or {}
    allergy_ids = data.get("allergies", [])
    conditions = data.get("conditions", [])

    uid = request.current_user.user_id

    # ---- Allergies ----
    db.session.execute(
        text("DELETE FROM user_allergies WHERE user_id = :uid"),
        {"uid": uid}
    )

    for aid in allergy_ids:
        db.session.execute(
            text("""
                INSERT INTO user_allergies (user_id, allergy_id)
                VALUES (:uid, :aid)
            """),
            {"uid": uid, "aid": aid}
        )

    # ---- Conditions ----
    db.session.execute(
        text("DELETE FROM user_conditions WHERE user_id = :uid"),
        {"uid": uid}
    )

    for c in conditions:
        c = c.strip()
        if c:
            db.session.execute(
                text("""
                    INSERT INTO user_conditions (user_id, conditn)
                    VALUES (:uid, :cond)
                """),
                {"uid": uid, "cond": c}
            )

    db.session.commit()

    return jsonify({
        "message": "Medical profile saved successfully",
        "needs_medical_profile": False
    }), 200

# -------------------------
# Analyze symptoms & recommend doctor (AI)
# -------------------------
@api.route("/symptoms/analyze", methods=["POST"])
@auth_required(roles=["patient"])
def analyze_symptoms():
    data = request.json or {}
    symptoms = data.get("symptoms", "").strip()
    severity = data.get("severity", "mild")

    if not symptoms:
        return jsonify({"message": "Symptoms are required"}), 400

    # If Gemini is not configured, fail gracefully
    if not GEMINI_AVAILABLE or not GEMINI_API_KEY:
        return jsonify({
            "condition": "Unknown",
            "explanation": "AI analysis is currently unavailable. Please consult a doctor directly.",
            "recommended_specialist": "General Physician"
        }), 200

    try:
        model = genai.GenerativeModel(GEMINI_MODEL)

        prompt = f"""
You are a medical assistant AI.

A patient has reported the following symptoms:
Symptoms: {symptoms}
Severity: {severity}

Your task:
1. Suggest a POSSIBLE medical condition (not a confirmed diagnosis).
2. Provide a short, patient-friendly explanation.
3. Recommend the most suitable medical specialist.

Rules:
- Do NOT provide a diagnosis.
- Do NOT suggest medications.
- Use cautious language ("may indicate", "could be related to").
- Keep the explanation under 4 sentences.
- Return STRICT JSON with keys:
  condition, explanation, recommended_specialist

Example:
{{
  "condition": "Possible viral fever",
  "explanation": "These symptoms may indicate a viral infection...",
  "recommended_specialist": "General Physician"
}}
"""

        response = model.generate_content(prompt)

        # Extract and clean JSON
        analysis_text = response.text if hasattr(response, "text") else str(response)
        analysis_json = clean_json_text(analysis_text)

        # Safety fallback
        return jsonify({
            "condition": analysis_json.get("condition", "Unknown"),
            "explanation": analysis_json.get(
                "explanation",
                "Based on the symptoms provided, a doctor consultation is recommended."
            ),
            "recommended_specialist": analysis_json.get(
                "recommended_specialist",
                "General Physician"
            )
        }), 200

    except Exception as e:
        app.logger.exception("Symptom analysis failed")
        return jsonify({
            "condition": "Unknown",
            "explanation": "We encountered an issue while analyzing your symptoms. Please consult a doctor.",
            "recommended_specialist": "General Physician"
        }), 200

# -------------------------
# Recommend doctors from symptom analysis
# -------------------------
@api.route("/recommend/from-symptoms", methods=["POST"])
@auth_required(roles=["patient"])
def recommend_from_symptoms():
    data = request.json or {}

    condition = data.get("condition")
    recommended_specialist = data.get("recommended_specialist")

    if not recommended_specialist:
        return jsonify({"message": "Specialist not provided"}), 400

    # reuse existing recommend logic
    user_city = request.current_user.city or ""

    q = (
        db.session.query(User, Doctor)
        .join(Doctor, Doctor.doctor_id == User.user_id)
        .filter(User.city.ilike(f"%{user_city}%"))
        .filter(Doctor.specialization.ilike(f"%{recommended_specialist}%"))
        .order_by(Doctor.rating.desc())
    )

    doctors = []
    for user, doc in q.all():
        doctors.append({
            "doctor_id": user.user_id,
            "name": user.name,
            "specialization": doc.specialization,
            "rating": float(doc.rating or 0),
            "experience": int(doc.years_experience or 0),
            "clinic_address": doc.clinic_address,
            "consultation_fee": float(doc.consultation_fee or 0)
        })

    return jsonify({
        "condition": condition,
        "recommended_specialist": recommended_specialist,
        "doctors": doctors
    }), 200


@api.route("/upload", methods=["POST"])
@auth_required(roles=["patient","doctor"])
def upload_file():
    try:
        # Accepts multipart/form-data with 'file' and upload_type, consent_cloud_ocr optional
        if "file" not in request.files:
            return jsonify({"message": "No file part"}), 400
        f = request.files["file"]
        if f.filename == "":
            return jsonify({"message": "No selected file"}), 400
        upload_type = request.form.get("upload_type", "prescription")
        consent_flag = request.form.get("consent_cloud_ocr", "false").lower() == "true"

        filename = secure_filename(f.filename)
        unique_name = f"{datetime.datetime.utcnow().strftime('%Y%m%d%H%M%S')}_{filename}"
        path = os.path.join(app.config["UPLOAD_FOLDER"], unique_name)
        f.save(path)

        upload = Upload(
            user_id=request.current_user.user_id,
            file_path=path,
            upload_type=upload_type,
            consent_cloud_ocr=consent_flag
        )
        db.session.add(upload)
        db.session.commit()

        # placeholder summary
        placeholder = {
            "medicines": [],
            "condition": "Processing",
            "explanation": "Your file has been uploaded and will be processed shortly."
        }
        summary = Summary(
            upload_id=upload.upload_id,
            summary_text=json.dumps(placeholder),
            llm_model_used=None
        )
        db.session.add(summary)
        db.session.commit()

        # If consented, run Gemini pipeline synchronously (for demo). In production, enqueue to worker.
        if consent_flag:
            try:
                ocr_text, analysis_json = run_gemini_pipeline(path)
                upload.ocr_text = ocr_text
                upload.ocr_provider = 'gemini'
                db.session.commit()

                summary.summary_text = json.dumps(analysis_json)
                summary.llm_model_used = GEMINI_MODEL if GEMINI_API_KEY else "gemini"
                summary.recommended_specialist = analysis_json.get("recommended_specialist")
                db.session.commit()
            except Exception:
                app.logger.exception("Gemini pipeline failed. Upload saved with placeholder summary.")

        return jsonify({"uploadId": upload.upload_id, "message": "File uploaded"}), 201
    except Exception as e:
        app.logger.error("Upload failed: %s", str(e))
        traceback.print_exc()
        return jsonify({"message": "Server error", "error": str(e)}), 500

@api.route("/upload/<int:upload_id>/summary", methods=["GET"])
@auth_required(roles=["patient","doctor"])
def get_summary(upload_id):
    upload = Upload.query.get(upload_id)
    if not upload:
        return jsonify({"message": "Upload not found"}), 404
    # only owner or doctor can fetch
    if upload.user_id != request.current_user.user_id and request.current_user.role != "doctor":
        return jsonify({"message": "Forbidden"}), 403
    summary = Summary.query.filter_by(upload_id=upload_id).first()
    if not summary:
        return jsonify({"message": "No summary available"}), 404
    try:
        return jsonify(json.loads(summary.summary_text)), 200
    except Exception:
        return jsonify({"summary_text": summary.summary_text}), 200

@api.route("/upload-multiple", methods=["POST"])
@auth_required(roles=["patient", "doctor"])
def upload_multiple():
    try:
        if "files" not in request.files:
            return jsonify({"message": "No files provided"}), 400

        files = request.files.getlist("files")
        upload_type = request.form.get("upload_type", "prescription")
        consent_flag = request.form.get("consent_cloud_ocr", "false").lower() == "true"

        upload_ids = []

        for f in files:
            if f.filename == "":
                continue

            filename = secure_filename(f.filename)
            unique_name = f"{datetime.datetime.utcnow().strftime('%Y%m%d%H%M%S')}_{filename}"
            path = os.path.join(app.config["UPLOAD_FOLDER"], unique_name)
            f.save(path)

            upload = Upload(
                user_id=request.current_user.user_id,
                file_path=path,
                upload_type=upload_type,
                consent_cloud_ocr=consent_flag
            )
            db.session.add(upload)
            db.session.commit()
            upload_ids.append(upload.upload_id)

            placeholder = {
                "condition": "Processing",
                "explanation": "Your file has been uploaded and will be processed shortly.",
                "medicines": []
            }

            summary = Summary(
                upload_id=upload.upload_id,
                summary_text=json.dumps(placeholder),
                llm_model_used=None
            )
            db.session.add(summary)
            db.session.commit()

            # ---- GEMINI PIPELINE ----
            if consent_flag and GEMINI_AVAILABLE and GEMINI_API_KEY:
                try:
                    ocr_text, analysis_json = run_gemini_pipeline(path)

                    upload.ocr_text = ocr_text
                    upload.ocr_provider = "gemini"
                    db.session.commit()

                    summary.summary_text = json.dumps(analysis_json)
                    summary.llm_model_used = GEMINI_MODEL
                    db.session.commit()

                    # medical entities
                    if analysis_json.get("condition"):
                        db.session.add(MedicalEntity(
                            upload_id=upload.upload_id,
                            type="CONDITION",
                            text=analysis_json["condition"],
                            normalized_value=analysis_json["condition"],
                            confidence=1.0,
                            source="gemini"
                        ))

                    for med in analysis_json.get("medicines", []):
                        if med.get("name"):
                            db.session.add(MedicalEntity(
                                upload_id=upload.upload_id,
                                type="DRUG",
                                text=med["name"],
                                normalized_value=med["name"],
                                confidence=1.0,
                                source="gemini"
                            ))
                        if med.get("dosage"):
                            db.session.add(MedicalEntity(
                                upload_id=upload.upload_id,
                                type="DOSAGE",
                                text=med["dosage"],
                                normalized_value=med["dosage"],
                                confidence=1.0,
                                source="gemini"
                            ))
                        if med.get("frequency"):
                            db.session.add(MedicalEntity(
                                upload_id=upload.upload_id,
                                type="FREQUENCY",
                                text=med["frequency"],
                                normalized_value=med["frequency"],
                                confidence=1.0,
                                source="gemini"
                            ))

                    db.session.commit()

                except Exception:
                    traceback.print_exc()
                    db.session.rollback()

        return jsonify({"uploads": upload_ids}), 201

    except Exception as e:
        traceback.print_exc()
        return jsonify({"message": "Server error", "error": str(e)}), 500

@api.route("/uploads/my", methods=["GET"])
@auth_required(roles=["patient","doctor"])
def get_my_uploads():
    uploads = (
        Upload.query
        .filter_by(user_id=request.current_user.user_id)
        .order_by(Upload.created_at.desc())
        .all()
    )

    out = []
    for u in uploads:
        out.append({
            "upload_id": u.upload_id,
            "type": u.upload_type,
            "file_name": u.file_path.split("/")[-1],
            "created_at": u.created_at.isoformat(),
            "status": "Processed" if u.ocr_text else "Uploaded"
        })

    return jsonify(out), 200

@api.route("/recommend", methods=["GET"])
@auth_required(roles=["patient"])
def recommend_doctors():
    # 1) fetch patient city
    user_city = request.current_user.city or request.args.get("city") or ""

    # 2) try to get recommended_specialist from latest summary
    latest_summary = Summary.query \
        .join(Upload, Upload.upload_id == Summary.upload_id) \
        .filter(Upload.user_id == request.current_user.user_id) \
        .order_by(Summary.created_at.desc()) \
        .first()

    recommended_specialist = None
    if latest_summary:
        try:
            summary_json = json.loads(latest_summary.summary_text)
            recommended_specialist = summary_json.get("recommended_specialist")
        except Exception:
            pass

    # 3) fallback: query param
    if not recommended_specialist:
        recommended_specialist = request.args.get("specialist")

    condition = request.args.get("condition")
    if not recommended_specialist and condition:
        recommended_specialist = condition

    # 4) build doctor query
    q = (
        db.session.query(User, Doctor)
        .join(Doctor, Doctor.doctor_id == User.user_id)
        .filter(User.city.ilike(f"%{user_city}%"))
    )

    if recommended_specialist:
        q = q.filter(Doctor.specialization.ilike(f"%{recommended_specialist}%"))

    q = q.order_by(Doctor.rating.desc())

    results = []
    for user, doc in q.all():
        results.append({
            "doctor_id": user.user_id,
            "name": user.name,
            "email": user.email,
            "phone": user.phone,
            "city": user.city,
            "specialization": doc.specialization,
            "rating": float(doc.rating or 0),
            "experience": int(doc.years_experience or 0),
            "clinicAddress": doc.clinic_address,
            "consultationFee": float(doc.consultation_fee or 0)
        })

    # log recommendation
    log = DoctorRecommendation(
        user_id=request.current_user.user_id,
        user_condition=recommended_specialist or condition,
        city=user_city,
        recommended_doctors=results
    )
    db.session.add(log)
    db.session.commit()

    return jsonify(results), 200

# -------------------------
# Doctor profile & slots (single canonical implementations)
# -------------------------
@api.route("/doctor/<int:doctor_id>", methods=["GET"])
@auth_required(roles=["patient","doctor"])
def doctor_profile_route(doctor_id):
    doc = Doctor.query.get(doctor_id)
    if not doc:
        return jsonify({"message": "Doctor not found"}), 404
    user = User.query.get(doctor_id)

    slots = DoctorSlot.query.filter_by(doctor_id=doctor_id).order_by(DoctorSlot.slot_start.asc()).all()
    slots_out = [{
        "slot_id": s.slot_id,
        "slot_start": s.slot_start.isoformat(),
        "slot_end": s.slot_end.isoformat(),
        "is_booked": s.is_booked
    } for s in slots]

    doc_info = {
        "doctor_id": doc.doctor_id,
        "name": user.name if user else None,
        "specialization": doc.specialization,
        "rating": float(doc.rating or 0),
        "years_experience": int(doc.years_experience or 0),
        "languages": doc.languages or [],
        "clinic_address": doc.clinic_address,
        "city": user.city if user else None,
        "consultation_fee": float(doc.consultation_fee or 0),
        "bio": doc.bio,
        "slots": slots_out
    }
    return jsonify(doc_info), 200

@api.route("/doctor/<int:doctor_id>/slots", methods=["GET"])
@auth_required(roles=["patient", "doctor"])
def doctor_slots_route(doctor_id):
    slots = DoctorSlot.query.filter_by(doctor_id=doctor_id).order_by(DoctorSlot.slot_start.asc()).all()

    output = []
    for s in slots:
        output.append({
            "slot_id": s.slot_id,
            "slot_start": s.slot_start.isoformat(),
            "slot_end": s.slot_end.isoformat(),
            "is_booked": s.is_booked
        })

    return jsonify(output), 200

@api.route("/slots/<int:slot_id>", methods=["GET"])
@auth_required(roles=["patient", "doctor"])
def slot_details_route(slot_id):
    slot = DoctorSlot.query.get(slot_id)
    if not slot:
        return jsonify({"message": "Slot not found"}), 404

    doctor = Doctor.query.get(slot.doctor_id)
    user = User.query.get(slot.doctor_id)

    return jsonify({
        "slot_id": slot.slot_id,
        "slot_start": slot.slot_start.isoformat(),
        "slot_end": slot.slot_end.isoformat(),
        "doctor_name": user.name if user else None,
        "doctor_specialization": doctor.specialization if doctor else None,
        "clinic_address": doctor.clinic_address if doctor else None
    }), 200

# -------------------------
# Add slot (doctor)
# -------------------------
@api.route("/doctor/add-slot", methods=["POST"])
@auth_required(roles=["doctor"])
def doctor_addslot_route():
    data = request.json or {}
    # Support both ISO datetimes and date + time fields
    slot_start = data.get("slot_start")
    slot_end = data.get("slot_end")
    date = data.get("date")
    start_time = data.get("startTime")
    duration = int(data.get("duration", 30))

    try:
        if slot_start and slot_end:
            s_start = datetime.datetime.fromisoformat(slot_start)
            s_end = datetime.datetime.fromisoformat(slot_end)
        elif date and start_time:
            s_start = datetime.datetime.fromisoformat(f"{date}T{start_time}")
            s_end = s_start + datetime.timedelta(minutes=duration)
        else:
            return jsonify({"message": "Provide slot_start/slot_end ISO or date + startTime"}), 400
    except Exception:
        return jsonify({"message": "Invalid datetime format. Use ISO format."}), 400

    slot = DoctorSlot(doctor_id=request.current_user.user_id, slot_start=s_start, slot_end=s_end, is_booked=False)
    db.session.add(slot)
    db.session.commit()
    return jsonify({"message": "Slot added", "slot_id": slot.slot_id}), 201

# -------------------------
# Book appointment (patient) - starts as PENDING
# -------------------------
@api.route("/appointments", methods=["POST"])
@auth_required(roles=["patient"])
def appointments_create_route():
    data = request.json or {}
    slot_id = data.get("slot_id")
    if not slot_id:
        return jsonify({"message": "slot_id required"}), 400

    slot = DoctorSlot.query.get(slot_id)
    if not slot or slot.is_booked:
        return jsonify({"message": "Slot not available"}), 400

    # mark slot booked, create appointment as pending
    slot.is_booked = True
    appt = Appointment(
        patient_id=request.current_user.user_id,
        doctor_id=slot.doctor_id,
        slot_id=slot.slot_id,
        status="pending"
    )
    db.session.add(appt)
    db.session.commit()

    return jsonify({"appointment_id": appt.appointment_id}), 201

# -------------------------
# Doctor: list appointments
# -------------------------
@api.route("/doctor/appointments", methods=["GET"])
@auth_required(roles=["doctor"])
def doctor_appointments_route():
    doctor_id = request.current_user.user_id

    appointments = (
        Appointment.query
        .filter_by(doctor_id=doctor_id)
        .order_by(Appointment.created_at.desc())
        .all()
    )

    out = []
    for a in appointments:
        slot = DoctorSlot.query.get(a.slot_id)
        patient = User.query.get(a.patient_id)
        out.append({
            "appointment_id": a.appointment_id,
            "patient_name": patient.name if patient else None,
            "date": slot.slot_start.strftime("%Y-%m-%d") if slot else None,
            "time": slot.slot_start.strftime("%I:%M %p") if slot else None,
            "status": a.status
        })

    return jsonify(out), 200

# -------------------------
# Accept appointment (doctor)
# -------------------------
@api.route("/appointments/<int:appointment_id>/accept", methods=["POST"])
@auth_required(roles=["doctor"])
def appointment_accept_route(appointment_id):
    appt = Appointment.query.get(appointment_id)
    if not appt or appt.doctor_id != request.current_user.user_id:
        return jsonify({"message": "Appointment not found or forbidden"}), 404
    appt.status = "confirmed"
    db.session.commit()
    return jsonify({"message": "Appointment confirmed"}), 200

# -------------------------
# Cancel appointment (doctor or patient)
# -------------------------
@api.route("/appointments/<int:appointment_id>/cancel", methods=["POST"])
@auth_required(roles=["doctor","patient"])
def appointment_cancel_route(appointment_id):
    appt = Appointment.query.get(appointment_id)
    if not appt:
        return jsonify({"message": "Appointment not found"}), 404

    # authorization
    if request.current_user.role == "doctor" and appt.doctor_id != request.current_user.user_id:
        return jsonify({"message": "Forbidden"}), 403
    if request.current_user.role == "patient" and appt.patient_id != request.current_user.user_id:
        return jsonify({"message": "Forbidden"}), 403

    appt.status = "cancelled"
    db.session.commit()

    # free the slot
    slot = DoctorSlot.query.get(appt.slot_id)
    if slot:
        slot.is_booked = False
        db.session.commit()

    return jsonify({"message": "Appointment cancelled"}), 200

# -------------------------
# Serve uploaded files (protected)
# -------------------------
@api.route("/uploads/<path:filename>", methods=["GET"])
@auth_required()
def serve_upload(filename):
    return send_from_directory(app.config["UPLOAD_FOLDER"], filename, as_attachment=True)

@api.route("/appointments/my", methods=["GET"])
@auth_required(roles=["patient"])
def my_appointments_route():
    user_id = request.current_user.user_id

    appts = (
        Appointment.query
        .filter_by(patient_id=user_id)
        .order_by(Appointment.created_at.desc())
        .all()
    )

    out = []
    for a in appts:
        slot = DoctorSlot.query.get(a.slot_id)
        doctor_user = User.query.get(a.doctor_id)
        doctor_info = Doctor.query.get(a.doctor_id)

        out.append({
            "appointment_id": a.appointment_id,
            "patient_id": a.patient_id,
            "doctor_id": a.doctor_id,

            # doctor details
            "doctor_name": doctor_user.name if doctor_user else None,
            "doctor_specialization": doctor_info.specialization if doctor_info else None,
            "doctor_experience": doctor_info.years_experience if doctor_info else None,
            "doctor_clinic": doctor_info.clinic_address if doctor_info else None,
            "doctor_fee": float(doctor_info.consultation_fee or 0) if doctor_info else None,

            # slot time
            "slot_start": slot.slot_start.isoformat() if slot else None,

            # appointment status
            "status": a.status
        })

    return jsonify(out), 200

# -------------------------
# Update slot (doctor) - Option A: PUT /doctor/slot/<slot_id>
# -------------------------
@api.route("/doctor/slot/<int:slot_id>", methods=["PUT"])
@auth_required(roles=["doctor"])
def doctor_update_slot_route(slot_id):
    data = request.json or {}
    # Only doctor owning the slot can edit
    slot = DoctorSlot.query.get(slot_id)
    if not slot:
        return jsonify({"message": "Slot not found"}), 404
    if slot.doctor_id != request.current_user.user_id:
        return jsonify({"message": "Forbidden"}), 403

    # Accept payload fields: date (YYYY-MM-DD) or slot_start iso, startTime (HH:MM), duration (minutes)
    try:
        if data.get("slot_start"):
            new_start = datetime.datetime.fromisoformat(data["slot_start"])
            duration = int(data.get("duration", int((slot.slot_end - slot.slot_start).total_seconds() / 60)))
            new_end = new_start + datetime.timedelta(minutes=duration)
        elif data.get("date") and data.get("startTime"):
            new_start = datetime.datetime.fromisoformat(f"{data['date']}T{data['startTime']}")
            duration = int(data.get("duration", int((slot.slot_end - slot.slot_start).total_seconds() / 60)))
            new_end = new_start + datetime.timedelta(minutes=duration)
        else:
            return jsonify({"message": "Provide slot_start ISO or date + startTime"}), 400
    except Exception as e:
        return jsonify({"message": "Invalid datetime format", "error": str(e)}), 400

    # If slot is already booked, disallow changing start time (or optionally allow — here we disallow)
    if slot.is_booked:
        return jsonify({"message": "Cannot edit a booked slot"}), 400

    slot.slot_start = new_start
    slot.slot_end = new_end
    db.session.commit()

    return jsonify({
        "message": "Slot updated",
        "slot_id": slot.slot_id,
        "slot_start": slot.slot_start.isoformat(),
        "slot_end": slot.slot_end.isoformat()
    }), 200

# -------------------------
# Delete slot (doctor)
# -------------------------
@api.route("/doctor/slot/<int:slot_id>", methods=["DELETE"])
@auth_required(roles=["doctor"])
def doctor_delete_slot_route(slot_id):
    slot = DoctorSlot.query.get(slot_id)
    if not slot:
        return jsonify({"message": "Slot not found"}), 404
    if slot.doctor_id != request.current_user.user_id:
        return jsonify({"message": "Forbidden"}), 403

    # If slot is booked, disallow deletion (alternatively cancel appointment first). We will disallow to be safe.
    if slot.is_booked:
        return jsonify({"message": "Cannot delete a booked slot"}), 400

    db.session.delete(slot)
    db.session.commit()
    return jsonify({"message": "Slot deleted", "slot_id": slot_id}), 200


# register blueprint under /api
app.register_blueprint(api, url_prefix="/api")


if __name__ == "__main__":
    # DO NOT call db.create_all() automatically against an existing production DB.
    # If you want SQLAlchemy to create tables in a fresh DB for local dev, uncomment:
    # with app.app_context():
    #     db.create_all()
    app.run(host="0.0.0.0", port=5000, debug=True)
