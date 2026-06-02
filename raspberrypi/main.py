import json
import os
import re
import signal
import subprocess
import threading
from pathlib import Path

from dotenv import load_dotenv

from comm.serial_comm import SerialComm

load_dotenv()

REPO_ROOT = Path(__file__).resolve().parents[1]
SETUP_WIFI_SCRIPT = REPO_ROOT / "scripts" / "setup-raspberrypi-wifi.sh"

ROBOT_COMMANDS = {
    "FORWARD",
    "BACKWARD",
    "LEFT",
    "RIGHT",
    "STOP",
    "CAM_UP",
    "CAM_DOWN",
    "CAM_LEFT",
    "CAM_RIGHT",
    "CAM_CENTER",
}


class RaspberryPiAgent:
    def __init__(self) -> None:
        self.serial = SerialComm()
        self.mqtt_disabled = os.getenv("MQTT_DISABLED", "false").lower() == "true"
        self.mqtt_host = os.getenv("MQTT_BROKER_HOST", "localhost")
        self.mqtt_port = int(os.getenv("MQTT_BROKER_PORT", "1883"))
        self.mqtt_username = os.getenv("MQTT_USERNAME")
        self.mqtt_password = os.getenv("MQTT_PASSWORD")
        self.client_id = os.getenv("MQTT_CLIENT_ID", "ai-myaong-raspberrypi")
        self.topics = tuple(
            topic.strip()
            for topic in os.getenv("MQTT_TOPICS", "robot/move,robot/camera").split(",")
            if topic.strip()
        )
        self._client = None

    def start(self) -> None:
        try:
            self.serial.connect()
        except Exception as exc:
            print(f"[serial] connection failed, continuing without Arduino serial: {exc}")

        if self.mqtt_disabled:
            print("[raspberrypi] MQTT disabled by MQTT_DISABLED=true")
            return

        import paho.mqtt.client as mqtt

        client = self._make_mqtt_client(mqtt)
        self._client = client
        if self.mqtt_username:
            client.username_pw_set(self.mqtt_username, self.mqtt_password)

        client.on_connect = self.on_connect
        client.on_disconnect = self.on_disconnect
        client.on_message = self.on_message
        print(f"[raspberrypi] connecting to MQTT broker {self.mqtt_host}:{self.mqtt_port}")

        try:
            client.connect(self.mqtt_host, self.mqtt_port, keepalive=30)
            client.loop_forever()
        except KeyboardInterrupt:
            print("[raspberrypi] stopped by user")
        finally:
            client.disconnect()
            self.serial.close()

    def stop(self, *_args) -> None:
        if self._client:
            self._client.disconnect()

    def _make_mqtt_client(self, mqtt):
        try:
            return mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, client_id=self.client_id)
        except AttributeError:
            return mqtt.Client(client_id=self.client_id)

    def on_connect(self, client, _userdata, _flags, reason_code, _properties=None) -> None:
        if not self._is_success(reason_code):
            print(f"[raspberrypi] MQTT connect failed: {reason_code}")
            return

        for topic in self.topics:
            client.subscribe(topic)
            print(f"[raspberrypi] subscribed to {topic}")

    def on_disconnect(self, _client, _userdata, *args) -> None:
        reason_code = args[1] if len(args) >= 2 else args[0] if args else 0
        if not self._is_success(reason_code):
            print(f"[raspberrypi] MQTT disconnected: {reason_code}")

    def on_message(self, _client, _userdata, message) -> None:
        command = self._extract_command(message.payload)
        if not command:
            print(f"[raspberrypi] ignored empty command on {message.topic}")
            return

        if command not in ROBOT_COMMANDS:
            print(f"[raspberrypi] ignored unsupported command on {message.topic}: {command}")
            return

        print(f"[raspberrypi] MQTT {message.topic} -> Arduino {command}")
        self.serial.send(command)

    def _extract_command(self, payload_bytes: bytes) -> str | None:
        payload_text = payload_bytes.decode("utf-8").strip()
        if not payload_text:
            return None

        try:
            payload = json.loads(payload_text)
        except json.JSONDecodeError:
            return payload_text

        if isinstance(payload, str):
            return payload.strip() or None

        if not isinstance(payload, dict):
            return None

        command = (
            payload.get("cmd")
            or payload.get("command")
            or payload.get("direction")
            or payload.get("action")
        )
        if command is None:
            return None

        return str(command).strip() or None

    def _is_success(self, reason_code) -> bool:
        try:
            return int(reason_code) == 0
        except (TypeError, ValueError):
            return str(reason_code).lower() in {"0", "success", "normal disconnection"}


def start_wifi_http_server() -> None:
    if os.getenv("PI_AGENT_HTTP_DISABLED", "false").lower() == "true":
        return

    host = os.getenv("PI_AGENT_HTTP_HOST", "0.0.0.0")
    port = int(os.getenv("PI_AGENT_HTTP_PORT", "8765"))
    thread = threading.Thread(target=_run_wifi_http_server, args=(host, port), daemon=True)
    thread.start()


def _run_wifi_http_server(host: str, port: int) -> None:
    import uvicorn
    from fastapi import FastAPI, HTTPException

    app = FastAPI(title="Ai-Myaong Raspberry Pi Agent", version="0.1.0")

    @app.get("/api/wifi/scan")
    def wifi_scan():
        try:
            return {"networks": scan_wifi_networks(), "source": "raspberrypi"}
        except RuntimeError as exc:
            raise HTTPException(status_code=500, detail=str(exc)) from exc

    @app.post("/api/wifi/connect")
    def wifi_connect(body: dict | None = None):
        body = body or {}
        ssid = str(body.get("ssid", "")).strip()
        password = str(body.get("password", ""))
        mqtt_host = str(body.get("mqttHost") or body.get("mqtt_host") or "auto").strip() or "auto"
        mqtt_port = int(body.get("mqttPort") or body.get("mqtt_port") or 1883)
        esp32_setup_url = str(body.get("esp32SetupUrl") or body.get("esp32_setup_url") or "").strip()
        pi_ap_fallback = bool(body.get("piApFallback") or body.get("pi_ap_fallback") or False)

        if not ssid:
            raise HTTPException(status_code=400, detail="SSID is required.")
        if not SETUP_WIFI_SCRIPT.exists():
            raise HTTPException(status_code=500, detail="Wi-Fi setup script was not found.")

        env = os.environ.copy()
        env["MQTT_BROKER_HOST"] = mqtt_host
        env["MQTT_BROKER_PORT"] = str(mqtt_port)
        env["PI_AP_FALLBACK"] = "true" if pi_ap_fallback else "false"
        if esp32_setup_url:
            env["ESP32_SETUP_URL"] = esp32_setup_url

        try:
            result = subprocess.run(
                ["bash", str(SETUP_WIFI_SCRIPT), ssid, password],
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

        return {"ok": True, "stdout": result.stdout, "stderr": result.stderr}

    print(f"[raspberrypi] Wi-Fi HTTP API listening on {host}:{port}")
    uvicorn.run(app, host=host, port=port, log_level="warning")


def scan_wifi_networks() -> list[dict[str, object]]:
    iwlist_error = ""
    if _command_exists("iwlist"):
        try:
            networks = _scan_with_iwlist()
            if networks:
                return networks
        except RuntimeError as exc:
            iwlist_error = str(exc)

    if _command_exists("nmcli"):
        return _scan_with_nmcli()

    detail = "iwlist and nmcli were not found."
    if iwlist_error:
        detail = f"iwlist failed: {iwlist_error}"
    raise RuntimeError(f"{detail} Install wireless-tools or NetworkManager on the Raspberry Pi.")


def _scan_with_iwlist() -> list[dict[str, object]]:
    interface = os.getenv("WIFI_SCAN_INTERFACE", "wlan0").strip() or "wlan0"
    commands = [
        ["iwlist", interface, "scan"],
        ["sudo", "-n", "iwlist", interface, "scan"],
    ]
    result = None
    errors: list[str] = []

    for command in commands:
        if command[0] == "sudo" and not _command_exists("sudo"):
            continue
        result = subprocess.run(
            command,
            text=True,
            capture_output=True,
            timeout=30,
            check=False,
        )
        if result.returncode == 0:
            return _parse_iwlist_scan(result.stdout)
        errors.append(result.stderr.strip() or result.stdout.strip() or "scan failed")

    raise RuntimeError("; ".join(error for error in errors if error) or "Failed to scan Wi-Fi networks.")


def _parse_iwlist_scan(output: str) -> list[dict[str, object]]:
    cells = re.split(r"\n\s*Cell \d+ - Address:", output)
    networks_by_key: dict[tuple[str, int], dict[str, object]] = {}

    for cell in cells:
        if "ESSID:" not in cell:
            continue

        ssid_match = re.search(r'ESSID:"((?:\\.|[^"])*)"', cell)
        ssid = _unescape_iwlist_ssid(ssid_match.group(1)) if ssid_match else ""

        channel = 0
        channel_match = re.search(r"\(Channel\s+(\d+)\)", cell) or re.search(r"\bChannel:(\d+)", cell)
        if channel_match:
            channel = int(channel_match.group(1))

        frequency = 0.0
        frequency_match = re.search(r"Frequency:([0-9.]+)\s*GHz", cell)
        if frequency_match:
            frequency = float(frequency_match.group(1))

        rssi = 0
        signal_match = re.search(r"Signal level=(-?\d+)", cell)
        quality_match = re.search(r"Quality=(\d+)/(\d+)", cell)
        if signal_match:
            rssi = int(signal_match.group(1))
        elif quality_match:
            quality = int(quality_match.group(1))
            total = max(1, int(quality_match.group(2)))
            rssi = round((quality / total) * 100)

        encryption_match = re.search(r"Encryption key:(on|off)", cell)
        secure = encryption_match is None or encryption_match.group(1) == "on"
        security = _iwlist_security(cell, secure)
        esp32_compatible = _esp32_wifi_compatible(channel, frequency)

        network = {
            "ssid": ssid,
            "rssi": rssi,
            "secure": secure,
            "security": security,
            "channel": channel,
            "frequency": frequency,
            "band": _wifi_band(channel, frequency),
            "esp32Compatible": esp32_compatible,
            "compatible": esp32_compatible,
            "unsupportedReason": "" if esp32_compatible else "ESP32 supports 2.4GHz Wi-Fi only.",
        }

        key = (ssid, channel)
        previous = networks_by_key.get(key)
        if previous is None or int(previous["rssi"]) < rssi:
            networks_by_key[key] = network

    return sorted(networks_by_key.values(), key=lambda item: int(item["rssi"]), reverse=True)


def _scan_with_nmcli() -> list[dict[str, object]]:
    result = subprocess.run(
        ["nmcli", "-t", "-f", "SSID,SIGNAL,SECURITY,CHAN", "dev", "wifi", "list", "--rescan", "yes"],
        text=True,
        capture_output=True,
        timeout=20,
        check=False,
    )
    if result.returncode != 0:
        raise RuntimeError(result.stderr.strip() or "Failed to scan Wi-Fi networks.")

    networks_by_key: dict[tuple[str, int], dict[str, object]] = {}
    for line in result.stdout.splitlines():
        parts = _split_nmcli_line(line, 4)
        if len(parts) < 4:
            continue

        ssid, signal_text, security, channel_text = parts
        if not ssid:
            continue

        try:
            rssi = int(signal_text)
        except ValueError:
            rssi = 0
        try:
            channel = int(channel_text)
        except ValueError:
            channel = 0

        key = (ssid, channel)
        network = {
            "ssid": ssid,
            "rssi": rssi,
            "secure": bool(security and security != "--"),
            "security": "" if security == "--" else security,
            "channel": channel,
            "frequency": 0,
            "band": _wifi_band(channel, 0),
            "esp32Compatible": _esp32_wifi_compatible(channel, 0),
            "compatible": _esp32_wifi_compatible(channel, 0),
            "unsupportedReason": "" if _esp32_wifi_compatible(channel, 0) else "ESP32 supports 2.4GHz Wi-Fi only.",
        }
        previous = networks_by_key.get(key)
        if previous is None or int(previous["rssi"]) < rssi:
            networks_by_key[key] = network

    return sorted(networks_by_key.values(), key=lambda item: int(item["rssi"]), reverse=True)


def _split_nmcli_line(line: str, expected_parts: int) -> list[str]:
    parts: list[str] = []
    current = []
    escaping = False
    for char in line:
        if escaping:
            current.append(char)
            escaping = False
        elif char == "\\":
            escaping = True
        elif char == ":" and len(parts) < expected_parts - 1:
            parts.append("".join(current))
            current = []
        else:
            current.append(char)
    parts.append("".join(current))
    return parts


def _unescape_iwlist_ssid(value: str) -> str:
    return value.replace(r"\"", '"').replace(r"\\", "\\")


def _iwlist_security(cell: str, secure: bool) -> str:
    if not secure:
        return ""

    security: list[str] = []
    if "WPA3" in cell:
        security.append("WPA3")
    if "WPA2" in cell or "IEEE 802.11i" in cell:
        security.append("WPA2")
    if "WPA Version" in cell:
        security.append("WPA")
    return "/".join(dict.fromkeys(security)) or "WEP"


def _wifi_band(channel: int, frequency: float) -> str:
    if 1 <= channel <= 14 or 2.3 <= frequency < 2.6:
        return "2.4GHz"
    if channel >= 32 or 4.9 <= frequency < 6.0:
        return "5GHz"
    if frequency >= 6.0:
        return "6GHz"
    return "unknown"


def _esp32_wifi_compatible(channel: int, frequency: float) -> bool:
    if 1 <= channel <= 14:
        return True
    if frequency:
        return 2.3 <= frequency < 2.6
    return channel == 0


def _command_exists(command: str) -> bool:
    result = subprocess.run(["bash", "-lc", f"command -v {command}"], capture_output=True, text=True)
    return result.returncode == 0


if __name__ == "__main__":
    agent = RaspberryPiAgent()
    signal.signal(signal.SIGTERM, agent.stop)
    start_wifi_http_server()
    agent.start()
