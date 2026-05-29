import json
import os
import signal

from dotenv import load_dotenv

from comm.serial_comm import SerialComm

load_dotenv()

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
        self.serial.connect()
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


if __name__ == "__main__":
    agent = RaspberryPiAgent()
    signal.signal(signal.SIGTERM, agent.stop)
    agent.start()
