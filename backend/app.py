# app.py (final)
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
CORS(app, supports_credentials=True)
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
    source = db.Column(db.Enum('med7','bioclinicalbert','regex'))
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)

class Summary(db.Model):
    __tablename__ = "summaries"
    summary_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    upload_id = db.Column(db.Integer, db.ForeignKey("uploads.upload_id"), nullable=False, unique=True)
    summary_text = db.Column(db.Text, nullable=False)  # JSON string
    llm_model_used = db.Column(db.String(100))
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
    sub = int(user.user_id)
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
Return only JSON.
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
    return jsonify({"token": token, "user": user.to_dict()}), 200

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

@api.route("/recommend", methods=["GET"])
@auth_required(roles=["patient"])
def recommend_doctors():
    condition = request.args.get("condition", "")
    user_city = request.current_user.city or request.args.get("city") or ""
    # Lookup doctors who match city and specialization (simple contains)
    q = db.session.query(User, Doctor).join(Doctor, Doctor.doctor_id==User.user_id).filter(User.city.ilike(f"%{user_city}%"))
    results = []
    for user, doc in q.all():
        if condition and condition.lower() not in (doc.specialization or "").lower():
            continue
        results.append({
            "user_id": user.user_id,
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
    return jsonify(results), 200

@api.route("/doctor/<int:doctor_id>", methods=["GET"])
@auth_required(roles=["patient","doctor"])
def get_doctor_profile(doctor_id):
    doc = Doctor.query.get(doctor_id)
    if not doc:
        return jsonify({"message": "Doctor not found"}), 404
    user = User.query.get(doctor_id)
    slots = DoctorSlot.query.filter_by(doctor_id=doctor_id).all()
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
        "experience": int(doc.years_experience or 0),
        "languages": doc.languages or [],
        "clinicAddress": doc.clinic_address,
        "city": user.city if user else None,
        "consultationFee": float(doc.consultation_fee or 0),
        "slots": slots_out
    }
    return jsonify(doc_info), 200

@api.route("/doctor/add-slot", methods=["POST"])
@auth_required(roles=["doctor"])
def add_slot():
    data = request.json or {}
    slot_start = data.get("slot_start")  # expects ISO datetime string
    slot_end = data.get("slot_end")
    if not slot_start or not slot_end:
        return jsonify({"message": "slot_start and slot_end required"}), 400
    try:
        s_start = datetime.datetime.fromisoformat(slot_start)
        s_end = datetime.datetime.fromisoformat(slot_end)
    except Exception:
        return jsonify({"message": "Invalid datetime format. Use ISO format."}), 400

    slot = DoctorSlot(doctor_id=request.current_user.user_id, slot_start=s_start, slot_end=s_end, is_booked=False)
    db.session.add(slot)
    db.session.commit()
    return jsonify({"message": "Slot added", "slot_id": slot.slot_id}), 201

@api.route("/book-appointment", methods=["POST"])
@auth_required(roles=["patient"])
def book_appointment():
    data = request.json or {}
    slot_id = data.get("slot_id")
    if not slot_id:
        return jsonify({"message": "slot_id required"}), 400
    slot = DoctorSlot.query.get(slot_id)
    if not slot or slot.is_booked:
        return jsonify({"message": "Slot not available"}), 400
    appt = Appointment(
        patient_id=request.current_user.user_id,
        doctor_id=slot.doctor_id,
        slot_id=slot.slot_id,
        status="confirmed"
    )
    slot.is_booked = True
    db.session.add(appt)
    db.session.commit()
    return jsonify({"appointment_id": appt.appointment_id}), 201

@api.route("/appointments/<int:appointment_id>/accept", methods=["POST"])
@auth_required(roles=["doctor"])
def accept_appointment(appointment_id):
    appt = Appointment.query.get(appointment_id)
    if not appt or appt.doctor_id != request.current_user.user_id:
        return jsonify({"message": "Appointment not found or forbidden"}), 404
    appt.status = "confirmed"
    db.session.commit()
    return jsonify({"message": "Appointment confirmed"}), 200

@api.route("/appointments/<int:appointment_id>/cancel", methods=["POST"])
@auth_required(roles=["doctor","patient"])
def cancel_appointment(appointment_id):
    appt = Appointment.query.get(appointment_id)
    if not appt:
        return jsonify({"message": "Appointment not found"}), 404
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

@api.route("/uploads/<path:filename>", methods=["GET"])
@auth_required()
def serve_upload(filename):
    # careful: still protected by auth_required
    return send_from_directory(app.config["UPLOAD_FOLDER"], filename, as_attachment=True)

# register blueprint under /api
app.register_blueprint(api, url_prefix="/api")

# CLI helpers
@app.cli.command("seed")
def seed():
    """Seed a sample doctor user (if not exists)"""
    # safe create_all for dev seed; comment out in production
    db.create_all()
    existing = User.query.filter_by(email="dr.joy@example.com").first()
    if existing:
        print("Seed already present")
        return
    pw = generate_password_hash("password")
    user = User(name="Dr Joy", email="dr.joy@example.com", phone="9999999999", password_hash=pw, role="doctor", city="Mumbai")
    db.session.add(user)
    db.session.commit()
    doc = Doctor(doctor_id=user.user_id, specialization="General", years_experience=8, rating=4.5, clinic_address="Mumbai Clinic", languages=["English"])
    db.session.add(doc)
    # add a slot
    start = datetime.datetime.utcnow() + datetime.timedelta(days=1, hours=9)
    end = start + datetime.timedelta(minutes=30)
    slot = DoctorSlot(doctor_id=user.user_id, slot_start=start, slot_end=end, is_booked=False)
    db.session.add(slot)
    db.session.commit()
    print("Seeded doctor and slot")

if __name__ == "__main__":
    # DO NOT call db.create_all() automatically against an existing production DB.
    # If you want SQLAlchemy to create tables in a fresh DB for local dev, uncomment:
    # with app.app_context():
    #     db.create_all()
    app.run(host="0.0.0.0", port=5000, debug=True)
