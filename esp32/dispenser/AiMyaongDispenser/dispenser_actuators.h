#pragma once

#include <Arduino.h>

// TB6612FNG A channel for the food dispenser motor.
// Tune FOOD_MOTOR_MS_PER_AMOUNT after measuring how much food is dispensed.
constexpr uint8_t FOOD_MOTOR_IN1_PIN = 25;      // AIN1
constexpr uint8_t FOOD_MOTOR_IN2_PIN = 26;      // AIN2
constexpr uint8_t FOOD_MOTOR_PWM_PIN = 27;      // PWMA
constexpr uint8_t FOOD_MOTOR_STANDBY_PIN = 23;  // STBY

constexpr uint8_t FOOD_MOTOR_SPEED = 180;
constexpr unsigned long FOOD_MOTOR_MS_PER_AMOUNT = 250;
constexpr unsigned long FOOD_MOTOR_MIN_RUN_MS = 300;
constexpr unsigned long FOOD_MOTOR_MAX_RUN_MS = 8000;

// 물 펌프: N채널 MOSFET 게이트를 GPIO32로 구동 (esp32/main/water_pump_control.h 와 동일 배선).
// 물통이 저수조 겸 음수대라 펌프를 돌려도 물이 통 밖으로 나가지 않는다(순환). 그래서 물은
// 사료처럼 '양'으로 지시할 수 없고 '몇 초 돌릴지'로만 지시한다.
constexpr uint8_t WATER_PUMP_GATE_PIN = 32;
constexpr uint8_t WATER_PUMP_SPEED = 200;
constexpr unsigned long WATER_PUMP_MIN_RUN_MS = 300;
constexpr unsigned long WATER_PUMP_MAX_RUN_MS = 10000;

unsigned long foodMotorStopAt = 0;
unsigned long waterPumpStopAt = 0;

// 배식 1회가 실제로 몇 g 나갔는지 재기 위한 표식. 오거를 돌리기 직전 무게를 적어두고,
// 저울이 잠잠해지면 그때 차이를 낸다. (dispenser_loadcell.h 가 채운다)
bool foodDispensePending = false;
float foodGramsBeforeDispense = 0.0f;

inline unsigned long foodRunMsForAmount(int amount) {
  long safeAmount = amount < 1 ? 1 : amount;
  unsigned long runMs = static_cast<unsigned long>(safeAmount) * FOOD_MOTOR_MS_PER_AMOUNT;
  return constrain(runMs, FOOD_MOTOR_MIN_RUN_MS, FOOD_MOTOR_MAX_RUN_MS);
}

inline void runFoodMotor(uint8_t speed) {
  digitalWrite(FOOD_MOTOR_STANDBY_PIN, HIGH);
  // The auger dispenses food when the motor runs in reverse.
  digitalWrite(FOOD_MOTOR_IN1_PIN, LOW);
  digitalWrite(FOOD_MOTOR_IN2_PIN, HIGH);
  analogWrite(FOOD_MOTOR_PWM_PIN, speed);
}

inline void stopFoodMotor() {
  digitalWrite(FOOD_MOTOR_IN1_PIN, LOW);
  digitalWrite(FOOD_MOTOR_IN2_PIN, LOW);
  analogWrite(FOOD_MOTOR_PWM_PIN, 0);
}

inline void stopWaterPump() {
  analogWrite(WATER_PUMP_GATE_PIN, 0);
}

inline void setupActuators() {
  pinMode(FOOD_MOTOR_IN1_PIN, OUTPUT);
  pinMode(FOOD_MOTOR_IN2_PIN, OUTPUT);
  pinMode(FOOD_MOTOR_PWM_PIN, OUTPUT);
  pinMode(FOOD_MOTOR_STANDBY_PIN, OUTPUT);
  pinMode(WATER_PUMP_GATE_PIN, OUTPUT);

  digitalWrite(FOOD_MOTOR_STANDBY_PIN, HIGH);
  stopFoodMotor();
  stopWaterPump();
}

// markFoodDispenseStart 는 dispenser_loadcell.h 에 있다 (로드셀 상태를 알아야 해서).
inline void markFoodDispenseStart();

inline void dispenseFood(int amount) {
  unsigned long runMs = foodRunMsForAmount(amount);
  markFoodDispenseStart();  // 오거 돌리기 전 무게를 먼저 적어둔다
  foodMotorStopAt = millis() + runMs;
  runFoodMotor(FOOD_MOTOR_SPEED);

  Serial.print("[food] dispensing amount=");
  Serial.print(amount);
  Serial.print(" run_ms=");
  Serial.println(runMs);
}

// 물은 '몇 초 돌릴지'로 지시한다. 순환 구조라 ml 로 지시해봐야 의미가 없다.
inline void dispenseWaterSeconds(int seconds) {
  long safeSeconds = seconds < 1 ? 1 : seconds;
  unsigned long runMs = constrain(
    static_cast<unsigned long>(safeSeconds) * 1000UL,
    WATER_PUMP_MIN_RUN_MS,
    WATER_PUMP_MAX_RUN_MS
  );
  waterPumpStopAt = millis() + runMs;
  analogWrite(WATER_PUMP_GATE_PIN, WATER_PUMP_SPEED);

  Serial.print("[water] pumping seconds=");
  Serial.print(safeSeconds);
  Serial.print(" run_ms=");
  Serial.println(runMs);
}

inline void serviceActuators() {
  if (foodMotorStopAt != 0 && static_cast<long>(millis() - foodMotorStopAt) >= 0) {
    stopFoodMotor();
    foodMotorStopAt = 0;
    Serial.println("[food] motor stopped");
  }
  if (waterPumpStopAt != 0 && static_cast<long>(millis() - waterPumpStopAt) >= 0) {
    stopWaterPump();
    waterPumpStopAt = 0;
    Serial.println("[water] pump stopped");
  }
}
