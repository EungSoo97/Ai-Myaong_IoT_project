import { useEffect, useState } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from "react-router-dom";
import { PublicLayout, PrivateLayout } from "./components/Layout";
import { Splash } from "./pages/Splash";
import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { RobotVision } from "./pages/RobotVision";
import { Dispenser } from "./pages/Dispenser";
import { Settings } from "./pages/Settings";
import { MyPage } from "./pages/MyPage";

const AUTH_KEY = "aimyaong:auth";

function App() {
  const [authenticated, setAuthenticated] = useState(() => {
    try {
      return sessionStorage.getItem(AUTH_KEY) === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      if (authenticated) sessionStorage.setItem(AUTH_KEY, "1");
      else sessionStorage.removeItem(AUTH_KEY);
    } catch {
      /* ignore */
    }
  }, [authenticated]);

  return (
    <BrowserRouter>
      <Routes>
        {/* Public: Splash / Login - 하단 탭 바 없음 */}
        <Route element={<PublicLayout />}>
          <Route path="/splash" element={<Splash />} />
          <Route
            path="/login"
            element={
              authenticated ?
                <Navigate to="/" replace />
              : <LoginRoute onLogin={() => setAuthenticated(true)} />
            }
          />
        </Route>

        {/* Private: 메인 5개 탭 - 하단 탭 바 포함 */}
        <Route
          element={
            authenticated ?
              <PrivateLayout />
            : <Navigate to="/splash" replace />
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="vision" element={<RobotVision />} />
          <Route path="dispenser" element={<Dispenser />} />
          <Route path="settings" element={<Settings />} />
          <Route path="mypage" element={<MyPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/splash" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

function LoginRoute({ onLogin }) {
  const navigate = useNavigate();
  return (
    <Login
      onLogin={() => {
        onLogin();
        navigate("/", { replace: true });
      }}
    />
  );
}

export default App;
