@echo off
setlocal EnableExtensions
title Push to GitHub
cd /d "%~dp0"

if not exist "repo.txt" (
  echo https://github.com/YOUR-LOGIN/YOUR-REPO.git>repo.txt
  echo.
  echo [1] Notepad will open with repo.txt
  echo     Paste YOUR repo URL there, format: https://github.com/login/repo.git
  echo     Save it: Ctrl+S  -  then press any key below.
  echo.
  pause
  notepad "repo.txt"
)

set "REPO="
set /p REPO=<repo.txt
set "REPO=%REPO:"=%"
set "REPO=%REPO: =%"

echo(%REPO%| findstr /i /c:"github.com" >nul
if errorlevel 1 goto :bad

echo.
echo Repo: %REPO%
git remote remove origin 2>nul
git remote add origin %REPO%
git branch -M main
git add .
git commit -m "update" --allow-empty
echo.
echo Pushing... a GitHub login window may open - complete it.
git push -u origin main
if errorlevel 1 goto :pushfail
echo.
echo DONE. Code is on GitHub. Next: connect it to Cloudflare, see README.md.
pause
exit /b 0

:bad
echo.
echo repo.txt does not look like a GitHub URL.
echo Expected: https://github.com/login/repo.git
echo Open repo.txt in Notepad, fix it and run this file again.
pause
exit /b 1

:pushfail
echo.
echo Push failed. Check:
echo   1) repo exists at github.com/new and is EMPTY (no README, no gitignore)
echo   2) URL in repo.txt matches it exactly
echo   3) GitHub authorization was completed in the browser window
pause
exit /b 1
