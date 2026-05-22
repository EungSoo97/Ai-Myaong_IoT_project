import json
import os
from typing import Any


class MqttClient:
    def __init__(self) -> None:
        self.host = os.getenv("MQTT_BROKER_HOST", "localhost")
        self.port = int(os.getenv("MQTT_BROKER_PORT", "1883"))
        self.simulation_mode = os.getenv("SIMULATION_MODE", "true").lower() == "true"
        self.connected = False
        self._client = None

    def start(self) -> None:
        if self.simulation_mode:
            self.connected = True
            return

        try:
            import paho.mqtt.client as mqtt

            self._client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
            self._client.connect(self.host, self.port, keepalive=30)
            self._client.loop_start()
            self.connected = True
        except Exception:
            self.connected = False

    def stop(self) -> None:
        if self._client:
            self._client.loop_stop()
            self._client.disconnect()
        self.connected = False

    def publish(self, topic: str, payload: dict[str, Any]) -> bool:
        message = json.dumps(payload, ensure_ascii=False)
        if self.simulation_mode or not self._client:
            print(f"[mqtt:simulated] {topic} {message}")
            return True

        result = self._client.publish(topic, message)
        return result.rc == 0
