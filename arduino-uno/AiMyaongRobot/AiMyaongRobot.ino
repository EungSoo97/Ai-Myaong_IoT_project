#include "command_handler.h"
#include "motor_control.h"
#include "servo_control.h"

void setup() {
  Serial.begin(115200);
  setupMotors();
  setupServos();
}

void loop() {
  processIncomingCommands();
}
