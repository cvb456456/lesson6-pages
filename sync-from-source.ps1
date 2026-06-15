$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$workspaceRoot = Split-Path -Parent $repoRoot
$sourceRoot = Join-Path $workspaceRoot "LearnJapan"
$publicRoot = Join-Path $repoRoot "public"

$sourceIndex = Join-Path $sourceRoot "middle-study-index.html"
$sourceDialogue = Join-Path $sourceRoot "lesson6-senpai-notes.html"
$sourceReading = Join-Path $sourceRoot "lesson6-hashi-notes.html"
$sourceImage = Join-Path $sourceRoot "images\lesson6-senpai-video.jpg"
$sourceAudio = Join-Path $sourceRoot "audio\jp-nanami"
$targetIndex = Join-Path $publicRoot "index.html"
$targetDialogue = Join-Path $publicRoot "lesson6-senpai-notes.html"
$targetReading = Join-Path $publicRoot "lesson6-hashi-notes.html"
$targetImage = Join-Path $publicRoot "images\lesson6-senpai-video.jpg"
$targetAudio = Join-Path $publicRoot "audio\jp-nanami"

foreach ($requiredFile in @($sourceIndex, $sourceDialogue, $sourceReading, $sourceImage)) {
    if (-not (Test-Path -LiteralPath $requiredFile -PathType Leaf)) {
        throw "Required source file was not found: $requiredFile"
    }
}

New-Item -ItemType Directory -Path (Split-Path -Parent $targetImage) -Force | Out-Null
Copy-Item -LiteralPath $sourceIndex -Destination $targetIndex -Force
Copy-Item -LiteralPath $sourceDialogue -Destination $targetDialogue -Force
Copy-Item -LiteralPath $sourceReading -Destination $targetReading -Force
Copy-Item -LiteralPath $sourceImage -Destination $targetImage -Force
if (Test-Path -LiteralPath $sourceAudio -PathType Container) {
    New-Item -ItemType Directory -Path $targetAudio -Force | Out-Null
    Copy-Item -Path (Join-Path $sourceAudio "*") -Destination $targetAudio -Force
}

Write-Host "Cloudflare Pages files synchronized:"
Write-Host "  $targetIndex"
Write-Host "  $targetDialogue"
Write-Host "  $targetReading"
Write-Host "  $targetImage"
Write-Host "  $targetAudio"
