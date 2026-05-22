from typing import Any
from uuid import uuid4

from app.mqtt.mqtt_client import MqttClient
from app.services.database import Database
from app.services.simulator import DeviceSimulator


class RobotService:
    def __init__(self, mqtt_client: MqttClient, database: Database, simulator: DeviceSimulator):
        self.mqtt = mqtt_client
        self.database = database
        self.simulator = simulator

    def move(self, command: str) -> dict[str, Any]:
        request_id = str(uuid4())
        payload = {"request_id": request_id, "cmd": command}
        self.mqtt.publish("robot/move", payload)
        status = self.simulator.move(command)
        self.database.log_command(request_id, "move", "robot/move", payload, "accepted")
        self.database.log_event("robot/status", f"이동 명령 처리: {command}", status)
        return self._response(request_id, "robot/move", payload)

    def camera(self, direction: str) -> dict[str, Any]:
        request_id = str(uuid4())
        payload = {"request_id": request_id, "cmd": direction}
        self.mqtt.publish("robot/camera", payload)
        status = self.simulator.control_camera(direction)
        self.database.log_command(request_id, "camera", "robot/camera", payload, "accepted")
        self.database.log_event("robot/status", f"카메라 명령 처리: {direction}", status)
        return self._response(request_id, "robot/camera", payload)

    def status(self) -> dict[str, Any]:
        return self.simulator.status()

    def dashboard(self) -> dict[str, Any]:
        return {
            "status": self.simulator.status(),
            "commands": self.database.recent_commands(),
            "events": self.database.recent_events(),
        }

    def _response(self, request_id: str, topic: str, payload: dict[str, Any]) -> dict[str, Any]:
        return {
            "request_id": request_id,
            "status": "accepted",
            "topic": topic,
            "payload": payload,
            "simulated": self.mqtt.simulation_mode,
        }
