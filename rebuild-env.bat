@echo off
setlocal EnableExtensions

set "TARGET=%~1"
if not defined TARGET set "TARGET=all"

set "REPO_ROOT=%~dp0"
if "%REPO_ROOT:~-1%"=="\" set "REPO_ROOT=%REPO_ROOT:~0,-1%"

if /I "%TARGET%"=="backend" call :remove_venv backend Backend || exit /b 1
if /I "%TARGET%"=="desktop" call :remove_venv desktop Desktop || exit /b 1
if /I "%TARGET%"=="raspberrypi" call :remove_venv raspberrypi Raspberry Pi || exit /b 1
if /I "%TARGET%"=="all" (
  call :remove_venv backend Backend || exit /b 1
  call :remove_venv desktop Desktop || exit /b 1
  call :remove_venv raspberrypi Raspberry Pi || exit /b 1
)

if /I "%TARGET%"=="frontend" goto rebuild_frontend
if /I "%TARGET%"=="backend" goto rebuild_python
if /I "%TARGET%"=="desktop" goto rebuild_python
if /I "%TARGET%"=="raspberrypi" goto rebuild_python
if /I "%TARGET%"=="all" goto rebuild_all

echo Invalid target: %TARGET%
echo Use one of: backend, desktop, raspberrypi, frontend, all
exit /b 1

:remove_venv
set "TARGET_KEY=%~1"
set "TARGET_LABEL=%~2"
set "VENV_PATH=%REPO_ROOT%\%TARGET_KEY%\.venv"

echo.
echo [%TARGET_LABEL%]
if exist "%VENV_PATH%" (
  echo Removing %VENV_PATH%
  rmdir /s /q "%VENV_PATH%"
  if exist "%VENV_PATH%" (
    echo Failed to remove %VENV_PATH%
    exit /b 1
  )
) else (
  echo No virtual environment found.
)
exit /b 0

:rebuild_python
echo.
echo Rebuilding %TARGET% environment...
call "%REPO_ROOT%\setup-python-venv.bat" -Target %TARGET%
exit /b %ERRORLEVEL%

:rebuild_frontend
echo.
echo Reinstalling frontend dependencies...
pushd "%REPO_ROOT%\frontend"
if exist "node_modules" (
  echo Removing frontend\node_modules
  rmdir /s /q "node_modules"
)
popd
call "%REPO_ROOT%\setup-python-venv.bat" -Target frontend
exit /b %ERRORLEVEL%

:rebuild_all
echo.
echo Rebuilding all environments...
pushd "%REPO_ROOT%\frontend"
if exist "node_modules" (
  echo Removing frontend\node_modules
  rmdir /s /q "node_modules"
)
popd
call "%REPO_ROOT%\setup-python-venv.bat" -Target all
exit /b %ERRORLEVEL%
