import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  Bell,
  ChevronRight,
  Droplets,
  HeartPulse,
  PawPrint,
  Plane,
  RefreshCw,
  Sparkles,
  UtensilsCrossed,
  Video,
  Wifi,
  WifiOff,
} from "lucide-react-native";
import { api, mediaUrl } from "../api/client";
import { Card, Empty, Header, Pill, Screen } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { petAgeLabel } from "../lib/pets";
import { colors } from "../theme";

const timeAgo = (iso) => {
  const diff = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(diff) || diff < 60000) return "방금 전";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}분 전`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}시간 전`;
  return `${Math.floor(diff / 86400000)}일 전`;
};

export function DashboardScreen({ navigation }) {
  const { account, refreshAccount } = useAuth();
  const [status, setStatus] = useState(null);
  const [logs, setLogs] = useState({ feed: [], water: [] });
  const [events, setEvents] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [quickBusy, setQuickBusy] = useState(null);
  const [petPhotoFailed, setPetPhotoFailed] = useState(false);
  const pet = account?.pets?.[0];
  const awayOn = Boolean(status?.away_mode);

  useEffect(() => {
    setPetPhotoFailed(false);
  }, [pet?.photo]);

  const load = useCallback(async () => {
    const [robot, dispenser, vision] = await Promise.allSettled([
      api.getDashboard(),
      api.getDispenserLogs(30),
      api.getVisionEvents(8),
    ]);
    if (robot.status === "fulfilled")
      setStatus(robot.value?.status || robot.value);
    if (dispenser.status === "fulfilled") setLogs(dispenser.value);
    if (vision.status === "fulfilled") setEvents(vision.value.events || []);
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, 5000);
    return () => clearInterval(timer);
  }, [load]);

  const recent = useMemo(() => {
    const feed = (logs.feed || []).map((item) => ({
      id: `f-${item.created_at}`,
      title: "배식 완료",
      description: `사료 ${Math.round(Number(item.amount_g) || 0)}g`,
      time: item.created_at,
      Icon: UtensilsCrossed,
    }));
    const water = (logs.water || []).map((item) => ({
      id: `w-${item.created_at}`,
      title: "급수 완료",
      description: `물 ${Math.round(Number(item.amount_ml) || 0)}ml`,
      time: item.created_at,
      Icon: Droplets,
    }));
    const vision = events.map((item) => ({
      id: `v-${item.id}`,
      title: item.title,
      description: item.message,
      time: item.created_at,
      Icon: Video,
    }));
    return [...feed, ...water, ...vision]
      .sort((a, b) => new Date(b.time) - new Date(a.time))
      .slice(0, 5);
  }, [events, logs]);

  const quickFeed = async () => {
    if (quickBusy) return;
    setQuickBusy("feed");
    try {
      await api.dispenserFeed(15);
      await api.createFeedLog({ amount_g: 15, feed_type: "quick" });
      Alert.alert("배식 완료", "사료 15g을 배식했어요.");
      await load();
    } catch (e) {
      Alert.alert("배식 실패", e.message);
    } finally {
      setQuickBusy(null);
    }
  };

  const toggleAway = async () => {
    if (quickBusy) return;
    const next = !awayOn;
    setQuickBusy("away");
    setStatus((current) => ({ ...current, away_mode: next }));
    try {
      await api.setAwayMode(next);
      await load();
    } catch (e) {
      setStatus((current) => ({ ...current, away_mode: !next }));
      Alert.alert("외출 모드", e.message);
    } finally {
      setQuickBusy(null);
    }
  };

  const refresh = async () => {
    setRefreshing(true);
    await Promise.allSettled([load(), refreshAccount()]);
    setRefreshing(false);
  };

  return (
    <Screen
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={refresh} />
      }
    >
      <Header
        title={`${account?.user?.nickname || "집사"}님, 안녕하세요`}
        subtitle="우리 아이의 오늘을 확인해요"
        right={
          <Pressable
            style={styles.bell}
            onPress={() => navigation.navigate("Notifications")}
          >
            <Bell size={21} color={colors.text} />
          </Pressable>
        }
      />

      <Card style={styles.connection}>
        <View style={styles.connectionText}>
          {status?.connected ? (
            <Wifi size={21} color={colors.success} />
          ) : (
            <WifiOff size={21} color={colors.danger} />
          )}
          <View>
            <Text style={styles.cardTitle}>
              {status?.connected ? "로봇 연결됨" : "로봇 연결 대기"}
            </Text>
            <Text style={styles.caption}>
              배터리 {status?.battery ?? "-"}% · {status?.mode || "상태 확인 중"}
            </Text>
          </View>
        </View>
        <Pressable onPress={load}>
          <RefreshCw size={19} color={colors.muted} />
        </Pressable>
      </Card>

      {pet ? (
        <Pressable onPress={() => navigation.navigate("PetDetail", { pet })}>
          <Card style={styles.petCard}>
            <View style={styles.petIcon}>
              {pet.photo && !petPhotoFailed ? (
                <Image
                  source={{ uri: mediaUrl(pet.photo) }}
                  style={styles.petPhoto}
                  resizeMode="cover"
                  onError={() => setPetPhotoFailed(true)}
                />
              ) : (
                <PawPrint size={35} color={colors.primary} />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.petName}>{pet.name}</Text>
              <Text style={styles.caption}>
                {pet.breed || (pet.species === "CAT" ? "고양이" : "강아지")}
                {petAgeLabel(pet) ? ` · ${petAgeLabel(pet)}` : ""}
              </Text>
              <View style={styles.badges}>
                {pet.weightKg ? <Pill>{pet.weightKg}kg</Pill> : null}
                <Pill tone="success">함께하는 중</Pill>
              </View>
            </View>
            <ChevronRight size={20} color={colors.muted} />
          </Card>
        </Pressable>
      ) : (
        <Pressable onPress={() => navigation.navigate("PetDetail")}>
          <Card>
            <Empty
              icon={<PawPrint size={34} color={colors.primary} />}
              title="반려동물을 등록해 주세요"
            />
          </Card>
        </Pressable>
      )}

      <Text style={styles.sectionTitle}>빠른 실행</Text>
      <View style={styles.quickRow}>
        <Pressable
          disabled={Boolean(quickBusy)}
          onPress={quickFeed}
          style={({ pressed }) => [
            styles.quickPrimary,
            pressed && styles.quickPressed,
            quickBusy && quickBusy !== "feed" && styles.quickDisabled,
          ]}
        >
          <UtensilsCrossed size={25} color="#fff" />
          <Text style={styles.quickPrimaryText}>빠른 배식</Text>
          <Text style={styles.quickPrimarySub}>
            {quickBusy === "feed" ? "배식 중…" : "15g"}
          </Text>
        </Pressable>
        <Pressable
          disabled={Boolean(quickBusy)}
          onPress={toggleAway}
          style={({ pressed }) => [
            styles.quickSecondary,
            awayOn && styles.quickAwayActive,
            pressed && styles.quickPressed,
            quickBusy && quickBusy !== "away" && styles.quickDisabled,
          ]}
        >
          <Plane size={25} color={awayOn ? "#fff" : colors.text} />
          <Text
            style={[
              styles.quickSecondaryText,
              awayOn && styles.quickAwayText,
            ]}
          >
            외출 모드
          </Text>
          <Text style={[styles.caption, awayOn && styles.quickAwayCaption]}>
            {quickBusy === "away" ? "변경 중…" : awayOn ? "켜짐" : "꺼짐"}
          </Text>
        </Pressable>
      </View>

      <Pressable
        onPress={() =>
          pet
            ? navigation.navigate("HealthReport", { pet })
            : Alert.alert("안내", "반려동물을 먼저 등록해 주세요.")
        }
      >
        <Card style={styles.health}>
          <View style={styles.healthIcon}>
            <HeartPulse size={24} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>AI 건강 리포트</Text>
            <Text style={styles.caption}>최근 생활 데이터를 분석해요</Text>
          </View>
          <Sparkles size={20} color={colors.warning} />
        </Card>
      </Pressable>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>최근 활동</Text>
        <Pressable onPress={() => navigation.navigate("Activity")}>
          <Text style={styles.more}>전체 보기</Text>
        </Pressable>
      </View>
      <Card style={styles.listCard}>
        {recent.length ? (
          recent.map(({ id, title, description, time, Icon }, index) => (
            <View
              key={id}
              style={[styles.listItem, index > 0 && styles.listBorder]}
            >
              <View style={styles.listIcon}>
                <Icon size={19} color={colors.primaryDark} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.listTitle}>{title}</Text>
                <Text style={styles.caption} numberOfLines={1}>
                  {description}
                </Text>
              </View>
              <Text style={styles.time}>{timeAgo(time)}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.emptyLine}>아직 기록된 활동이 없어요.</Text>
        )}
      </Card>
    </Screen>
  );
}

export function ActivityScreen() {
  const [filter, setFilter] = useState("all");
  const [logs, setLogs] = useState({ feed: [], water: [] });
  const [events, setEvents] = useState([]);
  const load = useCallback(async () => {
    const [d, v] = await Promise.allSettled([
      api.getDispenserLogs(),
      api.getVisionEvents(50),
    ]);
    if (d.status === "fulfilled") setLogs(d.value);
    if (v.status === "fulfilled") setEvents(v.value.events || []);
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  const items = useMemo(() => {
    const feed = (logs.feed || []).map((x) => ({
      id: `feed-${x.created_at}`,
      category: "feed",
      title: "배식",
      desc: `사료 ${Math.round(Number(x.amount_g) || 0)}g`,
      time: x.created_at,
      Icon: UtensilsCrossed,
    }));
    const water = (logs.water || []).map((x) => ({
      id: `water-${x.created_at}`,
      category: "feed",
      title: "급수",
      desc: `물 ${Math.round(Number(x.amount_ml) || 0)}ml`,
      time: x.created_at,
      Icon: Droplets,
    }));
    const vision = events.map((x) => ({
      id: `vision-${x.id}`,
      category: "vision",
      title: x.title,
      desc: x.message,
      time: x.created_at,
      Icon: Video,
    }));
    return [...feed, ...water, ...vision]
      .filter((x) => filter === "all" || x.category === filter)
      .sort((a, b) => new Date(b.time) - new Date(a.time));
  }, [events, filter, logs]);
  return (
    <Screen
      refreshControl={<RefreshControl refreshing={false} onRefresh={load} />}
    >
      <Header title="활동" subtitle="감지 · 급여 기록을 모아봐요" />
      <View style={styles.filterRow}>
        {[
          ["all", "전체"],
          ["vision", "감지"],
          ["feed", "급여"],
        ].map(([value, label]) => (
          <Pressable
            key={value}
            onPress={() => setFilter(value)}
            style={[
              styles.filter,
              filter === value && styles.filterActive,
            ]}
          >
            <Text
              style={[
                styles.filterText,
                filter === value && styles.filterTextActive,
              ]}
            >
              {label}
            </Text>
          </Pressable>
        ))}
      </View>
      <Card style={styles.listCard}>
        {items.length ? (
          items.map((item, index) => (
            <View
              key={item.id}
              style={[styles.listItem, index > 0 && styles.listBorder]}
            >
              <View style={styles.listIcon}>
                <item.Icon size={19} color={colors.primaryDark} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.listTitle}>{item.title}</Text>
                <Text style={styles.caption}>{item.desc}</Text>
              </View>
              <Text style={styles.time}>{timeAgo(item.time)}</Text>
            </View>
          ))
        ) : (
          <Empty
            icon={<Sparkles size={34} color={colors.primary} />}
            title="활동 기록이 없어요"
          />
        )}
      </Card>
    </Screen>
  );
}

export function NotificationsScreen({ navigation }) {
  const [items, setItems] = useState([]);
  const load = useCallback(async () => {
    try {
      setItems(await api.getAlerts());
    } catch (e) {
      Alert.alert("알림 조회 실패", e.message);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  const remove = async (id) => {
    await api.deleteAlert(id);
    setItems((current) => current.filter((x) => x.alert_id !== id && x.id !== id));
  };
  const clear = () =>
    Alert.alert("전체 삭제", "모든 알림을 삭제할까요?", [
      { text: "취소", style: "cancel" },
      {
        text: "삭제",
        style: "destructive",
        onPress: async () => {
          await api.deleteAllAlerts();
          setItems([]);
        },
      },
    ]);
  return (
    <Screen>
      <Header
        title="알림"
        subtitle={items.length ? `${items.length}개의 알림` : "모두 확인했어요"}
        onBack={navigation.goBack}
        right={
          items.length ? (
            <Pressable onPress={clear}>
              <Text style={styles.delete}>전체 삭제</Text>
            </Pressable>
          ) : null
        }
      />
      {items.length ? (
        <Card style={styles.listCard}>
          {items.map((item, index) => {
            let message = item.message || "";
            let title = item.alert_type || "알림";
            try {
              const parsed = JSON.parse(message);
              title = parsed.title || title;
              message = parsed.desc || parsed.message || message;
            } catch {}
            const id = item.alert_id || item.id;
            return (
              <Pressable
                key={id}
                onLongPress={() => remove(id)}
                style={[styles.listItem, index > 0 && styles.listBorder]}
              >
                <View style={styles.listIcon}>
                  <Bell size={19} color={colors.primaryDark} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.listTitle}>{title}</Text>
                  <Text style={styles.caption}>{message}</Text>
                  <Text style={styles.time}>{timeAgo(item.created_at)}</Text>
                </View>
              </Pressable>
            );
          })}
        </Card>
      ) : (
        <Empty
          icon={<Bell size={40} color={colors.primary} />}
          title="새로운 알림이 없어요"
          description="우리 아이에게 무슨 일이 생기면 여기로 알려드릴게요."
        />
      )}
    </Screen>
  );
}

export const homeStyles = styles;

const styles = StyleSheet.create({
  bell: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  connection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  connectionText: { flexDirection: "row", alignItems: "center", gap: 11 },
  cardTitle: { color: colors.text, fontSize: 15, fontWeight: "800" },
  caption: { color: colors.muted, fontSize: 12, marginTop: 3 },
  petCard: { flexDirection: "row", alignItems: "center", gap: 14 },
  petIcon: {
    width: 74,
    height: 74,
    borderRadius: 26,
    backgroundColor: colors.cream,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  petPhoto: { width: "100%", height: "100%" },
  petName: { color: colors.text, fontSize: 23, fontWeight: "900" },
  badges: { flexDirection: "row", gap: 6, marginTop: 9 },
  sectionTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "900",
    marginTop: 24,
    marginBottom: 11,
  },
  quickRow: { flexDirection: "row", gap: 12 },
  quickPrimary: {
    flex: 1,
    minHeight: 118,
    borderRadius: 24,
    padding: 17,
    backgroundColor: colors.primary,
  },
  quickSecondary: {
    flex: 1,
    minHeight: 118,
    borderRadius: 24,
    padding: 17,
    backgroundColor: colors.cream,
  },
  quickAwayActive: { backgroundColor: colors.text },
  quickAwayText: { color: "#fff" },
  quickAwayCaption: { color: "#fff", opacity: 0.72 },
  quickPressed: { opacity: 0.78, transform: [{ scale: 0.97 }] },
  quickDisabled: { opacity: 0.48 },
  quickPrimaryText: { color: "#fff", fontWeight: "900", marginTop: 14 },
  quickPrimarySub: { color: "#fff", opacity: 0.8, marginTop: 3 },
  quickSecondaryText: { color: colors.text, fontWeight: "900", marginTop: 14 },
  health: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  healthIcon: {
    width: 46,
    height: 46,
    borderRadius: 17,
    backgroundColor: colors.primary + "18",
    alignItems: "center",
    justifyContent: "center",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  more: { color: colors.primaryDark, fontWeight: "800", marginTop: 13 },
  listCard: { paddingVertical: 3, paddingHorizontal: 15 },
  listItem: {
    minHeight: 70,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    paddingVertical: 12,
  },
  listBorder: { borderTopWidth: 1, borderTopColor: colors.line },
  listIcon: {
    width: 40,
    height: 40,
    borderRadius: 15,
    backgroundColor: colors.primary + "16",
    alignItems: "center",
    justifyContent: "center",
  },
  listTitle: { color: colors.text, fontWeight: "800", fontSize: 14 },
  time: { color: colors.muted, fontSize: 10, marginTop: 3 },
  emptyLine: { color: colors.muted, textAlign: "center", paddingVertical: 30 },
  filterRow: {
    flexDirection: "row",
    alignSelf: "center",
    backgroundColor: colors.cream,
    borderRadius: 999,
    padding: 4,
    marginBottom: 18,
  },
  filter: { paddingHorizontal: 21, paddingVertical: 9, borderRadius: 999 },
  filterActive: { backgroundColor: colors.primary },
  filterText: { color: colors.muted, fontWeight: "800" },
  filterTextActive: { color: "#fff" },
  delete: { color: colors.danger, fontSize: 12, fontWeight: "800" },
});
