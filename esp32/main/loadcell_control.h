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
constexpr uint8_t LOADCELL_1_GAIN = 128;
// 물통의 기본 하중에서 gain 128 원시값이 24비트 한계에 가까워 포화되므로
// gain 64를 사용해 측정 가능한 하중 범위를 넓힌다.
constexpr uint8_t LOADCELL_2_GAIN = 64;
// Calibrated from a 40 g reference: reading changed -5.18 g with the old
// -7050 factor, so raw delta / 40 g gives a corrected factor of +912.98.
constexpr float LOADCELL_1_DEFAULT_SCALE = 913.0f;
// 영점 설정 후 물 500 ml(약 500 g)를 올렸을 때 1165.06 g로 측정된 값을
// 실제 영점 저장 후 물 500 ml에서 측정된 85,969 카운트로 최종 보정:
// 85,969 / 500 = 171.938.
constexpr float LOADCELL_2_DEFAULT_SCALE = 171.938f;
constexpr unsigned long LOADCELL_PRINT_INTERVAL_MS = 1000;
constexpr unsigned long LOADCELL_TARE_READY_TIMEOUT_MS = 2000;

// 배출/급수 중에는 저울이 흔들려 값이 튄다. 액추에이터가 멈추고 이만큼 지나야 믿는다.
constexpr unsigned long LOADCELL_SETTLE_MS = 1500;

HX711 loadCell1;
HX711 loadCell2;
float loadCell1Scale = LOADCELL_1_DEFAULT_SCALE;
float loadCell2Scale = LOADCELL_2_DEFAULT_SCALE;
unsigned long lastLoadCellPrintMs = 0;

// 마지막으로 '실제로 읽은' 값. HX711 은 약 10Hz 라 대부분의 순간에 is_ready() 가 false 인데,
// 그때 0 을 내보내면 진짜 값과 가짜 0 이 번갈아 나가서 잔여량이 튄다. 그래서 마지막 값을 들고 있는다.
bool loadCell1HasValue = false;
bool loadCell2HasValue = false;
float loadCell1Grams = 0.0f;
float loadCell2Grams = 0.0f;
unsigned long loadCellSettleUntilMs = 0;

// 배식 1회의 실제 배출량을 재기 위한 표식.
bool foodDispensePending = false;
float foodGramsBeforeDispense = 0.0f;

inline bool loadCellSettled() {
  return static_cast<long>(millis() - loadCellSettleUntilMs) >= 0;
}

inline void holdLoadCellSettle() {
  loadCellSettleUntilMs = millis() + LOADCELL_SETTLE_MS;
}

// tare 영점을 NVS 에 저장해 재부팅 후에도 유지한다. 안 그러면 껐다 켤 때마다
// 통을 비우고 다시 영점을 잡아야 한다.
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

bool waitForLoadCellReady(HX711& scale, unsigned long timeoutMs) {
  const unsigned long waitStartedAt = millis();
  while (!scale.is_ready() && millis() - waitStartedAt < timeoutMs) {
    delay(10);
  }
  return scale.is_ready();
}

// 현재 HX711 라이브러리는 양의 부호 경계(2^23)를 지날 때 RAW가 8,388,607
// 다음에 0부터 다시 증가한다. 저장된 영점과의 차이를 원형 카운터처럼 펼쳐
// 기본 구조물이 경계 근처에 있어도 추가된 물의 무게를 연속적으로 계산한다.
long wrappedLoadCellDelta(long raw, long offset) {
  constexpr long HX711_WRAP = 8388608L;
  constexpr long HX711_HALF_WRAP = HX711_WRAP / 2L;
  long delta = raw - offset;
  if (delta < -HX711_HALF_WRAP) {
    delta += HX711_WRAP;
  } else if (delta > HX711_HALF_WRAP) {
    delta -= HX711_WRAP;
  }
  return delta;
}

float readWaterLoadCellUnits() {
  const long raw = loadCell2.read();
  return static_cast<float>(
      wrappedLoadCellDelta(raw, loadCell2.get_offset())) / loadCell2Scale;
}

void setupOneLoadCell(HX711& scale, float scaleFactor, const char* label, const char* offsetKey, uint8_t doutPin, uint8_t sckPin, uint8_t gain) {
  scale.begin(doutPin, sckPin);
  scale.set_gain(gain);
  scale.set_scale(scaleFactor);

  // 저장된 오프셋 적용에는 HX711 샘플 준비가 필요하지 않다. 부팅 직후
  // DOUT이 아직 준비되지 않았더라도 먼저 복원해야 이후 측정값에 영점이 유지된다.
  if (restoreLoadCellOffset(scale, offsetKey)) {
    Serial.print("ACK ");
    Serial.print(label);
    Serial.println("_READY offset=restored");
    return;
  }

  // 저장값이 없는 최초 부팅만 센서 준비를 기다린 뒤 현재 하중으로 영점을 잡는다.
  if (!waitForLoadCellReady(scale, LOADCELL_TARE_READY_TIMEOUT_MS)) {
    Serial.print("WARN ");
    Serial.print(label);
    Serial.println("_NOT_READY offset=missing");
    return;
  }

  scale.tare();
  saveLoadCellOffset(offsetKey, scale.get_offset());
  Serial.print("ACK ");
  Serial.print(label);
  Serial.println("_READY tare=done offset=saved");
}

void setupLoadCell() {
  setupOneLoadCell(loadCell1, loadCell1Scale, "LOADCELL1", "offset1", LOADCELL_1_DOUT_PIN, LOADCELL_1_SCK_PIN, LOADCELL_1_GAIN);
  // gain 128에서 저장한 기존 offset2는 gain 64에서 유효하지 않으므로 새 키를 쓴다.
  setupOneLoadCell(loadCell2, loadCell2Scale, "LOADCELL2", "offset2g64", LOADCELL_2_DOUT_PIN, LOADCELL_2_SCK_PIN, LOADCELL_2_GAIN);
}

void tareOneLoadCell(HX711& scale, const char* label, const char* offsetKey) {
  // HX711은 보통 10Hz로 샘플을 내므로 MQTT 명령이 샘플 사이에 도착하면
  // is_ready() 한 번만 확인해서는 정상 연결된 로드셀도 NOT_READY가 된다.
  // 설치된 HX711 라이브러리 버전과 무관하게 다음 샘플을 직접 기다린다.
  if (!waitForLoadCellReady(scale, LOADCELL_TARE_READY_TIMEOUT_MS)) {
    Serial.print("ERR ");
    Serial.print(label);
    Serial.println("_NOT_READY timeout=2000ms");
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
  tareOneLoadCell(loadCell2, "LOADCELL2", "offset2g64");
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
  if (!waitForLoadCellReady(scale, LOADCELL_TARE_READY_TIMEOUT_MS)) {
    Serial.print("ERR ");
    Serial.print(label);
    Serial.println("_NOT_READY timeout=2000ms");
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
  if (!waitForLoadCellReady(scale, LOADCELL_TARE_READY_TIMEOUT_MS)) {
    Serial.print("ERR ");
    Serial.print(label);
    Serial.println("_NOT_READY timeout=2000ms");
    return;
  }

  Serial.print(label);
  Serial.print("_RAW ");
  Serial.println(scale.read_average(3));
}

void printOneLoadCellCount(HX711& scale, const char* label) {
  if (!waitForLoadCellReady(scale, LOADCELL_TARE_READY_TIMEOUT_MS)) {
    Serial.print("ERR ");
    Serial.print(label);
    Serial.println("_NOT_READY timeout=2000ms");
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
  if (!waitForLoadCellReady(loadCell2, LOADCELL_TARE_READY_TIMEOUT_MS)) {
    Serial.println("ERR LOADCELL2_NOT_READY timeout=2000ms");
    return;
  }
  const long raw = loadCell2.read();
  const long count = wrappedLoadCellDelta(raw, loadCell2.get_offset());
  Serial.print("LOADCELL2 unit=");
  Serial.println(static_cast<float>(count) / loadCell2Scale, 2);
  Serial.print("LOADCELL2_COUNT ");
  Serial.println(count);
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
  if (!waitForLoadCellReady(loadCell2, LOADCELL_TARE_READY_TIMEOUT_MS)) {
    Serial.println("ERR LOADCELL2_NOT_READY timeout=2000ms");
    return;
  }
  const long raw = loadCell2.read();
  Serial.print("LOADCELL2_COUNT ");
  Serial.println(wrappedLoadCellDelta(raw, loadCell2.get_offset()));
}

void tareLoadCell1() {
  tareOneLoadCell(loadCell1, "LOADCELL1", "offset1");
}

void tareLoadCell2() {
  tareOneLoadCell(loadCell2, "LOADCELL2", "offset2g64");
}

void setLoadCell1Scale(float scale) {
  setOneLoadCellScale(loadCell1, loadCell1Scale, "LOADCELL1", scale);
}

void setLoadCell2Scale(float scale) {
  setOneLoadCellScale(loadCell2, loadCell2Scale, "LOADCELL2", scale);
}

// 오거를 돌리기 직전 무게를 적어둔다. 로드셀 값을 아직 한 번도 못 읽었으면 잴 수가 없으니
// 표식을 세우지 않는다 — 그 경우 배출량은 기록되지 않는다(지어내는 것보다 낫다).
void markFoodDispenseStart() {
  if (!loadCell1HasValue) {
    return;
  }
  foodGramsBeforeDispense = loadCell1Grams;
  foodDispensePending = true;
}

// 오거가 멈추고 저울이 잠잠해졌으면 이번 배식의 실제 배출량을 돌려준다.
// 아직 잴 때가 아니거나 잴 게 없으면 -1. (mqtt_control.h 가 이 값을 발행한다)
float takeFoodDispensedGrams() {
  if (!foodDispensePending || !loadCellSettled() || !loadCell1HasValue) {
    return -1.0f;
  }
  foodDispensePending = false;

  float grams = foodGramsBeforeDispense - loadCell1Grams;
  return grams < 0.0f ? 0.0f : grams;  // 사람이 통을 채웠거나 저울이 흔들린 경우
}

// 배식/급수 중이면 밖에서 이걸 불러 측정을 미룬다. (mqtt_control.h 가 호출)
void sampleLoadCells() {
  if (!loadCellSettled()) {
    return;
  }
  // is_ready() 로 막지 않으면 read() 가 변환을 기다리며 루프를 붙잡는다 —
  // 그동안 serviceMotors()/serviceWaterPump() 가 밀려 모터가 더 돈다.
  if (loadCell1.is_ready()) {
    loadCell1Grams = loadCell1.get_units(1);
    loadCell1HasValue = true;
  }
  if (loadCell2.is_ready()) {
    loadCell2Grams = readWaterLoadCellUnits();
    loadCell2HasValue = true;
  }
}

void serviceLoadCell() {
  // MQTT 주기 발행은 loopMqttControl() 이 한다. 여기서는 값만 최신으로 유지한다.
  sampleLoadCells();

  unsigned long now = millis();
  if (now - lastLoadCellPrintMs < LOADCELL_PRINT_INTERVAL_MS) {
    return;
  }
  lastLoadCellPrintMs = now;

  // 보정용 시리얼 출력. get_units() 를 다시 부르지 않고 sampleLoadCells() 가 읽어둔 값을 쓴다 —
  // get_units() 는 HX711 변환값을 소비해서, 여기서 또 부르면 샘플러와 변환을 서로 뺏는다.
  // 같은 값을 쓰므로 시리얼에 찍히는 무게가 앱에 보이는 무게와 항상 일치한다.
  Serial.print("[loadcell] food=");
  if (loadCell1HasValue) {
    Serial.print(loadCell1Grams, 2);
    Serial.print("g");
  } else {
    Serial.print("NOT_READY");
  }

  Serial.print(" water=");
  if (loadCell2HasValue) {
    Serial.print(loadCell2Grams, 2);
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
