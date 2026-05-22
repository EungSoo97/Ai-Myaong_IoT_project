# Arduino Uno Robot Controller

This workspace contains the Arduino Uno sketch for the remote robot.

Responsibilities:
- Receive serial commands from the Raspberry Pi
- Drive crawler or caterpillar DC motors
- Control the camera pan/tilt servos

This controller is only for the robot. The food and water dispenser is handled separately by the ESP32 dispenser device.

## Arduino IDE

Open this sketch in Arduino IDE:

- `arduino-uno/AiMyaongRobot/AiMyaongRobot.ino`

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
