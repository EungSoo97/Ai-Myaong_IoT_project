@echo off
setlocal EnableExtensions

set "SCRIPT_DIR=%~dp0"
set "PROJECT_PATH=%SCRIPT_DIR%..\backend"

pushd "%PROJECT_PATH%"

if exist ".venv\Scripts\python.exe" (
  .venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
  set "EXIT_CODE=%ERRORLEVEL%"
  popd
  exit /b %EXIT_CODE%
)

if exist ".venv\bin\python" (
  .venv\bin\python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
  set "EXIT_CODE=%ERRORLEVEL%"
  popd
  exit /b %EXIT_CODE%
)

py -3.11 --version >nul 2>&1
if not errorlevel 1 (
  py -3.11 -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
  set "EXIT_CODE=%ERRORLEVEL%"
  popd
  exit /b %EXIT_CODE%
)

python3.11 -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
set "EXIT_CODE=%ERRORLEVEL%"
popd
exit /b %EXIT_CODE%
