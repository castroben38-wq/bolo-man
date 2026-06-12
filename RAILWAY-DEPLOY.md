# Deploy Bolo-Man to Railway

Railway is the easiest zero-config cloud host for this monorepo. It auto-detects
the NestJS backend, builds the Vite admin dashboard, and provisions managed
PostgreSQL + Redis with one click each. No Docker Desktop required on your
machine — Railway builds in the cloud.

This repo already includes the needed config:

| File | Purpose |
|------|---------|
| `backend/railway.json` | Builds backend from its Dockerfile, runs Prisma migrations on deploy, health-checks `/health` |
| `admin/railway.json` | Builds the Vite admin via Nixpacks and serves it |
| `backend/Dockerfile` | Production NestJS image |

---

## Prerequisites

- A GitHub account with this project pushed to a repository
- A free Railway account: https://railway.app (sign in with GitHub)

> If the project is not on GitHub yet, create a repo and push it first. Railway
> deploys directly from GitHub.

---

## Step 1 — Create the project

1. Go to https://railway.app/new
2. Click **Deploy from GitHub repo**
3. Authorize Railway and select the `build-a-cameroonfocused-daily` repo

Railway creates an empty project. We'll add 4 services into it.

---

## Step 2 — Add the database services

Inside the project canvas:

1. Click **+ New** → **Database** → **Add PostgreSQL**
2. Click **+ New** → **Database** → **Add Redis**

Railway provisions both and exposes connection variables automatically:
- PostgreSQL → `DATABASE_URL`
- Redis → `REDIS_URL`

---

## Step 3 — Add the backend service

1. Click **+ New** → **GitHub Repo** → select this repo again
2. Open the new service → **Settings**
3. Set **Root Directory** to `backend`
4. Railway reads `backend/railway.json` automatically (Dockerfile build +
   migrate-on-deploy + `/health` check)

### Backend environment variables

Open the backend service → **Variables** → add:

```
NODE_ENV=production
DATABASE_URL=${{Postgres.DATABASE_URL}}
REDIS_HOST=${{Redis.REDISHOST}}
REDIS_PORT=${{Redis.REDISPORT}}
REDIS_PASSWORD=${{Redis.REDISPASSWORD}}
JWT_SECRET=<paste a 64-char random string>
JWT_REFRESH_SECRET=<paste a different 64-char random string>
DEFAULT_COUNTRY_CODE=CM
DEFAULT_CURRENCY=XAF
DEFAULT_LANGUAGE=fr
CORS_ORIGINS=https://<your-admin-domain>.up.railway.app

# Payment gateways (use sandbox keys to start)
MOMO_API_KEY=
MOMO_API_USER=
MOMO_SUBSCRIPTION_KEY=
ORANGE_CLIENT_ID=
ORANGE_CLIENT_SECRET=
FLUTTERWAVE_SECRET_KEY=
```

> `${{Postgres.DATABASE_URL}}` and `${{Redis.*}}` are Railway reference
> variables — they auto-resolve to the addon's live credentials. Type them
> exactly as shown.

Generate the JWT secrets on Windows PowerShell:
```powershell
-join ((48..57)+(65..90)+(97..122) | Get-Random -Count 64 | % {[char]$_})
```

5. Open **Settings → Networking → Generate Domain** to get a public backend URL,
   e.g. `https://bolo-man-api-production.up.railway.app`

---

## Step 4 — Add the admin dashboard service

1. Click **+ New** → **GitHub Repo** → select this repo again
2. Open the service → **Settings** → set **Root Directory** to `admin`
3. Railway reads `admin/railway.json` (Nixpacks build + `vite preview`)

### Admin environment variables

The admin is currently a UI scaffold; once its API client is wired it reads the
backend URL from `VITE_API_URL` (Vite inlines `VITE_`-prefixed vars at build
time). Add it now so it's ready:

```
VITE_API_URL=https://<your-backend-domain>.up.railway.app
```

4. **Settings → Networking → Generate Domain** to get the admin URL.
5. Go back to the **backend** service and set `CORS_ORIGINS` to this admin URL,
   then redeploy the backend.

---

## Step 5 — Seed the database (first deploy only)

Migrations run automatically on every deploy (`prisma migrate deploy`). To load
the Cameroon seed data once:

1. Open the **backend** service → **Settings → Deploy**
2. Temporarily change the start command to:
   ```
   npx prisma migrate deploy && npx prisma db seed && node dist/main
   ```
3. Redeploy, wait for it to boot, then revert the start command back to the
   default in `railway.json` to avoid re-seeding on every deploy.

Alternatively, run a one-off via the Railway CLI:
```bash
railway run npx prisma db seed
```

---

## Step 6 — Verify

| Check | URL |
|-------|-----|
| Backend health | `https://<backend>.up.railway.app/health` → `{"status":"ok"}` |
| Admin dashboard | `https://<admin>.up.railway.app` |

Default seeded logins:

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@boloman.cm | admin123! |
| Client | alice@example.cm | client123! |
| Provider | jean.electricien@boloman.cm | provider123! |

---

## Mobile app (Expo) — not on Railway

The React Native client/provider app is distributed via Expo, not Railway:
```powershell
cd mobile
npm install
npx expo start
```
Point it at the backend by setting `EXPO_PUBLIC_API_URL` to your Railway backend
domain in `mobile/.env`.

---

## Cost & scaling notes

- Railway's free trial covers the backend + admin + Postgres + Redis for light
  testing. Beyond the trial you pay per usage (~$5/mo Hobby plan credit).
- Postgres and Redis persist automatically.
- To scale, raise the service's resource limits in **Settings → Resources**.

---

## Troubleshooting

**Build fails on backend** — confirm Root Directory is `backend` so Railway finds
the Dockerfile and `railway.json`.

**`/health` check times out** — the backend can't reach Postgres. Verify
`DATABASE_URL=${{Postgres.DATABASE_URL}}` is set and the Postgres service is in
the same project.

**Admin shows blank / CORS errors** — set `VITE_API_URL` on the admin and
`CORS_ORIGINS` on the backend to each other's public domains, then redeploy both.

**`vite preview` rejects the host** — already handled via `allowedHosts: true`
in `admin/vite.config.ts`.

**Migrations didn't run** — check the backend deploy logs; the start command runs
`prisma migrate deploy` before booting.
