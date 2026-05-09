# Meditrust+ Deployment Guide

This guide provides step-by-step instructions for deploying the Meditrust+ application.
The app uses **SQLite** (no external database needed), making deployment straightforward.

---

## Architecture

| Component | Technology | Hosting | URL |
|-----------|-----------|---------|-----|
| Frontend | React + Vite | **Vercel** (free) | [meditrust-eight.vercel.app](https://meditrust-eight.vercel.app) |
| Backend | Flask + SQLite | **Render** (free) | [meditrust-backend-6rry.onrender.com](https://meditrust-backend-6rry.onrender.com) |
| AI | Google Gemini API | API key | — |

No external database server needed — SQLite is embedded and the `.db` file lives alongside the backend.

---

## Step 1: Prepare the Code

### 1. Frontend API URL

`frontend/src/lib/axios.ts` reads from the `VITE_API_URL` environment variable:

```typescript
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  // ...
});
```

### 2. Backend CORS

`backend/app.py` reads allowed origins from the `ALLOWED_ORIGINS` environment variable:

```python
ALLOWED_ORIGINS = [
    o.strip() for o in
    os.environ.get(
        "ALLOWED_ORIGINS",
        "http://localhost:8080,http://127.0.0.1:8080,https://meditrust-eight.vercel.app"
    ).split(",")
]
```

### 3. SPA Routing

`frontend/vercel.json` ensures all routes are handled by React Router:

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

### 4. Push to GitHub

```bash
git add -A
git commit -m "Deploy to Vercel + Render"
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
| `ALLOWED_ORIGINS` | `https://meditrust-eight.vercel.app,http://localhost:8080` |

6. Click **Create Web Service**.
7. Wait for the build. Once done, your URL will be: `https://meditrust-backend-6rry.onrender.com`

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
| `VITE_API_URL` | `https://meditrust-backend-6rry.onrender.com/api` |

6. Click **Deploy**.
7. Your URL will be: `https://meditrust-eight.vercel.app`

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
- Is the backend running? Check `https://meditrust-backend-6rry.onrender.com/api/allergies` in a browser.
- On Render: check the logs for errors.

### CORS errors in browser console
- Make sure your Vercel URL is listed in the CORS `ALLOWED_ORIGINS` env var on Render.
- The default in `app.py` already includes `https://meditrust-eight.vercel.app`.

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
