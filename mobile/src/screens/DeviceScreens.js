import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { WebView } from "react-native-webview";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Camera,
  CircleStop,
  Droplets,
  Minus,
  Plus,
  RotateCcw,
  UtensilsCrossed,
  Video,
} from "lucide-react-native";
import { api } from "../api/client";
import { Button, Card, Field, Header, Pill, Screen } from "../components/ui";
import { colors } from "../theme";

const moveMap = {
  up: "FORWARD",
  down: "BACKWARD",
  left: "LEFT",
  right: "RIGHT",
  stop: "STOP",
};
const cameraMap = {
  up: "CAM_UP",
  down: "CAM_DOWN",
  left: "CAM_LEFT",
  right: "CAM_RIGHT",
  center: "CAM_CENTER",
};

export function VisionScreen() {
  const [stream, setStream] = useState("");
  const [streamMode, setStreamMode] = useState("");
  const [streamError, setStreamError] = useState("");
  const [streamLoaded, setStreamLoaded] = useState(false);
  const [events, setEvents] = useState([]);
  const [recording, setRecording] = useState(false);
  const [emergency, setEmergency] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [streamResult, eventResult, settingResult] = await Promise.allSettled([
      api.getStreamUrl(),
      api.getVisionEvents(10),
      api.getSettings(),
    ]);
    if (streamResult.status === "fulfilled") {
      setStream(streamResult.value.url);
      setStreamMode(streamResult.value.mode || "live");
      setStreamError("");
    } else {
      setStream("");
      setStreamMode("");
      setStreamLoaded(false);
      setStreamError(streamResult.reason?.message || "스트림 URL을 불러오지 못했어요.");
    }
    if (eventResult.status === "fulfilled")
      setEvents(eventResult.value.events || []);
    if (settingResult.status === "fulfilled")
      setEmergency(settingResult.value?.motion_alert !== "N");
  }, []);
  const streamStatus = streamError ? "off" : stream && streamLoaded ? "live" : "connecting";
  useEffect(() => {
    load();
    const timer = setInterval(load, 5000);
    return () => clearInterval(timer);
  }, [load]);

  const command = async (type, value) => {
    if (busy) return;
    setBusy(true);
    try {
      if (type === "move") await api.moveRobot(moveMap[value]);
      else await api.moveCamera(cameraMap[value]);
    } catch (e) {
      Alert.alert("명령 전송 실패", e.message);
    } finally {
      setBusy(false);
    }
  };
  const capture = async () => {
    try {
      await api.captureSnapshot();
      Alert.alert("캡처 완료", "현재 화면 저장을 요청했어요.");
      load();
    } catch (e) {
      Alert.alert("캡처 실패", e.message);
    }
  };
  const toggleRecording = async () => {
    try {
      await api.setVisionRecording(!recording);
      setRecording(!recording);
    } catch (e) {
      Alert.alert("녹화 설정 실패", e.message);
    }
  };
  const toggleEmergency = async () => {
    const next = !emergency;
    setEmergency(next);
    try {
      await api.setVisionEmergency(next);
    } catch (e) {
      setEmergency(!next);
      Alert.alert("이상 감지 설정 실패", e.message);
    }
  };

  return (
    <Screen>
      <Header title="로봇 비전" subtitle="실시간 카메라와 로봇을 제어해요" />
      <Card style={styles.streamCard}>
        {stream ? (
          <>
            <WebView
              key={stream}
              originWhitelist={["*"]}
              source={{ html: streamHtml(stream) }}
              style={styles.stream}
              scrollEnabled={false}
              bounces={false}
              javaScriptEnabled={false}
              domStorageEnabled={false}
              mixedContentMode="always"
              onLoadEnd={() => {
                setStreamLoaded(true);
                setStreamError("");
              }}
              onError={() => {
                setStreamLoaded(false);
                setStreamError("카메라 스트림을 표시하지 못했어요.");
              }}
            />
            {streamStatus !== "live" ? (
              <StreamFallback
                status={streamStatus}
                mode={streamMode}
                message={streamError}
                stream={stream}
              />
            ) : null}
          </>
        ) : (
          <StreamFallback
            status={streamStatus}
            mode={streamMode}
            message={streamError}
          />
        )}
        <View style={styles.live}>
          <View
            style={[
              styles.liveDot,
              streamStatus === "connecting" && styles.liveDotConnecting,
              streamStatus === "off" && styles.liveDotOff,
            ]}
          />
          <Text style={styles.liveText}>
            {streamStatus === "live"
              ? "LIVE"
              : streamStatus === "connecting"
                ? "연결 중"
                : "오프라인"}
          </Text>
        </View>
      </Card>
      <View style={styles.actionRow}>
        <Button
          title="캡처"
          variant="secondary"
          icon={<Camera size={18} color={colors.text} />}
          onPress={capture}
          style={{ flex: 1 }}
        />
        <Button
          title={recording ? "녹화 중지" : "녹화"}
          variant={recording ? "danger" : "secondary"}
          icon={
            recording ? (
              <CircleStop size={18} color="#fff" />
            ) : (
              <Video size={18} color={colors.text} />
            )
          }
          onPress={toggleRecording}
          style={{ flex: 1 }}
        />
      </View>
      <Card style={styles.settingRow}>
        <View>
          <Text style={styles.eventTitle}>이상 행동 감지</Text>
          <Text style={styles.muted}>움직임·응급 상황 알림을 받아요</Text>
        </View>
        <Switch
          value={emergency}
          onValueChange={toggleEmergency}
          trackColor={{ false: colors.line, true: colors.primary + "99" }}
          thumbColor={emergency ? colors.primary : "#fff"}
        />
      </Card>
      <Text style={styles.sectionTitle}>로봇 이동</Text>
      <Card style={styles.controls}>
        <ControlPad onPress={(value) => command("move", value)} />
      </Card>
      <Text style={styles.sectionTitle}>카메라 방향</Text>
      <Card style={styles.controls}>
        <ControlPad
          centerIcon={<RotateCcw size={20} color={colors.text} />}
          onPress={(value) => command("camera", value === "stop" ? "center" : value)}
        />
      </Card>
      <Text style={styles.sectionTitle}>최근 감지</Text>
      <Card style={styles.listCard}>
        {events.slice(0, 5).map((event, index) => (
          <View
            key={event.id}
            style={[styles.event, index > 0 && styles.borderTop]}
          >
            <View style={styles.eventIcon}>
              <Video size={18} color={colors.primaryDark} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.eventTitle}>{event.title}</Text>
              <Text style={styles.muted} numberOfLines={1}>
                {event.message}
              </Text>
            </View>
          </View>
        ))}
        {!events.length ? (
          <Text style={styles.emptyText}>아직 감지 기록이 없어요.</Text>
        ) : null}
      </Card>
    </Screen>
  );
}

function streamHtml(stream) {
  const escaped = String(stream)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return `<!doctype html>
<html>
  <head>
    <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1" />
    <style>
      html, body {
        margin: 0;
        width: 100%;
        height: 100%;
        overflow: hidden;
        background: #17130F;
      }
      img {
        width: 100%;
        height: 100%;
        object-fit: contain;
        display: block;
        background: #17130F;
      }
    </style>
  </head>
  <body>
    <img src="${escaped}" />
  </body>
</html>`;
}

function StreamFallback({ status, mode, message, stream }) {
  return (
    <View style={[styles.stream, styles.streamFallback]}>
      <View style={styles.streamFallbackIcon}>
        <Video size={31} color={colors.muted} />
      </View>
      <Text style={styles.streamFallbackTitle}>
        {status === "off" ? "카메라 스트림 연결 대기 중" : "연결 중..."}
      </Text>
      <Text style={styles.streamFallbackText}>
        {message || (mode === "simulated" ? "시뮬레이션 스트림" : "MJPEG 실시간 캠")}
      </Text>
      {stream ? (
        <Text style={styles.streamUrl} numberOfLines={1}>
          {stream}
        </Text>
      ) : null}
    </View>
  );
}

function ControlPad({ onPress, centerIcon }) {
  const key = (value, Icon) => (
    <Pressable
      onPress={() => onPress(value)}
      style={({ pressed }) => [styles.control, pressed && styles.pressed]}
    >
      {Icon}
    </Pressable>
  );
  return (
    <View style={styles.pad}>
      <View style={styles.padRow}>
        <View style={styles.spacer} />
        {key("up", <ArrowUp color={colors.text} />)}
        <View style={styles.spacer} />
      </View>
      <View style={styles.padRow}>
        {key("left", <ArrowLeft color={colors.text} />)}
        {key("stop", centerIcon || <CircleStop color={colors.danger} />)}
        {key("right", <ArrowRight color={colors.text} />)}
      </View>
      <View style={styles.padRow}>
        <View style={styles.spacer} />
        {key("down", <ArrowDown color={colors.text} />)}
        <View style={styles.spacer} />
      </View>
    </View>
  );
}

export function DispenserScreen() {
  const [food, setFood] = useState(15);
  const [water, setWater] = useState(100);
  const [logs, setLogs] = useState({ feed: [], water: [] });
  const [schedules, setSchedules] = useState([]);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ type: "food", time: "08:00", amount: "15" });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [logResult, settingResult] = await Promise.allSettled([
      api.getDispenserLogs(),
      api.getSettings(),
    ]);
    if (logResult.status === "fulfilled") setLogs(logResult.value);
    if (settingResult.status === "fulfilled") {
      const settings = settingResult.value;
      if (settings.feed_amount) setFood(Number(settings.feed_amount));
      if (settings.water_amount) setWater(Number(settings.water_amount));
      const parse = (raw, type) => {
        try {
          return JSON.parse(raw || "[]").map((x, i) => ({
            ...x,
            type,
            id: `${type}-${i}-${x.time}`,
          }));
        } catch {
          return [];
        }
      };
      setSchedules([
        ...parse(settings.feed_schedule, "food"),
        ...parse(settings.water_schedule, "water"),
      ].sort((a, b) => a.time.localeCompare(b.time)));
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const run = async (type) => {
    setBusy(true);
    try {
      if (type === "food") {
        await api.dispenserFeed(food);
        await api.createFeedLog({ amount_g: food, feed_type: "manual" });
        Alert.alert("완료", `사료 ${food}g을 배식했어요.`);
      } else {
        await api.dispenserWater(water);
        await api.createWaterLog({ amount_ml: water, water_type: "manual" });
        Alert.alert("완료", `물 ${water}ml를 급수했어요.`);
      }
      load();
    } catch (e) {
      Alert.alert("기기 명령 실패", e.message);
    } finally {
      setBusy(false);
    }
  };

  const saveAmounts = async (nextFood, nextWater) => {
    setFood(nextFood);
    setWater(nextWater);
    try {
      await api.updateSettings({
        feed_amount: nextFood,
        water_amount: nextWater,
      });
    } catch {}
  };

  const saveSchedule = async () => {
    const item = {
      id: `${form.type}-${Date.now()}`,
      type: form.type,
      time: form.time,
      amount: Number(form.amount),
      on: true,
    };
    const next = [...schedules, item].sort((a, b) =>
      a.time.localeCompare(b.time),
    );
    setSchedules(next);
    const pack = (type) =>
      JSON.stringify(
        next
          .filter((x) => x.type === type)
          .map(({ time, amount, on }) => ({ time, amount, on })),
      );
    try {
      await api.updateSettings({
        feed_schedule: pack("food"),
        water_schedule: pack("water"),
      });
      setEditing(false);
    } catch (e) {
      Alert.alert("저장 실패", e.message);
    }
  };

  const totals = useMemo(
    () => ({
      food: (logs.feed || []).reduce(
        (sum, x) => sum + (Number(x.amount_g) || 0),
        0,
      ),
      water: (logs.water || []).reduce(
        (sum, x) => sum + (Number(x.amount_ml) || 0),
        0,
      ),
    }),
    [logs],
  );

  return (
    <Screen>
      <Header title="디스펜서" subtitle="급식과 급수를 관리해요" />
      <View style={styles.dispenserRow}>
        <AmountCard
          icon={<UtensilsCrossed size={25} color={colors.food} />}
          label="사료"
          value={food}
          unit="g"
          onChange={(v) => saveAmounts(v, water)}
          onRun={() => run("food")}
          busy={busy}
        />
        <AmountCard
          icon={<Droplets size={25} color={colors.water} />}
          label="물"
          value={water}
          unit="ml"
          step={10}
          onChange={(v) => saveAmounts(food, v)}
          onRun={() => run("water")}
          busy={busy}
        />
      </View>
      <View style={styles.statsRow}>
        <Card style={styles.stat}>
          <Text style={styles.muted}>누적 배식</Text>
          <Text style={styles.statValue}>{Math.round(totals.food)}g</Text>
        </Card>
        <Card style={styles.stat}>
          <Text style={styles.muted}>누적 급수</Text>
          <Text style={styles.statValue}>{Math.round(totals.water)}ml</Text>
        </Card>
      </View>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>자동 스케줄</Text>
        <Pressable onPress={() => setEditing(true)}>
          <Text style={styles.add}>+ 추가</Text>
        </Pressable>
      </View>
      <Card style={styles.listCard}>
        {schedules.map((item, index) => (
          <View
            key={item.id}
            style={[styles.schedule, index > 0 && styles.borderTop]}
          >
            {item.type === "food" ? (
              <UtensilsCrossed size={19} color={colors.food} />
            ) : (
              <Droplets size={19} color={colors.water} />
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.eventTitle}>{item.time}</Text>
              <Text style={styles.muted}>
                {item.amount}
                {item.type === "food" ? "g" : "ml"}
              </Text>
            </View>
            <Pill tone={item.on === false ? "neutral" : "success"}>
              {item.on === false ? "꺼짐" : "켜짐"}
            </Pill>
          </View>
        ))}
        {!schedules.length ? (
          <Text style={styles.emptyText}>등록된 자동 스케줄이 없어요.</Text>
        ) : null}
      </Card>

      <Modal visible={editing} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>스케줄 추가</Text>
            <View style={styles.typeRow}>
              {[
                ["food", "사료"],
                ["water", "물"],
              ].map(([value, label]) => (
                <Pressable
                  key={value}
                  onPress={() => setForm((x) => ({ ...x, type: value }))}
                  style={[
                    styles.typeChoice,
                    form.type === value && styles.typeChoiceActive,
                  ]}
                >
                  <Text style={styles.eventTitle}>{label}</Text>
                </Pressable>
              ))}
            </View>
            <Field
              label="시간"
              value={form.time}
              onChangeText={(time) => setForm((x) => ({ ...x, time }))}
              placeholder="08:00"
            />
            <Field
              style={{ marginTop: 14 }}
              label="제공량"
              value={form.amount}
              onChangeText={(amount) => setForm((x) => ({ ...x, amount }))}
              keyboardType="number-pad"
            />
            <View style={styles.actionRow}>
              <Button
                title="취소"
                variant="secondary"
                onPress={() => setEditing(false)}
                style={{ flex: 1 }}
              />
              <Button title="저장" onPress={saveSchedule} style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

function AmountCard({
  icon,
  label,
  value,
  unit,
  onChange,
  onRun,
  step = 1,
  busy,
}) {
  return (
    <Card style={styles.amountCard}>
      {icon}
      <Text style={styles.amountLabel}>{label}</Text>
      <Text style={styles.amountValue}>
        {value}
        <Text style={styles.amountUnit}>{unit}</Text>
      </Text>
      <View style={styles.counter}>
        <Pressable onPress={() => onChange(Math.max(step, value - step))}>
          <Minus size={20} color={colors.text} />
        </Pressable>
        <Pressable onPress={() => onChange(value + step)}>
          <Plus size={20} color={colors.text} />
        </Pressable>
      </View>
      <Button
        title={label === "사료" ? "배식" : "급수"}
        onPress={onRun}
        loading={busy}
        style={{ width: "100%", marginTop: 13 }}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  streamCard: { padding: 5, overflow: "hidden" },
  stream: {
    width: "100%",
    aspectRatio: 16 / 10,
    borderRadius: 20,
    backgroundColor: colors.black,
  },
  streamEmpty: {
    backgroundColor: colors.black,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  streamFallback: {
    position: "absolute",
    top: 5,
    right: 5,
    bottom: 5,
    left: 5,
    backgroundColor: colors.cream,
    alignItems: "center",
    justifyContent: "center",
    padding: 22,
    gap: 8,
  },
  streamFallbackIcon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#FFFFFF99",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#FFFFFFAA",
  },
  streamFallbackTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "900",
    textAlign: "center",
  },
  streamFallbackText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
  },
  streamUrl: {
    color: colors.muted,
    opacity: 0.7,
    fontSize: 10,
    marginTop: 2,
    maxWidth: "92%",
  },
  live: {
    position: "absolute",
    top: 15,
    left: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#0009",
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
  },
  liveDot: { width: 7, height: 7, borderRadius: 5, backgroundColor: "#ff554d" },
  liveDotConnecting: { backgroundColor: colors.warning },
  liveDotOff: { backgroundColor: "#FFFFFF66" },
  liveText: { color: "#fff", fontWeight: "900", fontSize: 10 },
  muted: { color: colors.muted, fontSize: 12 },
  actionRow: { flexDirection: "row", gap: 12, marginTop: 13 },
  settingRow: {
    minHeight: 70,
    marginTop: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "900",
    marginTop: 24,
    marginBottom: 11,
  },
  controls: { alignItems: "center" },
  pad: { width: 198, gap: 7 },
  padRow: { flexDirection: "row", gap: 7 },
  control: {
    width: 61,
    height: 54,
    borderRadius: 18,
    backgroundColor: colors.cream,
    alignItems: "center",
    justifyContent: "center",
  },
  spacer: { width: 61 },
  pressed: { opacity: 0.55, transform: [{ scale: 0.96 }] },
  listCard: { paddingVertical: 3 },
  event: { flexDirection: "row", alignItems: "center", gap: 11, padding: 13 },
  eventIcon: {
    width: 40,
    height: 40,
    borderRadius: 15,
    backgroundColor: colors.primary + "16",
    alignItems: "center",
    justifyContent: "center",
  },
  eventTitle: { color: colors.text, fontWeight: "800" },
  borderTop: { borderTopWidth: 1, borderTopColor: colors.line },
  emptyText: { color: colors.muted, textAlign: "center", padding: 30 },
  dispenserRow: { flexDirection: "row", gap: 12 },
  amountCard: { flex: 1, alignItems: "center", paddingHorizontal: 12 },
  amountLabel: { color: colors.text, fontWeight: "800", marginTop: 8 },
  amountValue: { color: colors.text, fontSize: 27, fontWeight: "900", marginTop: 8 },
  amountUnit: { color: colors.muted, fontSize: 13 },
  counter: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: colors.cream,
    paddingVertical: 9,
    borderRadius: 15,
    marginTop: 10,
  },
  statsRow: { flexDirection: "row", gap: 12, marginTop: 12 },
  stat: { flex: 1 },
  statValue: { color: colors.text, fontSize: 23, fontWeight: "900", marginTop: 5 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  add: { color: colors.primaryDark, fontWeight: "900", marginTop: 14 },
  schedule: { flexDirection: "row", alignItems: "center", gap: 12, padding: 15 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "#0006",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 24,
    paddingBottom: 38,
  },
  sheetTitle: { color: colors.text, fontSize: 22, fontWeight: "900", marginBottom: 18 },
  typeRow: { flexDirection: "row", gap: 12, marginBottom: 16 },
  typeChoice: {
    flex: 1,
    alignItems: "center",
    padding: 14,
    borderRadius: 16,
    backgroundColor: colors.cream,
    borderWidth: 2,
    borderColor: "transparent",
  },
  typeChoiceActive: { borderColor: colors.primary },
});
