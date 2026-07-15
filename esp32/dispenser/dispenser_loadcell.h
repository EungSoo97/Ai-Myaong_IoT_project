#pragma once

#include <Arduino.h>
#include "HX711.h"

// Two HX711 channels: one under the food hopper, one under the water tank.
// Water is reported in grams; 1 g of water is 1 ml, so the backend shows it as ml.
// GPIO34/35 are input-only, so they take DOUT. Pins match esp32/main/loadcell_control.h.
constexpr uint8_t FOOD_LOADCELL_DOUT_PIN = 34;
constexpr uint8_t FOOD_LOADCELL_SCK_PIN = 33;
constexpr uint8_t WATER_LOADCELL_DOUT_PIN = 35;
constexpr uint8_t WATER_LOADCELL_SCK_PIN = 22;

// Tune each cell against a known reference weight, then update these.
constexpr float FOOD_LOADCELL_SCALE = -7050.0f;
constexpr float WATER_LOADCELL_SCALE = -7050.0f;

constexpr unsigned long WEIGHT_PUBLISH_INTERVAL_MS = 1000;
// The hopper keeps shaking after the auger stops; wait before trusting the cell again.
constexpr unsigned long WEIGHT_SETTLE_MS = 1500;

HX711 foodScale;
HX711 waterScale;
bool foodScaleReady = false;
bool waterScaleReady = false;
float lastFoodGrams = 0.0f;
float lastWaterGrams = 0.0f;
unsigned long lastWeightPublishAt = 0;
unsigned long weightSettleUntil = 0;

inline void setupOneScale(
  HX711& scale,
  bool& ready,
  float scaleFactor,
  const char* label,
  uint8_t doutPin,
  uint8_t sckPin
) {
  scale.begin(doutPin, sckPin);
  scale.set_scale(scaleFactor);
  ready = scale.is_ready();

  Serial.print("[loadcell] ");
  Serial.print(label);
  if (ready) {
    scale.tare();
    Serial.println(" ready, tare done");
  } else {
    // Not fatal: the dispenser still feeds, the backend just shows no weight.
    Serial.println(" not responding; weight will not be published");
  }
}

inline void setupLoadCells() {
  setupOneScale(foodScale, foodScaleReady, FOOD_LOADCELL_SCALE, "food", FOOD_LOADCELL_DOUT_PIN, FOOD_LOADCELL_SCK_PIN);
  setupOneScale(waterScale, waterScaleReady, WATER_LOADCELL_SCALE, "water", WATER_LOADCELL_DOUT_PIN, WATER_LOADCELL_SCK_PIN);
}

inline void tareLoadCells() {
  if (foodScaleReady) {
    foodScale.tare();
    Serial.println("[loadcell] food tare done");
  }
  if (waterScaleReady) {
    waterScale.tare();
    Serial.println("[loadcell] water tare done");
  }
}

// HX711 read() busy-waits for the chip, so only sample when a conversion is already
// pending. A blocking read here would delay serviceActuators() and overrun the food
// motor stop time, which would over-dispense.
inline bool sampleScales() {
  bool sampledFood = false;
  if (foodScaleReady && foodScale.is_ready()) {
    lastFoodGrams = foodScale.get_units(1);
    sampledFood = true;
  }
  if (waterScaleReady && waterScale.is_ready()) {
    lastWaterGrams = waterScale.get_units(1);
  }
  return sampledFood;
}

inline void publishWeightNow() {
  publishDispenserWeight(foodScaleReady, lastFoodGrams, waterScaleReady, lastWaterGrams);
  lastWeightPublishAt = millis();
}

// 오거를 돌리기 직전 무게를 적어둔다. 로드셀이 없으면 잴 방법이 없으니 표식을 세우지 않는다.
inline void markFoodDispenseStart() {
  if (!foodScaleReady) {
    return;
  }
  foodGramsBeforeDispense = lastFoodGrams;
  foodDispensePending = true;
}

// 저울이 잠잠해진 '바로 그 시점'에 실제 배출량을 낸다. 언제 잠잠해지는지는 여기서만
// 알 수 있어서, 백엔드나 프론트가 시간을 추측하는 것보다 빠르고 정확하다.
inline void reportFoodDispensedIfDone() {
  if (!foodDispensePending) {
    return;
  }
  foodDispensePending = false;

  float grams = foodGramsBeforeDispense - lastFoodGrams;
  if (grams < 0.0f) {
    grams = 0.0f;  // 사람이 통을 채웠거나 저울이 흔들린 경우
  }
  publishFoodDispensed(grams);

  Serial.print("[food] dispensed g=");
  Serial.println(grams, 1);
}

inline void serviceLoadCells() {
  if (!foodScaleReady && !waterScaleReady) {
    return;
  }

  // 오거가 돌 때는 사료가 쏟아지는 중이라, 펌프가 돌 때는 물이 튜브·음수대에 흩어져
  // 있고 진동까지 타므로 값이 튄다. 둘 다 멈추고 잠잠해진 뒤에만 잰다.
  if (foodMotorStopAt != 0 || waterPumpStopAt != 0) {
    weightSettleUntil = millis() + WEIGHT_SETTLE_MS;
    return;
  }
  if (static_cast<long>(millis() - weightSettleUntil) < 0) {
    return;
  }

  // 갓 잰 값이 있어야 배출량을 낼 수 있다. 발행 스로틀보다 먼저 처리해서, 배출량은
  // 저울이 잠잠해지는 즉시 나간다(최대 1초 기다리지 않는다).
  if (sampleScales()) {
    reportFoodDispensedIfDone();
  }

  if (millis() - lastWeightPublishAt < WEIGHT_PUBLISH_INTERVAL_MS) {
    return;
  }
  publishWeightNow();
}

inline void printLoadCellPinout() {
  Serial.println("HX711 food load cell:");
  Serial.println("  DOUT/DT -> GPIO34");
  Serial.println("  SCK/CLK -> GPIO33");
  Serial.println("HX711 water load cell:");
  Serial.println("  DOUT/DT -> GPIO35");
  Serial.println("  SCK/CLK -> GPIO22");
  Serial.println("  VCC -> ESP32 3V3, GND -> ESP32 GND");
}
