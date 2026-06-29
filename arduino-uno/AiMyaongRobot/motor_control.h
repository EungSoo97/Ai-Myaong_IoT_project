#pragma once

#include <Arduino.h>

// TB6612FNG wiring grouped on Arduino Uno D2-D8 for easier jumper routing.
constexpr uint8_t LEFT_MOTOR_IN1_PIN = 2;   // AIN1
constexpr uint8_t LEFT_MOTOR_IN2_PIN = 3;   // AIN2
constexpr uint8_t RIGHT_MOTOR_IN1_PIN = 4;  // BIN1
constexpr uint8_t LEFT_MOTOR_PWM_PIN = 5;   // PWMA
constexpr uint8_t RIGHT_MOTOR_PWM_PIN = 6;  // PWMB
constexpr uint8_t RIGHT_MOTOR_IN2_PIN = 7;  // BIN2
constexpr uint8_t MOTOR_STANDBY_PIN = 8;    // STBY
// Kick briefly at full PWM, then run lower to reduce current draw.
constexpr uint8_t MOTOR_RUN_SPEED = 120;
constexpr uint8_t MOTOR_START_SPEED = 160;
constexpr uint8_t MOTOR_START_KICK_MS = 50;
constexpr unsigned long MOTOR_COMMAND_TIMEOUT_MS = 700;

namespace {
unsigned long lastMotorCommandAt = 0;
bool motorSafetyActive = false;
}

inline void stopMotors();

inline void enableMotorDriver() {
  digitalWrite(MOTOR_STANDBY_PIN, HIGH);
}

inline void markMotorCommandActive() {
  lastMotorCommandAt = millis();
  motorSafetyActive = true;
}

inline void driveLeft(int direction, uint8_t speed = MOTOR_RUN_SPEED) {
  enableMotorDriver();

  if (direction > 0) {
    digitalWrite(LEFT_MOTOR_IN1_PIN, HIGH);
    digitalWrite(LEFT_MOTOR_IN2_PIN, LOW);
  } else if (direction < 0) {
    digitalWrite(LEFT_MOTOR_IN1_PIN, LOW);
    digitalWrite(LEFT_MOTOR_IN2_PIN, HIGH);
  } else {
    digitalWrite(LEFT_MOTOR_IN1_PIN, LOW);
    digitalWrite(LEFT_MOTOR_IN2_PIN, LOW);
    speed = 0;
  }

  analogWrite(LEFT_MOTOR_PWM_PIN, speed);
}

inline void driveRight(int direction, uint8_t speed = MOTOR_RUN_SPEED) {
  enableMotorDriver();

  if (direction > 0) {
    digitalWrite(RIGHT_MOTOR_IN1_PIN, HIGH);
    digitalWrite(RIGHT_MOTOR_IN2_PIN, LOW);
  } else if (direction < 0) {
    digitalWrite(RIGHT_MOTOR_IN1_PIN, LOW);
    digitalWrite(RIGHT_MOTOR_IN2_PIN, HIGH);
  } else {
    digitalWrite(RIGHT_MOTOR_IN1_PIN, LOW);
    digitalWrite(RIGHT_MOTOR_IN2_PIN, LOW);
    speed = 0;
  }

  analogWrite(RIGHT_MOTOR_PWM_PIN, speed);
}

inline void setupMotors() {
  pinMode(LEFT_MOTOR_PWM_PIN, OUTPUT);
  pinMode(LEFT_MOTOR_IN1_PIN, OUTPUT);
  pinMode(LEFT_MOTOR_IN2_PIN, OUTPUT);
  pinMode(RIGHT_MOTOR_PWM_PIN, OUTPUT);
  pinMode(RIGHT_MOTOR_IN1_PIN, OUTPUT);
  pinMode(RIGHT_MOTOR_IN2_PIN, OUTPUT);
  pinMode(MOTOR_STANDBY_PIN, OUTPUT);
  enableMotorDriver();
  stopMotors();
}

inline void printMotorPinout() {
  Serial.println("TB6612FNG pinout:");
  Serial.println("  AIN1 -> D2");
  Serial.println("  AIN2 -> D3");
  Serial.println("  BIN1 -> D4");
  Serial.println("  PWMA -> D5");
  Serial.println("  PWMB -> D6");
  Serial.println("  BIN2 -> D7");
  Serial.println("  STBY -> D8");
  Serial.println("Pan servo -> D9");
  Serial.println("Tilt servo -> D10");
  Serial.println("Rear ultrasonic TRIG -> D11");
  Serial.println("Rear ultrasonic ECHO -> D12");
}

inline void driveWithKick(int leftDirection, int rightDirection) {
  if (leftDirection != 0 || rightDirection != 0) {
    markMotorCommandActive();
  }

  driveLeft(leftDirection, MOTOR_START_SPEED);
  driveRight(rightDirection, MOTOR_START_SPEED);
  delay(MOTOR_START_KICK_MS);
  driveLeft(leftDirection, MOTOR_RUN_SPEED);
  driveRight(rightDirection, MOTOR_RUN_SPEED);
}

inline void moveForward() {
  driveWithKick(1, 1);
}

inline void moveBackward() {
  driveWithKick(-1, -1);
}

inline void turnLeft() {
  driveWithKick(0, 1);
}

inline void turnRight() {
  driveWithKick(1, 0);
}

inline void testLeftMotor() {
  driveLeft(1, MOTOR_START_SPEED);
  delay(800);
  driveLeft(0);
}

inline void testRightMotor() {
  driveRight(1, MOTOR_START_SPEED);
  delay(800);
  driveRight(0);
}

inline void diagnoseMotors() {
  printMotorPinout();

  Serial.println("DIAG STBY HIGH");
  enableMotorDriver();
  delay(300);

  Serial.println("DIAG LEFT FORWARD");
  driveLeft(1, MOTOR_START_SPEED);
  delay(1200);
  driveLeft(0);
  delay(500);

  Serial.println("DIAG LEFT BACKWARD");
  driveLeft(-1, MOTOR_START_SPEED);
  delay(1200);
  driveLeft(0);
  delay(500);

  Serial.println("DIAG RIGHT FORWARD");
  driveRight(1, MOTOR_START_SPEED);
  delay(1200);
  driveRight(0);
  delay(500);

  Serial.println("DIAG RIGHT BACKWARD");
  driveRight(-1, MOTOR_START_SPEED);
  delay(1200);
  driveRight(0);
  delay(500);

  stopMotors();
  Serial.println("DIAG DONE");
}

inline void testMotors() {
  testLeftMotor();
  delay(300);
  testRightMotor();
  delay(300);

  moveForward();
  delay(800);
  stopMotors();
}

inline void stopMotors() {
  driveLeft(0);
  driveRight(0);
  motorSafetyActive = false;
}

inline void serviceMotorSafety() {
  if (!motorSafetyActive) {
    return;
  }

  if (millis() - lastMotorCommandAt >= MOTOR_COMMAND_TIMEOUT_MS) {
    stopMotors();
    Serial.println("AUTO STOP motor command timeout");
  }
}
