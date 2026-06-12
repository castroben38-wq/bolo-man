# Bolo-Man Deployment Guide

## Prerequisites

Before deploying, you need:

1. **Docker Desktop** installed on Windows
   - Download: https://www.docker.com/products/docker-desktop/
   - Enable WSL2 backend during installation

2. **Node.js 20+** and **npm**
   - Download: https://nodejs.org/ (LTS version)

3. **Git** (optional, for cloning)

---

## Quick Start (5 minutes)

### Step 1: Set Environment Variables

Copy the production environment template:

```powershell
cd C:\Users\LENOVO\.verdent\verdent-projects\build-a-cameroonfocused-daily
copy .env.prod.example .env
```

Edit `.env` and set strong secrets:

```powershell
notepad .env
```

**Minimum required changes:**
```
POSTGRES_PASSWORD=your_strong_password_here
REDIS_PASSWORD=your_strong_password_here
JWT_SECRET=your_256_bit_secret_here
JWT_REFRESH_SECRET=your_other_256_bit_secret_here
```

Generate strong secrets:
```powershell
# In PowerShell
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 64 | ForEach-Object { [char]$_ })
```

---

### Step 2: Build and Start All Services

```powershell
cd infrastructure
docker-compose -f docker-compose.prod.yml up -d --build
```

This will:
- Build the backend NestJS API
- Build the admin React dashboard
- Start PostgreSQL with PostGIS
- Start Redis
- Start Nginx reverse proxy

---

### Step 3: Run Database Migrations

```powershell
cd ../backend
npm install
npx prisma migrate deploy
npx prisma db seed
```

---

### Step 4: Verify Everything is Running

```powershell
# Check all containers
docker ps

# Check backend health
curl http://localhost:3000/health

# Check admin dashboard
curl http://localhost:80
```

---

## Access URLs

| Service | URL | Description |
|---------|-----|-------------|
| Admin Dashboard | http://localhost | Web admin interface |
| Backend API | http://localhost:3000 | REST API |
| API Health | http://localhost:3000/health | Health check |
| Nginx Proxy | http://localhost:8080 | Reverse proxy entry |
| PostgreSQL | localhost:5432 | Database (internal) |
| Redis | localhost:6379 | Cache (internal) |

---

## Default Login Credentials

After seeding, these accounts are available:

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@boloman.cm | admin123! |
| Client | alice@example.cm | client123! |
| Provider | jean.electricien@boloman.cm | provider123! |

---

## Stopping the App

```powershell
cd infrastructure
docker-compose -f docker-compose.prod.yml down
```

To stop AND remove all data (volumes):
```powershell
docker-compose -f docker-compose.prod.yml down -v
```

---

## Viewing Logs

```powershell
# All services
docker-compose -f docker-compose.prod.yml logs -f

# Just backend
docker logs -f boloman-backend

# Just database
docker logs -f boloman-postgres
```

---

## Updating After Code Changes

```powershell
cd infrastructure
docker-compose -f docker-compose.prod.yml up -d --build
```

---

## Troubleshooting

### Port already in use
```powershell
# Find what's using port 3000
netstat -ano | findstr :3000

# Stop that process
taskkill /PID <PID> /F
```

### Database connection failed
```powershell
# Check if postgres is healthy
docker ps

# Restart just postgres
docker restart boloman-postgres
```

### Backend won't start
```powershell
# Check logs
docker logs boloman-backend

# Common issue: DATABASE_URL mismatch
# Make sure .env file exists in project root
```

---

## Production Checklist

Before going live:

- [ ] Change all default passwords in `.env`
- [ ] Set real payment gateway credentials (MoMo, Orange, Flutterwave)
- [ ] Configure SMS provider (Twilio or local)
- [ ] Set up Firebase for push notifications
- [ ] Add Sentry DSN for error tracking
- [ ] Enable HTTPS (use Let's Encrypt with Nginx)
- [ ] Set up automated backups for PostgreSQL
- [ ] Configure firewall rules
- [ ] Set up monitoring (Prometheus/Grafana)

---

## Mobile App Deployment

The mobile app (React Native/Expo) is NOT deployed via Docker. To publish:

```powershell
cd mobile
npm install
npx expo login
npx expo publish
```

For app store submission:
```powershell
# Build for Android
npx expo build:android

# Build for iOS (requires Mac)
npx expo build:ios
```

---

**Need help?** Check `TEST-REPORT.md` for detailed architecture documentation.
