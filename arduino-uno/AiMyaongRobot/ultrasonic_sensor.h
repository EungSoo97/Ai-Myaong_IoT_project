#pragma once

#include <Arduino.h>

constexpr uint8_t REAR_ULTRASONIC_TRIG_PIN = 11;
constexpr uint8_t REAR_ULTRASONIC_ECHO_PIN = 12;
constexpr unsigned long REAR_ULTRASONIC_SAMPLE_MS = 250;
constexpr unsigned long REAR_ULTRASONIC_REPORT_MS = 1000;
constexpr unsigned long REAR_OBSTACLE_REPORT_MS = 500;
constexpr unsigned long REAR_ULTRASONIC_TIMEOUT_US = 25000;
constexpr int REAR_OBSTACLE_ALERT_CM = 15;
constexpr int REAR_OBSTACLE_CLEAR_CM = 20;

namespace {
unsigned long lastRearUltrasonicSampleAt = 0;
unsigned long lastRearDistanceReportAt = 0;
unsigned long lastRearObstacleReportAt = 0;
int lastRearDistanceCm = -1;
bool rearObstacleActive = false;
}

inline void setupRearUltrasonicSensor() {
  pinMode(REAR_ULTRASONIC_TRIG_PIN, OUTPUT);
  pinMode(REAR_ULTRASONIC_ECHO_PIN, INPUT);
  digitalWrite(REAR_ULTRASONIC_TRIG_PIN, LOW);
}

inline int readRearDistanceCm() {
  digitalWrite(REAR_ULTRASONIC_TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(REAR_ULTRASONIC_TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(REAR_ULTRASONIC_TRIG_PIN, LOW);

  unsigned long duration = pulseIn(
    REAR_ULTRASONIC_ECHO_PIN,
    HIGH,
    REAR_ULTRASONIC_TIMEOUT_US
  );
  if (duration == 0) {
    return -1;
  }

  return static_cast<int>(duration / 58UL);
}

inline void printRearDistance(int distanceCm) {
  Serial.print("REAR_DISTANCE cm=");
  Serial.print(distanceCm);
  Serial.print(" obstacle=");
  Serial.println(rearObstacleActive ? 1 : 0);
}

inline void printRearObstacle(int distanceCm) {
  Serial.print("REAR_OBSTACLE cm=");
  Serial.println(distanceCm);
}

inline void serviceRearUltrasonicSensor() {
  const unsigned long now = millis();
  if (now - lastRearUltrasonicSampleAt < REAR_ULTRASONIC_SAMPLE_MS) {
    return;
  }
  lastRearUltrasonicSampleAt = now;

  const int distanceCm = readRearDistanceCm();
  if (distanceCm < 0) {
    return;
  }
  lastRearDistanceCm = distanceCm;

  if (distanceCm <= REAR_OBSTACLE_ALERT_CM) {
    rearObstacleActive = true;
  } else if (distanceCm >= REAR_OBSTACLE_CLEAR_CM) {
    rearObstacleActive = false;
  }

  if (now - lastRearDistanceReportAt >= REAR_ULTRASONIC_REPORT_MS) {
    lastRearDistanceReportAt = now;
    printRearDistance(lastRearDistanceCm);
  }

  if (
    rearObstacleActive &&
    now - lastRearObstacleReportAt >= REAR_OBSTACLE_REPORT_MS
  ) {
    lastRearObstacleReportAt = now;
    printRearObstacle(lastRearDistanceCm);
  }
}
