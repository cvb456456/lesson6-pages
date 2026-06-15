param(
    [string]$Message = "Update Japanese lesson"
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path

& (Join-Path $repoRoot "generate-audio.ps1")
if ($LASTEXITCODE -ne 0) {
    throw "Japanese audio generation failed."
}

& (Join-Path $repoRoot "sync-from-source.ps1")

git -C $repoRoot add -- public tools generate-audio.ps1 sync-from-source.ps1 publish.ps1 README.md .gitignore
if ($LASTEXITCODE -ne 0) {
    throw "Git staging failed."
}

if (-not (git -C $repoRoot diff --cached --quiet)) {
    git -C $repoRoot commit -m $Message
    if ($LASTEXITCODE -ne 0) {
        throw "Git commit failed."
    }

    git -C $repoRoot push origin main
    if ($LASTEXITCODE -ne 0) {
        throw "Git push failed."
    }

    Write-Host "Pushed to GitHub. Cloudflare Pages will deploy this commit automatically."
} else {
    Write-Host "No published file changes were detected."
}
