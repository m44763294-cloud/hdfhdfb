@echo off
chcp 65001 >nul
title Push to GitHub
cd /d "%~dp0"

set /p REPO="Вставь адрес репозитория (например https://github.com/логин/репо.git): "
if "%REPO%"=="" (
  echo Адрес не введён.
  pause
  exit /b 1
)

git remote remove origin 2>nul
git remote add origin %REPO%
git branch -M main
git add .
git commit -m "update" --allow-empty
git push -u origin main

echo.
echo Готово. Если Git попросит войти — пройди авторизацию в браузере.
pause
