param(
    [string]$Message = "Update Japanese lesson"
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path

& (Join-Path $repoRoot "sync-from-source.ps1")

git -C $repoRoot add -- public
if (-not (git -C $repoRoot diff --cached --quiet)) {
    git -C $repoRoot commit -m $Message
    git -C $repoRoot push origin main
    Write-Host "Pushed to GitHub. Cloudflare Pages will deploy this commit automatically."
} else {
    Write-Host "No published file changes were detected."
}

