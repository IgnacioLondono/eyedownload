@echo off
set PORT=7842

echo Iniciando EyeDownload...

for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%PORT%" ^| findstr "LISTENING"') do (
  echo Cerrando instancia anterior (PID %%a)...
  taskkill /F /PID %%a >nul 2>&1
)

timeout /t 1 /nobreak >nul

echo Abre http://localhost:%PORT% en tu navegador
npm start
