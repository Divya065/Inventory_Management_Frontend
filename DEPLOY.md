# Deploy Guide

## What goes where

| Part | Host | URL |
|------|------|-----|
| Frontend (React) | Vercel | your-app.vercel.app |
| Backend (.NET 8 API) | Somee.com | dp01.somee.com |
| Database (SQL Server) | Somee.com | finshark.mssql.somee.com |

---

## Step A — Somee website create karo (ONE TIME)

1. somee.com → Login → **Websites** → **Create website**
2. Name: `dp01` (must match your username)
3. Type: **ASP.NET Core**
4. Wait ~1 min

---

## Step B — Upload API files

`publish-somee.zip` already made. Two ways:

### Easy: File Manager (browser)
1. Websites → dp01 → **File manager**
2. **Upload archive** icon
3. Select `Project 1/publish-somee.zip`
4. Let it extract

### Alternative: VS Code SFTP
- Open `.vscode/sftp.json` and fill FTP password from **Websites → dp01 → Summary → FTP card**
- `Ctrl+Shift+P` → `SFTP: Upload Project`

---

## Step C — Test backend
Open: `https://dp01.somee.com/swagger`
Should show Swagger UI with all API endpoints.

---

## Step D — Vercel frontend

Vercel project → **Settings → Environment Variables**:
```
VITE_API_URL = https://dp01.somee.com/api
```

Then **Redeploy**.

---

## Step E — Update CORS (after you know Vercel URL)

Edit `Project 1/appsettings.Production.json`:
```json
"AllowedOrigins": [
  "https://YOUR-APP.vercel.app"
]
```

Re-upload just this file via File Manager to Somee.
Then restart site: Websites → dp01 → **Restart**.

---

## Local dev (unchanged)
- Backend: `dotnet run` → localhost:5032
- Frontend: `npm run dev` → localhost:3000
- `.env.production` only used in `npm run build` for Vercel
