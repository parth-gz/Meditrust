# Meditrust+ Deployment Guide

This guide provides step-by-step instructions for deploying the Meditrust+ application.
The app uses **SQLite** (no external database needed), making deployment straightforward.

---

## Architecture

| Component | Technology | Hosting |
|-----------|-----------|---------|
| Frontend | React + Vite | **Vercel** (free) |
| Backend | Flask + SQLite | **Render** (free) |
| AI | Google Gemini API | API key |

No external database server needed — SQLite is embedded and the `.db` file lives alongside the backend.

---

## Step 1: Prepare the Code

### 1. Update Frontend API URL

Edit `frontend/src/lib/axios.ts` to use an environment variable:

```typescript
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  // ...
});
```

### 2. Push to GitHub

```bash
git add -A
git commit -m "Switch to SQLite for deployment"
git push origin main
```

---

## Step 2: Deploy Backend on Render

1. Go to [render.com](https://render.com) and sign in with GitHub.
2. Click **New +** → **Web Service**.
3. Connect your `Meditrust` repository.
4. Configure:

| Setting | Value |
|---------|-------|
| **Name** | `meditrust-backend` |
| **Root Directory** | `backend` |
| **Environment** | `Python 3` |
| **Build Command** | `pip install -r requirements.txt && python init_db.py` |
| **Start Command** | `gunicorn app:app --bind 0.0.0.0:$PORT` |
| **Instance Type** | Free |

5. Add **Environment Variables**:

| Variable | Value |
|----------|-------|
| `GEMINI_API_KEY` | Your Gemini API key |
| `MEDITRUST_SECRET` | A strong random string for JWT signing |

6. Click **Create Web Service**.
7. Wait for the build. Once done, copy your URL (e.g., `https://meditrust-backend.onrender.com`).

---

## Step 3: Deploy Frontend on Vercel

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub.
2. Click **Add New → Project**.
3. Import your `Meditrust` repository.
4. Configure:

| Setting | Value |
|---------|-------|
| **Framework** | Vite |
| **Root Directory** | `frontend` |

5. Add **Environment Variable**:

| Variable | Value |
|----------|-------|
| `VITE_API_URL` | `https://meditrust-backend.onrender.com/api` |

6. Click **Deploy**.

---

## Step 4: Update CORS (Important!)

After deploying, update `backend/app.py` to allow your Vercel domain:

```python
CORS(app,
     resources={r"/*": {
         "origins": [
             "http://localhost:8080",
             "https://your-app.vercel.app",  # ← Add your Vercel URL here
         ]
     }},
     supports_credentials=True)
```

Push the change and Render will auto-redeploy.

---

## Step 5: Test

1. Open your Vercel URL in a browser.
2. Sign up a new account.
3. Login and test the prescription/symptoms flow.

---

## Running Locally

```bash
# Terminal 1 — Backend
cd backend
python init_db.py          # Only first time
python app.py

# Terminal 2 — Frontend
cd frontend
npm install                # Only first time
npm run dev
```

Open `http://localhost:8080`.

---

## Troubleshooting

### "Login failed" / Network error
- Is the backend running? Check `http://localhost:5000/api/allergies` in a browser.
- On Render: check the logs for errors.

### CORS errors in browser console
- Make sure your Vercel URL is listed in the CORS `origins` list in `app.py`.

### Render cold starts (30-50s delay)
- Render's free tier sleeps after 15 minutes of inactivity.
- Use [cron-job.org](https://cron-job.org) to ping your backend every 10 minutes.

### Uploaded files lost on restart
- Render's free tier clears local storage on redeploy/restart.
- For production: store uploads in Cloudinary or AWS S3 instead of local filesystem.

### To switch back to MySQL
- Set `DATABASE_URL` environment variable:
  ```
  DATABASE_URL=mysql+pymysql://user:pass@host/dbname
  ```
- Install pymysql: `pip install pymysql`
- The app will use whatever `DATABASE_URL` points to.
