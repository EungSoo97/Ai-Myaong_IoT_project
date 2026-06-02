import json
from typing import Any

from app.runtime_config import runtime_env


class MqttClient:
    def __init__(self) -> None:
        self.host = "localhost"
        self.port = 1883
        self.simulation_mode = True
        self.connected = False
        self._client = None
        self._refresh_config()

    def start(self) -> None:
        self._refresh_config()
        if self.simulation_mode:
            print("[mqtt:simulated] SIMULATION_MODE=true; MQTT publish is disabled")
            self.connected = True
            return

        try:
            import paho.mqtt.client as mqtt

            self._client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
            self._client.connect(self.host, self.port, keepalive=30)
            self._client.loop_start()
            self.connected = True
            print(f"[mqtt] connected to {self.host}:{self.port}")
        except Exception as error:
            print(f"[mqtt] connect failed {self.host}:{self.port} - {error}")
            self._client = None
            self.connected = False

    def stop(self) -> None:
        if self._client:
            self._client.loop_stop()
            self._client.disconnect()
            self._client = None
        self.connected = False

    def publish(self, topic: str, payload: dict[str, Any]) -> bool:
        self._restart_if_config_changed()
        message = json.dumps(payload, ensure_ascii=False)
        if self.simulation_mode:
            print(f"[mqtt:simulated] {topic} {message}")
            return True

        if not self._client:
            print(f"[mqtt:unavailable] {topic} {message}")
            return False

        result = self._client.publish(topic, message)
        if result.rc != 0:
            print(f"[mqtt] publish failed rc={result.rc} {topic} {message}")
        return result.rc == 0

    def _refresh_config(self) -> tuple[str, int, bool]:
        self.host = runtime_env("MQTT_BROKER_HOST", "localhost")
        self.port = int(runtime_env("MQTT_BROKER_PORT", "1883"))
        self.simulation_mode = runtime_env("SIMULATION_MODE", "true").lower() == "true"
        return self.host, self.port, self.simulation_mode

    def _restart_if_config_changed(self) -> None:
        previous = (self.host, self.port, self.simulation_mode)
        current = (
            runtime_env("MQTT_BROKER_HOST", "localhost"),
            int(runtime_env("MQTT_BROKER_PORT", "1883")),
            runtime_env("SIMULATION_MODE", "true").lower() == "true",
        )
        if current == previous:
            return

        print(f"[mqtt] config changed {previous} -> {current}; reconnecting")
        self.stop()
        self.host, self.port, self.simulation_mode = current
        self.start()
