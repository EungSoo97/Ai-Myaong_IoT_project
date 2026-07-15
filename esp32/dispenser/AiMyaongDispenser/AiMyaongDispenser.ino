#include "dispenser_actuators.h"
#include "wifi_mqtt.h"
// Must come after wifi_mqtt.h: it calls publishDispenserWeight().
#include "dispenser_loadcell.h"

void setup() {
  Serial.begin(115200);
  setupActuators();
  setupWifiAndMqtt();
  setupLoadCells();
  printLoadCellPinout();
}

void loop() {
  loopMqtt();
  serviceActuators();
  serviceLoadCells();
}
