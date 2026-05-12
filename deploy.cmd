@echo off
REM Double-click this file to deploy the latest GitHub Actions build to nextrealmos.pages.dev.
REM Requires: Git for Windows (provides bash) and the project's node_modules.

cd /d "%~dp0"
"C:\Program Files\Git\bin\bash.exe" deploy-from-built.sh
pause
