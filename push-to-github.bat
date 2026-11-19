@echo off
setlocal EnableExtensions
chcp 65001 >nul
title Push to GitHub
cd /d "%~dp0"

if not exist "repo.txt" (
  echo https://github.com/VASH-LOGIN/VASH-REPO.git>repo.txt
  echo.
  echo [1] Otkrylsya Notepad s failom repo.txt.
  echo     Zameni adres na svoj репозиторий i sokhrani: Ctrl+S
  echo     Adres vidno na stranitse posle sozdaniya repo,
  echo     on zhe v bloke "…or push an existing repository".
  echo.
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
echo Push... otkroyetsya avtorizatsiya GitHub, proydi ee.
git push -u origin main
if errorlevel 1 goto :pushfail
echo.
echo GOTovo. Kod na GitHub.
pause
exit /b 0

:bad
echo.
echo Adres v repo.txt ne pohozh na GitHub (nuzhen vid https://github.com/login/repo.git).
echo Otkrой repo.txt v Notepade, poprav' i zapusti skript snova.
pause
exit /b 1

:pushfail
echo.
echo Push ne proshel. Prover':
echo   1) sozdan LI STORej prazdnyj na github.com/new (bez README i gitignore)
echo   2) adres v repo.txt sovpadaet s nim
echo   3) proshla avtorizatsiya GitHub v okne brauzera
pause
exit /b 1
