const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://10.1.82.109:8000/";

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!response.ok) {
    const message = await response.text();
    let errorMessage = message || `API error: ${response.status}`;
    try {
      const parsed = JSON.parse(message);
      if (typeof parsed.detail === "string") errorMessage = parsed.detail;
      else if (parsed.detail?.message) errorMessage = parsed.detail.message;
    } catch {
      /* keep raw message */
    }
    throw new Error(errorMessage);
  }

  return response.json();
}

export const api = {
  getDashboard: () => request("/api/robot/dashboard"),
  getStatus: () => request("/api/robot/status"),
  getStreamUrl: () => request("/api/stream/url"),
  moveRobot: (command) =>
    request("/api/robot/move", {
      method: "POST",
      body: JSON.stringify({ command }),
    }),
  moveCamera: (direction) =>
    request("/api/robot/camera", {
      method: "POST",
      body: JSON.stringify({ direction }),
    }),
  dispenserFeed: (amount = 1) =>
    request("/api/dispenser/feed", {
      method: "POST",
      body: JSON.stringify({ amount }),
    }),
  dispenserWater: (amount = 1) =>
    request("/api/dispenser/water", {
      method: "POST",
      body: JSON.stringify({ amount }),
    }),
  getNetworkStatus: () => request("/api/network/status"),
  scanPiWifi: () => request("/api/network/pi-wifi-scan"),
  configurePiWifi: ({
    ssid,
    password,
    mqttHost,
    mqttPort = 1883,
    esp32SetupUrl,
    piApFallback = false,
  }) =>
    request("/api/network/pi-wifi-connect", {
      method: "POST",
      body: JSON.stringify({
        ssid,
        password,
        mqtt_host: mqttHost,
        mqtt_port: mqttPort,
        esp32_setup_url: esp32SetupUrl,
        pi_ap_fallback: piApFallback,
      }),
    }),
  configureSharedWifi: ({
    ssid,
    password,
    mqttHost,
    mqttPort = 1883,
    esp32SetupUrl,
    piApFallback = false,
  }) =>
    request("/api/network/shared-wifi", {
      method: "POST",
      body: JSON.stringify({
        ssid,
        password,
        mqtt_host: mqttHost,
        mqtt_port: mqttPort,
        esp32_setup_url: esp32SetupUrl,
        pi_ap_fallback: piApFallback,
      }),
    }),
};
