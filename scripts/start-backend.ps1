$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..\\backend")

if (Test-Path ".\\.venv\\Scripts\\python.exe") {
  .\\.venv\\Scripts\\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --no-access-log
} elseif (Test-Path ".\\.venv\\bin\\python") {
  .\\.venv\\bin\\python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --no-access-log
} else {
  py -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --no-access-log
}
