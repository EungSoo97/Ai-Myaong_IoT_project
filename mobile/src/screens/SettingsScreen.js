import { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { Cpu, RefreshCw, Wifi } from "lucide-react-native";
import { api } from "../api/client";
import { Button, Card, Field, Header, Screen } from "../components/ui";
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
      <Header title="설정" subtitle="알림과 기기 연결을 관리해요" onBack={navigation.goBack} />
      <Text style={styles.sectionTitle}>알림</Text>
      <Card style={styles.compactCard}>
        <Toggle label="푸시 알림" value={settings.push_enabled !== "N"} onChange={(v) => patch("push_enabled", v ? "Y" : "N")} />
        <Toggle label="움직임 감지" value={settings.motion_alert !== "N"} onChange={(v) => patch("motion_alert", v ? "Y" : "N")} />
        <Toggle label="외부인 감지" value={settings.stranger_alert !== "N"} onChange={(v) => patch("stranger_alert", v ? "Y" : "N")} />
        <Toggle label="급여 알림" value={settings.feed_alert === "Y"} onChange={(v) => patch("feed_alert", v ? "Y" : "N")} />
      </Card>
      <Text style={styles.sectionTitle}>기기</Text>
      <Card>
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
      </Card>
      <View style={styles.titleRow}>
        <Text style={styles.sectionTitle}>주변 Wi-Fi</Text>
        <Pressable onPress={scan} style={styles.refresh}>
          <RefreshCw size={18} color={colors.primaryDark} />
        </Pressable>
      </View>
      <Card style={styles.compactCard}>
        {networks.map((network, index) => {
          const name = network.ssid || network.name;
          return (
            <Pressable
              key={`${name}-${index}`}
              onPress={() => setSsid(name)}
              style={[styles.network, ssid === name && styles.networkActive]}
            >
              <Wifi size={19} color={ssid === name ? colors.primary : colors.muted} />
              <Text style={styles.networkName}>{name}</Text>
              <Text style={styles.signal}>{network.rssi ?? ""}</Text>
            </Pressable>
          );
        })}
        {!networks.length ? <Text style={styles.empty}>검색 버튼을 눌러 주변 네트워크를 찾아보세요.</Text> : null}
      </Card>
      {ssid ? (
        <>
          <Field
            style={styles.gap}
            label={`${ssid} 비밀번호`}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          <Button title="기기에 Wi-Fi 설정 전달" onPress={connect} loading={busy} style={styles.gap} />
        </>
      ) : null}
    </Screen>
  );
}

function Toggle({ label, value, onChange }) {
  return (
    <View style={styles.toggle}>
      <Text style={styles.toggleText}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: colors.line, true: colors.primary + "99" }}
        thumbColor={value ? colors.primary : "#fff"}
      />
    </View>
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
  compactCard: { paddingVertical: 5 },
  toggle: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  toggleText: { color: colors.text, fontWeight: "800" },
  gap: { marginTop: 14 },
  titleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  refresh: { marginTop: 12, padding: 8 },
  network: {
    minHeight: 54,
    borderRadius: 15,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  networkActive: { backgroundColor: colors.primary + "13" },
  networkName: { flex: 1, color: colors.text, fontWeight: "800" },
  signal: { color: colors.muted, fontSize: 12 },
  empty: { color: colors.muted, textAlign: "center", paddingVertical: 28, lineHeight: 20 },
});
