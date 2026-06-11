$ErrorActionPreference = "Stop"

$projectPath = Join-Path $PSScriptRoot "..\desktop"
Set-Location $projectPath

if (-not (Test-Path ".\.venv\Scripts\python.exe")) {
  try {
    py -3.11 -m venv .venv
  } catch {
    python -m venv .venv
  }
}

.\.venv\Scripts\python.exe -m pip install --upgrade pip
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe .\opencv\vision_to_frontend.py
