# Robot Controller Pinout Draft

Use this page to lock down the final Arduino Uno wiring.

## Motor Driver

TB6612FNG wiring:

- AIN1 / left motor direction A: D2
- AIN2 / left motor direction B: D3
- BIN1 / right motor direction A: D4
- PWMA / left motor PWM: D5
- PWMB / right motor PWM: D6
- BIN2 / right motor direction B: D7
- STBY / standby: D8
- VCC: Arduino 5V logic power
- VM: motor supply matched to the motor rating. Stop using 12V if the motor smells hot or burnt.
- GND: Arduino/Raspberry Pi GND and TB6612FNG GND must be shared.
- Arduino D2-D8 are reserved for the TB6612FNG control pins, making the driver wiring a compact block.
- Current code enables `STBY` HIGH during setup, kicks the motors at PWM 160 briefly, then runs at PWM 120 to reduce current draw.
- Movement commands automatically stop after 700 ms unless another movement command arrives.

## Motor Test

- Upload `AiMyaongRobot`, open Arduino Serial Monitor at `115200`, set line ending to newline, and send `MOTOR_TEST`.
- `MOTOR_TEST` runs left motor, right motor, then both motors briefly.
- Send `LEFT_MOTOR_TEST` or `RIGHT_MOTOR_TEST` to test only one side.
- Send `LEFT_BACKWARD_TEST` or `RIGHT_BACKWARD_TEST` to test each side in reverse.
- Send `PINOUT` to print the expected TB6612FNG and pan/tilt wiring.
- Send `MOTOR_DIAG` to run left forward/backward, then right forward/backward with serial phase messages.
- If `MOTOR_TEST` prints `ACK MOTOR_TEST` but motors do not move, check motor power, `STBY` wiring to D8, PWM wiring, shared GND, and whether the motors were damaged by 12V.
- If only one side spins and stops, swap the left/right motor outputs on the TB6612FNG. If the problem follows the motor, the motor is weak or damaged. If it stays on the same TB6612FNG side, the driver channel, wiring, or power path is the problem.
- If pan/tilt works but both crawler motors do not, check `VM` motor power first. `VCC` powers TB6612FNG logic only; motors need separate `VM` power and shared GND.

## Pan/Tilt Servos

- Pan servo signal: D9
- Tilt servo signal: D10
- Arduino D9-D10 sit next to the motor-driver block and are reserved for the pan/tilt servo signals.

## Rear Ultrasonic Sensor

- TRIG: D11
- ECHO: D12
- Sensor direction: rear-facing obstacle detection
- Current code reports rear distance over serial every 1 second.
- Rear obstacle alert turns on at 15 cm or closer and clears at 20 cm or farther.

## Serial Link

- Raspberry Pi TX -> Arduino Uno RX:
- Raspberry Pi RX -> Arduino Uno TX:
- Shared GND:
