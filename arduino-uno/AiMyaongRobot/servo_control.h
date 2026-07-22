#pragma once

#include <Servo.h>

namespace {
Servo panServo;
Servo tiltServo;

constexpr uint8_t PAN_SERVO_PIN = 9;
constexpr uint8_t TILT_SERVO_PIN = 10;

constexpr int PAN_MIN_ANGLE = 20;
constexpr int PAN_MAX_ANGLE = 160;
constexpr int TILT_MIN_ANGLE = 40;
constexpr int TILT_MAX_ANGLE = 140;

constexpr int PAN_CENTER_ANGLE = 90;
constexpr int TILT_CENTER_ANGLE = 90;
// A held camera button updates the target in small chunks.  The actual servos
// are advanced independently from the serial command handler so new commands
// can be accepted while they are moving.
constexpr int SERVO_COMMAND_STEP = 4;
constexpr unsigned long SERVO_UPDATE_INTERVAL_MS = 15;

int currentPanAngle = PAN_CENTER_ANGLE;
int currentTiltAngle = TILT_CENTER_ANGLE;
int targetPanAngle = PAN_CENTER_ANGLE;
int targetTiltAngle = TILT_CENTER_ANGLE;
unsigned long lastServoUpdateMs = 0;

inline int clampAngle(int angle, int minAngle, int maxAngle) {
  if (angle < minAngle) {
    return minAngle;
  }

  if (angle > maxAngle) {
    return maxAngle;
  }

  return angle;
}

inline void writePanAngle(int angle) {
  targetPanAngle = clampAngle(angle, PAN_MIN_ANGLE, PAN_MAX_ANGLE);
}

inline void writeTiltAngle(int angle) {
  targetTiltAngle = clampAngle(angle, TILT_MIN_ANGLE, TILT_MAX_ANGLE);
}

inline void advanceServo(Servo& servo, int& currentAngle, int targetAngle) {
  if (currentAngle == targetAngle) {
    return;
  }

  currentAngle += (currentAngle < targetAngle) ? 1 : -1;
  servo.write(currentAngle);
}
}  // namespace

inline void cameraUp();
inline void cameraDown();
inline void cameraLeft();
inline void cameraRight();
inline void cameraCenter();
inline void cameraStop();
inline void serviceServos();

inline void setupServos() {
  panServo.attach(PAN_SERVO_PIN);
  tiltServo.attach(TILT_SERVO_PIN);
  panServo.write(currentPanAngle);
  tiltServo.write(currentTiltAngle);
  lastServoUpdateMs = millis();
}

inline void cameraUp() {
  writeTiltAngle(targetTiltAngle - SERVO_COMMAND_STEP);
}

inline void cameraDown() {
  writeTiltAngle(targetTiltAngle + SERVO_COMMAND_STEP);
}

inline void cameraLeft() {
  writePanAngle(targetPanAngle + SERVO_COMMAND_STEP);
}

inline void cameraRight() {
  writePanAngle(targetPanAngle - SERVO_COMMAND_STEP);
}

inline void cameraCenter() {
  writePanAngle(PAN_CENTER_ANGLE);
  writeTiltAngle(TILT_CENTER_ANGLE);
}

inline void cameraStop() {
  // Discard any target accumulated while a direction button was held.
  targetPanAngle = currentPanAngle;
  targetTiltAngle = currentTiltAngle;
}

inline void serviceServos() {
  const unsigned long now = millis();
  if (now - lastServoUpdateMs < SERVO_UPDATE_INTERVAL_MS) {
    return;
  }

  lastServoUpdateMs = now;
  advanceServo(panServo, currentPanAngle, targetPanAngle);
  advanceServo(tiltServo, currentTiltAngle, targetTiltAngle);
}
