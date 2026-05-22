#!/usr/bin/env bash
set -euo pipefail

TARGET="all"
SKIP_INSTALL=0
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PYTHON_BIN=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    -Target|--target)
      TARGET="${2:-}"
      shift 2
      ;;
    -SkipInstall|--skip-install)
      SKIP_INSTALL=1
      shift
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 1
      ;;
  esac
done

pick_python() {
  if command -v python3.11 >/dev/null 2>&1; then
    PYTHON_BIN="python3.11"
    return
  fi

  if command -v python3 >/dev/null 2>&1; then
    local version
    version="$(python3 -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")')"
    if [[ "$version" == "3.11" ]]; then
      PYTHON_BIN="python3"
      return
    fi
  fi

  echo "Python 3.11 is required. Install Python 3.11.9 and run again." >&2
  exit 1
}

check_node() {
  if ! command -v node >/dev/null 2>&1; then
    echo "Node.js is required. Install Node.js 22 and run again." >&2
    exit 1
  fi

  if ! command -v npm >/dev/null 2>&1; then
    echo "npm is required. Install Node.js 22 and run again." >&2
    exit 1
  fi

  local node_version
  node_version="$(node -p 'process.versions.node')"
  if [[ "$node_version" != 22.* ]]; then
    echo "Node.js 22 is required. Current version: $node_version" >&2
    exit 1
  fi
}

setup_python_target() {
  local key="$1"
  local label="$2"
  local project_path="$REPO_ROOT/$key"
  local venv_path="$project_path/.venv"
  local venv_python="$venv_path/bin/python"
  local requirements_path="$project_path/requirements.txt"

  echo
  echo "[$label] $project_path"

  if [[ ! -x "$venv_python" ]]; then
    echo "Creating virtual environment with Python 3.11..."
    "$PYTHON_BIN" -m venv "$venv_path"
  else
    echo "Virtual environment already exists."
  fi

  if [[ "$SKIP_INSTALL" -eq 1 ]]; then
    echo "Skipping package install."
    return
  fi

  if [[ ! -f "$requirements_path" ]]; then
    echo "No requirements file found. Skipping package install."
    return
  fi

  echo "Installing packages from requirements.txt..."
  "$venv_python" -m pip install --upgrade pip
  "$venv_python" -m pip install -r "$requirements_path"
}

setup_frontend() {
  local project_path="$REPO_ROOT/frontend"

  check_node

  echo
  echo "[Frontend] $project_path"

  if [[ "$SKIP_INSTALL" -eq 1 ]]; then
    echo "Skipping package install."
    return
  fi

  pushd "$project_path" >/dev/null
  if [[ -f package-lock.json ]]; then
    echo "Installing packages with npm ci..."
    npm ci
  else
    echo "Installing packages with npm install..."
    npm install
  fi
  popd >/dev/null
}

case "$TARGET" in
  backend|desktop|raspberrypi|all)
    pick_python
    ;;
  frontend)
    ;;
  *)
    echo "Invalid target: $TARGET" >&2
    exit 1
    ;;
esac

case "$TARGET" in
  backend)
    setup_python_target "backend" "Backend"
    ;;
  desktop)
    setup_python_target "desktop" "Desktop"
    ;;
  raspberrypi)
    setup_python_target "raspberrypi" "Raspberry Pi"
    ;;
  frontend)
    setup_frontend
    ;;
  all)
    setup_python_target "backend" "Backend"
    setup_python_target "desktop" "Desktop"
    setup_python_target "raspberrypi" "Raspberry Pi"
    setup_frontend
    ;;
esac

echo
echo "Setup finished successfully."
