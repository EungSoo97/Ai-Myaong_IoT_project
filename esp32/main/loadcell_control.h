#pragma once

#include <Arduino.h>
#include <Preferences.h>
#include "HX711.h"

// Two HX711 load cell channels for dispenser weight tests.
// GPIO34 and GPIO35 are input-only, so they are suitable for HX711 DOUT.
constexpr uint8_t LOADCELL_1_DOUT_PIN = 34;
constexpr uint8_t LOADCELL_1_SCK_PIN = 33;
constexpr uint8_t LOADCELL_2_DOUT_PIN = 35;
constexpr uint8_t LOADCELL_2_SCK_PIN = 22;
// Calibrated from a 40 g reference: reading changed -5.18 g with the old
// -7050 factor, so raw delta / 40 g gives a corrected factor of +912.98.
constexpr float LOADCELL_1_DEFAULT_SCALE = 913.0f;
constexpr float LOADCELL_2_DEFAULT_SCALE = -7050.0f;
constexpr unsigned long LOADCELL_PRINT_INTERVAL_MS = 1000;

HX711 loadCell1;
HX711 loadCell2;
float loadCell1Scale = LOADCELL_1_DEFAULT_SCALE;
float loadCell2Scale = LOADCELL_2_DEFAULT_SCALE;
unsigned long lastLoadCellPrintMs = 0;

constexpr const char* LOADCELL_PREFS_NAMESPACE = "aimyaong-load";

void saveLoadCellOffset(const char* key, long offset) {
  Preferences preferences;
  if (!preferences.begin(LOADCELL_PREFS_NAMESPACE, false)) {
    Serial.println("ERR LOADCELL_OFFSET_SAVE_FAILED");
    return;
  }
  preferences.putLong(key, offset);
  preferences.end();
}

bool restoreLoadCellOffset(HX711& scale, const char* key) {
  Preferences preferences;
  if (!preferences.begin(LOADCELL_PREFS_NAMESPACE, true)) {
    return false;
  }
  bool saved = preferences.isKey(key);
  long offset = saved ? preferences.getLong(key, 0) : 0;
  preferences.end();
  if (saved) {
    scale.set_offset(offset);
  }
  return saved;
}

void setupOneLoadCell(HX711& scale, float scaleFactor, const char* label, const char* offsetKey, uint8_t doutPin, uint8_t sckPin) {
  scale.begin(doutPin, sckPin);
  scale.set_scale(scaleFactor);

  if (scale.is_ready()) {
    Serial.print("ACK ");
    Serial.print(label);
    if (restoreLoadCellOffset(scale, offsetKey)) {
      Serial.println("_READY offset=restored");
    } else {
      scale.tare();
      saveLoadCellOffset(offsetKey, scale.get_offset());
      Serial.println("_READY tare=done offset=saved");
    }
  } else {
    Serial.print("WARN ");
    Serial.print(label);
    Serial.println("_NOT_READY");
  }
}

void setupLoadCell() {
  setupOneLoadCell(loadCell1, loadCell1Scale, "LOADCELL1", "offset1", LOADCELL_1_DOUT_PIN, LOADCELL_1_SCK_PIN);
  setupOneLoadCell(loadCell2, loadCell2Scale, "LOADCELL2", "offset2", LOADCELL_2_DOUT_PIN, LOADCELL_2_SCK_PIN);
}

void tareOneLoadCell(HX711& scale, const char* label, const char* offsetKey) {
  if (!scale.is_ready()) {
    Serial.print("ERR ");
    Serial.print(label);
    Serial.println("_NOT_READY");
    return;
  }

  scale.tare();
  saveLoadCellOffset(offsetKey, scale.get_offset());
  Serial.print("ACK ");
  Serial.print(label);
  Serial.println("_TARE offset=saved");
}

void tareLoadCell() {
  tareOneLoadCell(loadCell1, "LOADCELL1", "offset1");
  tareOneLoadCell(loadCell2, "LOADCELL2", "offset2");
}

void setOneLoadCellScale(HX711& scale, float& scaleFactor, const char* label, float newScaleFactor) {
  if (newScaleFactor == 0.0f) {
    Serial.println("ERR LOADCELL_SCALE_ZERO");
    return;
  }

  scaleFactor = newScaleFactor;
  scale.set_scale(scaleFactor);
  Serial.print("ACK ");
  Serial.print(label);
  Serial.print("_SCALE ");
  Serial.println(scaleFactor, 4);
}

void setLoadCellScale(float scale) {
  setOneLoadCellScale(loadCell1, loadCell1Scale, "LOADCELL1", scale);
  setOneLoadCellScale(loadCell2, loadCell2Scale, "LOADCELL2", scale);
}

void printOneLoadCellValue(HX711& scale, const char* label, uint8_t samples) {
  if (!scale.is_ready()) {
    Serial.print("ERR ");
    Serial.print(label);
    Serial.println("_NOT_READY");
    return;
  }

  long counts = scale.get_value(samples);
  float units = scale.get_units(samples);
  Serial.print(label);
  Serial.print(" unit=");
  Serial.println(units, 2);
  Serial.print(label);
  Serial.print("_COUNT ");
  Serial.println(counts);
}

void printLoadCellValue() {
  printOneLoadCellValue(loadCell1, "LOADCELL1", 3);
  printOneLoadCellValue(loadCell2, "LOADCELL2", 3);
}

void printOneLoadCellRaw(HX711& scale, const char* label) {
  if (!scale.is_ready()) {
    Serial.print("ERR ");
    Serial.print(label);
    Serial.println("_NOT_READY");
    return;
  }

  Serial.print(label);
  Serial.print("_RAW ");
  Serial.println(scale.read_average(3));
}

void printOneLoadCellCount(HX711& scale, const char* label) {
  if (!scale.is_ready()) {
    Serial.print("ERR ");
    Serial.print(label);
    Serial.println("_NOT_READY");
    return;
  }

  Serial.print(label);
  Serial.print("_COUNT ");
  Serial.println(scale.get_value(3));
}

void printLoadCellRaw() {
  printOneLoadCellRaw(loadCell1, "LOADCELL1");
  printOneLoadCellRaw(loadCell2, "LOADCELL2");
}

void printLoadCellCount() {
  printOneLoadCellCount(loadCell1, "LOADCELL1");
  printOneLoadCellCount(loadCell2, "LOADCELL2");
}

void printLoadCell1Value() {
  printOneLoadCellValue(loadCell1, "LOADCELL1", 3);
}

void printLoadCell2Value() {
  printOneLoadCellValue(loadCell2, "LOADCELL2", 3);
}

void printLoadCell1Raw() {
  printOneLoadCellRaw(loadCell1, "LOADCELL1");
}

void printLoadCell2Raw() {
  printOneLoadCellRaw(loadCell2, "LOADCELL2");
}

void printLoadCell1Count() {
  printOneLoadCellCount(loadCell1, "LOADCELL1");
}

void printLoadCell2Count() {
  printOneLoadCellCount(loadCell2, "LOADCELL2");
}

void tareLoadCell1() {
  tareOneLoadCell(loadCell1, "LOADCELL1", "offset1");
}

void tareLoadCell2() {
  tareOneLoadCell(loadCell2, "LOADCELL2", "offset2");
}

void setLoadCell1Scale(float scale) {
  setOneLoadCellScale(loadCell1, loadCell1Scale, "LOADCELL1", scale);
}

void setLoadCell2Scale(float scale) {
  setOneLoadCellScale(loadCell2, loadCell2Scale, "LOADCELL2", scale);
}

void serviceLoadCell() {
  unsigned long now = millis();
  if (now - lastLoadCellPrintMs < LOADCELL_PRINT_INTERVAL_MS) {
    return;
  }
  lastLoadCellPrintMs = now;

  Serial.print("[loadcell] food=");
  if (loadCell1.is_ready()) {
    Serial.print(loadCell1.get_units(1), 2);
    Serial.print("g");
  } else {
    Serial.print("NOT_READY");
  }

  Serial.print(" water=");
  if (loadCell2.is_ready()) {
    Serial.print(loadCell2.get_units(1), 2);
    Serial.println("g");
  } else {
    Serial.println("NOT_READY");
  }
}

void printLoadCellPinout() {
  Serial.println("HX711 load cell 1 pinout:");
  Serial.println("  DOUT/DT -> GPIO34");
  Serial.println("  SCK/CLK -> GPIO33");
  Serial.println("  VCC -> ESP32 3V3");
  Serial.println("  GND -> ESP32 GND");
  Serial.println("HX711 load cell 2 pinout:");
  Serial.println("  DOUT/DT -> GPIO35");
  Serial.println("  SCK/CLK -> GPIO22");
  Serial.println("  VCC -> ESP32 3V3");
  Serial.println("  GND -> ESP32 GND");
}
