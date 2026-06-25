import AsyncStorage from "@react-native-async-storage/async-storage";
import { keys } from "../lib/storage";

const configured = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
export const API_BASE = (configured || "http://127.0.0.1:8000").replace(
  /\/$/,
  "",
);
const STREAM_URL = process.env.EXPO_PUBLIC_STREAM_URL?.trim();

function extractErrorMessage(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (value.detail) return extractErrorMessage(value.detail);
  if (typeof value.stderr === "string" && value.stderr.trim()) {
    return value.stderr.trim();
  }
  if (typeof value.stdout === "string" && value.stdout.trim()) {
    return value.stdout.trim();
  }
  if (Array.isArray(value.tried) && value.tried.length) {
    return value.tried
      .map((item) => `${item.baseUrl}: ${item.error}`)
      .join("\n");
  }
  if (typeof value.message === "string") return value.message;
  return "";
}

async function request(path, options = {}) {
  const token = await AsyncStorage.getItem(keys.token);
  const isForm =
    typeof FormData !== "undefined" && options.body instanceof FormData;
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
      message = extractErrorMessage(parsed) || message;
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

function resolveStreamUrl(path) {
  if (!path) return "";
  if (/^(https?:|file:|data:|blob:)/i.test(path)) return path;
  if (path.startsWith("/")) return `${API_BASE}${path}`;
  return path;
}

function proxiedStreamUrl(data) {
  const resolved = resolveStreamUrl(data?.url);
  if (!resolved) return "";
  if (data?.mode === "external" && /^https?:/i.test(resolved)) {
    return `${API_BASE}/api/stream/live.mjpg`;
  }
  return resolved;
}

export const mediaUrl = (path) => {
  if (!path) return "";
  if (/^(https?:|file:|data:|blob:)/i.test(path)) return path;
  return `${API_BASE}${path.startsWith("/") ? "" : "/"}${path}`;
};

export const resolveMediaUrl = mediaUrl;

export const api = {
  checkUsername: (username) =>
    request(`/api/auth/check-username?username=${encodeURIComponent(username)}`),
  login: (body) => request("/api/auth/login", json("POST", body)),
  googleAuth: ({ email, name, oauth_id, picture, allow_create = true }) =>
    request(
      "/api/auth/google",
      json("POST", { email, name, oauth_id, picture, allow_create }),
    ),
  signup: ({ username, email, password, nickname, pets }) =>
    request(
      "/api/auth/signup",
      json("POST", { username, email, password, nickname, pets }),
    ),
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
  voiceCall: () => request("/api/robot/voice-call", { method: "POST" }),

  getStreamUrl: async () => {
    try {
      const data = await request("/api/stream/url");
      return { ...data, url: proxiedStreamUrl(data) };
    } catch (error) {
      if (STREAM_URL) {
        return { url: resolveStreamUrl(STREAM_URL), mode: "external" };
      }
      throw error;
    }
  },
  getLatestDetections: () => request("/api/vision/detections/latest"),
  getActivityStats: (period = "day") =>
    request(`/api/vision/activity/stats?period=${encodeURIComponent(period)}`),
  getVisionEvents: (limit = 20) =>
    request(`/api/vision/events/recent?limit=${encodeURIComponent(limit)}`),
  getVisionMediaUrl: (path) =>
    `${API_BASE}/api/vision/media?path=${encodeURIComponent(path)}`,
  revealVisionMedia: (path) =>
    request("/api/vision/reveal", json("POST", { path })),
  requestVisionCapture: () =>
    request("/api/vision/capture", { method: "POST" }),
  captureSnapshot: async () => {
    const data = await request("/api/vision/capture", { method: "POST" });
    request("/api/robot/capture", { method: "POST" }).catch((error) => {
      console.error("[api] robot capture command failed:", error);
    });
    return data;
  },
  setVisionRecording: (on) =>
    request("/api/vision/recording", json("POST", { on })),
  setVisionEmergency: (on) =>
    request("/api/vision/emergency", json("POST", { on })),
  getClipUrl: async (clipId) => {
    const data = await request(`/api/clips/${clipId}`);
    return resolveStreamUrl(data.url || data.storage_path || "");
  },

  dispenserFeed: (amount = 1) =>
    request("/api/dispenser/feed", json("POST", { amount })),
  dispenserWater: (amount = 1) =>
    request("/api/dispenser/water", json("POST", { amount })),
  createFeedLog: ({ amount_g, feed_type = "manual", pet_id } = {}) =>
    request(
      "/api/dispenser/feed-log",
      json("POST", { amount_g, feed_type, pet_id }),
    ),
  createWaterLog: ({ amount_ml, water_type = "manual", pet_id } = {}) =>
    request(
      "/api/dispenser/water-log",
      json("POST", { amount_ml, water_type, pet_id }),
    ),
  getDispenserLogs: (days = 400) =>
    request(`/api/dispenser/logs?days=${days}`),

  getAlerts: () => request("/api/alerts"),
  createAlert: ({ alert_type, message }) =>
    request("/api/alerts", json("POST", { alert_type, message })),
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
  updatePetApi: (id, body) =>
    request(`/api/pets/${id}`, json("PATCH", body)),
  uploadPetPhoto: (id, asset) => upload(`/api/pets/${id}/photo`, asset),
  deletePet: (id) => request(`/api/pets/${id}`, { method: "DELETE" }),
  deletePetApi: (id) => request(`/api/pets/${id}`, { method: "DELETE" }),
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
  configurePiWifi: (body) =>
    request(
      "/api/network/pi-wifi-connect",
      json("POST", {
        ssid: body.ssid,
        password: body.password,
        mqtt_host: body.mqttHost,
        mqtt_port: body.mqttPort || 1883,
        esp32_setup_url: body.esp32SetupUrl,
        pi_ap_fallback: body.piApFallback || false,
      }),
    ),
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
