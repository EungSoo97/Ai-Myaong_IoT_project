from datetime import datetime, timezone
from typing import Any


class DeviceSimulator:
    def __init__(self) -> None:
        self.connected = True
        self.battery = 85
        self.mode = "simulation"
        self.away_mode = False
        self.last_command: str | None = None
        self.position = {"x": 0, "y": 0, "heading": 0}
        self.camera = {"pan": 90, "tilt": 90}
        self.dispenser = {"food_remaining": 75, "water_remaining": 60, "last_feed_amount": 0}
        self.sensor = {"distance": 30, "motion": False}

    def move(self, command: str) -> dict[str, Any]:
        self.last_command = command
        if command == "FORWARD":
            self._step(1)
        elif command == "BACKWARD":
            self._step(-1)
        elif command == "LEFT":
            self.position["heading"] = (self.position["heading"] - 90) % 360
        elif command == "RIGHT":
            self.position["heading"] = (self.position["heading"] + 90) % 360
        self._drain_battery()
        return self.status()

    def control_camera(self, direction: str) -> dict[str, Any]:
        self.last_command = direction
        step = 10
        if direction == "CAM_UP":
            self.camera["tilt"] = min(180, self.camera["tilt"] + step)
        elif direction == "CAM_DOWN":
            self.camera["tilt"] = max(0, self.camera["tilt"] - step)
        elif direction == "CAM_LEFT":
            self.camera["pan"] = max(0, self.camera["pan"] - step)
        elif direction == "CAM_RIGHT":
            self.camera["pan"] = min(180, self.camera["pan"] + step)
        elif direction == "CAM_CENTER":
            self.camera = {"pan": 90, "tilt": 90}
        self._drain_battery()
        return self.status()

    def set_away_mode(self, on: bool) -> dict[str, Any]:
        self.away_mode = on
        self.last_command = "AWAY_ON" if on else "AWAY_OFF"
        self._drain_battery()
        return self.status()

    def capture(self) -> dict[str, Any]:
        self.last_command = "CAPTURE"
        self._drain_battery()
        return self.status()

    def feed(self, amount: int) -> dict[str, Any]:
        self.last_command = "DISPENSER_FEED"
        self.dispenser["last_feed_amount"] = amount
        self.dispenser["food_remaining"] = max(0, self.dispenser["food_remaining"] - amount)
        self.sensor["motion"] = True
        self._drain_battery()
        return self.status()

    def water(self, amount: int) -> dict[str, Any]:
        self.last_command = "DISPENSER_WATER"
        self.dispenser["water_remaining"] = max(0, self.dispenser["water_remaining"] - amount)
        self.sensor["motion"] = True
        self._drain_battery()
        return self.status()

    def status(self) -> dict[str, Any]:
        return {
            "connected": self.connected,
            "battery": self.battery,
            "mode": self.mode,
            "away_mode": self.away_mode,
            "last_command": self.last_command,
            "position": self.position,
            "camera": self.camera,
            "dispenser": self.dispenser,
            "sensor": self.sensor,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }

    def update_sensor(
        self,
        *,
        distance_cm: int | None = None,
        rear_obstacle: bool | None = None,
        threshold_cm: int | None = None,
        source: str | None = None,
    ) -> dict[str, Any]:
        if distance_cm is not None:
            self.sensor["distance"] = distance_cm
            self.sensor["rear_distance_cm"] = distance_cm
        if rear_obstacle is not None:
            self.sensor["rear_obstacle"] = rear_obstacle
        if threshold_cm is not None:
            self.sensor["rear_obstacle_threshold_cm"] = threshold_cm
        if source:
            self.sensor["source"] = source
        return self.status()

    def _drain_battery(self) -> None:
        self.battery = max(0, self.battery - 1)

    def _step(self, direction: int) -> None:
        heading = self.position["heading"] % 360
        if heading == 0:
            self.position["y"] += direction
        elif heading == 90:
            self.position["x"] += direction
        elif heading == 180:
            self.position["y"] -= direction
        elif heading == 270:
            self.position["x"] -= direction
        else:
            self.position["y"] += direction
