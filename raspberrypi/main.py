import json
import os

from dotenv import load_dotenv

from comm.serial_comm import SerialComm

load_dotenv()


class RaspberryPiAgent:
    def __init__(self) -> None:
        self.serial = SerialComm()
        self.simulation_mode = os.getenv("SIMULATION_MODE", "false").lower() == "true"
        self.mqtt_host = os.getenv("MQTT_BROKER_HOST", "localhost")
        self.mqtt_port = int(os.getenv("MQTT_BROKER_PORT", "1883"))
        self.topics = ("robot/move", "robot/camera")

    def start(self) -> None:
        self.serial.connect()
        if self.simulation_mode:
            print("[raspberrypi:simulated] MQTT subscriber ready")
            return

        import paho.mqtt.client as mqtt

        client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
        client.on_connect = self.on_connect
        client.on_message = self.on_message
        print(f"[raspberrypi] connecting to MQTT broker {self.mqtt_host}:{self.mqtt_port}")

        try:
            client.connect(self.mqtt_host, self.mqtt_port, keepalive=30)
            client.loop_forever()
        finally:
            self.serial.close()

    def on_connect(self, client, _userdata, _flags, reason_code, _properties=None) -> None:
        if reason_code != 0:
            print(f"[raspberrypi] MQTT connect failed: {reason_code}")
            return

        for topic in self.topics:
            client.subscribe(topic)
            print(f"[raspberrypi] subscribed to {topic}")

    def on_message(self, _client, _userdata, message) -> None:
        try:
            payload = json.loads(message.payload.decode("utf-8"))
        except json.JSONDecodeError:
            print(f"[raspberrypi] ignored invalid JSON on {message.topic}")
            return

        command = payload.get("cmd")
        if not command:
            print(f"[raspberrypi] ignored empty command on {message.topic}")
            return

        print(f"[raspberrypi] MQTT {message.topic} <- {command}")
        self.serial.send(command)


if __name__ == "__main__":
    RaspberryPiAgent().start()
