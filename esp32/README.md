# ESP32 Layout

This directory now documents the dispenser-side ESP32 device.

- `dispenser/`: standalone food and water dispenser sketch
- `loadcell_test/`: ESP32 + two HX711 load cell serial monitor test
- `main/`: legacy sketch kept after the repo reset

The robot and dispenser are intentionally separate systems.

## Temporary TB6612FNG Single Motor Test

`main/` can be uploaded to an ESP32 DevKit for a temporary 12V single motor test over the serial monitor.

TB6612FNG wiring:

- AIN1 / motor direction A: GPIO25
- AIN2 / motor direction B: GPIO26
- PWMA / motor PWM: GPIO27
- STBY / standby: GPIO23
- VCC: ESP32 3V3 logic power
- VM: separate 12V motor supply
- GND: ESP32 GND, TB6612FNG GND, and 12V supply GND must be shared
- Motor wires: TB6612FNG A01 and A02

The TB6612FNG B channel is unused for this one-motor test.

Avoid powering the motors from the ESP32 board. Only TB6612FNG logic `VCC` should use ESP32 3V3; motor power goes to `VM`.

Water pump IRL744N MOSFET wiring:

- Gate: GPIO32 through a 100-220 ohm resistor
- Source: GND
- Drain: water pump negative wire
- Water pump positive wire: pump power +
- Pump power GND: ESP32 GND shared
- Gate pulldown: 10k ohm from gate to GND
- Flyback diode cathode/stripe: pump power +
- Flyback diode anode: MOSFET drain / pump negative

For one-direction pumping, the code drives PWM on GPIO32. The pump must use a separate motor supply matched to the pump rating, for example 6V for a 6V pump. Do not power the pump from the ESP32 board.

HX711 load cell 1 wiring:

- DOUT/DT: GPIO34
- SCK/CLK: GPIO33
- VCC: ESP32 3V3
- GND: ESP32 GND

HX711 load cell 2 wiring:

- DOUT/DT: GPIO35
- SCK/CLK: GPIO22
- VCC: ESP32 3V3
- GND: ESP32 GND

The previous HX711 test pins used GPIO32/GPIO33, but GPIO32 is now used by the water pump MOSFET gate, so the load cells in `main/` use GPIO34/GPIO33 and GPIO35/GPIO22.

MQTT routing for `main/`:

- Broker: `raspberrypi.local:1883`
- Subscribe: `dispenser/feed`, `dispenser/water`, `dispenser/pump/off`, `dispenser/pump/speed`, `dispenser/tare`, `dispenser/weight/request`
- Publish: `dispenser/status`, `dispenser/weight`

`dispenser/feed` runs the TB6612 food motor for `amount * 250 ms`, clamped to 300-8000 ms. `dispenser/water` runs the MOSFET water pump for `amount * 50 ms`, clamped to 300-10000 ms. Tune these constants after measuring real output.

Serial monitor:

- Baud rate: `115200`
- Line ending: newline
- Commands: `FORWARD`, `BACKWARD`, `STOP`
- Aliases: `LEFT` runs backward, `RIGHT` runs forward
- Water pump commands: `WATER`, `PUMP_ON`, `PUMP_OFF`, `PUMP_MS 3000`
- Water pump tuning: `PUMP_SPEED 200`
- Load cell commands: `LOAD`, `LOAD1`, `LOAD2`, `LOAD_RAW`, `LOAD1_RAW`, `LOAD2_RAW`, `LOAD_COUNT`, `LOAD1_COUNT`, `LOAD2_COUNT`
- Load cell tuning: `LOAD_TARE`, `LOAD1_TARE`, `LOAD2_TARE`, `LOAD_SCALE -7050`, `LOAD1_SCALE -7050`, `LOAD2_SCALE -7050`
- Speed command: `SPEED 0-255`, for example `SPEED 160`
- Pin map command: `PINOUT`
- Help command: `HELP`
- Serial test command: `PING`

Movement commands automatically stop after 800 ms unless another movement command arrives.
`WATER` and `PUMP_ON` keep the water pump running until `PUMP_OFF` is sent.
`PUMP_MS 3000` runs the water pump for the requested time only. Maximum is 10000 ms.

For load cell calibration, use `LOAD2_TARE`, then compare `LOAD2_COUNT` with no weight and with a known weight. `LOAD2_COUNT` is the tare-adjusted raw value before scale conversion, so it is easier to calibrate than the `unit` value.
