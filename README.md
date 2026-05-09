# MediTrust+ 🏥

Smart Healthcare Management & Doctor Appointments platform built with **Flask** (backend) and **React + Vite** (frontend).

---

## Prerequisites

Make sure the following are installed on your system:

| Tool       | Version  | Check command          |
|------------|----------|------------------------|
| Python     | 3.10+    | `python --version`     |
| Node.js    | 18+      | `node --version`       |
| npm        | 9+       | `npm --version`        |
| MySQL      | 8.0+     | `mysql --version`      |

---

## 1. Database Setup (one-time)

1. **Start MySQL** if it isn't already running.
2. Open a MySQL shell and run the schema file:

```bash
mysql -u root -p < database_schema.sql
```

> This creates the `meditrust_plus` database with all required tables and seed doctor data.

3. If you need extra tables that the app references (allergies, user conditions, etc.), run these in your MySQL shell:

```sql
USE meditrust_plus;

-- Allergies master table
CREATE TABLE IF NOT EXISTS allergies (
    allergy_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE
);

-- User ↔ Allergy mapping
CREATE TABLE IF NOT EXISTS user_allergies (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    allergy_id INT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (allergy_id) REFERENCES allergies(allergy_id) ON DELETE CASCADE
);

-- User conditions
CREATE TABLE IF NOT EXISTS user_conditions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    conditn VARCHAR(255) NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Seed some common allergies
INSERT IGNORE INTO allergies (name) VALUES
('Penicillin'), ('Aspirin'), ('Sulfa drugs'), ('Peanuts'),
('Latex'), ('Ibuprofen'), ('Codeine'), ('Shellfish'),
('Dust'), ('Pollen');
```

---

## 2. Backend Setup

### First-time setup

```bash
cd backend

# Create virtual environment (if not already created)
python -m venv ../venv

# Activate virtual environment
# Windows (PowerShell):
..\venv\Scripts\Activate.ps1
# Windows (CMD):
..\venv\Scripts\activate.bat

# Install dependencies
pip install flask flask-cors flask-sqlalchemy PyJWT Werkzeug python-dotenv pymysql google-generativeai gunicorn
```

### Configure environment

Edit `backend/.env` and set your values:

```env
GEMINI_API_KEY=your-gemini-api-key-here
MEDITRUST_SECRET=your-secret-here
```

> **Note:** The MySQL connection defaults to `root:mysql_password@localhost/meditrust_plus`.  
> If your MySQL password is different, set the `DATABASE_URL` in `.env`:
> ```env
> DATABASE_URL=mysql+pymysql://root:YOUR_PASSWORD@localhost/meditrust_plus
> ```

### Run the backend

```bash
cd backend
..\venv\Scripts\Activate.ps1
python app.py
```

✅ Backend will start on **http://localhost:5000**

---

## 3. Frontend Setup

### First-time setup

```bash
cd frontend
npm install
```

### Run the frontend

```bash
cd frontend
npm run dev
```

✅ Frontend will start on **http://localhost:8080**

---

## 4. Quick Start (after first-time setup)

Open **two terminals** and run:

**Terminal 1 — Backend:**
```powershell
cd "d:\Btech prjct\Meditrust\backend"
& "..\venv\Scripts\Activate.ps1"
python app.py
```

**Terminal 2 — Frontend:**
```powershell
cd "d:\Btech prjct\Meditrust\frontend"
npm run dev
```

Then open **http://localhost:8080** in your browser.

---

## 5. Troubleshooting

### "Login failed" toast

| Cause | Fix |
|-------|-----|
| Backend not running | Make sure `python app.py` is running on port 5000 |
| Wrong credentials | Sign up a new account first, then login |
| MySQL not running | Start MySQL service: `net start mysql` (CMD as admin) |
| Wrong DB password | Set `DATABASE_URL` in `backend/.env` with your actual MySQL password |

### Port already in use

Kill processes on ports 5000 and 8080 before starting:

```powershell
# PowerShell (run as admin if needed)
Get-NetTCPConnection -State Listen | Where-Object {$_.LocalPort -in 5000,8080} | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
```

### MySQL connection refused

1. Check MySQL is running: `Get-Service mysql*`
2. Start it: `net start mysql` or `net start mysql80`

### Module not found errors (Python)

```bash
..\venv\Scripts\Activate.ps1
pip install flask flask-cors flask-sqlalchemy PyJWT pymysql python-dotenv google-generativeai
```

### Module not found errors (Node)

```bash
cd frontend
npm install
```

---

## Project Structure

```
Meditrust/
├── backend/
│   ├── app.py              # Flask API server (all routes)
│   ├── .env                # Environment variables (DB, API keys)
│   ├── requirements.txt    # Python dependencies
│   └── uploads/            # Uploaded prescription images
├── frontend/
│   ├── src/
│   │   ├── pages/          # React page components
│   │   ├── components/     # Reusable UI components
│   │   ├── contexts/       # Auth context (login state)
│   │   └── lib/            # Axios config, utilities
│   ├── package.json        # Node dependencies
│   └── vite.config.ts      # Dev server config (port 8080, proxy)
├── database_schema.sql     # MySQL schema + seed data
├── venv/                   # Python virtual environment
└── README.md               # This file
```

---

## Tech Stack

- **Backend:** Flask, SQLAlchemy, PyJWT, MySQL, Google Gemini AI
- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, Sonner (toasts)
- **Database:** MySQL 8.0
