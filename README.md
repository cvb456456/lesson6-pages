# Lesson 6 Pages deployment

This repository contains the deployable copy of the Japanese intermediate
course library. The root page is the course index; individual lesson pages
are published as separate HTML files.

## Cloudflare Pages settings

- Production branch: `main`
- Framework preset: `None`
- Build command: leave blank
- Build output directory: `public`
- Root directory: leave blank

## Local publishing

The source page remains in `..\LearnJapan`. To synchronize, commit, and push:

```powershell
.\publish.ps1 -Message "Update lesson notes"
```

After the initial GitHub and Cloudflare connection, every push to `main`
automatically creates a new Cloudflare Pages production deployment.

Windows users can also double-click `publish.cmd`.

Before each publish, `generate-audio.ps1` renders the lesson pages, extracts
all Japanese playback text, and generates any missing MP3 files with
`ja-JP-NanamiNeural`. Existing files are cached and reused.

Sentence-level intensive-listening narration uses `zh-CN-XiaoxiaoNeural`
for Chinese explanations and `ja-JP-NanamiNeural` for Japanese examples.
The shared player component lives in `public/assets/`.
