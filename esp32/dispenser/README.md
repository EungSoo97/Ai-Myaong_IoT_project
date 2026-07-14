# ESP32 Dispenser

This sketch is for the standalone dispenser hardware.

- receives web/backend commands through MQTT
- `dispenser/feed` controls food output
- `dispenser/water` controls water output
- does not control the remote robot

Wi-Fi setup behavior:

- tries the saved SSID/password from ESP32 Preferences on boot
- starts the `ESP32_FEEDER_SETUP` access point if Wi-Fi fails
- serves setup UI and JSON APIs at `http://192.168.4.1`
- stores the MQTT broker host during Wi-Fi setup
- defaults to MQTT broker `raspberrypi.local:1883`
- use the same real Wi-Fi SSID/password that the Raspberry Pi uses
- hold the setup button on GPIO0 for 3 seconds to clear saved Wi-Fi/MQTT settings and reopen setup mode

Shared Raspberry Pi / ESP32 Wi-Fi setup:

```bash
cd ~/Ai-Myaong_IoT_project
bash ./scripts/setup-raspberrypi-wifi.sh "Wi-Fi SSID" "Wi-Fi password"
```

The script connects the Raspberry Pi to the Wi-Fi, detects the Raspberry Pi Wi-Fi IP, writes that IP to `raspberrypi/.env`, updates the ESP32 sketch default MQTT host, and pushes the same settings to the ESP32 setup portal when `http://192.168.4.1` is reachable.

ESP32 recovery behavior:

- Wi-Fi credentials and MQTT host are stored in Preferences.
- New Wi-Fi settings are tested before replacing the old saved settings.
- If the new Wi-Fi connection fails, the previous SSID/password/MQTT host are restored.
- If saved Wi-Fi cannot connect on boot, the `ESP32_FEEDER_SETUP` AP setup mode starts.

Setup page:

- app route: `/wifi-setup`
- device AP page: `http://192.168.4.1`

Arduino library requirement:

- `PubSubClient`

MQTT routing:

- ESP32 connects only to the local Raspberry Pi broker: `raspberrypi.local:1883`.
- Raspberry Pi runs Mosquitto for ESP32 devices on the same Wi-Fi.
- Raspberry Pi bridge receives HiveMQ Cloud messages and republishes dispenser commands to local Mosquitto.
- `dispenser/feed` and `dispenser/water`: HiveMQ Cloud -> Raspberry Pi bridge -> local Mosquitto -> ESP32.
- `dispenser/status` and `dispenser/weight`: ESP32 -> local Mosquitto -> Raspberry Pi bridge -> HiveMQ Cloud.
- If mDNS does not resolve `raspberrypi.local`, use the Raspberry Pi Wi-Fi IP in the ESP32 setup page.

Food motor wiring:

- Driver: TB6612FNG A channel
- AIN1: GPIO25
- AIN2: GPIO26
- PWMA: GPIO27
- STBY: GPIO23
- Motor wires: A01 and A02
- VCC: ESP32 3V3
- VM: separate motor power supply, for example 12V if the motor is rated for 12V
- GND: ESP32 GND, TB6612FNG GND, and motor supply GND must be shared

Food dispense timing:

- Frontend feed button sends the configured food amount to `/api/dispenser/feed`.
- Backend publishes that amount to MQTT topic `dispenser/feed`.
- ESP32 runs the food motor for `amount * FOOD_MOTOR_MS_PER_AMOUNT`.
- Current calibration is `250 ms` per amount unit, clamped from `300 ms` to `8000 ms`.
- Tune `FOOD_MOTOR_MS_PER_AMOUNT` in `AiMyaongDispenser/dispenser_actuators.h` after measuring real food output.
