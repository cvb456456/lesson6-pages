@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo 正在同步网页并发布到 GitHub...
echo.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0publish.ps1" -Message "Manual lesson update"
echo.
if errorlevel 1 (
  echo 发布失败，请保留此窗口中的错误信息。
) else (
  echo 发布流程完成。Cloudflare Pages 将自动开始部署。
)
pause
