#pragma once

#include <Arduino.h>

// L298N default wiring. Change these constants if your wiring is different.
constexpr uint8_t LEFT_MOTOR_PWM_PIN = 5;
constexpr uint8_t LEFT_MOTOR_IN1_PIN = 4;
constexpr uint8_t LEFT_MOTOR_IN2_PIN = 7;
constexpr uint8_t RIGHT_MOTOR_PWM_PIN = 6;
constexpr uint8_t RIGHT_MOTOR_IN1_PIN = 8;
constexpr uint8_t RIGHT_MOTOR_IN2_PIN = 12;
constexpr uint8_t MOTOR_SPEED = 190;

inline void stopMotors();

inline void driveLeft(int direction, uint8_t speed = MOTOR_SPEED) {
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

inline void driveRight(int direction, uint8_t speed = MOTOR_SPEED) {
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
  stopMotors();
}

inline void moveForward() {
  driveLeft(1);
  driveRight(1);
}

inline void moveBackward() {
  driveLeft(-1);
  driveRight(-1);
}

inline void turnLeft() {
  driveLeft(-1);
  driveRight(1);
}

inline void turnRight() {
  driveLeft(1);
  driveRight(-1);
}

inline void stopMotors() {
  driveLeft(0);
  driveRight(0);
}
