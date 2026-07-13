import json
import os
import signal
import ssl
import threading
import time
from typing import Iterable

from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"), override=True)


def env_bool(name: str, default: str = "false") -> bool:
    return os.getenv(name, default).strip().lower() in {"1", "true", "yes", "on"}


def csv_env(name: str, default: str) -> tuple[str, ...]:
    return tuple(item.strip() for item in os.getenv(name, default).split(",") if item.strip())


def make_client(mqtt, client_id: str):
    try:
        return mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, client_id=client_id)
    except AttributeError:
        return mqtt.Client(client_id=client_id)


class MqttBridge:
    def __init__(self) -> None:
        self.cloud_host = os.getenv("CLOUD_MQTT_HOST") or os.getenv("MQTT_BROKER_HOST", "")
        self.cloud_port = int(os.getenv("CLOUD_MQTT_PORT") or os.getenv("MQTT_BROKER_PORT", "8883"))
        self.cloud_username = os.getenv("CLOUD_MQTT_USERNAME") or os.getenv("MQTT_USERNAME", "")
        self.cloud_password = os.getenv("CLOUD_MQTT_PASSWORD") or os.getenv("MQTT_PASSWORD", "")
        self.cloud_tls = env_bool("CLOUD_MQTT_USE_TLS", os.getenv("MQTT_USE_TLS", "true"))
        self.cloud_tls_insecure = env_bool("CLOUD_MQTT_TLS_INSECURE", os.getenv("MQTT_TLS_INSECURE", "false"))

        self.local_host = os.getenv("LOCAL_MQTT_HOST", "127.0.0.1")
        self.local_port = int(os.getenv("LOCAL_MQTT_PORT", "1883"))

        self.cloud_to_local_topics = csv_env(
            "MQTT_BRIDGE_CLOUD_TO_LOCAL_TOPICS",
            "dispenser/feed,dispenser/water,dispenser/pump/off,dispenser/pump/speed,dispenser/tare,dispenser/weight/request",
        )
        self.local_to_cloud_topics = csv_env(
            "MQTT_BRIDGE_LOCAL_TO_CLOUD_TOPICS",
            "dispenser/status,dispenser/weight",
        )

        self.reconnect_delay = float(os.getenv("MQTT_BRIDGE_RECONNECT_DELAY", "5"))
        self.stopping = threading.Event()
        self.cloud_client = None
        self.local_client = None

    def start(self) -> None:
        if not self.cloud_host:
            raise RuntimeError("CLOUD_MQTT_HOST or MQTT_BROKER_HOST is required")

        import paho.mqtt.client as mqtt

        self.cloud_client = make_client(mqtt, os.getenv("CLOUD_MQTT_CLIENT_ID", "ai-myaong-pi-cloud-bridge"))
        self.local_client = make_client(mqtt, os.getenv("LOCAL_MQTT_CLIENT_ID", "ai-myaong-pi-local-bridge"))

        if self.cloud_username:
            self.cloud_client.username_pw_set(self.cloud_username, self.cloud_password or None)
        if self.cloud_tls:
            self.cloud_client.tls_set(cert_reqs=ssl.CERT_REQUIRED)
            self.cloud_client.tls_insecure_set(self.cloud_tls_insecure)

        self.cloud_client.on_connect = self._on_cloud_connect
        self.cloud_client.on_disconnect = self._on_disconnect("cloud")
        self.cloud_client.on_message = self._cloud_to_local

        self.local_client.on_connect = self._on_local_connect
        self.local_client.on_disconnect = self._on_disconnect("local")
        self.local_client.on_message = self._local_to_cloud

        print(f"[mqtt-bridge] cloud {self.cloud_host}:{self.cloud_port} -> local {self.local_host}:{self.local_port}")
        print(f"[mqtt-bridge] cloud->local topics: {', '.join(self.cloud_to_local_topics)}")
        print(f"[mqtt-bridge] local->cloud topics: {', '.join(self.local_to_cloud_topics)}")

        self._connect_with_retry(self.local_client, self.local_host, self.local_port, "local")
        self._connect_with_retry(self.cloud_client, self.cloud_host, self.cloud_port, "cloud")

        self.local_client.loop_start()
        self.cloud_client.loop_start()

        while not self.stopping.is_set():
            time.sleep(0.5)

    def stop(self, *_args) -> None:
        self.stopping.set()
        for client in (self.cloud_client, self.local_client):
            if client:
                try:
                    client.loop_stop()
                    client.disconnect()
                except Exception:
                    pass

    def _connect_with_retry(self, client, host: str, port: int, label: str) -> None:
        while not self.stopping.is_set():
            try:
                client.connect(host, port, keepalive=30)
                return
            except Exception as exc:
                print(f"[mqtt-bridge] {label} connect failed {host}:{port}: {exc}")
                time.sleep(self.reconnect_delay)

    def _on_cloud_connect(self, client, _userdata, _flags, reason_code, _properties=None) -> None:
        if not self._success(reason_code):
            print(f"[mqtt-bridge] cloud connect rejected: {reason_code}")
            return
        self._subscribe(client, self.cloud_to_local_topics, "cloud")

    def _on_local_connect(self, client, _userdata, _flags, reason_code, _properties=None) -> None:
        if not self._success(reason_code):
            print(f"[mqtt-bridge] local connect rejected: {reason_code}")
            return
        self._subscribe(client, self.local_to_cloud_topics, "local")

    def _on_disconnect(self, label: str):
        def handler(_client, _userdata, *args) -> None:
            reason_code = args[1] if len(args) >= 2 else args[0] if args else 0
            if not self._success(reason_code):
                print(f"[mqtt-bridge] {label} disconnected: {reason_code}")

        return handler

    def _cloud_to_local(self, _client, _userdata, message) -> None:
        self._republish(self.local_client, "cloud->local", message.topic, message.payload, message.retain)

    def _local_to_cloud(self, _client, _userdata, message) -> None:
        self._republish(self.cloud_client, "local->cloud", message.topic, message.payload, message.retain)

    def _republish(self, target, label: str, topic: str, payload: bytes, retain: bool) -> None:
        if not target:
            return
        result = target.publish(topic, payload, qos=0, retain=retain)
        rc = result[0] if isinstance(result, tuple) else getattr(result, "rc", 0)
        if rc == 0:
            print(f"[mqtt-bridge] {label} {topic} {self._preview(payload)}")
        else:
            print(f"[mqtt-bridge] publish failed rc={rc} {label} {topic}")

    def _subscribe(self, client, topics: Iterable[str], label: str) -> None:
        for topic in topics:
            client.subscribe(topic)
            print(f"[mqtt-bridge] {label} subscribed: {topic}")

    def _success(self, reason_code) -> bool:
        try:
            return int(reason_code) == 0
        except (TypeError, ValueError):
            return str(reason_code).lower() in {"0", "success", "normal disconnection"}

    def _preview(self, payload: bytes) -> str:
        try:
            text = payload.decode("utf-8")
            json.loads(text)
            return text[:160]
        except Exception:
            return f"{len(payload)} bytes"


if __name__ == "__main__":
    bridge = MqttBridge()
    signal.signal(signal.SIGTERM, bridge.stop)
    signal.signal(signal.SIGINT, bridge.stop)
    bridge.start()
