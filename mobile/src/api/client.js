import AsyncStorage from "@react-native-async-storage/async-storage";
import { keys } from "../lib/storage";

const configured = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
export const API_BASE = (configured || "http://127.0.0.1:8000").replace(
  /\/$/,
  "",
);

async function request(path, options = {}) {
  const token = await AsyncStorage.getItem(keys.token);
  const isForm = options.body instanceof FormData;
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        ...(!isForm ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
    });
  } catch {
    throw new Error(`백엔드 서버에 연결할 수 없습니다.\n${API_BASE}`);
  }

  if (!response.ok) {
    const raw = await response.text();
    let message = raw || `API 오류 (${response.status})`;
    try {
      const parsed = JSON.parse(raw);
      message =
        parsed.detail?.message ||
        parsed.detail ||
        parsed.message ||
        message;
    } catch {
      // 원문 사용
    }
    throw new Error(
      typeof message === "string" ? message : JSON.stringify(message),
    );
  }
  if (response.status === 204) return null;
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

const json = (method, body) => ({
  method,
  body: body === undefined ? undefined : JSON.stringify(body),
});

function upload(path, asset) {
  const form = new FormData();
  form.append("file", {
    uri: asset.uri,
    name: asset.fileName || `upload-${Date.now()}.jpg`,
    type: asset.mimeType || "image/jpeg",
  });
  return request(path, { method: "POST", body: form });
}

export const mediaUrl = (path) => {
  if (!path) return "";
  if (/^(https?:|file:|data:)/i.test(path)) return path;
  return `${API_BASE}${path.startsWith("/") ? "" : "/"}${path}`;
};

export const api = {
  checkUsername: (username) =>
    request(`/api/auth/check-username?username=${encodeURIComponent(username)}`),
  login: (body) => request("/api/auth/login", json("POST", body)),
  signup: (body) => request("/api/auth/signup", json("POST", body)),
  getMe: () => request("/api/auth/me"),
  updateMe: (body) => request("/api/auth/me", json("PATCH", body)),
  uploadUserPhoto: (asset) => upload("/api/auth/me/photo", asset),
  setCredentials: (body) =>
    request("/api/auth/me/credentials", json("POST", body)),
  deleteMe: () => request("/api/auth/me", { method: "DELETE" }),

  getDashboard: () => request("/api/robot/dashboard"),
  getStatus: () => request("/api/robot/status"),
  moveRobot: (command) =>
    request("/api/robot/move", json("POST", { command })),
  moveCamera: (direction) =>
    request("/api/robot/camera", json("POST", { direction })),
  setAwayMode: (on) =>
    request("/api/robot/away-mode", json("POST", { on })),

  getStreamUrl: () => request("/api/stream/url"),
  getLatestDetections: () => request("/api/vision/detections/latest"),
  getVisionEvents: (limit = 20) =>
    request(`/api/vision/events/recent?limit=${limit}`),
  captureSnapshot: () => request("/api/vision/capture", { method: "POST" }),
  setVisionRecording: (on) =>
    request("/api/vision/recording", json("POST", { on })),

  dispenserFeed: (amount = 1) =>
    request("/api/dispenser/feed", json("POST", { amount })),
  dispenserWater: (amount = 1) =>
    request("/api/dispenser/water", json("POST", { amount })),
  createFeedLog: (body) =>
    request("/api/dispenser/feed-log", json("POST", body)),
  createWaterLog: (body) =>
    request("/api/dispenser/water-log", json("POST", body)),
  getDispenserLogs: (days = 400) =>
    request(`/api/dispenser/logs?days=${days}`),

  getAlerts: () => request("/api/alerts"),
  confirmAlert: (id) =>
    request(`/api/alerts/${id}/confirm`, { method: "PATCH" }),
  confirmAllAlerts: () =>
    request("/api/alerts/confirm-all", { method: "PATCH" }),
  deleteAlert: (id) => request(`/api/alerts/${id}`, { method: "DELETE" }),
  deleteAllAlerts: () => request("/api/alerts", { method: "DELETE" }),

  getPets: () => request("/api/pets"),
  createPet: (body) => request("/api/pets", json("POST", body)),
  updatePet: (id, body) =>
    request(`/api/pets/${id}`, json("PATCH", body)),
  uploadPetPhoto: (id, asset) => upload(`/api/pets/${id}/photo`, asset),
  deletePet: (id) => request(`/api/pets/${id}`, { method: "DELETE" }),
  createHealthReport: (id) =>
    request(`/api/pets/${id}/health-report`, { method: "POST" }),
  getHealthReports: (id) => request(`/api/pets/${id}/health-reports`),
  getLatestHealthReport: (id) =>
    request(`/api/pets/${id}/health-report/latest`),

  getSettings: () => request("/api/settings"),
  updateSettings: (body) =>
    request("/api/settings", json("PUT", body)),
  getNetworkStatus: () => request("/api/network/status"),
  scanPiWifi: () => request("/api/network/pi-wifi-scan"),
  configureSharedWifi: (body) =>
    request(
      "/api/network/shared-wifi",
      json("POST", {
        ssid: body.ssid,
        password: body.password,
        mqtt_host: body.mqttHost,
        mqtt_port: body.mqttPort || 1883,
        esp32_setup_url: body.esp32SetupUrl,
        pi_ap_fallback: body.piApFallback || false,
      }),
    ),
};
