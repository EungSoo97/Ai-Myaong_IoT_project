# Arduino Uno Robot Controller

This workspace contains the Arduino Uno sketch for the remote robot.

Responsibilities:
- Execute robot commands forwarded by the Raspberry Pi MQTT agent
- Drive crawler or caterpillar DC motors
- Control the camera pan/tilt servos

This controller is only for the robot. The food and water dispenser is handled separately by the ESP32 dispenser device.

## Runtime Command Flow

The web UI no longer needs to talk to the Arduino over browser serial.

1. Frontend sends robot commands to FastAPI.
2. FastAPI publishes MQTT messages on `robot/move` or `robot/camera`.
3. Raspberry Pi subscribes to those MQTT topics.
4. Raspberry Pi forwards the validated command to this Arduino controller.

## Arduino IDE

Open this sketch in Arduino IDE:

- `arduino-uno/AiMyaongRobot/AiMyaongRobot.ino`

## Direct Desktop Serial Test

Use this path when the Raspberry Pi is not connected.

1. Upload `AiMyaongRobot` to the Arduino Uno.
2. Connect the Arduino Uno to the desktop by USB.
3. Open `frontend/public/serial-test.html` in Chrome or Edge.
4. Click `Connect`, select the Arduino serial port, then run `PINOUT` or `MOTOR_DIAG`.

For backend/API testing with the desktop USB cable, set these values in `backend/.env`:

```env
ROBOT_COMMAND_TRANSPORT=local_serial
SERIAL_PORT=auto
SERIAL_BAUD=115200
SERIAL_DEBUG=true
```

## Command Set

Supported commands in the scaffold:
- `FORWARD`
- `BACKWARD`
- `LEFT`
- `RIGHT`
- `STOP`
- `CAM_UP`
- `CAM_DOWN`
- `CAM_LEFT`
- `CAM_RIGHT`
- `CAM_CENTER`
- `CAM_STOP`
