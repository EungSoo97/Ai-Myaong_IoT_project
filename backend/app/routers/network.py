import json
import os
import shutil
import subprocess
import urllib.error
import urllib.request
from pathlib import Path

from fastapi import APIRouter, HTTPException

from app.models.command import SharedWifiRequest

router = APIRouter(prefix="/api/network", tags=["network"])

REPO_ROOT = Path(__file__).resolve().parents[3]
PI_ENV = REPO_ROOT / "raspberrypi" / ".env"
SETUP_WIFI_SCRIPT = REPO_ROOT / "scripts" / "setup-raspberrypi-wifi.sh"


@router.get("/status")
def network_status():
    pi_status = _pi_agent_status()
    local_wifi_ip = _command_output(["bash", "-lc", "hostname -I | awk '{print $1}'"])
    local_wifi_ssid = _command_output(["bash", "-lc", "iwgetid -r"])

    return {
        "raspberrypiEnv": _read_env_values(
            PI_ENV,
            ("MQTT_BROKER_HOST", "MQTT_BROKER_PORT", "SERIAL_PORT", "MQTT_DISABLED"),
        ),
        "wifiIp": pi_status.get("ip") or local_wifi_ip,
        "wifiSsid": pi_status.get("ssid") or local_wifi_ssid,
        "source": pi_status.get("source") or "local",
    }


@router.get("/pi-wifi-scan")
def pi_wifi_scan():
    return _pi_agent_json_request("/api/wifi/scan")


@router.post("/pi-wifi-connect")
def pi_wifi_connect(payload: SharedWifiRequest):
    return _pi_agent_json_request(
        "/api/wifi/connect",
        {
            "ssid": payload.ssid,
            "password": payload.password,
            "mqttHost": payload.mqtt_host,
            "mqttPort": payload.mqtt_port,
            "esp32SetupUrl": payload.esp32_setup_url,
            "piApFallback": payload.pi_ap_fallback,
        },
    )


@router.post("/shared-wifi")
def configure_shared_wifi(payload: SharedWifiRequest):
    if not SETUP_WIFI_SCRIPT.exists():
        raise HTTPException(status_code=500, detail="Wi-Fi setup script was not found.")
    if shutil.which("bash") is None:
        raise HTTPException(
            status_code=502,
            detail={
                "message": "Wi-Fi setup script can only run on Raspberry Pi/Linux with bash. Use the Raspberry Pi agent endpoint instead.",
                "script": str(SETUP_WIFI_SCRIPT),
            },
        )

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
    except FileNotFoundError as exc:
        raise HTTPException(
            status_code=502,
            detail={
                "message": "bash was not found, so the Wi-Fi setup script could not run.",
                "script": str(SETUP_WIFI_SCRIPT),
            },
        ) from exc
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


def _pi_agent_json_request(path: str, payload: dict | None = None) -> dict:
    pi_agent_base_url = _pi_agent_base_url()
    timeout = 45 if path == "/api/wifi/scan" else 120 if payload is not None else 15
    body = None
    method = "GET"
    headers = {"Accept": "application/json"}
    if payload is not None:
        body = json.dumps(payload).encode("utf-8")
        method = "POST"
        headers["Content-Type"] = "application/json"

    request = urllib.request.Request(
        f"{pi_agent_base_url}{path}",
        data=body,
        headers=headers,
        method=method,
    )
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        detail_text = exc.read().decode("utf-8", "replace")
        try:
            detail = json.loads(detail_text)
        except json.JSONDecodeError:
            detail = detail_text or exc.reason
        raise HTTPException(status_code=exc.code, detail=detail) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail={
                "message": "Raspberry Pi Wi-Fi API is not reachable.",
                "baseUrl": pi_agent_base_url,
                "error": str(exc),
            },
        ) from exc


def _pi_agent_base_url() -> str:
    configured_url = os.getenv("PI_AGENT_BASE_URL", "").strip()
    if configured_url:
        return configured_url.rstrip("/")

    host = os.getenv("MQTT_BROKER_HOST", "10.1.82.103").strip() or "10.1.82.103"
    port = os.getenv("PI_AGENT_HTTP_PORT", "8765").strip() or "8765"
    return f"http://{host}:{port}"


def _pi_agent_status() -> dict:
    try:
        return _pi_agent_json_request("/api/wifi/status")
    except HTTPException:
        return {}
