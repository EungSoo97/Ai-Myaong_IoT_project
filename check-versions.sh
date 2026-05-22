#!/usr/bin/env bash
set -euo pipefail

TARGET="${1:-all}"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
EXPECTED_PYTHON="$(tr -d '[:space:]' < "$REPO_ROOT/.python-version")"
EXPECTED_NODE="$(tr -d '[:space:]' < "$REPO_ROOT/.nvmrc")"

check_python_target() {
  local key="$1"
  local label="$2"
  local venv_python="$REPO_ROOT/$key/.venv/bin/python"

  echo
  echo "[$label]"

  if [[ ! -x "$venv_python" ]]; then
    echo "Virtual environment not found: $venv_python"
    echo "Run bash ./setup-dev-env.sh -Target $key first."
    return 1
  fi

  local current_python
  current_python="$("$venv_python" -c "import sys; print(sys.version.split()[0])")"
  echo "Python: $current_python"
  if [[ "$current_python" == "$EXPECTED_PYTHON" ]]; then
    echo "Python status: OK"
  else
    echo "Python status: expected $EXPECTED_PYTHON, current $current_python"
  fi

  if "$venv_python" -c "import cv2; print('OpenCV:', cv2.__version__)" 2>/dev/null; then
    :
  else
    echo "OpenCV: not installed"
  fi

  if "$venv_python" -c "import ultralytics; print('Ultralytics:', ultralytics.__version__)" 2>/dev/null; then
    :
  else
    echo "Ultralytics: not installed"
  fi
}

check_node_target() {
  echo
  echo "[Frontend]"

  if ! command -v node >/dev/null 2>&1; then
    echo "Node: not available"
    return 1
  fi

  if ! command -v npm >/dev/null 2>&1; then
    echo "npm: not available"
    return 1
  fi

  local current_node
  current_node="$(node -p 'process.versions.node')"
  echo "Node: $current_node"
  if [[ "$current_node" == "$EXPECTED_NODE".* ]]; then
    echo "Node status: OK"
  else
    echo "Node status: expected $EXPECTED_NODE.x, current $current_node"
  fi

  echo "npm: $(npm -v)"
}

case "$TARGET" in
  backend)
    check_python_target "backend" "Backend"
    ;;
  desktop)
    check_python_target "desktop" "Desktop"
    ;;
  raspberrypi)
    check_python_target "raspberrypi" "Raspberry Pi"
    ;;
  frontend)
    check_node_target
    ;;
  all)
    check_python_target "backend" "Backend"
    check_python_target "desktop" "Desktop"
    check_python_target "raspberrypi" "Raspberry Pi"
    check_node_target
    ;;
  *)
    echo "Invalid target: $TARGET" >&2
    echo "Use one of: backend, desktop, raspberrypi, frontend, all" >&2
    exit 1
    ;;
esac

echo
echo "Version check finished."
