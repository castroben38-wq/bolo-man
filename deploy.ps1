# Bolo-Man Deployment Script for Windows
# Run this in PowerShell as Administrator

param(
    [switch]$Stop,
    [switch]$Restart,
    [switch]$Logs,
    [switch]$Status,
    [switch]$Reset
)

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$InfraDir = Join-Path $ProjectRoot "infrastructure"
$ComposeFile = Join-Path $InfraDir "docker-compose.prod.yml"

function Write-Header($text) {
    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Green
    Write-Host "  $text" -ForegroundColor Green
    Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Green
    Write-Host ""
}

function Test-Docker {
    try {
        docker version | Out-Null
        return $true
    } catch {
        Write-Host "❌ Docker is not installed or not running!" -ForegroundColor Red
        Write-Host "   Please install Docker Desktop: https://www.docker.com/products/docker-desktop/" -ForegroundColor Yellow
        return $false
    }
}

function Test-EnvFile {
    $envFile = Join-Path $ProjectRoot ".env"
    if (-not (Test-Path $envFile)) {
        Write-Host "⚠️  .env file not found!" -ForegroundColor Yellow
        Write-Host "   Creating from template..." -ForegroundColor Cyan
        $template = Join-Path $ProjectRoot ".env.prod.example"
        if (Test-Path $template) {
            Copy-Item $template $envFile
            Write-Host "✅ Created .env from template" -ForegroundColor Green
            Write-Host "   ⚠️  IMPORTANT: Edit .env and set strong passwords before deploying!" -ForegroundColor Red
        } else {
            Write-Host "❌ Template file not found: $template" -ForegroundColor Red
            return $false
        }
    }
    return $true
}

function Deploy-App {
    Write-Header "Bolo-Man Deployment"

    if (-not (Test-Docker)) { exit 1 }
    if (-not (Test-EnvFile)) { exit 1 }

    Write-Host "📦 Building and starting all services..." -ForegroundColor Cyan
    Write-Host "   This may take 5-10 minutes on first run." -ForegroundColor Gray
    Write-Host ""

    Set-Location $InfraDir

    # Pull latest images
    Write-Host "⬇️  Pulling base images..." -ForegroundColor Cyan
    docker-compose -f $ComposeFile pull

    # Build and start
    Write-Host "🔨 Building services..." -ForegroundColor Cyan
    docker-compose -f $ComposeFile up -d --build

    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Deployment failed!" -ForegroundColor Red
        exit 1
    }

    Write-Host ""
    Write-Host "✅ Services started successfully!" -ForegroundColor Green
    Write-Host ""

    # Wait for database
    Write-Host "⏳ Waiting for database to be ready..." -ForegroundColor Cyan
    $retries = 0
    while ($retries -lt 30) {
        $healthy = docker ps --filter "name=boloman-postgres" --filter "health=healthy" --format "{{.Names}}"
        if ($healthy) {
            Write-Host "✅ Database is healthy!" -ForegroundColor Green
            break
        }
        Start-Sleep -Seconds 2
        $retries++
        Write-Host "   Retry $retries/30..." -ForegroundColor Gray
    }

    # Run migrations
    Write-Host ""
    Write-Host "🔄 Running database migrations..." -ForegroundColor Cyan
    Set-Location (Join-Path $ProjectRoot "backend")

    # Check if node_modules exists
    if (-not (Test-Path "node_modules")) {
        Write-Host "📦 Installing backend dependencies..." -ForegroundColor Cyan
        npm install
    }

    npx prisma migrate deploy

    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Migrations applied!" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Migration warning (may already be up to date)" -ForegroundColor Yellow
    }

    # Seed data
    Write-Host ""
    Write-Host "🌱 Seeding database..." -ForegroundColor Cyan
    npx prisma db seed

    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Green
    Write-Host "  🚀 Bolo-Man is LIVE!" -ForegroundColor Green
    Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Green
    Write-Host ""
    Write-Host "  Admin Dashboard:  http://localhost" -ForegroundColor White
    Write-Host "  API Endpoint:     http://localhost:3000" -ForegroundColor White
    Write-Host "  Health Check:     http://localhost:3000/health" -ForegroundColor White
    Write-Host "  API Docs (dev):   http://localhost:3000/docs" -ForegroundColor White
    Write-Host ""
    Write-Host "  Default Logins:" -ForegroundColor Yellow
    Write-Host "    Admin:    admin@boloman.cm / admin123!" -ForegroundColor Gray
    Write-Host "    Client:   alice@example.cm / client123!" -ForegroundColor Gray
    Write-Host "    Provider: jean.electricien@boloman.cm / provider123!" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  Commands:" -ForegroundColor Yellow
    Write-Host "    View logs:    .\deploy.ps1 -Logs" -ForegroundColor Gray
    Write-Host "    Check status: .\deploy.ps1 -Status" -ForegroundColor Gray
    Write-Host "    Stop:         .\deploy.ps1 -Stop" -ForegroundColor Gray
    Write-Host "    Restart:      .\deploy.ps1 -Restart" -ForegroundColor Gray
    Write-Host ""
}

function Stop-App {
    Write-Header "Stopping Bolo-Man"
    Set-Location $InfraDir
    docker-compose -f $ComposeFile down
    Write-Host "✅ Services stopped" -ForegroundColor Green
}

function Restart-App {
    Write-Header "Restarting Bolo-Man"
    Stop-App
    Deploy-App
}

function Show-Logs {
    Write-Header "Service Logs"
    Set-Location $InfraDir
    docker-compose -f $ComposeFile logs -f
}

function Show-Status {
    Write-Header "Service Status"

    Write-Host "🐳 Docker Containers:" -ForegroundColor Cyan
    docker ps --filter "name=boloman" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

    Write-Host ""
    Write-Host "🔍 Health Checks:" -ForegroundColor Cyan

    try {
        $health = Invoke-RestMethod -Uri "http://localhost:3000/health" -TimeoutSec 5
        Write-Host "  ✅ Backend API: $($health.status)" -ForegroundColor Green
    } catch {
        Write-Host "  ❌ Backend API: Unreachable" -ForegroundColor Red
    }

    try {
        $admin = Invoke-WebRequest -Uri "http://localhost" -TimeoutSec 5 -UseBasicParsing
        Write-Host "  ✅ Admin Dashboard: HTTP $($admin.StatusCode)" -ForegroundColor Green
    } catch {
        Write-Host "  ❌ Admin Dashboard: Unreachable" -ForegroundColor Red
    }
}

function Reset-App {
    Write-Header "WARNING: Full Reset"
    Write-Host "This will DELETE all data including database!" -ForegroundColor Red
    $confirm = Read-Host "Type 'DELETE' to confirm"
    if ($confirm -eq 'DELETE') {
        Set-Location $InfraDir
        docker-compose -f $ComposeFile down -v
        Write-Host "✅ All data deleted. Run deploy again to start fresh." -ForegroundColor Green
    } else {
        Write-Host "Cancelled." -ForegroundColor Yellow
    }
}

# Main
if ($Stop) {
    Stop-App
} elseif ($Restart) {
    Restart-App
} elseif ($Logs) {
    Show-Logs
} elseif ($Status) {
    Show-Status
} elseif ($Reset) {
    Reset-App
} else {
    Deploy-App
}
