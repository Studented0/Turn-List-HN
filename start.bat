@echo off
setlocal EnableDelayedExpansion

cd /d "%~dp0web"

echo Checking dependencies...
if not exist "node_modules\" (
    echo Installing dependencies, please wait...
    call npm install
    if errorlevel 1 (
        echo.
        echo ERROR: Failed to install dependencies.
        pause
        exit /b 1
    )
    echo Done.
    echo.
)

REM Detect LAN IP — prefer the first non-loopback, non-link-local IPv4
set "LOCAL_IP="
for /f "delims=" %%a in ('powershell -NoProfile -Command "try{(Get-NetIPAddress -AddressFamily IPv4 | Where-Object{$_.IPAddress -notmatch '^127\.' -and $_.IPAddress -notmatch '^169\.254\.'} | Select-Object -First 1).IPAddress}catch{''}"') do set "LOCAL_IP=%%a"
if "!LOCAL_IP!"=="" set "LOCAL_IP=<network-ip-unavailable>"

echo.
echo ========================================
echo  CadenApp
echo.
echo  Local:   http://localhost:3000
echo  Network: http://!LOCAL_IP!:3000
echo.
echo  Data:    %~dp0web\data\database.xlsx
echo  (double-click "Open Data.bat" to open it)
echo ========================================
echo.

REM Open the browser after the server has had 3 seconds to start
start "" cmd /c "timeout /t 3 /nobreak >nul && start http://localhost:3000"

REM Bind to 0.0.0.0 so LAN devices can reach the network URL above
node_modules\.bin\next dev -H 0.0.0.0 -p 3000

echo.
echo Server stopped. Press any key to close this window.
pause >nul

endlocal
