$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$workspaceRoot = Split-Path -Parent $repoRoot
$sourceRoot = Join-Path $workspaceRoot "LearnJapan"
$publicRoot = Join-Path $repoRoot "public"

$sourceIndex = Join-Path $sourceRoot "middle-study-index.html"
$sourceDialogue = Join-Path $sourceRoot "lesson6-senpai-notes.html"
$sourceReading = Join-Path $sourceRoot "lesson6-hashi-notes.html"
$sourceLesson7Grammar = Join-Path $sourceRoot "lesson7-yobikai-grammar.html"
$sourceLesson7Dialogue = Join-Path $sourceRoot "lesson7-yobikai-dialogue.html"
$sourceLesson7Email = Join-Path $sourceRoot "lesson7-email-notes.html"
$sourceSongKatachi = Join-Path $sourceRoot "song-katachi-nai-study.html"
$sourceImage = Join-Path $sourceRoot "images\lesson6-senpai-video.jpg"
$sourceLesson7Image = Join-Path $sourceRoot "images\lesson7-yobikai-video.jpg"
$sourceLesson7DialogueImage = Join-Path $sourceRoot "images\lesson7-yobikai-dialogue-video.jpg"
$sourceLesson7EmailImage = Join-Path $sourceRoot "images\lesson7-email-video.jpg"
$sourceAudio = Join-Path $sourceRoot "audio\jp-nanami"
$sourceChineseAudio = Join-Path $sourceRoot "audio\zh-xiaoxiao"
$sourcePlayerScript = Join-Path $sourceRoot "assets\audio-lesson-player.js"
$sourcePlayerStyle = Join-Path $sourceRoot "assets\audio-lesson-player.css"
$targetIndex = Join-Path $publicRoot "index.html"
$targetDialogue = Join-Path $publicRoot "lesson6-senpai-notes.html"
$targetReading = Join-Path $publicRoot "lesson6-hashi-notes.html"
$targetLesson7Grammar = Join-Path $publicRoot "lesson7-yobikai-grammar.html"
$targetLesson7Dialogue = Join-Path $publicRoot "lesson7-yobikai-dialogue.html"
$targetLesson7Email = Join-Path $publicRoot "lesson7-email-notes.html"
$targetSongKatachi = Join-Path $publicRoot "song-katachi-nai-study.html"
$targetImage = Join-Path $publicRoot "images\lesson6-senpai-video.jpg"
$targetLesson7Image = Join-Path $publicRoot "images\lesson7-yobikai-video.jpg"
$targetLesson7DialogueImage = Join-Path $publicRoot "images\lesson7-yobikai-dialogue-video.jpg"
$targetLesson7EmailImage = Join-Path $publicRoot "images\lesson7-email-video.jpg"
$targetAudio = Join-Path $publicRoot "audio\jp-nanami"
$targetChineseAudio = Join-Path $publicRoot "audio\zh-xiaoxiao"
$targetAssets = Join-Path $publicRoot "assets"

function Sync-AudioDirectory {
    param(
        [string]$Source,
        [string]$Target
    )

    if (-not (Test-Path -LiteralPath $Source -PathType Container)) {
        return
    }

    $fullPublicRoot = [IO.Path]::GetFullPath($publicRoot).TrimEnd('\')
    $fullTarget = [IO.Path]::GetFullPath($Target)
    if (-not $fullTarget.StartsWith($fullPublicRoot + "\", [StringComparison]::OrdinalIgnoreCase)) {
        throw "Refusing to synchronize audio outside the public directory: $fullTarget"
    }

    if (Test-Path -LiteralPath $fullTarget) {
        Remove-Item -LiteralPath $fullTarget -Recurse -Force
    }
    New-Item -ItemType Directory -Path $fullTarget -Force | Out-Null
    Copy-Item -Path (Join-Path $Source "*") -Destination $fullTarget -Force
}

foreach ($requiredFile in @($sourceIndex, $sourceDialogue, $sourceReading, $sourceLesson7Grammar, $sourceLesson7Dialogue, $sourceLesson7Email, $sourceSongKatachi, $sourceImage, $sourceLesson7Image, $sourceLesson7DialogueImage, $sourceLesson7EmailImage, $sourcePlayerScript, $sourcePlayerStyle)) {
    if (-not (Test-Path -LiteralPath $requiredFile -PathType Leaf)) {
        throw "Required source file was not found: $requiredFile"
    }
}

New-Item -ItemType Directory -Path (Split-Path -Parent $targetImage) -Force | Out-Null
Copy-Item -LiteralPath $sourceIndex -Destination $targetIndex -Force
Copy-Item -LiteralPath $sourceDialogue -Destination $targetDialogue -Force
Copy-Item -LiteralPath $sourceReading -Destination $targetReading -Force
Copy-Item -LiteralPath $sourceLesson7Grammar -Destination $targetLesson7Grammar -Force
Copy-Item -LiteralPath $sourceLesson7Dialogue -Destination $targetLesson7Dialogue -Force
Copy-Item -LiteralPath $sourceLesson7Email -Destination $targetLesson7Email -Force
Copy-Item -LiteralPath $sourceSongKatachi -Destination $targetSongKatachi -Force
Copy-Item -LiteralPath $sourceImage -Destination $targetImage -Force
Copy-Item -LiteralPath $sourceLesson7Image -Destination $targetLesson7Image -Force
Copy-Item -LiteralPath $sourceLesson7DialogueImage -Destination $targetLesson7DialogueImage -Force
Copy-Item -LiteralPath $sourceLesson7EmailImage -Destination $targetLesson7EmailImage -Force
New-Item -ItemType Directory -Path $targetAssets -Force | Out-Null
Copy-Item -LiteralPath $sourcePlayerScript -Destination (Join-Path $targetAssets "audio-lesson-player.js") -Force
Copy-Item -LiteralPath $sourcePlayerStyle -Destination (Join-Path $targetAssets "audio-lesson-player.css") -Force
Sync-AudioDirectory -Source $sourceAudio -Target $targetAudio
Sync-AudioDirectory -Source $sourceChineseAudio -Target $targetChineseAudio

Write-Host "Cloudflare Pages files synchronized:"
Write-Host "  $targetIndex"
Write-Host "  $targetDialogue"
Write-Host "  $targetReading"
Write-Host "  $targetLesson7Grammar"
Write-Host "  $targetLesson7Dialogue"
Write-Host "  $targetLesson7Email"
Write-Host "  $targetSongKatachi"
Write-Host "  $targetImage"
Write-Host "  $targetLesson7Image"
Write-Host "  $targetLesson7DialogueImage"
Write-Host "  $targetLesson7EmailImage"
Write-Host "  $targetAudio"
Write-Host "  $targetChineseAudio"
Write-Host "  $targetAssets"
