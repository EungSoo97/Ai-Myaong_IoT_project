@echo off
setlocal EnableExtensions

set "SCRIPT_DIR=%~dp0"
set "PROJECT_PATH=%SCRIPT_DIR%..\frontend"

pushd "%PROJECT_PATH%"
cmd /d /c "npm run dev"
set "EXIT_CODE=%ERRORLEVEL%"
popd
exit /b %EXIT_CODE%
