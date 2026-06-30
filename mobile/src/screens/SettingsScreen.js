import { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Switch, Text, View } from "react-native";
import {
  Bell,
  Check,
  ChevronRight,
  Cpu,
  Info,
  Lock,
  Moon,
  Power,
  RefreshCw,
  Wifi,
} from "lucide-react-native";
import { api } from "../api/client";
import {
  Button,
  FeltCard,
  FeltMark,
  Field,
  Header,
  Pill,
  Screen,
} from "../components/ui";
import { colors } from "../theme";

export function SettingsScreen({ navigation }) {
  const [settings, setSettings] = useState({
    push_enabled: "Y",
    motion_alert: "Y",
    stranger_alert: "Y",
    feed_alert: "N",
    robot_serial: "",
    mqtt_host: "",
    esp32_setup_url:
      process.env.EXPO_PUBLIC_ESP32_SETUP_URL || "http://192.168.4.1",
  });
  const [networks, setNetworks] = useState([]);
  const [ssid, setSsid] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    api.getSettings().then((data) => setSettings((x) => ({ ...x, ...data }))).catch(() => {});
  }, []);
  const patch = async (key, value) => {
    const next = { ...settings, [key]: value };
    setSettings(next);
    try {
      await api.updateSettings({ [key]: value });
    } catch {}
  };
  const scan = async () => {
    setBusy(true);
    try {
      const data = await api.scanPiWifi();
      setNetworks(data.networks || []);
    } catch (e) {
      Alert.alert("Wi-Fi 검색 실패", e.message);
    } finally {
      setBusy(false);
    }
  };
  const connect = async () => {
    if (!ssid) return Alert.alert("Wi-Fi 선택", "연결할 네트워크를 선택해 주세요.");
    setBusy(true);
    try {
      await api.configureSharedWifi({
        ssid,
        password,
        mqttHost: settings.mqtt_host,
        esp32SetupUrl: settings.esp32_setup_url,
      });
      Alert.alert("설정 완료", `${ssid} 연결 정보를 기기에 전달했습니다.`);
    } catch (e) {
      Alert.alert("설정 실패", e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Screen>
      <Header title="설정" subtitle="기기와 알림을 관리해요" onBack={navigation.goBack} />

      <Text style={styles.sectionTitle}>네트워크</Text>
      <FeltCard highlight accent contentStyle={styles.networkStatus}>
        <FeltMark
          style={[
            styles.statusIcon,
            ssid ? styles.statusIconOn : styles.statusIconWarn,
          ]}
        >
          <Wifi size={21} color={ssid ? colors.success : "#8B641C"} />
        </FeltMark>
        <View style={{ flex: 1 }}>
          <Text style={styles.statusTitle}>
            {ssid || "연결된 Wi-Fi 없음"}
          </Text>
          <Text style={styles.statusDesc}>
            {ssid
              ? `MQTT ${settings.mqtt_host || "자동"} · 설정 대기`
              : "아래에서 네트워크를 선택해 연결하세요"}
          </Text>
        </View>
        <Pill tone={ssid ? "success" : "warning"}>
          {ssid ? "선택됨" : "설정 모드"}
        </Pill>
      </FeltCard>

      <View style={styles.titleRow}>
        <Text style={styles.subTitle}>사용 가능한 Wi-Fi</Text>
        <Pressable onPress={scan} style={styles.scanButton}>
          <RefreshCw
            size={15}
            color={colors.primaryDark}
            style={busy ? { transform: [{ rotate: "24deg" }] } : null}
          />
          <Text style={styles.scanText}>{busy ? "검색 중" : "검색"}</Text>
        </Pressable>
      </View>
      <FeltCard contentStyle={styles.compactCard}>
        {networks.map((network, index) => {
          const name = network.ssid || network.name;
          return (
            <Pressable
              key={`${name}-${index}`}
              onPress={() => setSsid(name)}
              style={[styles.network, ssid === name && styles.networkActive]}
            >
              <SignalBars rssi={network.rssi} />
              <View style={{ flex: 1 }}>
                <Text style={styles.networkName}>{name || "숨겨진 네트워크"}</Text>
                {ssid === name ? <Text style={styles.connectedText}>선택됨</Text> : null}
              </View>
              {network.secure ? <Lock size={16} color={colors.muted} /> : null}
              <ChevronRight size={17} color={colors.muted} />
            </Pressable>
          );
        })}
        {!networks.length ? (
          <Pressable onPress={scan}>
            <Text style={styles.empty}>
              {busy ? "주변 Wi-Fi를 검색하는 중..." : "검색을 눌러 주변 Wi-Fi를 찾아보세요."}
            </Text>
          </Pressable>
        ) : null}
      </FeltCard>
      {ssid ? (
        <FeltCard style={styles.passwordCard} contentStyle={{ padding: 16 }}>
          <Field
            label={`${ssid} 비밀번호`}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          <Button title="라즈베리파이 + ESP32 같이 적용" onPress={connect} loading={busy} style={styles.gap} />
        </FeltCard>
      ) : null}

      <Text style={styles.sectionTitle}>알림 제어</Text>
      <FeltCard contentStyle={styles.compactCard}>
        <Toggle
          highlight
          icon={<Bell size={20} color={colors.primary} />}
          label="푸시 알림"
          desc="모든 푸시 알림 전역 On/Off"
          value={settings.push_enabled !== "N"}
          onChange={(v) => patch("push_enabled", v ? "Y" : "N")}
        />
        <Toggle label="이상 행동 감지" desc="비정상 패턴 감지 시 알림" value={settings.motion_alert !== "N"} onChange={(v) => patch("motion_alert", v ? "Y" : "N")} />
        <Toggle label="외부인 감지" desc="등록되지 않은 사람 알림" value={settings.stranger_alert !== "N"} onChange={(v) => patch("stranger_alert", v ? "Y" : "N")} />
        <Toggle label="배식 완료 알림" desc="자동 배식이 끝났을 때" value={settings.feed_alert === "Y"} onChange={(v) => patch("feed_alert", v ? "Y" : "N")} />
      </FeltCard>

      <Text style={styles.sectionTitle}>화면 테마</Text>
      <FeltCard contentStyle={styles.themeCard}>
        <FeltMark>
          <Moon size={20} color={colors.primary} />
        </FeltMark>
        <View style={{ flex: 1 }}>
          <Text style={styles.toggleText}>테마</Text>
          <Text style={styles.toggleDesc}>라이트 · 다크</Text>
        </View>
        <Pill tone="neutral">시스템</Pill>
      </FeltCard>

      <Text style={styles.sectionTitle}>기기 제어</Text>
      <FeltCard contentStyle={{ padding: 16 }}>
        <Field
          label="로봇 시리얼 번호"
          value={settings.robot_serial || ""}
          onChangeText={(v) => setSettings((x) => ({ ...x, robot_serial: v }))}
          onEndEditing={() => patch("robot_serial", settings.robot_serial)}
          icon={<Cpu size={18} color={colors.muted} />}
          placeholder="ROBOT-XXXX"
        />
        <Field
          style={styles.gap}
          label="MQTT 호스트"
          value={settings.mqtt_host || ""}
          onChangeText={(v) => setSettings((x) => ({ ...x, mqtt_host: v }))}
          onEndEditing={() => patch("mqtt_host", settings.mqtt_host)}
          placeholder="192.168.0.10"
        />
        <Field
          style={styles.gap}
          label="ESP32 설정 주소"
          value={settings.esp32_setup_url || ""}
          onChangeText={(v) => setSettings((x) => ({ ...x, esp32_setup_url: v }))}
          onEndEditing={() => patch("esp32_setup_url", settings.esp32_setup_url)}
          placeholder="http://192.168.4.1"
        />
        <View style={styles.deviceButtons}>
          <DeviceButton
            icon={<RefreshCw size={20} color={colors.primary} />}
            label="재부팅"
            disabled={!settings.robot_serial}
          />
          <DeviceButton
            icon={<Power size={20} color={colors.danger} />}
            label="전원 Off"
            disabled={!settings.robot_serial}
          />
        </View>
        {!settings.robot_serial ? (
          <Text style={styles.deviceHint}>
            기기를 먼저 등록하면 재부팅·전원 제어를 사용할 수 있어요.
          </Text>
        ) : null}
      </FeltCard>

      <FeltCard style={styles.appInfoCard} contentStyle={styles.infoRow}>
        <FeltMark>
          <Info size={20} color={colors.muted} />
        </FeltMark>
        <Text style={styles.infoText}>앱 정보 · 버전 1.0.0</Text>
        <ChevronRight size={17} color={colors.muted} />
      </FeltCard>
    </Screen>
  );
}

function Toggle({ label, desc, value, onChange, icon, highlight }) {
  return (
    <View style={[styles.toggle, highlight && styles.toggleHighlight]}>
      {icon ? <FeltMark style={styles.toggleIcon}>{icon}</FeltMark> : null}
      <View style={{ flex: 1 }}>
        <Text style={styles.toggleText}>{label}</Text>
        {desc ? <Text style={styles.toggleDesc}>{desc}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: colors.line, true: colors.primary + "99" }}
        thumbColor={value ? colors.primary : "#fff"}
      />
    </View>
  );
}

function signalLevel(rssi) {
  if (rssi == null) return 2;
  if (rssi >= -55) return 3;
  if (rssi >= -67) return 2;
  if (rssi >= -78) return 1;
  return 0;
}

function SignalBars({ rssi }) {
  const level = signalLevel(rssi);
  return (
    <FeltMark style={styles.signalIcon}>
      {[0, 1, 2].map((index) => (
        <View
          key={index}
          style={[
            styles.signalBar,
            {
              height: 7 + index * 5,
              backgroundColor:
                index < level ? colors.primary : colors.line,
            },
          ]}
        />
      ))}
    </FeltMark>
  );
}

function DeviceButton({ icon, label, disabled }) {
  return (
    <Pressable style={[styles.deviceButton, disabled && styles.disabledButton]}>
      <FeltMark>{icon}</FeltMark>
      <Text style={styles.deviceButtonText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "900",
    marginTop: 20,
    marginBottom: 10,
  },
  subTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "900",
  },
  compactCard: { paddingVertical: 5 },
  networkStatus: {
    minHeight: 82,
    padding: 16,
    paddingLeft: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  statusIcon: { width: 46, height: 46, borderRadius: 18 },
  statusIconOn: { backgroundColor: colors.success + "20" },
  statusIconWarn: { backgroundColor: colors.warning + "24" },
  statusTitle: { color: colors.text, fontSize: 15, fontWeight: "900" },
  statusDesc: { color: colors.muted, fontSize: 12, marginTop: 3 },
  toggle: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  toggleHighlight: { backgroundColor: "#F8EBD8" },
  toggleIcon: { width: 40, height: 40 },
  toggleText: { color: colors.text, fontWeight: "800" },
  toggleDesc: { color: colors.muted, fontSize: 12, marginTop: 2 },
  gap: { marginTop: 14 },
  titleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  scanButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 6,
  },
  scanText: { color: colors.primaryDark, fontSize: 12, fontWeight: "900" },
  network: {
    minHeight: 62,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  networkActive: { backgroundColor: colors.primary + "13" },
  networkName: { flex: 1, color: colors.text, fontWeight: "800" },
  connectedText: { color: colors.success, fontSize: 11, fontWeight: "800", marginTop: 2 },
  signalIcon: {
    width: 38,
    height: 38,
    borderRadius: 15,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 2,
    paddingBottom: 9,
  },
  signalBar: { width: 4, borderRadius: 4 },
  passwordCard: { marginTop: 12 },
  themeCard: {
    minHeight: 72,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  deviceButtons: { flexDirection: "row", gap: 12, marginTop: 14 },
  deviceButton: {
    flex: 1,
    minHeight: 98,
    borderRadius: 24,
    backgroundColor: "#FFFBF5",
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
  },
  disabledButton: { opacity: 0.5 },
  deviceButtonText: { color: colors.text, fontWeight: "900" },
  deviceHint: { color: colors.muted, fontSize: 11, marginTop: 10 },
  appInfoCard: { marginTop: 22 },
  infoRow: {
    minHeight: 66,
    paddingHorizontal: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  infoText: { flex: 1, color: colors.text, fontWeight: "800" },
  empty: { color: colors.muted, textAlign: "center", paddingVertical: 28, lineHeight: 20 },
});
