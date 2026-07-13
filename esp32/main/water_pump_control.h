#pragma once

#include <Arduino.h>

// One-direction water pump control through a logic-level N-channel MOSFET.
// GPIO32 drives the MOSFET gate through a small resistor.
constexpr uint8_t WATER_PUMP_GATE_PIN = 32;
constexpr uint8_t WATER_PUMP_DEFAULT_SPEED = 200;
constexpr unsigned long WATER_PUMP_DEFAULT_RUN_MS = 1000;
constexpr unsigned long WATER_PUMP_MAX_RUN_MS = 10000;
constexpr unsigned long WATER_PUMP_MS_PER_AMOUNT = 50;
constexpr unsigned long WATER_PUMP_MIN_RUN_MS = 300;

unsigned long waterPumpStopAt = 0;
uint8_t waterPumpSpeed = WATER_PUMP_DEFAULT_SPEED;

void stopWaterPump();

void setupWaterPump() {
  pinMode(WATER_PUMP_GATE_PIN, OUTPUT);
  stopWaterPump();
}

void runWaterPumpOutput() {
  analogWrite(WATER_PUMP_GATE_PIN, waterPumpSpeed);
}

void startWaterPump() {
  waterPumpStopAt = 0;
  runWaterPumpOutput();

  Serial.print("ACK WATER_PUMP_ON continuous speed=");
  Serial.println(waterPumpSpeed);
}

void startWaterPumpFor(unsigned long runMs) {
  unsigned long safeRunMs = constrain(runMs, 1UL, WATER_PUMP_MAX_RUN_MS);
  waterPumpStopAt = millis() + safeRunMs;
  runWaterPumpOutput();

  Serial.print("ACK WATER_PUMP_ON ");
  Serial.print(safeRunMs);
  Serial.print("ms speed=");
  Serial.print(waterPumpSpeed);
  Serial.println();
}

unsigned long waterRunMsForAmount(int amount) {
  long safeAmount = amount < 1 ? 1 : amount;
  unsigned long runMs = static_cast<unsigned long>(safeAmount) * WATER_PUMP_MS_PER_AMOUNT;
  return constrain(runMs, WATER_PUMP_MIN_RUN_MS, WATER_PUMP_MAX_RUN_MS);
}

void dispenseWaterAmount(int amount) {
  unsigned long runMs = waterRunMsForAmount(amount);
  waterPumpStopAt = millis() + runMs;
  runWaterPumpOutput();

  Serial.print("ACK WATER_PUMP_ON amount=");
  Serial.print(amount);
  Serial.print(" run_ms=");
  Serial.print(runMs);
  Serial.print(" speed=");
  Serial.println(waterPumpSpeed);
}

void setWaterPumpSpeed(int speed) {
  waterPumpSpeed = constrain(speed, 0, 255);
  Serial.print("ACK WATER_PUMP_SPEED ");
  Serial.println(waterPumpSpeed);
}

void reverseWaterPumpPinsForTest() {
  Serial.println("ERR WATER_PUMP_REVERSE_UNSUPPORTED_MOSFET");
}

void stopWaterPump() {
  analogWrite(WATER_PUMP_GATE_PIN, 0);
  waterPumpStopAt = 0;
}

void serviceWaterPump() {
  if (waterPumpStopAt != 0 && static_cast<long>(millis() - waterPumpStopAt) >= 0) {
    stopWaterPump();
    Serial.println("ACK WATER_PUMP_OFF");
  }
}

void printWaterPumpPinout() {
  Serial.println("Water pump MOSFET pinout:");
  Serial.println("  MOSFET gate -> GPIO32 through 100-220 ohm resistor");
  Serial.println("  MOSFET source -> GND");
  Serial.println("  MOSFET drain -> water pump negative wire");
  Serial.println("  Water pump positive wire -> pump power +");
  Serial.println("  ESP32 GND -> pump power GND shared");
  Serial.println("  Flyback diode cathode(stripe) -> pump power +");
  Serial.println("  Flyback diode anode -> MOSFET drain / pump negative");
}
