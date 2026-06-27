@echo off
echo Instalando EyeDownload...
set YOUTUBE_DL_SKIP_PYTHON_CHECK=1
call npm install
if %ERRORLEVEL% NEQ 0 (
  echo Ocurrio un error durante la instalacion.
  pause
  exit /b 1
)
echo.
echo Instalacion completada. Ejecuta: npm start
pause
