import AsyncStorage from "@react-native-async-storage/async-storage";

export const keys = {
  token: "aimyaong:token",
  user: "aimyaong:user",
  account: "aimyaong:account",
  settings: "aimyaong:mobile-settings",
};

export async function readJson(key, fallback = null) {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export async function writeJson(key, value) {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export async function clearSession() {
  await AsyncStorage.multiRemove([keys.token, keys.user, keys.account]);
}
