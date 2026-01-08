@echo off
setlocal

if "%1"=="clean" (
    powershell -ExecutionPolicy Bypass -File build.ps1 -Clean
) else (
    powershell -ExecutionPolicy Bypass -File build.ps1
)

endlocal

