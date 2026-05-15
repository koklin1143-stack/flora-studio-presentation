param(
  [string]$Message = ""
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $repoRoot

Copy-Item -LiteralPath "flora_studio_presentation.html" -Destination "index.html" -Force

if ([string]::IsNullOrWhiteSpace($Message)) {
  $stamp = Get-Date -Format "yyyy-MM-dd HH:mm"
  $Message = "Update Flora Studio presentation $stamp"
}

git add "flora_studio_presentation.html" "index.html" "assets" "flora_studio_codex_handoff"

$changes = git diff --cached --name-only
if ([string]::IsNullOrWhiteSpace($changes)) {
  Write-Host "No publishable changes found."
  exit 0
}

git commit -m $Message
git push origin main

Write-Host ""
Write-Host "Published to GitHub. GitHub Pages will usually refresh in 1-5 minutes."
