# Quick Start: Bolo-Man on Windows (No Docker)

Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Green
Write-Host "  Bolo-Man Local Deployment" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Green
Write-Host ""

# Check prerequisites
$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
    Write-Host "❌ Node.js not found!" -ForegroundColor Red
    Write-Host "   Install from: https://nodejs.org/ (LTS version)" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

Write-Host "✅ Node.js found: $(node --version)" -ForegroundColor Green
Write-Host "✅ npm found: $(npm --version)" -ForegroundColor Green
Write-Host ""

# Check .env
$envFile = Join-Path $PSScriptRoot ".env"
if (-not (Test-Path $envFile)) {
    Write-Host "⚠️  .env file not found. Creating from template..." -ForegroundColor Yellow
    if (Test-Path ".env.example") {
        Copy-Item ".env.example" $envFile
        Write-Host "✅ Created .env from template" -ForegroundColor Green
        Write-Host "   ⚠️  IMPORTANT: Edit .env and set DATABASE_URL with your PostgreSQL password!" -ForegroundColor Red
        Write-Host ""
    }
}

# Install backend dependencies
Write-Host "📦 Installing backend dependencies..." -ForegroundColor Cyan
Set-Location (Join-Path $PSScriptRoot "backend")
if (-not (Test-Path "node_modules")) {
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Backend npm install failed" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "   Backend dependencies already installed" -ForegroundColor Gray
}

# Generate Prisma client
Write-Host "🔧 Generating Prisma client..." -ForegroundColor Cyan
npx prisma generate

# Check if database needs migration
Write-Host "🔄 Checking database..." -ForegroundColor Cyan
$dbUrl = [System.Environment]::GetEnvironmentVariable("DATABASE_URL")
if (-not $dbUrl) {
    # Try to read from .env
    $envContent = Get-Content (Join-Path $PSScriptRoot ".env") -ErrorAction SilentlyContinue
    $dbLine = $envContent | Where-Object { $_ -match "^DATABASE_URL=" }
    if ($dbLine) {
        $dbUrl = $dbLine -replace "^DATABASE_URL=", ""
    }
}

Write-Host "   Database URL: $dbUrl" -ForegroundColor Gray

# Run migrations
Write-Host "🔄 Running database migrations..." -ForegroundColor Cyan
npx prisma migrate deploy
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  Migration failed. Trying to create database first..." -ForegroundColor Yellow
    Write-Host "   Make sure PostgreSQL is running and the database exists." -ForegroundColor Yellow
    Write-Host "   See DIRECT-RUN.md for setup instructions." -ForegroundColor Yellow
    Write-Host ""
}

# Seed data
Write-Host "🌱 Seeding database..." -ForegroundColor Cyan
npx prisma db seed

# Install admin dependencies
Write-Host ""
Write-Host "📦 Installing admin dashboard dependencies..." -ForegroundColor Cyan
Set-Location (Join-Path $PSScriptRoot "admin")
if (-not (Test-Path "node_modules")) {
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Admin npm install failed" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "   Admin dependencies already installed" -ForegroundColor Gray
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Green
Write-Host "  ✅ Setup Complete!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Green
Write-Host ""
Write-Host "Starting services..." -ForegroundColor Cyan
Write-Host ""

# Start backend in new window
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$((Join-Path $PSScriptRoot "backend"))'; npm run start:prod"

# Start admin in new window
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$((Join-Path $PSScriptRoot "admin"))'; npm run dev"

Start-Sleep -Seconds 3

Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Green
Write-Host "  🚀 Bolo-Man is starting!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Green
Write-Host ""
Write-Host "  Admin Dashboard:  http://localhost:5173" -ForegroundColor White
Write-Host "  Backend API:      http://localhost:3000" -ForegroundColor White
Write-Host "  Health Check:     http://localhost:3000/health" -ForegroundColor White
Write-Host "  API Docs:         http://localhost:3000/docs" -ForegroundColor White
Write-Host ""
Write-Host "  Default Logins:" -ForegroundColor Yellow
Write-Host "    Admin:    admin@boloman.cm / admin123!" -ForegroundColor Gray
Write-Host "    Client:   alice@example.cm / client123!" -ForegroundColor Gray
Write-Host "    Provider: jean.electricien@boloman.cm / provider123!" -ForegroundColor Gray
Write-Host ""
Write-Host "  Press Ctrl+C in each window to stop services." -ForegroundColor Gray
Write-Host ""
