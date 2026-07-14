#pragma once

#include <Arduino.h>
#include <PubSubClient.h>
#include <WiFi.h>

#include "loadcell_control.h"
#include "motor_control.h"
#include "water_pump_control.h"

// Leave SSID/PASSWORD empty to let ESP32 reuse credentials already saved by WiFi.begin().
constexpr const char* WIFI_SSID = "";
constexpr const char* WIFI_PASSWORD = "";
constexpr const char* MQTT_HOST = "raspberrypi.local";
constexpr uint16_t MQTT_PORT = 1883;
constexpr unsigned long WIFI_RECONNECT_INTERVAL_MS = 10000;
constexpr unsigned long MQTT_RECONNECT_INTERVAL_MS = 5000;
constexpr unsigned long MQTT_WEIGHT_INTERVAL_MS = 3000;

WiFiClient mqttWifiClient;
PubSubClient mqttClient(mqttWifiClient);
unsigned long lastWifiAttemptMs = 0;
unsigned long lastMqttAttemptMs = 0;
unsigned long lastMqttWeightPublishMs = 0;

String mqttJsonEscape(const String& value) {
  String escaped;
  escaped.reserve(value.length() + 8);
  for (size_t i = 0; i < value.length(); i += 1) {
    char c = value[i];
    if (c == '"' || c == '\\') {
      escaped += '\\';
      escaped += c;
    } else if (c == '\n') {
      escaped += "\\n";
    } else if (c == '\r') {
      escaped += "\\r";
    } else {
      escaped += c;
    }
  }
  return escaped;
}

int mqttExtractAmount(const String& payload) {
  int amountIndex = payload.indexOf("\"amount\"");
  if (amountIndex >= 0) {
    int colonIndex = payload.indexOf(':', amountIndex);
    if (colonIndex >= 0) {
      int start = colonIndex + 1;
      while (start < payload.length() && !isDigit(payload[start]) && payload[start] != '-') {
        start += 1;
      }

      int end = start;
      while (end < payload.length() && (isDigit(payload[end]) || payload[end] == '-')) {
        end += 1;
      }

      long amount = payload.substring(start, end).toInt();
      return amount < 1 ? 1 : static_cast<int>(amount);
    }
  }

  long plainAmount = payload.toInt();
  return plainAmount < 1 ? 1 : static_cast<int>(plainAmount);
}

float mqttReadUnitsOrZero(HX711& scale) {
  return scale.is_ready() ? scale.get_units(1) : 0.0f;
}

long mqttReadCountOrZero(HX711& scale) {
  return scale.is_ready() ? scale.get_value(1) : 0;
}

void publishDispenserStatus(const char* state) {
  if (!mqttClient.connected()) {
    return;
  }

  String payload = "{\"state\":\"";
  payload += state;
  payload += "\",\"ip\":\"";
  payload += WiFi.localIP().toString();
  payload += "\",\"ssid\":\"";
  payload += mqttJsonEscape(WiFi.SSID());
  payload += "\",\"mqttHost\":\"";
  payload += MQTT_HOST;
  payload += "\"}";
  mqttClient.publish("dispenser/status", payload.c_str(), true);
}

void publishDispenserWeight() {
  if (!mqttClient.connected()) {
    return;
  }

  String payload = "{\"food_g\":";
  payload += String(mqttReadUnitsOrZero(loadCell1), 1);
  payload += ",\"water_g\":";
  payload += String(mqttReadUnitsOrZero(loadCell2), 1);
  payload += ",\"food_count\":";
  payload += String(mqttReadCountOrZero(loadCell1));
  payload += ",\"water_count\":";
  payload += String(mqttReadCountOrZero(loadCell2));
  payload += ",\"ip\":\"";
  payload += WiFi.localIP().toString();
  payload += "\"}";
  mqttClient.publish("dispenser/weight", payload.c_str(), false);
}

void handleDispenserMqttMessage(const String& topic, const String& payload) {
  int amount = mqttExtractAmount(payload);

  if (topic == "dispenser/feed") {
    dispenseFoodAmount(amount);
    publishDispenserStatus("feed_running");
  } else if (topic == "dispenser/water") {
    dispenseWaterAmount(amount);
    publishDispenserStatus("water_running");
  } else if (topic == "dispenser/pump/off") {
    stopWaterPump();
    publishDispenserStatus("water_stopped");
  } else if (topic == "dispenser/pump/speed") {
    setWaterPumpSpeed(amount);
    publishDispenserStatus("water_speed_set");
  } else if (topic == "dispenser/tare") {
    tareLoadCell();
    publishDispenserStatus("tare_done");
    publishDispenserWeight();
  } else if (topic == "dispenser/weight/request") {
    publishDispenserWeight();
  }
}

void connectWifiIfNeeded() {
  if (WiFi.status() == WL_CONNECTED) {
    return;
  }

  unsigned long now = millis();
  if (now - lastWifiAttemptMs < WIFI_RECONNECT_INTERVAL_MS) {
    return;
  }
  lastWifiAttemptMs = now;

  Serial.println("[wifi] connecting...");
  WiFi.mode(WIFI_STA);
  if (String(WIFI_SSID).length() > 0) {
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  } else {
    WiFi.begin();
  }
}

void connectMqttIfNeeded() {
  if (WiFi.status() != WL_CONNECTED || mqttClient.connected()) {
    return;
  }

  unsigned long now = millis();
  if (now - lastMqttAttemptMs < MQTT_RECONNECT_INTERVAL_MS) {
    return;
  }
  lastMqttAttemptMs = now;

  Serial.print("[mqtt] connecting ");
  Serial.print(MQTT_HOST);
  Serial.print(":");
  Serial.println(MQTT_PORT);

  String clientId = "aimyaong-main-" + String((uint32_t)ESP.getEfuseMac(), HEX);
  if (!mqttClient.connect(clientId.c_str())) {
    Serial.print("[mqtt] connect failed state=");
    Serial.println(mqttClient.state());
    return;
  }

  mqttClient.subscribe("dispenser/feed");
  mqttClient.subscribe("dispenser/water");
  mqttClient.subscribe("dispenser/pump/off");
  mqttClient.subscribe("dispenser/pump/speed");
  mqttClient.subscribe("dispenser/tare");
  mqttClient.subscribe("dispenser/weight/request");
  publishDispenserStatus("online");
  publishDispenserWeight();
  Serial.println("[mqtt] connected and subscribed");
}

void setupMqttControl() {
  mqttClient.setServer(MQTT_HOST, MQTT_PORT);
  mqttClient.setCallback([](char* topic, byte* payload, unsigned int length) {
    String body;
    body.reserve(length);
    for (unsigned int i = 0; i < length; i += 1) {
      body += static_cast<char>(payload[i]);
    }
    handleDispenserMqttMessage(String(topic), body);
  });

  connectWifiIfNeeded();
}

void loopMqttControl() {
  connectWifiIfNeeded();
  connectMqttIfNeeded();

  if (mqttClient.connected()) {
    mqttClient.loop();

    unsigned long now = millis();
    if (now - lastMqttWeightPublishMs >= MQTT_WEIGHT_INTERVAL_MS) {
      lastMqttWeightPublishMs = now;
      publishDispenserWeight();
    }
  }
}
