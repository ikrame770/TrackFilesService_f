@echo off
echo ======================================
echo 🚀 Starting TrackFilesService (backend + frontend)
echo ======================================

REM --- Backend setup ---
cd WebApplication2
echo 🔧 Restoring backend dependencies...
dotnet restore

echo 🗃️ Applying database migrations and seeding...
dotnet ef database update

echo ▶️ Starting backend in new terminal...
start "Backend" cmd /k "dotnet run"

REM --- Frontend setup ---
set FRONTEND_PATH=%~dp0front-end
cd /d "%FRONTEND_PATH%"

echo 📦 Installing frontend dependencies...
npm install

echo ▶️ Starting frontend (React will open in browser automatically)...
start "" cmd /c "npm start"

echo ======================================
echo ✅ Backend and frontend are running!
echo ======================================
pause
