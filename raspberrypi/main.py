import json
import os
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
    from flask import Flask, jsonify, request

    app = Flask(__name__)

    @app.get("/api/wifi/scan")
    def wifi_scan():
        try:
            return jsonify({"networks": scan_wifi_networks(), "source": "raspberrypi"})
        except RuntimeError as exc:
            return jsonify({"error": str(exc)}), 500

    @app.post("/api/wifi/connect")
    def wifi_connect():
        body = request.get_json(silent=True) or {}
        ssid = str(body.get("ssid", "")).strip()
        password = str(body.get("password", ""))
        mqtt_host = str(body.get("mqttHost") or body.get("mqtt_host") or "auto").strip() or "auto"
        mqtt_port = int(body.get("mqttPort") or body.get("mqtt_port") or 1883)
        esp32_setup_url = str(body.get("esp32SetupUrl") or body.get("esp32_setup_url") or "").strip()
        pi_ap_fallback = bool(body.get("piApFallback") or body.get("pi_ap_fallback") or False)

        if not ssid:
            return jsonify({"error": "SSID is required."}), 400
        if not SETUP_WIFI_SCRIPT.exists():
            return jsonify({"error": "Wi-Fi setup script was not found."}), 500

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
            return jsonify({
                "error": "Wi-Fi setup timed out.",
                "stdout": exc.stdout or "",
                "stderr": exc.stderr or "",
            }), 504

        if result.returncode != 0:
            return jsonify({
                "error": "Wi-Fi setup failed.",
                "stdout": result.stdout,
                "stderr": result.stderr,
            }), 500

        return jsonify({"ok": True, "stdout": result.stdout, "stderr": result.stderr})

    print(f"[raspberrypi] Wi-Fi HTTP API listening on {host}:{port}")
    app.run(host=host, port=port, debug=False, use_reloader=False)


def scan_wifi_networks() -> list[dict[str, object]]:
    if _command_exists("nmcli"):
        return _scan_with_nmcli()
    raise RuntimeError("nmcli was not found. Install NetworkManager or scan Wi-Fi directly on the Raspberry Pi.")


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


def _command_exists(command: str) -> bool:
    result = subprocess.run(["bash", "-lc", f"command -v {command}"], capture_output=True, text=True)
    return result.returncode == 0


if __name__ == "__main__":
    agent = RaspberryPiAgent()
    signal.signal(signal.SIGTERM, agent.stop)
    start_wifi_http_server()
    agent.start()
