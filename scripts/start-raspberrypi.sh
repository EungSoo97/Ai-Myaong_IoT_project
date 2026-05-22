#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_PATH="$SCRIPT_DIR/../raspberrypi"

cd "$PROJECT_PATH"

if [[ -x ".venv/bin/python" ]]; then
  exec .venv/bin/python ./main.py
fi

if command -v python3.11 >/dev/null 2>&1; then
  exec python3.11 ./main.py
fi

exec python3 ./main.py
