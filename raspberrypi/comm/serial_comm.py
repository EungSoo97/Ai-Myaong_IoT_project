import os


class SerialComm:
    def __init__(self) -> None:
        self.port = os.getenv("SERIAL_PORT", "/dev/ttyUSB0")
        self.baud = int(os.getenv("SERIAL_BAUD", "115200"))
        self.simulation_mode = os.getenv("SIMULATION_MODE", "true").lower() == "true"
        self._serial = None

    def connect(self) -> None:
        if self.simulation_mode:
            print("[serial:simulated] robot serial ready")
            return

        import serial

        self._serial = serial.Serial(self.port, self.baud, timeout=1)

    def send(self, command: str) -> None:
        if self.simulation_mode or not self._serial:
            print(f"[serial:simulated] -> robot-controller {command}")
            return

        self._serial.write(f"{command}\n".encode("utf-8"))
