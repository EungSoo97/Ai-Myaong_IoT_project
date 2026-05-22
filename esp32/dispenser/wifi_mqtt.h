#pragma once

#include "dispenser_actuators.h"

inline void setupWifiAndMqtt() {
  // TODO: connect to Wi-Fi and subscribe to:
  // dispenser/feed
  // dispenser/water
}

inline void handleMqttMessage(const String& topic, int amount) {
  if (topic == "dispenser/feed") {
    dispenseFood(amount);
  } else if (topic == "dispenser/water") {
    dispenseWater(amount);
  }
}

inline void loopMqtt() {
  // TODO: drive the MQTT loop here.
}
