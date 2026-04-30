@echo off
cd /d "%~dp0"

set "LOCAL_NODE=%LOCALAPPDATA%\Microsoft\WinGet\Packages\OpenJS.NodeJS.LTS_Microsoft.Winget.Source_8wekyb3d8bbwe\node-v24.15.0-win-x64"

for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000" ^| findstr "LISTENING"') do set "PORT_PID=%%a"

if defined PORT_PID (
  echo.
  echo El puerto 3000 ya esta ocupado por el proceso %PORT_PID%.
  echo Si hiciste cambios, hay que cerrar el servidor viejo para iniciar la version nueva.
  choice /C SN /M "Cerrar servidor viejo?"
  if errorlevel 2 (
    echo.
    echo No se inicio otro servidor. La pagina actual sigue en http://127.0.0.1:3000
    pause
    exit /b 0
  )
  if errorlevel 1 (
    taskkill /PID %PORT_PID% /F
  )
)

if exist "%LOCAL_NODE%\node.exe" (
  "%LOCAL_NODE%\node.exe" "%CD%\node_modules\next\dist\bin\next" build
  "%LOCAL_NODE%\node.exe" "%CD%\node_modules\next\dist\bin\next" start -p 3000 -H 0.0.0.0
) else (
  npm run build
  npx next start -p 3000 -H 0.0.0.0
)

pause
