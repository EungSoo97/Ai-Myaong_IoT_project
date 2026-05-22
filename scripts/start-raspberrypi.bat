@echo off
setlocal EnableExtensions

set "SCRIPT_DIR=%~dp0"
set "PROJECT_PATH=%SCRIPT_DIR%..\raspberrypi"

pushd "%PROJECT_PATH%"

if exist ".venv\Scripts\python.exe" (
  .venv\Scripts\python.exe .\main.py
  set "EXIT_CODE=%ERRORLEVEL%"
  popd
  exit /b %EXIT_CODE%
)

if exist ".venv\bin\python" (
  .venv\bin\python .\main.py
  set "EXIT_CODE=%ERRORLEVEL%"
  popd
  exit /b %EXIT_CODE%
)

py -3.11 --version >nul 2>&1
if not errorlevel 1 (
  py -3.11 .\main.py
  set "EXIT_CODE=%ERRORLEVEL%"
  popd
  exit /b %EXIT_CODE%
)

python3.11 .\main.py
set "EXIT_CODE=%ERRORLEVEL%"
popd
exit /b %EXIT_CODE%
