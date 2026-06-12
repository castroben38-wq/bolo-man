# Bolo-Man Direct Run Guide (No Docker)

Run Bolo-Man directly on Windows without Docker. This is the fastest deployment option.

---

## Step 1: Install Prerequisites

### 1.1 Node.js 20+
1. Go to https://nodejs.org/
2. Download **LTS** version (green button)
3. Run installer — keep all defaults
4. Verify:
```powershell
node --version   # Should show v20.x.x
npm --version    # Should show 10.x.x
```

### 1.2 PostgreSQL 16
1. Go to https://www.postgresql.org/download/windows/
2. Download installer
3. Run installer with these settings:
   - **Password**: `boloman_secret` (or your own)
   - **Port**: `5432`
   - **Locale**: Default
4. Verify:
```powershell
# Add PostgreSQL to PATH if needed
$env:PATH += ";C:\Program Files\PostgreSQL\16\bin"
psql --version
```

### 1.3 Redis (Optional but recommended)
Option A: Install Redis for Windows
```powershell
# Using chocolatey (if installed)
choco install redis-64

# Or download from:
# https://github.com/microsoftarchive/redis/releases
```

Option B: Skip Redis (app works with in-memory fallback)

---

## Step 2: Create Database

Open **pgAdmin** (installed with PostgreSQL) or use psql:

```sql
CREATE DATABASE boloman;
CREATE USER boloman WITH PASSWORD 'boloman_secret';
GRANT ALL PRIVILEGES ON DATABASE boloman TO boloman;
```

Or via PowerShell:
```powershell
psql -U postgres -c "CREATE DATABASE boloman;"
psql -U postgres -c "CREATE USER boloman WITH PASSWORD 'boloman_secret';"
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE boloman TO boloman;"
```

---

## Step 3: Configure Environment

Create `.env` file in project root:

```powershell
cd C:\Users\LENOVO\.verdent\verdent-projects\build-a-cameroonfocused-daily
copy .env.example .env
notepad .env
```

Edit these values:
```env
NODE_ENV=production
APP_PORT=3000

# Database
DATABASE_URL=postgresql://boloman:boloman_secret@localhost:5432/boloman?schema=public

# Redis (skip if not installed)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT (generate strong secrets)
JWT_SECRET=your-256-bit-secret-here
JWT_REFRESH_SECRET=your-other-256-bit-secret-here

# Default Cameroon settings
DEFAULT_COUNTRY_CODE=CM
DEFAULT_CURRENCY=XAF
DEFAULT_LANGUAGE=fr
```

Generate secrets:
```powershell
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 64 | ForEach-Object { [char]$_ })
```

---

## Step 4: Install Dependencies

### Backend
```powershell
cd backend
npm install
```

### Admin Dashboard
```powershell
cd ../admin
npm install
```

---

## Step 5: Database Setup

```powershell
cd backend

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Seed with Cameroon data
npx prisma db seed
```

---

## Step 6: Start the App

### Terminal 1: Backend API
```powershell
cd backend
npm run start:prod
```

### Terminal 2: Admin Dashboard (new window)
```powershell
cd admin
npm run build
npx serve dist -l 5173
```

Or for development with hot reload:
```powershell
cd admin
npm run dev
```

---

## Step 7: Access the App

| Service | URL |
|---------|-----|
| Admin Dashboard | http://localhost:5173 |
| Backend API | http://localhost:3000 |
| API Health | http://localhost:3000/health |
| API Docs | http://localhost:3000/docs |

---

## Default Login Credentials

After seeding:

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@boloman.cm | admin123! |
| Client | alice@example.cm | client123! |
| Provider | jean.electricien@boloman.cm | provider123! |

---

## Troubleshooting

### "Cannot find module" errors
```powershell
cd backend
npm install
npx prisma generate
```

### Database connection failed
```powershell
# Check if PostgreSQL is running
Get-Service postgresql*

# Start if stopped
Start-Service postgresql-x64-16
```

### Port already in use
```powershell
# Find process using port 3000
netstat -ano | findstr :3000

# Kill it
taskkill /PID <PID> /F
```

### Prisma migration errors
```powershell
# Reset database
npx prisma migrate reset --force

# Or drop and recreate
psql -U postgres -c "DROP DATABASE boloman;"
psql -U postgres -c "CREATE DATABASE boloman;"
npx prisma migrate dev
```

---

## Production Considerations

For a real production deployment:

1. **Use a process manager** (PM2):
```powershell
npm install -g pm2
pm2 start backend/dist/main.js --name "bolo-man-api"
pm2 startup
pm2 save
```

2. **Use Nginx as reverse proxy** (instead of direct port access)

3. **Set up HTTPS** with Let's Encrypt

4. **Configure firewall** to block direct database access

---

## Quick Start Script

Save as `start-local.ps1` and run:

```powershell
# start-local.ps1
Write-Host "🚀 Starting Bolo-Man locally..." -ForegroundColor Green

# Check prerequisites
$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
    Write-Host "❌ Node.js not found. Install from https://nodejs.org/" -ForegroundColor Red
    exit 1
}

# Start backend
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; npm run start:prod"

# Start admin
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd admin; npm run dev"

Write-Host ""
Write-Host "✅ Services starting..." -ForegroundColor Green
Write-Host "   API:      http://localhost:3000" -ForegroundColor Cyan
Write-Host "   Admin:    http://localhost:5173" -ForegroundColor Cyan
Write-Host "   Docs:     http://localhost:3000/docs" -ForegroundColor Cyan
```

---

**Need help?** Check `DEPLOY.md` for Docker deployment (once Docker is fixed) or `TEST-REPORT.md` for architecture details.
