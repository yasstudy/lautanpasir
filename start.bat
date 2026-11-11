@echo off
cd /d "%~dp0"
if not exist .env copy .env.example .env >nul & echo Edit file .env dulu (ganti ADMIN_PASSWORD), lalu jalankan lagi. & notepad .env & exit /b
if not exist node_modules call npm install
start "" cmd /c "timeout /t 2 >nul & start http://localhost:3000/"
node server.js
pause
