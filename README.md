# AniStream

Next.js 15 anime streaming site. Deploy to Vercel in 2 minutes.

## Deploy

### 1 — Push to GitHub
```bash
git init
git add .
git commit -m "init"
git remote add origin https://github.com/YOUR_NAME/anistream.git
git push -u origin main
```

### 2 — Deploy to Vercel
- vercel.com → Add New Project → import repo
- Framework auto-detected as **Next.js**
- Click **Deploy** — homepage works immediately ✓

### 3 — Add streams (aniwatch-api)
1. Fork: github.com/ghoshRitesh12/aniwatch-api
2. render.com → New Web Service → connect fork
   - Runtime: Node | Build: `npm install` | Start: `npm start`
   - Env var: `ANIWATCH_API_DEPLOYMENT_ENV` = `render`
3. Vercel → Settings → Environment Variables:
   - `ANIWATCH_API` = `https://your-app.onrender.com`
4. Redeploy on Vercel

**Keep Render awake:** uptimerobot.com (free) → ping your API URL every 14 min.

## Stack
- Next.js 15 + React 19
- AniList GraphQL API (anime data, free)
- aniwatch-api (HLS streams from HiAnime)
- HLS.js (video playback)
