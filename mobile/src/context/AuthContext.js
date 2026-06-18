import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { api } from "../api/client";
import { fromApiPet } from "../lib/pets";
import { clearSession, keys, readJson, writeJson } from "../lib/storage";

const AuthContext = createContext(null);

function accountFromUser(user = {}) {
  return {
    provider: user.oauth_provider || "email",
    user: {
      userId: user.username || "",
      email: user.email || "",
      nickname: user.nickname || "",
      photo: user.profile_photo_path || "",
    },
    pets: (user.pets || []).map(fromApiPet),
  };
}

export function AuthProvider({ children }) {
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(null);
  const [account, setAccount] = useState(null);

  const refreshAccount = useCallback(async () => {
    const me = await api.getMe();
    const next = accountFromUser(me);
    setAccount(next);
    await writeJson(keys.account, next);
    await writeJson(keys.user, me);
    return next;
  }, []);

  useEffect(() => {
    (async () => {
      const savedToken = await AsyncStorage.getItem(keys.token);
      const savedAccount = await readJson(keys.account);
      if (savedToken) {
        setToken(savedToken);
        setAccount(savedAccount);
        try {
          await refreshAccount();
        } catch {
          // 오프라인이면 마지막 계정 정보 유지
        }
      }
      setLoading(false);
    })();
  }, [refreshAccount]);

  const completeAuth = useCallback(async (result) => {
    await AsyncStorage.setItem(keys.token, result.access_token);
    await writeJson(keys.user, result.user);
    const next = accountFromUser(result.user);
    setToken(result.access_token);
    setAccount(next);
    await writeJson(keys.account, next);
    try {
      return await refreshAccount();
    } catch {
      return next;
    }
  }, [refreshAccount]);

  const login = useCallback(
    async (username, password) =>
      completeAuth(await api.login({ username, password })),
    [completeAuth],
  );

  const googleLogin = useCallback(
    async (profile) =>
      completeAuth(
        await api.googleAuth({
          email: profile.email,
          name: profile.name,
          oauth_id: profile.sub,
          picture: profile.picture,
          allow_create: false,
        }),
      ),
    [completeAuth],
  );

  const signup = useCallback(
    async (body) => completeAuth(await api.signup(body)),
    [completeAuth],
  );

  const logout = useCallback(async () => {
    await clearSession();
    setToken(null);
    setAccount(null);
  }, []);

  const removeAccount = useCallback(async () => {
    try {
      await api.deleteMe();
    } finally {
      await logout();
    }
  }, [logout]);

  const value = useMemo(
    () => ({
      loading,
      token,
      account,
      authenticated: Boolean(token),
      login,
      googleLogin,
      signup,
      logout,
      removeAccount,
      refreshAccount,
      setAccount,
    }),
    [
      loading,
      token,
      account,
      login,
      googleLogin,
      signup,
      logout,
      removeAccount,
      refreshAccount,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
