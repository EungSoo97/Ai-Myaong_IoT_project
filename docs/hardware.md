# Hardware Notes

## Raspberry Pi

- subscribes to `robot/move` and `robot/camera`
- serves MJPEG camera stream
- forwards robot commands to the robot controller over serial

## Robot Controller

- receives low-level robot commands from Raspberry Pi
- drives crawler motors
- drives camera pan/tilt servos

## ESP32 Dispenser

- separate device from the robot
- receives `dispenser/feed` and `dispenser/water`
- controls food and water actuators
