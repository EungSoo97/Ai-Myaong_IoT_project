#pragma once

#include "motor_control.h"
#include "servo_control.h"

inline bool handleCommand(const String& command) {
  if (command == "FORWARD") {
    moveForward();
  } else if (command == "BACKWARD") {
    moveBackward();
  } else if (command == "LEFT") {
    turnLeft();
  } else if (command == "RIGHT") {
    turnRight();
  } else if (command == "STOP") {
    stopMotors();
  } else if (command == "CAM_UP") {
    cameraUp();
  } else if (command == "CAM_DOWN") {
    cameraDown();
  } else if (command == "CAM_LEFT") {
    cameraLeft();
  } else if (command == "CAM_RIGHT") {
    cameraRight();
  } else if (command == "CAM_CENTER") {
    cameraCenter();
  } else {
    return false;
  }

  return true;
}

inline void processIncomingCommands() {
  if (!Serial.available()) {
    return;
  }

  String command = Serial.readStringUntil('\n');
  command.trim();

  if (command.length() == 0) {
    return;
  }

  Serial.print("RX ");
  Serial.println(command);

  if (handleCommand(command)) {
    Serial.print("ACK ");
    Serial.println(command);
  } else {
    Serial.print("UNKNOWN ");
    Serial.println(command);
  }
}
