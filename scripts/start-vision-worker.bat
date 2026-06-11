@echo off
setlocal EnableExtensions

set "SCRIPT_DIR=%~dp0"
set "PROJECT_PATH=%SCRIPT_DIR%..\desktop"
set "EXIT_CODE=0"
set "AUTO_PAUSE=0"
echo %CMDCMDLINE% | findstr /I /C:" /c " >nul
if not errorlevel 1 set "AUTO_PAUSE=1"

pushd "%PROJECT_PATH%"

if not exist ".venv\Scripts\python.exe" (
  py -3.11 -m venv .venv 2>nul || python -m venv .venv
)

".venv\Scripts\python.exe" -m pip install --upgrade pip
if errorlevel 1 (
  set "EXIT_CODE=%ERRORLEVEL%"
  popd
  goto finish
)

".venv\Scripts\python.exe" -m pip install -r requirements.txt
if errorlevel 1 (
  set "EXIT_CODE=%ERRORLEVEL%"
  popd
  goto finish
)

".venv\Scripts\python.exe" opencv\vision_to_frontend.py
set "EXIT_CODE=%ERRORLEVEL%"
popd

:finish
if "%AUTO_PAUSE%"=="1" pause
exit /b %EXIT_CODE%
