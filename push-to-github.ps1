# push-to-github.ps1
# One-shot helper to publish Bolo-Man to GitHub.
#
# PREREQUISITES (do these once):
#   1. Install Git:   winget install --id Git.Git -e --source winget
#      Then CLOSE and REOPEN PowerShell so `git` is on PATH.
#   2. Create an EMPTY repo on GitHub (no README/.gitignore):
#         https://github.com/new
#      Copy its URL, e.g. https://github.com/<you>/bolo-man.git
#
# USAGE:
#   .\push-to-github.ps1 -RepoUrl "https://github.com/<you>/bolo-man.git"

param(
    [Parameter(Mandatory = $true)]
    [string]$RepoUrl,

    [string]$Branch = "main",
    [string]$CommitMessage = "Initial commit: Bolo-Man Cameroon daily services platform"
)

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

# Verify git is available
$git = Get-Command git -ErrorAction SilentlyContinue
if (-not $git) {
    Write-Host "Git is not installed or not on PATH." -ForegroundColor Red
    Write-Host "Install it with:  winget install --id Git.Git -e --source winget" -ForegroundColor Yellow
    Write-Host "Then close and reopen PowerShell and run this script again." -ForegroundColor Yellow
    exit 1
}

Write-Host "Using $(git --version)" -ForegroundColor Green

# Set identity if missing (local to this repo only)
if (-not (git config user.email)) {
    $email = Read-Host "Enter your GitHub email"
    $name  = Read-Host "Enter your name"
    git config user.email "$email"
    git config user.name  "$name"
}

# Init repo if needed
if (-not (Test-Path ".git")) {
    git init
    git branch -M $Branch
}

git add -A
git commit -m "$CommitMessage"

# Wire the remote (replace if it already exists)
if (git remote | Select-String -Quiet "^origin$") {
    git remote set-url origin $RepoUrl
} else {
    git remote add origin $RepoUrl
}

Write-Host ""
Write-Host "Pushing to $RepoUrl ($Branch)..." -ForegroundColor Cyan
Write-Host "If prompted, sign in to GitHub in the browser window that opens." -ForegroundColor Gray
git push -u origin $Branch

Write-Host ""
Write-Host "Done. Repo is on GitHub. Next: follow RAILWAY-DEPLOY.md to deploy." -ForegroundColor Green
