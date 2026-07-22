#include "command_handler.h"
#include "motor_control.h"
#include "servo_control.h"
#include "ultrasonic_sensor.h"

void setup() {
  Serial.begin(115200);
  Serial.setTimeout(50);
  setupMotors();
  setupServos();
  setupRearUltrasonicSensor();
  Serial.println("AiMyaongRobot ready");
}

void loop() {
  processIncomingCommands();
  serviceServos();
  serviceMotorSafety();
  serviceRearUltrasonicSensor();
}
