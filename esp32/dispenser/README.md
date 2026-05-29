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
- defaults to MQTT broker `10.1.82.103:1883`
- use the same real Wi-Fi SSID/password that the Raspberry Pi uses
- hold the setup button on GPIO0 for 3 seconds to clear saved Wi-Fi/MQTT settings and reopen setup mode

Setup page:

- app route: `/wifi-setup`
- device AP page: `http://192.168.4.1`

Arduino library requirement:

- `PubSubClient`
