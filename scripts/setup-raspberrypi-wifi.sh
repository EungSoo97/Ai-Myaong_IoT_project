#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  bash ./scripts/setup-raspberrypi-wifi.sh "SSID" "PASSWORD"

Optional environment variables:
  MQTT_BROKER_HOST=10.1.82.103
  MQTT_BROKER_PORT=1883

This script connects Raspberry Pi OS to the same Wi-Fi that the ESP32
dispenser should be configured to use through ESP32_FEEDER_SETUP.
EOF
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

if [[ $# -lt 2 ]]; then
  usage
  exit 1
fi

SSID="$1"
PASSWORD="$2"
MQTT_HOST="${MQTT_BROKER_HOST:-10.1.82.103}"
MQTT_PORT="${MQTT_BROKER_PORT:-1883}"
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PI_ENV="$REPO_ROOT/raspberrypi/.env"

if ! command -v nmcli >/dev/null 2>&1; then
  echo "[wifi] nmcli is required. Install NetworkManager or configure Wi-Fi manually with raspi-config."
  exit 1
fi

echo "[wifi] connecting Raspberry Pi to: $SSID"
if nmcli -t -f NAME connection show | grep -Fxq "$SSID"; then
  nmcli connection modify "$SSID" wifi-sec.key-mgmt wpa-psk wifi-sec.psk "$PASSWORD"
  nmcli connection up "$SSID"
else
  nmcli dev wifi connect "$SSID" password "$PASSWORD"
fi

mkdir -p "$(dirname "$PI_ENV")"
if [[ ! -f "$PI_ENV" ]]; then
  cp "$REPO_ROOT/raspberrypi/.env.example" "$PI_ENV"
fi

set_env_value() {
  local key="$1"
  local value="$2"
  if grep -q "^${key}=" "$PI_ENV"; then
    sed -i "s|^${key}=.*|${key}=${value}|" "$PI_ENV"
  else
    printf '%s=%s\n' "$key" "$value" >> "$PI_ENV"
  fi
}

set_env_value MQTT_BROKER_HOST "$MQTT_HOST"
set_env_value MQTT_BROKER_PORT "$MQTT_PORT"
set_env_value MQTT_DISABLED false

echo "[wifi] Raspberry Pi Wi-Fi configured."
echo "[wifi] raspberrypi/.env MQTT broker: $MQTT_HOST:$MQTT_PORT"
echo "[wifi] Configure the ESP32 through ESP32_FEEDER_SETUP with the same SSID and password."
