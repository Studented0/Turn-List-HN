@echo off
set "XLSX=%~dp0web\data\database.xlsx"

if exist "%XLSX%" (
    start "" "%XLSX%"
) else (
    echo The data file has not been created yet.
    echo Start the app first using start.bat, then come back here.
    echo.
    pause
)
