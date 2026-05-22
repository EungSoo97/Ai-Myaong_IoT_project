import json
import os

from dotenv import load_dotenv

from comm.serial_comm import SerialComm

load_dotenv()


class RaspberryPiAgent:
    def __init__(self) -> None:
        self.serial = SerialComm()
        self.simulation_mode = os.getenv("SIMULATION_MODE", "true").lower() == "true"

    def start(self) -> None:
        self.serial.connect()
        if self.simulation_mode:
            print("[raspberrypi:simulated] MQTT subscriber ready")
            return

        import paho.mqtt.client as mqtt

        client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
        client.on_message = self.on_message
        client.connect(os.getenv("MQTT_BROKER_HOST", "localhost"), int(os.getenv("MQTT_BROKER_PORT", "1883")))
        client.subscribe("robot/move")
        client.subscribe("robot/camera")
        client.loop_forever()

    def on_message(self, _client, _userdata, message) -> None:
        payload = json.loads(message.payload.decode("utf-8"))
        command = payload.get("cmd", "STOP")
        self.serial.send(command)


if __name__ == "__main__":
    RaspberryPiAgent().start()
