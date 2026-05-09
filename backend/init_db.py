"""
Initialize the SQLite database with all tables and seed data.
Run this ONCE before starting the app for the first time:
    python init_db.py
"""
import os
import json
import datetime
from app import app, db, User, Doctor, DoctorSlot
from sqlalchemy import text, event, inspect
from werkzeug.security import generate_password_hash

def enable_sqlite_fk(dbapi_conn, connection_record):
    """Enable foreign key support in SQLite."""
    cursor = dbapi_conn.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()

def init():
    with app.app_context():
        # Enable foreign keys for SQLite
        if "sqlite" in app.config["SQLALCHEMY_DATABASE_URI"]:
            event.listen(db.engine, "connect", enable_sqlite_fk)

        # Create all SQLAlchemy-defined tables
        db.create_all()

        # Create extra tables that aren't in the ORM models
        inspector = inspect(db.engine)
        existing = inspector.get_table_names()

        if "allergies" not in existing:
            db.session.execute(text("""
                CREATE TABLE allergies (
                    allergy_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name VARCHAR(100) NOT NULL UNIQUE,
                    category VARCHAR(20) DEFAULT 'other'
                )
            """))

        if "user_allergies" not in existing:
            db.session.execute(text("""
                CREATE TABLE user_allergies (
                    user_id INTEGER NOT NULL,
                    allergy_id INTEGER NOT NULL,
                    PRIMARY KEY (user_id, allergy_id),
                    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
                    FOREIGN KEY (allergy_id) REFERENCES allergies(allergy_id) ON DELETE CASCADE
                )
            """))

        if "user_conditions" not in existing:
            db.session.execute(text("""
                CREATE TABLE user_conditions (
                    condition_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    conditn VARCHAR(255) NOT NULL,
                    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
                )
            """))

        if "user_medical_profile" not in existing:
            db.session.execute(text("""
                CREATE TABLE user_medical_profile (
                    user_id INTEGER PRIMARY KEY,
                    date_of_birth DATE,
                    gender VARCHAR(20),
                    blood_group VARCHAR(5),
                    height_cm INTEGER,
                    weight_kg INTEGER,
                    is_smoker BOOLEAN DEFAULT 0,
                    alcohol_use BOOLEAN DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
                )
            """))

        db.session.commit()

        # ---- SEED DATA ----
        # Only seed if the users table is empty
        user_count = db.session.execute(text("SELECT COUNT(*) FROM users")).scalar()
        if user_count > 0:
            print(f"Database already has {user_count} users. Skipping seed.")
            return

        print("Seeding database...")

        # --- Allergies ---
        allergies_data = [
            ('Penicillin', 'drug'), ('Peanuts', 'food'), ('Shellfish', 'food'),
            ('Eggs', 'food'), ('Milk', 'food'), ('Soy', 'food'),
            ('Wheat', 'food'), ('Tree Nuts', 'food'), ('Latex', 'environment'),
            ('Sulfa Drugs', 'drug'), ('NSAIDs', 'drug'), ('Aspirin', 'drug'),
            ('Ibuprofen', 'drug'), ('Sesame', 'food'), ('Gluten', 'food'),
            ('Dust Mites', 'environment'), ('Pollen', 'environment'),
            ('Pet Dander', 'environment'), ('Mold', 'environment'),
            ('Insect Stings', 'environment'), ('Contrast Dye', 'drug'),
        ]
        for name, cat in allergies_data:
            db.session.execute(
                text("INSERT INTO allergies (name, category) VALUES (:n, :c)"),
                {"n": name, "c": cat}
            )

        # --- Doctor Users ---
        doctors_seed = [
            # (name, email, phone, city, pincode)
            ('Dr. Ajay Shinde', 'ajay.shinde@example.com', '9876543201', 'Ahmednagar', '414001'),
            ('Dr. Priya Jagtap', 'priya.jagtap@example.com', '9876543202', 'Ahmednagar', '414002'),
            ('Dr. Nitin Bhor', 'nitin.bhor@example.com', '9876543203', 'Ahmednagar', '414003'),
            ('Dr. Kalyani Khomane', 'kalyani.k@example.com', '9876543204', 'Ahmednagar', '414004'),
            ('Dr. Sagar Auti', 'sagar.auti@example.com', '9876543205', 'Ahmednagar', '414005'),
            ('Dr. Tejas Patil', 'tejas.patil@example.com', '9876543206', 'Pune', '411001'),
            ('Dr. Sneha Kulkarni', 'sneha.k@example.com', '9876543207', 'Pune', '411002'),
            ('Dr. Mangesh Ghorpade', 'mangesh.g@example.com', '9876543208', 'Pune', '411003'),
            ('Dr. Rucha Wagh', 'rucha.wagh@example.com', '9876543209', 'Pune', '411004'),
            ('Dr. Onkar Satpute', 'onkar.s@example.com', '9876543210', 'Pune', '411005'),
            ('Dr. Ashwini Kedar', 'ashwini.kedar@example.com', '9876543211', 'Mumbai', '400001'),
            ('Dr. Akash More', 'akash.more@example.com', '9876543212', 'Mumbai', '400002'),
            ('Dr. Shital Pawar', 'shital.p@example.com', '9876543213', 'Mumbai', '400003'),
            ('Dr. Atul Dhone', 'atul.dhone@example.com', '9876543214', 'Mumbai', '400004'),
            ('Dr. Manasi Lohar', 'manasi.lohar@example.com', '9876543215', 'Mumbai', '400005'),
            ('Dr. Rohit Gite', 'rohit.g@example.com', '9876543216', 'Nashik', '422001'),
            ('Dr. Kavita Nikam', 'kavita.n@example.com', '9876543217', 'Nashik', '422002'),
            ('Dr. Omkar Jadhav', 'omkar.j@example.com', '9876543218', 'Nashik', '422003'),
            ('Dr. Shweta Borawake', 'shweta.b@example.com', '9876543219', 'Nashik', '422004'),
            ('Dr. Ganesh Shelke', 'ganesh.s@example.com', '9876543220', 'Nashik', '422005'),
            ('Dr. Rohan Ghule', 'rohan.ghule@example.com', '9876543221', 'Pune', '411006'),
            ('Dr. Varsha Pawar', 'varsha.pawar@example.com', '9876543222', 'Mumbai', '400006'),
            ('Dr. Jayesh Patole', 'jayesh.p@example.com', '9876543223', 'Ahmednagar', '414006'),
            ('Dr. Anjali Phuke', 'anjali.phuke@example.com', '9876543224', 'Pune', '411007'),
            ('Dr. Vaibhav Shirsat', 'vaibhav.s@example.com', '9876543225', 'Nashik', '422006'),
            ('Dr. Manish Mhaske', 'manish.m@example.com', '9876543226', 'Ahmednagar', '414007'),
            ('Dr. Sayali Kshirsagar', 'sayali.ks@example.com', '9876543227', 'Mumbai', '400007'),
            ('Dr. Aditya Thombre', 'aditya.t@example.com', '9876543228', 'Pune', '411008'),
            ('Dr. Komal Salve', 'komal.s@example.com', '9876543229', 'Nashik', '422007'),
            ('Dr. Sameer Gujar', 'sameer.g@example.com', '9876543230', 'Ahmednagar', '414008'),
            ('Dr. Pooja Landge', 'pooja.l@example.com', '9876543231', 'Mumbai', '400008'),
            ('Dr. Prasad Nalawade', 'prasad.n@example.com', '9876543232', 'Pune', '411009'),
            ('Dr. Rutuja Biradar', 'rutuja.b@example.com', '9876543233', 'Nashik', '422008'),
            ('Dr. Swapnil Kokate', 'swapnil.k@example.com', '9876543234', 'Ahmednagar', '414009'),
            ('Dr. Amruta Jagtap', 'amruta.j@example.com', '9876543235', 'Mumbai', '400009'),
            ('Dr. Rahul Aher', 'rahul.aher@example.com', '9876543236', 'Nashik', '422009'),
            ('Dr. Nandini Shinde', 'nandini.s@example.com', '9876543237', 'Pune', '411010'),
            ('Dr. Suyog Jaware', 'suyog.j@example.com', '9876543238', 'Ahmednagar', '414010'),
            ('Dr. Bhavana Kute', 'bhavana.k@example.com', '9876543239', 'Mumbai', '400010'),
            ('Dr. Suraj Nalge', 'suraj.n@example.com', '9876543240', 'Nashik', '422010'),
            ('Dr. Mohini Borse', 'mohini.b@example.com', '9876543241', 'Pune', '411011'),
            ('Dr. Kiran Chavan', 'kiran.c@example.com', '9876543242', 'Mumbai', '400011'),
            ('Dr. Tanvi Sonawane', 'tanvi.s@example.com', '9876543243', 'Ahmednagar', '414011'),
            ('Dr. Akshay Kakade', 'akshay.k@example.com', '9876543244', 'Nashik', '422011'),
            ('Dr. Medha Nalge', 'medha.n@example.com', '9876543245', 'Pune', '411012'),
            ('Dr. Suvarna Gitte', 'suvarna.gitte@example.com', '9876551001', 'Ahmednagar', '414001'),
            ('Dr. Mahesh Lakhe', 'mahesh.lakhe@example.com', '9876551002', 'Ahmednagar', '414001'),
            ('Dr. Manasi Kanse', 'manasi.kanse@example.com', '9876551003', 'Ahmednagar', '414001'),
            ('Dr. Swapnil Kolhe', 'swapnil.kolhe@example.com', '9876551004', 'Ahmednagar', '414001'),
        ]

        user_ids = {}
        for name, email, phone, city, pincode in doctors_seed:
            u = User(
                name=name, email=email, phone=phone,
                password_hash=generate_password_hash("dummy"),
                role='doctor', city=city, pincode=pincode
            )
            db.session.add(u)
            db.session.flush()
            user_ids[name] = u.user_id

        # --- Doctor specializations ---
        # (name, specialization, years_exp, rating, bio, clinic_address, languages_json, fee)
        doctors_details = [
            ('Dr. Ajay Shinde', 'Dermatologist', 10, 4.2, 'Experienced dermatologist from Ahmednagar.', 'Ahmednagar City Clinic', '["Marathi","Hindi"]', 300),
            ('Dr. Priya Jagtap', 'Dermatologist', 12, 4.5, 'Skin specialist with 12 years experience.', 'Shinde Skin Clinic, Ahmednagar', '["Marathi","English"]', 500),
            ('Dr. Nitin Bhor', 'Cardiologist', 15, 4.8, 'Heart expert with advanced practice.', 'Patil Heart Care, Pune', '["Marathi","English"]', 900),
            ('Dr. Kalyani Khomane', 'General Physician', 8, 4.1, 'Internal medicine and primary care.', 'Kulkarni Polyclinic, Pune', '["Marathi"]', 350),
            ('Dr. Sagar Auti', 'ENT Specialist', 10, 4.4, 'Ear, Nose & Throat specialist.', 'Ghorpade ENT Center, Pune', '["Marathi","Hindi"]', 450),
            ('Dr. Tejas Patil', 'Pediatrician', 7, 4.3, 'Specialist for children and infants.', 'Jagtap Children Hospital, Pune', '["Marathi","English"]', 400),
            ('Dr. Sneha Kulkarni', 'Orthopedic', 11, 4.6, 'Bone & joint expert.', 'More Ortho Care, Mumbai', '["Marathi","English"]', 700),
            ('Dr. Mangesh Ghorpade', 'Neurologist', 14, 4.7, 'Brain and nerve specialist.', 'Dhone Neuro Clinic, Mumbai', '["Marathi","English"]', 1000),
            ('Dr. Rucha Wagh', 'Gynecologist', 9, 4.3, 'Women health and maternity care.', 'Pawar Women Clinic, Mumbai', '["Marathi"]', 650),
            ('Dr. Onkar Satpute', 'Dentist', 8, 4.1, 'Dental and oral care expert.', 'Lohar Dental Clinic, Mumbai', '["Marathi"]', 300),
            ('Dr. Ashwini Kedar', 'Psychiatrist', 13, 4.5, 'Mental health and counselling.', 'Wagh MindCare, Mumbai', '["Marathi","English"]', 750),
            ('Dr. Akash More', 'Pediatrician', 8, 4.2, 'Child health specialist.', 'Nikam Kids Care, Nashik', '["Marathi"]', 400),
            ('Dr. Shital Pawar', 'ENT Specialist', 7, 4.0, 'ENT surgeon with 7 years exp.', 'Jadhav ENT Center, Nashik', '["Marathi"]', 430),
            ('Dr. Atul Dhone', 'General Physician', 9, 4.1, 'General medicine specialist.', 'Shelke Family Clinic, Nashik', '["Marathi","English"]', 320),
            ('Dr. Manasi Lohar', 'Gynecologist', 12, 4.5, 'Women health surgeon.', 'Borawake Maternity Home, Nashik', '["Marathi"]', 650),
            ('Dr. Rohit Gite', 'Orthopedic', 8, 4.2, 'Expert in fractures & joints.', 'Ghule Ortho Clinic, Pune', '["Marathi"]', 600),
            ('Dr. Kavita Nikam', 'Cardiologist', 14, 4.6, 'Cardiac specialist.', 'Pawar Heart Institute, Pune', '["Marathi","English"]', 950),
            ('Dr. Omkar Jadhav', 'Dentist', 5, 4.0, 'Routine and cosmetic dentistry.', 'Patole Dental Care, Ahmednagar', '["Marathi"]', 300),
            ('Dr. Shweta Borawake', 'ENT Specialist', 9, 4.2, 'ENT disorders specialist.', 'Phuke ENT Center, Ahmednagar', '["Marathi"]', 450),
            ('Dr. Ganesh Shelke', 'General Physician', 6, 4.1, 'Primary medicine practice.', 'Shirsat Clinic, Ahmednagar', '["Marathi","English"]', 350),
            ('Dr. Rohan Ghule', 'Dermatologist', 10, 4.4, 'Acne & skin treatment specialist.', 'Mhaske Skin Care, Mumbai', '["Marathi"]', 500),
            ('Dr. Varsha Pawar', 'Psychiatrist', 11, 4.5, 'Mental wellness & therapy.', 'Kshirsagar MindCare, Mumbai', '["Marathi","English"]', 700),
            ('Dr. Jayesh Patole', 'Orthopedic', 8, 4.2, 'Sports injuries & knee expert.', 'Thombre Ortho Center, Pune', '["Marathi"]', 650),
            ('Dr. Anjali Phuke', 'Dentist', 7, 4.1, 'Root canal & braces expert.', 'Salve Dental Care, Pune', '["Marathi","English"]', 350),
            ('Dr. Vaibhav Shirsat', 'Gynecologist', 13, 4.6, 'High-risk pregnancy care.', 'Gujar Women Health, Ahmednagar', '["Marathi"]', 700),
            ('Dr. Manish Mhaske', 'Pediatrician', 9, 4.3, 'Vaccination & child care.', 'Landge Children Hospital, Nashik', '["Marathi"]', 420),
            ('Dr. Sayali Kshirsagar', 'Dermatologist', 8, 4.1, 'Hair & skin specialist.', 'Nalawade Skin Clinic, Nashik', '["Marathi"]', 480),
            ('Dr. Aditya Thombre', 'General Physician', 6, 4.0, 'Family healthcare.', 'Biradar Clinic, Nashik', '["Marathi"]', 300),
            ('Dr. Komal Salve', 'Orthopedic', 10, 4.4, 'Joint replacement & spine.', 'Kokate Ortho Care, Mumbai', '["Marathi"]', 750),
            ('Dr. Sameer Gujar', 'Gynecologist', 12, 4.5, 'Women health & surgery.', 'Jagtap Women Center, Pune', '["Marathi"]', 650),
            ('Dr. Pooja Landge', 'Cardiologist', 14, 4.7, 'Heart failure & ECG specialist.', 'Aher Heart Hospital, Pune', '["Marathi"]', 900),
            ('Dr. Prasad Nalawade', 'ENT Specialist', 7, 4.0, 'Throat surgeries & allergies.', 'Shinde ENT Care, Mumbai', '["Marathi"]', 430),
            ('Dr. Rutuja Biradar', 'Orthopedic', 11, 4.3, 'Spine & fracture care.', 'Jaware Ortho Hospital, Nashik', '["Marathi"]', 680),
            ('Dr. Swapnil Kokate', 'Psychiatrist', 10, 4.4, 'Depression & stress treatment.', 'Kute Wellness Center, Pune', '["Marathi","English"]', 760),
            ('Dr. Amruta Jagtap', 'Dentist', 5, 4.0, 'Teeth whitening & RCT.', 'Nalge Dental Clinic, Nashik', '["Marathi"]', 320),
            ('Dr. Rahul Aher', 'General Physician', 8, 4.2, 'Routine and chronic illness.', 'Borse Clinic, Mumbai', '["Marathi"]', 350),
            ('Dr. Nandini Shinde', 'Dermatologist', 9, 4.3, 'Skin allergies & cosmetic care.', 'Chavan Skin Center, Pune', '["Marathi"]', 500),
            ('Dr. Suyog Jaware', 'Pediatrician', 7, 4.1, 'Child specialist & NICU care.', 'Sonawane Kids Clinic, Ahmednagar', '["Marathi"]', 400),
            ('Dr. Bhavana Kute', 'Neurologist', 12, 4.6, 'Neuro & spine disorders.', 'Kakade Neuro Center, Pune', '["Marathi"]', 950),
            ('Dr. Suraj Nalge', 'Gynecologist', 13, 4.5, 'Women surgery & pregnancy care.', 'Nalge Women Clinic, Nashik', '["Marathi"]', 650),
            ('Dr. Mohini Borse', 'Orthopedic', 9, 4.2, 'Sports injuries & fractures.', 'Gite Ortho Center, Ahmednagar', '["Marathi"]', 600),
            ('Dr. Kiran Chavan', 'Cardiologist', 11, 4.4, 'Angiography & heart care.', 'Pune Cardiac Center', '["Marathi"]', 850),
            ('Dr. Tanvi Sonawane', 'ENT Specialist', 10, 4.4, 'Nasal & throat surgery.', 'Nashik ENT Hospital', '["Marathi"]', 450),
            ('Dr. Akshay Kakade', 'Dermatologist', 12, 4.5, 'Cosmetic skin expert.', 'Mumbai Derma Clinic', '["Marathi"]', 550),
            ('Dr. Medha Nalge', 'General Physician', 8, 4.2, 'Daily medical care.', 'Ahmednagar Clinic', '["Marathi"]', 300),
            ('Dr. Suvarna Gitte', 'Dermatologist', 9, 4.4, 'Expert in acne and pigmentation treatment.', 'Gitte Skin & Hair Clinic, Ahmednagar', '["Marathi","English"]', 550),
            ('Dr. Mahesh Lakhe', 'Dermatologist', 11, 4.6, 'Dermatology specialist with 11 years practice.', 'Lakhe Derma Care, Ahmednagar', '["Marathi","Hindi"]', 600),
            ('Dr. Manasi Kanse', 'Dermatologist', 7, 4.2, 'Specialist in cosmetic dermatology.', 'Kanse Skin Clinic, Ahmednagar', '["Marathi"]', 500),
            ('Dr. Swapnil Kolhe', 'Dermatologist', 10, 4.5, 'Hair & skin specialist with laser treatment experience.', 'Kolhe Dermatology Center, Ahmednagar', '["Marathi","English"]', 650),
        ]

        for name, spec, yrs, rating, bio, clinic, langs, fee in doctors_details:
            if name in user_ids:
                doc = Doctor(
                    doctor_id=user_ids[name],
                    specialization=spec,
                    years_experience=yrs,
                    rating=rating,
                    bio=bio,
                    clinic_address=clinic,
                    languages=langs,
                    consultation_fee=fee,
                    verified=True
                )
                db.session.add(doc)

        # --- Sample Doctor Slots (future dates) ---
        # Get all doctor IDs
        db.session.flush()
        all_doc_ids = [did for did in user_ids.values()]
        base_date = datetime.datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)

        for i, doc_id in enumerate(all_doc_ids[:20]):  # slots for first 20 doctors
            for day_offset in range(1, 4):  # next 3 days
                for hour in [9, 10, 11, 14, 15, 16]:  # 6 slots per day
                    slot_start = base_date + datetime.timedelta(days=day_offset, hours=hour)
                    slot_end = slot_start + datetime.timedelta(minutes=30)
                    slot = DoctorSlot(doctor_id=doc_id, slot_start=slot_start, slot_end=slot_end, is_booked=False)
                    db.session.add(slot)

        db.session.commit()
        print(f"[OK] Database initialized with {len(doctors_seed)} doctors and seed data.")
        print(f"   SQLite file: {app.config['SQLALCHEMY_DATABASE_URI']}")


if __name__ == "__main__":
    init()
