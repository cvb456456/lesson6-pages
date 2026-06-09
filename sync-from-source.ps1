$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$workspaceRoot = Split-Path -Parent $repoRoot
$sourceRoot = Join-Path $workspaceRoot "LearnJapan"
$publicRoot = Join-Path $repoRoot "public"

$sourcePage = Join-Path $sourceRoot "lesson6-senpai-notes.html"
$sourceImage = Join-Path $sourceRoot "images\lesson6-senpai-video.jpg"
$targetPage = Join-Path $publicRoot "index.html"
$targetImage = Join-Path $publicRoot "images\lesson6-senpai-video.jpg"

foreach ($requiredFile in @($sourcePage, $sourceImage)) {
    if (-not (Test-Path -LiteralPath $requiredFile -PathType Leaf)) {
        throw "Required source file was not found: $requiredFile"
    }
}

New-Item -ItemType Directory -Path (Split-Path -Parent $targetImage) -Force | Out-Null
Copy-Item -LiteralPath $sourcePage -Destination $targetPage -Force
Copy-Item -LiteralPath $sourceImage -Destination $targetImage -Force

Write-Host "Cloudflare Pages files synchronized:"
Write-Host "  $targetPage"
Write-Host "  $targetImage"

