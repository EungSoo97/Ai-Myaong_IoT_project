# Raspberry Pi Agent

The Raspberry Pi agent subscribes to MQTT robot topics and forwards received commands to the serial robot controller.

## Setup

```bash
cd raspberrypi
python3.11 -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

Edit `.env` so `MQTT_BROKER_HOST` points to the machine running your MQTT broker. If the broker runs on the same Raspberry Pi, keep `localhost`.

For the current shared IoT network, the broker host is:

```env
MQTT_BROKER_HOST=10.1.82.103
MQTT_BROKER_PORT=1883
```

To put the Raspberry Pi on the same Wi-Fi as the ESP32 dispenser:

```bash
bash ./scripts/setup-raspberrypi-wifi.sh "YOUR_WIFI_SSID" "YOUR_WIFI_PASSWORD"
```

Then configure the ESP32 through `ESP32_FEEDER_SETUP` with the same SSID and password.

## Run

From the repository root:

```bash
bash ./scripts/start-raspberrypi.sh
```

Or from this directory:

```bash
python main.py
```

## MQTT Messages

Default subscribed topics:

- `robot/move`
- `robot/camera`

Accepted payload examples:

```json
{"cmd":"forward"}
```

```json
{"command":"stop"}
```

```json
{"direction":"left"}
```

Plain text payloads are also accepted, for example `forward`.

## Local Receive Test

Keep `SIMULATION_MODE=true` if you want to test MQTT receive without opening a real serial port.

```bash
mosquitto_pub -h localhost -t robot/move -m '{"cmd":"forward"}'
```

Expected output:

```text
[raspberrypi] MQTT robot/move <- forward
[serial:simulated] -> robot-controller forward
```
