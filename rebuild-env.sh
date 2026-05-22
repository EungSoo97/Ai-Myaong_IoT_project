#!/usr/bin/env bash
set -euo pipefail

TARGET="${1:-all}"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

remove_venv() {
  local key="$1"
  local label="$2"
  local venv_path="$REPO_ROOT/$key/.venv"

  echo
  echo "[$label]"
  if [[ -d "$venv_path" ]]; then
    echo "Removing $venv_path"
    rm -rf "$venv_path"
  else
    echo "No virtual environment found."
  fi
}

remove_node_modules() {
  local node_modules_path="$REPO_ROOT/frontend/node_modules"

  echo
  echo "[Frontend]"
  if [[ -d "$node_modules_path" ]]; then
    echo "Removing $node_modules_path"
    rm -rf "$node_modules_path"
  else
    echo "No node_modules directory found."
  fi
}

case "$TARGET" in
  backend)
    remove_venv "backend" "Backend"
    bash "$REPO_ROOT/setup-dev-env.sh" -Target backend
    ;;
  desktop)
    remove_venv "desktop" "Desktop"
    bash "$REPO_ROOT/setup-dev-env.sh" -Target desktop
    ;;
  raspberrypi)
    remove_venv "raspberrypi" "Raspberry Pi"
    bash "$REPO_ROOT/setup-dev-env.sh" -Target raspberrypi
    ;;
  frontend)
    remove_node_modules
    bash "$REPO_ROOT/setup-dev-env.sh" -Target frontend
    ;;
  all)
    remove_venv "backend" "Backend"
    remove_venv "desktop" "Desktop"
    remove_venv "raspberrypi" "Raspberry Pi"
    remove_node_modules
    bash "$REPO_ROOT/setup-dev-env.sh" -Target all
    ;;
  *)
    echo "Invalid target: $TARGET" >&2
    echo "Use one of: backend, desktop, raspberrypi, frontend, all" >&2
    exit 1
    ;;
esac

echo
echo "Rebuild finished successfully."
