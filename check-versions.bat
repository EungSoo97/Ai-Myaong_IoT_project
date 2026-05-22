@echo off
setlocal EnableExtensions

set "TARGET=%~1"
if not defined TARGET set "TARGET=all"

set "REPO_ROOT=%~dp0"
if "%REPO_ROOT:~-1%"=="\" set "REPO_ROOT=%REPO_ROOT:~0,-1%"
set /p EXPECTED_PYTHON=<"%REPO_ROOT%\.python-version"
set /p EXPECTED_NODE=<"%REPO_ROOT%\.nvmrc"

if /I "%TARGET%"=="backend" call :check_python_target backend Backend || exit /b 1
if /I "%TARGET%"=="desktop" call :check_python_target desktop Desktop || exit /b 1
if /I "%TARGET%"=="raspberrypi" call :check_python_target raspberrypi Raspberry Pi || exit /b 1
if /I "%TARGET%"=="frontend" call :check_node_target || exit /b 1
if /I "%TARGET%"=="all" (
  call :check_python_target backend Backend || exit /b 1
  call :check_python_target desktop Desktop || exit /b 1
  call :check_python_target raspberrypi Raspberry Pi || exit /b 1
  call :check_node_target || exit /b 1
)

if /I not "%TARGET%"=="backend" if /I not "%TARGET%"=="desktop" if /I not "%TARGET%"=="raspberrypi" if /I not "%TARGET%"=="frontend" if /I not "%TARGET%"=="all" (
  echo Invalid target: %TARGET%
  echo Use one of: backend, desktop, raspberrypi, frontend, all
  exit /b 1
)

echo.
echo Version check finished.
exit /b 0

:check_python_target
set "TARGET_KEY=%~1"
set "TARGET_LABEL=%~2"
set "VENV_PY=%REPO_ROOT%\%TARGET_KEY%\.venv\Scripts\python.exe"

echo.
echo [%TARGET_LABEL%]

if not exist "%VENV_PY%" (
  echo Virtual environment not found: %VENV_PY%
  echo Run setup-python-venv.bat -Target %TARGET_KEY% first.
  exit /b 1
)

"%VENV_PY%" -c "import sys; print('Python:', sys.version.split()[0])"
if errorlevel 1 exit /b 1

for /f "delims=" %%V in ('%VENV_PY% -c "import sys; print(sys.version.split()[0])"') do set "CURRENT_PYTHON=%%V"
if /I "%CURRENT_PYTHON%"=="%EXPECTED_PYTHON%" (
  echo Python status: OK
) else (
  echo Python status: expected %EXPECTED_PYTHON%, current %CURRENT_PYTHON%
)

"%VENV_PY%" -c "import cv2; print('OpenCV:', cv2.__version__)" 2>nul
if errorlevel 1 (
  echo OpenCV: not installed
)

"%VENV_PY%" -c "import ultralytics; print('Ultralytics:', ultralytics.__version__)" 2>nul
if errorlevel 1 (
  echo Ultralytics: not installed
)

exit /b 0

:check_node_target
echo.
echo [Frontend]

for /f "usebackq delims=" %%V in (`cmd /d /c "node -p process.versions.node" 2^>nul`) do set "CURRENT_NODE=%%V"
if not defined CURRENT_NODE (
  echo Node: not available
  exit /b 1
)

echo Node: %CURRENT_NODE%
if /I "%CURRENT_NODE:~0,3%"=="%EXPECTED_NODE%." (
  echo Node status: OK
) else (
  echo Node status: expected %EXPECTED_NODE%.x, current %CURRENT_NODE%
)

cmd /d /c "npm -v" 2>nul
if errorlevel 1 (
  echo npm: not available
  exit /b 1
)

exit /b 0
