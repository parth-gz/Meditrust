-- ============================================
-- DATABASE: meditrust_plus
-- ============================================
CREATE DATABASE IF NOT EXISTS meditrust_plus;
USE meditrust_plus;

-- ============================================
-- USERS TABLE (Patients + Doctors)
-- ============================================
CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    phone VARCHAR(20),
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('patient', 'doctor') DEFAULT 'patient',
    city VARCHAR(100),
    pincode VARCHAR(10),
    location_source ENUM('user_input', 'ip', 'browser', 'map') DEFAULT 'user_input',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ============================================
-- DOCTORS TABLE (Extra details for doctors only)
-- ============================================
CREATE TABLE doctors (
    doctor_id INT PRIMARY KEY,
    specialization VARCHAR(100) NOT NULL,
    years_experience INT DEFAULT 0,
    rating FLOAT DEFAULT 0,
    bio TEXT,
    clinic_address TEXT,
    languages JSON,
    consultation_fee DECIMAL(10,2),
    verified BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (doctor_id) REFERENCES users(user_id)
        ON DELETE CASCADE
);

-- ============================================
-- UPLOADS (Prescriptions / Reports)
-- ============================================
CREATE TABLE uploads (
    upload_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    file_path TEXT NOT NULL,
    upload_type ENUM('prescription', 'report') NOT NULL,
    consent_cloud_ocr BOOLEAN DEFAULT FALSE,
    ocr_text LONGTEXT,
    ocr_provider ENUM('gemini', 'local'),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(user_id)
        ON DELETE CASCADE
);

-- ============================================
-- MEDICAL ENTITIES (Drugs, Dosage, Conditions…)
-- ============================================
CREATE TABLE medical_entities (
    entity_id INT AUTO_INCREMENT PRIMARY KEY,
    upload_id INT NOT NULL,
    type ENUM('DRUG','DOSAGE','FREQUENCY','DURATION','CONDITION') NOT NULL,
    text VARCHAR(255) NOT NULL,
    normalized_value VARCHAR(255),
    confidence FLOAT,
    source ENUM('med7','bioclinicalbert','regex'),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (upload_id) REFERENCES uploads(upload_id)
        ON DELETE CASCADE
);

-- ============================================
-- SUMMARIES (Patient-friendly explanation)
-- ============================================
CREATE TABLE summaries (
    summary_id INT AUTO_INCREMENT PRIMARY KEY,
    upload_id INT NOT NULL,
    summary_text LONGTEXT NOT NULL,
    llm_model_used VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (upload_id) REFERENCES uploads(upload_id)
        ON DELETE CASCADE
);

-- ============================================
-- DOCTOR RECOMMENDATIONS LOG
-- ============================================
CREATE TABLE doctor_recommendations (
    rec_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    user_condition VARCHAR(255),
    city VARCHAR(100),
    recommended_doctors JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(user_id)
        ON DELETE CASCADE
);

-- ============================================
-- DOCTOR AVAILABLE SLOTS
-- ============================================
CREATE TABLE doctor_slots (
    slot_id INT AUTO_INCREMENT PRIMARY KEY,
    doctor_id INT NOT NULL,
    slot_start DATETIME NOT NULL,
    slot_end DATETIME NOT NULL,
    is_booked BOOLEAN DEFAULT FALSE,
    
    FOREIGN KEY (doctor_id) REFERENCES doctors(doctor_id)
        ON DELETE CASCADE
);

-- ============================================
-- APPOINTMENTS
-- ============================================
CREATE TABLE appointments (
    appointment_id INT AUTO_INCREMENT PRIMARY KEY,
    patient_id INT NOT NULL,
    doctor_id INT NOT NULL,
    slot_id INT NOT NULL,
    status ENUM('pending','confirmed','cancelled','completed') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (patient_id) REFERENCES users(user_id)
        ON DELETE CASCADE,
    FOREIGN KEY (doctor_id) REFERENCES doctors(doctor_id)
        ON DELETE CASCADE,
    FOREIGN KEY (slot_id) REFERENCES doctor_slots(slot_id)
        ON DELETE CASCADE
);

-- ============================================
-- NOTIFICATIONS (SMS/Email Reminder)
-- ============================================
CREATE TABLE notifications (
    notif_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    appointment_id INT,
    message TEXT,
    status ENUM('pending','sent','failed') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(user_id)
        ON DELETE CASCADE,
    FOREIGN KEY (appointment_id) REFERENCES appointments(appointment_id)
        ON DELETE SET NULL
);
ALTER TABLE medical_entities
  MODIFY COLUMN source ENUM('med7','bioclinicalbert','regex','gemini')
  DEFAULT 'regex';

ALTER TABLE summaries
ADD COLUMN recommended_specialist VARCHAR(100) NULL AFTER llm_model_used;

select * from summaries;

INSERT INTO users (name, email, phone, password_hash, role, city, pincode)
VALUES
('Dr. Ajay Shinde', 'ajay.shinde@example.com', '9876543201', 'dummy', 'doctor', 'Ahmednagar', '414001'),
('Dr. Priya Jagtap', 'priya.jagtap@example.com', '9876543202', 'dummy', 'doctor', 'Ahmednagar', '414002'),
('Dr. Nitin Bhor', 'nitin.bhor@example.com', '9876543203', 'dummy', 'doctor', 'Ahmednagar', '414003'),
('Dr. Kalyani Khomane', 'kalyani.k@example.com', '9876543204', 'dummy', 'doctor', 'Ahmednagar', '414004'),
('Dr. Sagar Auti', 'sagar.auti@example.com', '9876543205', 'dummy', 'doctor', 'Ahmednagar', '414005'),

('Dr. Tejas Patil', 'tejas.patil@example.com', '9876543206', 'dummy', 'doctor', 'Pune', '411001'),
('Dr. Sneha Kulkarni', 'sneha.k@example.com', '9876543207', 'dummy', 'doctor', 'Pune', '411002'),
('Dr. Mangesh Ghorpade', 'mangesh.g@example.com', '9876543208', 'dummy', 'doctor', 'Pune', '411003'),
('Dr. Rucha Wagh', 'rucha.wagh@example.com', '9876543209', 'dummy', 'doctor', 'Pune', '411004'),
('Dr. Onkar Satpute', 'onkar.s@example.com', '9876543210', 'dummy', 'doctor', 'Pune', '411005'),

('Dr. Ashwini Kedar', 'ashwini.kedar@example.com', '9876543211', 'dummy', 'doctor', 'Mumbai', '400001'),
('Dr. Akash More', 'akash.more@example.com', '9876543212', 'dummy', 'doctor', 'Mumbai', '400002'),
('Dr. Shital Pawar', 'shital.p@example.com', '9876543213', 'dummy', 'doctor', 'Mumbai', '400003'),
('Dr. Atul Dhone', 'atul.dhone@example.com', '9876543214', 'dummy', 'doctor', 'Mumbai', '400004'),
('Dr. Manasi Lohar', 'manasi.lohar@example.com', '9876543215', 'dummy', 'doctor', 'Mumbai', '400005'),

('Dr. Rohit Gite', 'rohit.g@example.com', '9876543216', 'dummy', 'doctor', 'Nashik', '422001'),
('Dr. Kavita Nikam', 'kavita.n@example.com', '9876543217', 'dummy', 'doctor', 'Nashik', '422002'),
('Dr. Omkar Jadhav', 'omkar.j@example.com', '9876543218', 'dummy', 'doctor', 'Nashik', '422003'),
('Dr. Shweta Borawake', 'shweta.b@example.com', '9876543219', 'dummy', 'doctor', 'Nashik', '422004'),
('Dr. Ganesh Shelke', 'ganesh.s@example.com', '9876543220', 'dummy', 'doctor', 'Nashik', '422005'),

-- REPEAT WITH DIFFERENT COMBINATIONS TO REACH 50
('Dr. Rohan Ghule', 'rohan.ghule@example.com', '9876543221', 'dummy', 'doctor', 'Pune', '411006'),
('Dr. Varsha Pawar', 'varsha.pawar@example.com', '9876543222', 'dummy', 'doctor', 'Mumbai', '400006'),
('Dr. Jayesh Patole', 'jayesh.p@example.com', '9876543223', 'dummy', 'doctor', 'Ahmednagar', '414006'),
('Dr. Anjali Phuke', 'anjali.phuke@example.com', '9876543224', 'dummy', 'doctor', 'Pune', '411007'),
('Dr. Vaibhav Shirsat', 'vaibhav.s@example.com', '9876543225', 'dummy', 'doctor', 'Nashik', '422006'),

('Dr. Manish Mhaske', 'manish.m@example.com', '9876543226', 'dummy', 'doctor', 'Ahmednagar', '414007'),
('Dr. Sayali Kshirsagar', 'sayali.ks@example.com', '9876543227', 'dummy', 'doctor', 'Mumbai', '400007'),
('Dr. Aditya Thombre', 'aditya.t@example.com', '9876543228', 'dummy', 'doctor', 'Pune', '411008'),
('Dr. Komal Salve', 'komal.s@example.com', '9876543229', 'dummy', 'doctor', 'Nashik', '422007'),
('Dr. Sameer Gujar', 'sameer.g@example.com', '9876543230', 'dummy', 'doctor', 'Ahmednagar', '414008'),

('Dr. Pooja Landge', 'pooja.l@example.com', '9876543231', 'dummy', 'doctor', 'Mumbai', '400008'),
('Dr. Prasad Nalawade', 'prasad.n@example.com', '9876543232', 'dummy', 'doctor', 'Pune', '411009'),
('Dr. Rutuja Biradar', 'rutuja.b@example.com', '9876543233', 'dummy', 'doctor', 'Nashik', '422008'),
('Dr. Swapnil Kokate', 'swapnil.k@example.com', '9876543234', 'dummy', 'doctor', 'Ahmednagar', '414009'),
('Dr. Amruta Jagtap', 'amruta.j@example.com', '9876543235', 'dummy', 'doctor', 'Mumbai', '400009'),

('Dr. Rahul Aher', 'rahul.aher@example.com', '9876543236', 'dummy', 'doctor', 'Nashik', '422009'),
('Dr. Nandini Shinde', 'nandini.s@example.com', '9876543237', 'dummy', 'doctor', 'Pune', '411010'),
('Dr. Suyog Jaware', 'suyog.j@example.com', '9876543238', 'dummy', 'doctor', 'Ahmednagar', '414010'),
('Dr. Bhavana Kute', 'bhavana.k@example.com', '9876543239', 'dummy', 'doctor', 'Mumbai', '400010'),
('Dr. Suraj Nalge', 'suraj.n@example.com', '9876543240', 'dummy', 'doctor', 'Nashik', '422010'),

('Dr. Mohini Borse', 'mohini.b@example.com', '9876543241', 'dummy', 'doctor', 'Pune', '411011'),
('Dr. Kiran Chavan', 'kiran.c@example.com', '9876543242', 'dummy', 'doctor', 'Mumbai', '400011'),
('Dr. Tanvi Sonawane', 'tanvi.s@example.com', '9876543243', 'dummy', 'doctor', 'Ahmednagar', '414011'),
('Dr. Akshay Kakade', 'akshay.k@example.com', '9876543244', 'dummy', 'doctor', 'Nashik', '422011'),
('Dr. Medha Nalge', 'medha.n@example.com', '9876543245', 'dummy', 'doctor', 'Pune', '411012');

INSERT INTO doctors
(doctor_id, specialization, years_experience, rating, bio, clinic_address, languages, consultation_fee, verified)
VALUES
(3,  'General Physician', 10, 4.2, 'Experienced general physician from Ahmednagar.', 'Ahmednagar City Clinic', '["Marathi","Hindi"]', 300, TRUE),

(5,  'Dermatologist',      12, 4.5, 'Skin specialist with 12 years experience.', 'Shinde Skin Clinic, Ahmednagar', '["Marathi","English"]', 500, TRUE),
(6,  'Cardiologist',       15, 4.8, 'Heart expert with advanced practice.', 'Patil Heart Care, Pune', '["Marathi","English"]', 900, TRUE),
(7,  'General Physician',   8, 4.1, 'Internal medicine and primary care.', 'Kulkarni Polyclinic, Pune', '["Marathi"]', 350, TRUE),
(8,  'ENT Specialist',     10, 4.4, 'Ear, Nose & Throat specialist.', 'Ghorpade ENT Center, Pune', '["Marathi","Hindi"]', 450, TRUE),
(9,  'Pediatrician',        7, 4.3, 'Specialist for children and infants.', 'Jagtap Children Hospital, Pune', '["Marathi","English"]', 400, TRUE),

(10, 'Orthopedic',         11, 4.6, 'Bone & joint expert.', 'More Ortho Care, Mumbai', '["Marathi","English"]', 700, TRUE),
(11, 'Gynecologist',        9, 4.3, 'Women health and maternity care.', 'Pawar Women Clinic, Mumbai', '["Marathi"]', 650, TRUE),
(12, 'Neurologist',        14, 4.7, 'Brain and nerve specialist.', 'Dhone Neuro Clinic, Mumbai', '["Marathi","English"]', 1000, TRUE),
(13, 'Dentist',             8, 4.1, 'Dental and oral care expert.', 'Lohar Dental Clinic, Mumbai', '["Marathi"]', 300, TRUE),
(14, 'Psychiatrist',       13, 4.5, 'Mental health and counselling.', 'Wagh MindCare, Mumbai', '["Marathi","English"]', 750, TRUE),

(15, 'Pediatrician',        8, 4.2, 'Child health specialist.', 'Nikam Kids Care, Nashik', '["Marathi"]', 400, TRUE),
(16, 'ENT Specialist',      7, 4.0, 'ENT surgeon with 7 years exp.', 'Jadhav ENT Center, Nashik', '["Marathi"]', 430, TRUE),
(17, 'General Physician',   9, 4.1, 'General medicine specialist.', 'Shelke Family Clinic, Nashik', '["Marathi","English"]', 320, TRUE),
(18, 'Gynecologist',       12, 4.5, 'Women health surgeon.', 'Borawake Maternity Home, Nashik', '["Marathi"]', 650, TRUE),
(19, 'Neurologist',        10, 4.4, 'Nerve disorders specialist.', 'Gite Neuro Center, Nashik', '["Marathi","English"]', 900, TRUE),

(20, 'Orthopedic',          8, 4.2, 'Expert in fractures & joints.', 'Ghule Ortho Clinic, Pune', '["Marathi"]', 600, TRUE),
(21, 'Cardiologist',       14, 4.6, 'Cardiac specialist.', 'Pawar Heart Institute, Pune', '["Marathi","English"]', 950, TRUE),
(22, 'Dentist',             5, 4.0, 'Routine and cosmetic dentistry.', 'Patole Dental Care, Ahmednagar', '["Marathi"]', 300, TRUE),
(23, 'ENT Specialist',      9, 4.2, 'ENT disorders specialist.', 'Phuke ENT Center, Ahmednagar', '["Marathi"]', 450, TRUE),
(24, 'General Physician',   6, 4.1, 'Primary medicine practice.', 'Shirsat Clinic, Ahmednagar', '["Marathi","English"]', 350, TRUE),

(25, 'Dermatologist',      10, 4.4, 'Acne & skin treatment specialist.', 'Mhaske Skin Care, Mumbai', '["Marathi"]', 500, TRUE),
(26, 'Psychiatrist',       11, 4.5, 'Mental wellness & therapy.', 'Kshirsagar MindCare, Mumbai', '["Marathi","English"]', 700, TRUE),
(27, 'Orthopedic',          8, 4.2, 'Sports injuries & knee expert.', 'Thombre Ortho Center, Pune', '["Marathi"]', 650, TRUE),
(28, 'Dentist',             7, 4.1, 'Root canal & braces expert.', 'Salve Dental Care, Pune', '["Marathi","English"]', 350, TRUE),
(29, 'Gynecologist',       13, 4.6, 'High-risk pregnancy care.', 'Gujar Women Health, Ahmednagar', '["Marathi"]', 700, TRUE),

(30, 'Pediatrician',        9, 4.3, 'Vaccination & child care.', 'Landge Children Hospital, Nashik', '["Marathi"]', 420, TRUE),
(31, 'Dermatologist',       8, 4.1, 'Hair & skin specialist.', 'Nalawade Skin Clinic, Nashik', '["Marathi"]', 480, TRUE),
(32, 'General Physician',   6, 4.0, 'Family healthcare.', 'Biradar Clinic, Nashik', '["Marathi"]', 300, TRUE),
(33, 'Orthopedic',         10, 4.4, 'Joint replacement & spine.', 'Kokate Ortho Care, Mumbai', '["Marathi"]', 750, TRUE),
(34, 'Gynecologist',       12, 4.5, 'Women health & surgery.', 'Jagtap Women Center, Pune', '["Marathi"]', 650, TRUE),

(35, 'Cardiologist',       14, 4.7, 'Heart failure & ECG specialist.', 'Aher Heart Hospital, Pune', '["Marathi"]', 900, TRUE),
(36, 'ENT Specialist',      7, 4.0, 'Throat surgeries & allergies.', 'Shinde ENT Care, Mumbai', '["Marathi"]', 430, TRUE),
(37, 'Orthopedic',         11, 4.3, 'Spine & fracture care.', 'Jaware Ortho Hospital, Nashik', '["Marathi"]', 680, TRUE),
(38, 'Psychiatrist',       10, 4.4, 'Depression & stress treatment.', 'Kute Wellness Center, Pune', '["Marathi","English"]', 760, TRUE),
(39, 'Dentist',             5, 4.0, 'Teeth whitening & RCT.', 'Nalge Dental Clinic, Nashik', '["Marathi"]', 320, TRUE),

(40, 'General Physician',   8, 4.2, 'Routine and chronic illness.', 'Borse Clinic, Mumbai', '["Marathi"]', 350, TRUE),
(41, 'Dermatologist',       9, 4.3, 'Skin allergies & cosmetic care.', 'Chavan Skin Center, Pune', '["Marathi"]', 500, TRUE),
(42, 'Pediatrician',        7, 4.1, 'Child specialist & NICU care.', 'Sonawane Kids Clinic, Ahmednagar', '["Marathi"]', 400, TRUE),
(43, 'Neurologist',        12, 4.6, 'Neuro & spine disorders.', 'Kakade Neuro Center, Pune', '["Marathi"]', 950, TRUE),
(44, 'Gynecologist',       13, 4.5, 'Women surgery & pregnancy care.', 'Nalge Women Clinic, Nashik', '["Marathi"]', 650, TRUE),

(45, 'Orthopedic',          9, 4.2, 'Sports injuries & fractures.', 'Gite Ortho Center, Ahmednagar', '["Marathi"]', 600, TRUE),
(46, 'Cardiologist',       11, 4.4, 'Angiography & heart care.', 'Pune Cardiac Center', '["Marathi"]', 850, TRUE),
(47, 'ENT Specialist',     10, 4.4, 'Nasal & throat surgery.', 'Nashik ENT Hospital', '["Marathi"]', 450, TRUE),
(48, 'Dermatologist',      12, 4.5, 'Cosmetic skin expert.', 'Mumbai Derma Clinic', '["Marathi"]', 550, TRUE),
(49, 'General Physician',   8, 4.2, 'Daily medical care.', 'Ahmednagar Clinic', '["Marathi"]', 300, TRUE);

select * from users;
select * from doctors;
delete from doctors where doctor_id=3;

INSERT INTO users (name, email, phone, password_hash, role, city, pincode)
VALUES
('Dr. Suvarna Gitte',  'suvarna.gitte@example.com',  '9876551001', 'dummy', 'doctor', 'Ahmednagar', '414001'),
('Dr. Mahesh Lakhe',   'mahesh.lakhe@example.com',   '9876551002', 'dummy', 'doctor', 'Ahmednagar', '414001'),
('Dr. Manasi Kanse',   'manasi.kanse@example.com',   '9876551003', 'dummy', 'doctor', 'Ahmednagar', '414001'),
('Dr. Swapnil Kolhe',  'swapnil.kolhe@example.com',  '9876551004', 'dummy', 'doctor', 'Ahmednagar', '414001');
INSERT INTO doctors
(doctor_id, specialization, years_experience, rating, bio, clinic_address, languages, consultation_fee, verified)
VALUES
(50, 'Dermatologist', 9, 4.4, 'Expert in acne and pigmentation treatment.', 'Gitte Skin & Hair Clinic, Ahmednagar', '["Marathi","English"]', 550, TRUE),
(51, 'Dermatologist', 11, 4.6, 'Dermatology specialist with 11 years practice.', 'Lakhe Derma Care, Ahmednagar', '["Marathi","Hindi"]', 600, TRUE),
(52, 'Dermatologist', 7, 4.2, 'Specialist in cosmetic dermatology.', 'Kanse Skin Clinic, Ahmednagar', '["Marathi"]', 500, TRUE),
(53, 'Dermatologist', 10, 4.5, 'Hair & skin specialist with laser treatment experience.', 'Kolhe Dermatology Center, Ahmednagar', '["Marathi","English"]', 650, TRUE);

-- check last summary entry
SELECT upload_id, summary_text 
FROM summaries 
ORDER BY summary_id DESC 
LIMIT 1;

select * from doctors;
select * from users;
UPDATE doctors
SET specialization = 'Dermatologist'
WHERE doctor_id = 3;
