const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || defaultApiBaseUrl();
const API_BASE = API_BASE_URL.replace(/\/$/, "");
const STREAM_URL = import.meta.env.VITE_STREAM_URL?.trim();

function defaultApiBaseUrl() {
  const host = window.location.hostname;
  if (!host || host === "localhost" || host === "127.0.0.1") {
    return "http://127.0.0.1:8000/";
  }
  return `${window.location.protocol}//${host}:8000/`;
}

function resolveStreamUrl(url) {
  if (!url) return "";
  if (/^(https?:|data:|blob:)/i.test(url)) return url;
  if (url.startsWith("/")) return `${API_BASE}${url}`;
  return url;
}

async function request(path, options = {}) {
  const token = sessionStorage.getItem("aimyaong:token");
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
      ...options,
    });
  } catch {
    throw new Error(
      `백엔드 서버에 연결할 수 없습니다. ${API_BASE} 실행 상태를 확인하세요.`,
    );
  }

  if (!response.ok) {
    const message = await response.text();
    let errorMessage = message || `API error: ${response.status}`;
    try {
      const parsed = JSON.parse(message);
      errorMessage = extractErrorMessage(parsed) || errorMessage;
    } catch {
      /* keep raw message */
    }
    throw new Error(errorMessage);
  }

  return response.json();
}

function extractErrorMessage(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (value.detail) return extractErrorMessage(value.detail);
  if (typeof value.stderr === "string" && value.stderr.trim())
    return value.stderr.trim();
  if (typeof value.stdout === "string" && value.stdout.trim())
    return value.stdout.trim();
  if (Array.isArray(value.tried) && value.tried.length) {
    return value.tried
      .map((item) => `${item.baseUrl}: ${item.error}`)
      .join("\n");
  }
  if (typeof value.message === "string") return value.message;
  return "";
}

export const api = {
  getDashboard: () => request("/api/robot/dashboard"),
  getStatus: () => request("/api/robot/status"),
  getStreamUrl: async () => {
    try {
      const data = await request("/api/stream/url");
      return {
        ...data,
        url: resolveStreamUrl(data.url),
      };
    } catch (error) {
      if (STREAM_URL) {
        return { url: resolveStreamUrl(STREAM_URL), mode: "external" };
      }
      throw error;
    }
  },
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

  signup: ({ username, email, password, nickname, pets }) =>
    request("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({ username, email, password, nickname, pets }),
    }),

  login: ({ username, password }) =>
    request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),

  getMe: (token) =>
    request("/api/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
    }),
};
