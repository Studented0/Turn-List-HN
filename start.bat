@echo off
setlocal EnableDelayedExpansion

REM ── Require administrator privileges (needed to open the firewall) ────────────
net session >nul 2>&1
if errorlevel 1 (
    echo Requesting administrator privileges for firewall access...
    powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
    exit /b 0
)

REM ── Check for Node.js ────────────────────────────────────────────────────────
where node >nul 2>&1
if errorlevel 1 (
    echo Node.js is not installed. Downloading the LTS installer...
    echo This may take a few minutes. Please wait.
    echo.

    set "PS_SCRIPT=%TEMP%\cadenapp_install_node.ps1"
    (
        echo try {
        echo     $info = Invoke-RestMethod 'https://nodejs.org/dist/index.json' ^| Where-Object { $_.lts } ^| Select-Object -First 1
        echo     $v = $info.version
        echo     $url = "https://nodejs.org/dist/$v/node-$v-x64.msi"
        echo     $out = "$env:TEMP\node_lts_installer.msi"
        echo     Write-Host "Downloading Node.js $v ..."
        echo     Invoke-WebRequest $url -OutFile $out -UseBasicParsing
        echo     Write-Host "Installing ..."
        echo     Start-Process msiexec.exe -ArgumentList "/i `"$out`" /qn" -Wait
        echo     Remove-Item $out -Force -ErrorAction SilentlyContinue
        echo } catch {
        echo     Write-Error $_
        echo     exit 1
        echo }
    ) > "!PS_SCRIPT!"

    powershell -NoProfile -ExecutionPolicy Bypass -File "!PS_SCRIPT!"
    set "NODE_INSTALL_ERR=!errorlevel!"
    del "!PS_SCRIPT!" >nul 2>&1

    if !NODE_INSTALL_ERR! neq 0 (
        echo.
        echo ERROR: Could not install Node.js automatically.
        echo Please download and install it manually from: https://nodejs.org
        echo Then run start.bat again.
        echo.
        pause
        exit /b 1
    )

    echo.
    echo Node.js installed successfully.
    echo Please close this window and run start.bat again.
    echo.
    pause
    exit /b 0
)

REM ── Install app dependencies if needed ───────────────────────────────────────
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

REM ── Open port 3000 in Windows Firewall so other devices can connect ──────────
netsh advfirewall firewall show rule name="CadenApp Port 3000" >nul 2>&1
if errorlevel 1 (
    netsh advfirewall firewall add rule name="CadenApp Port 3000" dir=in action=allow protocol=TCP localport=3000 >nul
    echo Firewall: opened port 3000 for network access.
    echo.
)

REM ── Show all LAN IPs (try each one on other devices) ─────────────────────────
echo.
echo ========================================
echo  CadenApp
echo.
echo  This device:  http://localhost:3000
echo.
echo  Other devices - try each address below:
for /f "delims=" %%a in ('powershell -NoProfile -Command "Get-NetIPAddress -AddressFamily IPv4 | Where-Object{$_.IPAddress -notmatch '^127\.' -and $_.IPAddress -notmatch '^169\.254\.'} | Select-Object -ExpandProperty IPAddress"') do (
    echo    http://%%a:3000
)
echo.
echo  Data:  %~dp0web\data\database.xlsx
echo  (double-click "Open Data.bat" to open it)
echo ========================================
echo.

REM ── Open browser after 3-second head start ───────────────────────────────────
start "" cmd /c "timeout /t 3 /nobreak >nul && start http://localhost:3000"

REM ── Start the server ─────────────────────────────────────────────────────────
call npm run dev -- -H 0.0.0.0 -p 3000

echo.
echo Server stopped. Press any key to close this window.
pause >nul

endlocal
