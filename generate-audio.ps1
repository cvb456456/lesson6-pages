$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$workspaceRoot = Split-Path -Parent $repoRoot
$sourceRoot = Join-Path $workspaceRoot "LearnJapan"
$japaneseAudioRoot = Join-Path $sourceRoot "audio\jp-nanami"
$chineseAudioRoot = Join-Path $sourceRoot "audio\zh-xiaoxiao"
$japaneseTextList = Join-Path $repoRoot ".tts-ja-texts.txt"
$chineseTextList = Join-Path $repoRoot ".tts-zh-texts.txt"
$edge = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"

if (-not (Test-Path -LiteralPath $edge -PathType Leaf)) {
    throw "Microsoft Edge was not found: $edge"
}

$japaneseTexts = [System.Collections.Generic.List[string]]::new()
$chineseTexts = [System.Collections.Generic.List[string]]::new()
$pages = Get-ChildItem -LiteralPath $sourceRoot -Filter "lesson*.html" -File

foreach ($page in $pages) {
    $safeName = [IO.Path]::GetFileNameWithoutExtension($page.Name)
    $profile = Join-Path $workspaceRoot ".edge-tts-$safeName"
    $domFile = Join-Path $workspaceRoot "$safeName.tts-dom.html"

    & $edge `
        "--headless=new" `
        "--disable-gpu" `
        "--user-data-dir=$profile" `
        "--dump-dom" `
        "file:///$($page.FullName.Replace('\', '/'))" |
        Set-Content -LiteralPath $domFile -Encoding UTF8

    Start-Sleep -Milliseconds 800
    $html = Get-Content -LiteralPath $domFile -Raw -Encoding UTF8
    foreach ($match in [regex]::Matches($html, 'data-speech="([^"]+)"')) {
        $japaneseTexts.Add([uri]::UnescapeDataString($match.Groups[1].Value))
    }
    foreach ($match in [regex]::Matches($html, 'data-narration-ja="([^"]+)"')) {
        $japaneseTexts.Add([uri]::UnescapeDataString($match.Groups[1].Value))
    }
    foreach ($match in [regex]::Matches($html, 'data-narration-zh="([^"]+)"')) {
        $chineseTexts.Add([uri]::UnescapeDataString($match.Groups[1].Value))
    }

    $resolvedProfile = Resolve-Path -LiteralPath $profile -ErrorAction SilentlyContinue
    if ($resolvedProfile -and $resolvedProfile.Path.StartsWith($workspaceRoot + "\.edge-tts-")) {
        Remove-Item -LiteralPath $resolvedProfile.Path -Recurse -Force
    }
    Remove-Item -LiteralPath $domFile -Force -ErrorAction SilentlyContinue
}

$japaneseTexts |
    Sort-Object -Unique |
    Set-Content -LiteralPath $japaneseTextList -Encoding UTF8

python (Join-Path $repoRoot "tools\generate_audio.py") `
    --input $japaneseTextList `
    --output $japaneseAudioRoot `
    --voice "ja-JP-NanamiNeural" `
    --rate=-12% `
    --concurrency 5

if ($LASTEXITCODE -ne 0) {
    throw "Audio generation failed."
}

$chineseTexts |
    Sort-Object -Unique |
    Set-Content -LiteralPath $chineseTextList -Encoding UTF8

python (Join-Path $repoRoot "tools\generate_audio.py") `
    --input $chineseTextList `
    --output $chineseAudioRoot `
    --voice "zh-CN-XiaoxiaoNeural" `
    --rate=-6% `
    --concurrency 2

if ($LASTEXITCODE -ne 0) {
    throw "Chinese narration generation failed."
}

Write-Host "Japanese audio files are ready: $japaneseAudioRoot"
Write-Host "Chinese narration files are ready: $chineseAudioRoot"
