import os
import subprocess
from pathlib import Path

from fastapi import APIRouter, HTTPException

from app.models.command import SharedWifiRequest

router = APIRouter(prefix="/api/network", tags=["network"])

REPO_ROOT = Path(__file__).resolve().parents[3]
PI_ENV = REPO_ROOT / "raspberrypi" / ".env"
SETUP_WIFI_SCRIPT = REPO_ROOT / "scripts" / "setup-raspberrypi-wifi.sh"


@router.get("/status")
def network_status():
    return {
        "raspberrypiEnv": _read_env_values(
            PI_ENV,
            ("MQTT_BROKER_HOST", "MQTT_BROKER_PORT", "SERIAL_PORT", "MQTT_DISABLED"),
        ),
        "wifiIp": _command_output(["bash", "-lc", "hostname -I | awk '{print $1}'"]),
        "wifiSsid": _command_output(["bash", "-lc", "iwgetid -r"]),
    }


@router.post("/shared-wifi")
def configure_shared_wifi(payload: SharedWifiRequest):
    if not SETUP_WIFI_SCRIPT.exists():
        raise HTTPException(status_code=500, detail="Wi-Fi setup script was not found.")

    env = os.environ.copy()
    env["MQTT_BROKER_HOST"] = (payload.mqtt_host or "auto").strip() or "auto"
    env["MQTT_BROKER_PORT"] = str(payload.mqtt_port)
    env["PI_AP_FALLBACK"] = "true" if payload.pi_ap_fallback else "false"
    if payload.esp32_setup_url:
        env["ESP32_SETUP_URL"] = payload.esp32_setup_url

    try:
        result = subprocess.run(
            ["bash", str(SETUP_WIFI_SCRIPT), payload.ssid, payload.password],
            cwd=REPO_ROOT,
            env=env,
            text=True,
            capture_output=True,
            timeout=120,
            check=False,
        )
    except subprocess.TimeoutExpired as exc:
        raise HTTPException(
            status_code=504,
            detail={
                "message": "Wi-Fi setup timed out.",
                "stdout": exc.stdout or "",
                "stderr": exc.stderr or "",
            },
        ) from exc

    if result.returncode != 0:
        raise HTTPException(
            status_code=500,
            detail={
                "message": "Wi-Fi setup failed.",
                "stdout": result.stdout,
                "stderr": result.stderr,
            },
        )

    return {
        "ok": True,
        "stdout": result.stdout,
        "stderr": result.stderr,
        "raspberrypiEnv": _read_env_values(
            PI_ENV,
            ("MQTT_BROKER_HOST", "MQTT_BROKER_PORT", "SERIAL_PORT", "MQTT_DISABLED"),
        ),
    }


def _read_env_values(path: Path, keys: tuple[str, ...]) -> dict[str, str]:
    values: dict[str, str] = {}
    if not path.exists():
        return values

    for line in path.read_text(encoding="utf-8").splitlines():
        if not line or line.lstrip().startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        if key in keys:
            values[key] = value
    return values


def _command_output(command: list[str]) -> str:
    try:
        result = subprocess.run(
            command,
            text=True,
            capture_output=True,
            timeout=5,
            check=False,
        )
    except Exception:
        return ""

    if result.returncode != 0:
        return ""
    return result.stdout.strip()
