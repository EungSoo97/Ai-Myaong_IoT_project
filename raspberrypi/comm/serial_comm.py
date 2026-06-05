import os
from glob import glob


class SerialComm:
    def __init__(self) -> None:
        self.port = os.getenv("SERIAL_PORT", "/dev/ttyUSB0")
        self.baud = int(os.getenv("SERIAL_BAUD", "115200"))
        self.simulation_mode = os.getenv("SIMULATION_MODE", "false").lower() == "true"
        self._serial = None

    def connect(self) -> None:
        if self.simulation_mode:
            print("[serial:simulated] robot serial ready")
            return

        import serial

        self.port = self._resolve_port()
        self._serial = serial.Serial(self.port, self.baud, timeout=1)
        print(f"[serial] connected to {self.port} @ {self.baud}")

    def send(self, command: str) -> None:
        if self.simulation_mode or not self._serial:
            print(f"[serial:simulated] -> robot-controller {command}")
            return

        self._serial.write(f"{command}\n".encode("utf-8"))
        print(f"[serial] -> robot-controller {command}")

    def close(self) -> None:
        if self._serial and self._serial.is_open:
            self._serial.close()
            print("[serial] disconnected")

    def _resolve_port(self) -> str:
        if self.port and self.port.lower() != "auto" and os.path.exists(self.port):
            return self.port

        candidates = []
        candidates.extend(sorted(glob("/dev/serial/by-id/*")))
        candidates.extend(sorted(glob("/dev/ttyACM*")))
        candidates.extend(sorted(glob("/dev/ttyUSB*")))

        if candidates:
            selected = candidates[0]
            print(f"[serial] auto-detected Arduino port: {selected}")
            return selected

        if self.port and self.port.lower() != "auto":
            return self.port

        raise FileNotFoundError("Arduino serial port was not found. Check /dev/ttyACM* or /dev/ttyUSB*.")
