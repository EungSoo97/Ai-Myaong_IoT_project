import { useEffect, useState } from "react";
import {
  Alert,
  Image,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import {
  Bell,
  Camera,
  Check,
  ChevronRight,
  Droplets,
  HeartPulse,
  Info,
  Lightbulb,
  LogOut,
  PawPrint,
  RefreshCw,
  Scale,
  Search,
  Settings,
  ShieldAlert,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Trash2,
  UtensilsCrossed,
  UserRound,
  Wifi,
} from "lucide-react-native";
import { api, mediaUrl } from "../api/client";
import { Button, Card, Empty, Field, Header, Pill, Screen } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { petAgeLabel, toApiPet } from "../lib/pets";
import { colors } from "../theme";

async function pickImage() {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    Alert.alert("권한 필요", "사진을 선택하려면 사진 접근 권한이 필요합니다.");
    return null;
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.8,
  });
  return result.canceled ? null : result.assets[0];
}

export function ProfileScreen({ navigation }) {
  const { account, logout, removeAccount } = useAuth();
  const user = account?.user || {};
  const pets = account?.pets || [];
  return (
    <Screen>
      <Header title="마이페이지" subtitle="계정과 반려동물을 관리해요" />
      <Card style={styles.userCard}>
        <View style={styles.avatar}>
          {user.photo ? (
            <Image source={{ uri: mediaUrl(user.photo) }} style={styles.image} />
          ) : (
            <UserRound size={32} color={colors.primary} />
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.userName}>{user.nickname || "집사"}</Text>
          <Text style={styles.muted}>{user.email}</Text>
        </View>
        <Button
          title="편집"
          variant="secondary"
          onPress={() => navigation.navigate("ProfileEdit")}
          style={styles.smallButton}
        />
      </Card>

      <Text style={styles.sectionTitle}>반려동물</Text>
      {pets.length ? (
        pets.map((pet) => (
          <Pressable
            key={pet.pet_id}
            onPress={() => navigation.navigate("PetDetail", { pet })}
            style={{ marginBottom: 11 }}
          >
            <Card style={styles.petRow}>
              <View style={styles.petAvatar}>
                {pet.photo ? (
                  <Image source={{ uri: mediaUrl(pet.photo) }} style={styles.image} />
                ) : (
                  <PawPrint size={29} color={colors.primary} />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.petName}>{pet.name}</Text>
                <Text style={styles.muted}>
                  {pet.breed || pet.species} {petAgeLabel(pet) ? `· ${petAgeLabel(pet)}` : ""}
                </Text>
              </View>
              <ChevronRight size={20} color={colors.muted} />
            </Card>
          </Pressable>
        ))
      ) : (
        <Pressable onPress={() => navigation.navigate("PetDetail")}>
          <Card>
            <Empty
              icon={<PawPrint size={35} color={colors.primary} />}
              title="반려동물 등록하기"
            />
          </Card>
        </Pressable>
      )}
      <Button
        title="+ 반려동물 추가"
        variant="secondary"
        onPress={() => navigation.navigate("PetDetail")}
      />

      <Text style={styles.sectionTitle}>앱 관리</Text>
      <MenuRow
        icon={<Bell size={20} color={colors.primaryDark} />}
        label="알림"
        onPress={() => navigation.navigate("Notifications")}
      />
      <MenuRow
        icon={<Wifi size={20} color={colors.water} />}
        label="Wi-Fi 및 기기 설정"
        onPress={() => navigation.navigate("Settings")}
      />
      <MenuRow
        icon={<Settings size={20} color={colors.text} />}
        label="환경 설정"
        onPress={() => navigation.navigate("Settings")}
      />
      <Button
        title="로그아웃"
        variant="secondary"
        icon={<LogOut size={18} color={colors.text} />}
        onPress={logout}
        style={{ marginTop: 18 }}
      />
      <Button
        title="회원 탈퇴"
        variant="ghost"
        icon={<Trash2 size={17} color={colors.danger} />}
        onPress={() =>
          Alert.alert("회원 탈퇴", "계정과 반려동물 정보가 모두 삭제됩니다.", [
            { text: "취소", style: "cancel" },
            { text: "탈퇴", style: "destructive", onPress: removeAccount },
          ])
        }
      />
    </Screen>
  );
}

function MenuRow({ icon, label, onPress }) {
  return (
    <Pressable onPress={onPress} style={styles.menu}>
      <View style={styles.menuIcon}>{icon}</View>
      <Text style={styles.menuText}>{label}</Text>
      <ChevronRight size={19} color={colors.muted} />
    </Pressable>
  );
}

export function ProfileEditScreen({ navigation }) {
  const { account, refreshAccount } = useAuth();
  const user = account?.user || {};
  const [nickname, setNickname] = useState(user.nickname || "");
  const [email, setEmail] = useState(user.email || "");
  const [photo, setPhoto] = useState(user.photo || "");
  const [asset, setAsset] = useState(null);
  const [busy, setBusy] = useState(false);
  const choose = async () => {
    const picked = await pickImage();
    if (picked) {
      setAsset(picked);
      setPhoto(picked.uri);
    }
  };
  const save = async () => {
    if (!nickname.trim() || !email.includes("@"))
      return Alert.alert("입력 확인", "닉네임과 이메일을 확인해 주세요.");
    setBusy(true);
    try {
      await api.updateMe({ nickname: nickname.trim(), email: email.trim() });
      if (asset) await api.uploadUserPhoto(asset);
      await refreshAccount();
      navigation.goBack();
    } catch (e) {
      Alert.alert("저장 실패", e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Screen>
      <Header title="회원 정보 수정" onBack={navigation.goBack} />
      <Pressable style={styles.photoPicker} onPress={choose}>
        {photo ? (
          <Image source={{ uri: mediaUrl(photo) }} style={styles.image} />
        ) : (
          <Camera size={30} color={colors.muted} />
        )}
      </Pressable>
      <Card>
        <Field label="아이디" value={user.userId} editable={false} />
        <Field
          style={styles.gap}
          label="닉네임"
          value={nickname}
          onChangeText={setNickname}
        />
        <Field
          style={styles.gap}
          label="이메일"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </Card>
      <Button title="저장" loading={busy} onPress={save} style={styles.save} />
    </Screen>
  );
}

const emptyPet = {
  name: "",
  species: "DOG",
  breed: "",
  gender: "M",
  birthDate: "",
  weightKg: "",
  heightCm: "",
  circumference: "",
  legLength: "",
  photo: "",
};

export function PetDetailScreen({ navigation, route }) {
  const { refreshAccount } = useAuth();
  const original = route.params?.pet;
  const [pet, setPet] = useState(original || emptyPet);
  const [asset, setAsset] = useState(null);
  const [busy, setBusy] = useState(false);
  const patch = (key, value) => setPet((x) => ({ ...x, [key]: value }));
  const choose = async () => {
    const picked = await pickImage();
    if (picked) {
      setAsset(picked);
      patch("photo", picked.uri);
    }
  };
  const save = async () => {
    if (!pet.name.trim()) return Alert.alert("입력 확인", "이름을 입력해 주세요.");
    setBusy(true);
    try {
      const saved = original?.pet_id
        ? await api.updatePet(original.pet_id, toApiPet(pet))
        : await api.createPet(toApiPet(pet));
      if (asset) await api.uploadPetPhoto(saved.pet_id || original.pet_id, asset);
      await refreshAccount();
      navigation.goBack();
    } catch (e) {
      Alert.alert("저장 실패", e.message);
    } finally {
      setBusy(false);
    }
  };
  const remove = () =>
    Alert.alert("반려동물 삭제", `${pet.name}의 정보를 삭제할까요?`, [
      { text: "취소", style: "cancel" },
      {
        text: "삭제",
        style: "destructive",
        onPress: async () => {
          await api.deletePet(original.pet_id);
          await refreshAccount();
          navigation.goBack();
        },
      },
    ]);
  return (
    <Screen>
      <Header
        title={original ? "반려동물 정보" : "반려동물 등록"}
        onBack={navigation.goBack}
        right={
          original ? (
            <Pressable
              onPress={() => navigation.navigate("HealthReport", { pet: original })}
            >
              <HeartPulse size={23} color={colors.primary} />
            </Pressable>
          ) : null
        }
      />
      <Pressable style={styles.photoPicker} onPress={choose}>
        {pet.photo ? (
          <Image source={{ uri: mediaUrl(pet.photo) }} style={styles.image} />
        ) : (
          <PawPrint size={35} color={colors.primary} />
        )}
      </Pressable>
      <Card>
        <View style={styles.speciesRow}>
          {[
            ["DOG", "강아지"],
            ["CAT", "고양이"],
          ].map(([value, label]) => (
            <Pressable
              key={value}
              onPress={() => patch("species", value)}
              style={[
                styles.species,
                pet.species === value && styles.speciesActive,
              ]}
            >
              <Text style={styles.menuText}>{label}</Text>
            </Pressable>
          ))}
        </View>
        <Field
          style={styles.gap}
          label="이름"
          value={pet.name}
          onChangeText={(v) => patch("name", v)}
        />
        <Field
          style={styles.gap}
          label="품종"
          value={pet.breed}
          onChangeText={(v) => patch("breed", v)}
        />
        <Field
          style={styles.gap}
          label="생년월일"
          value={pet.birthDate}
          onChangeText={(v) => patch("birthDate", v)}
          placeholder="YYYY-MM-DD"
        />
        <View style={styles.columns}>
          <Field
            style={{ flex: 1 }}
            label="몸무게(kg)"
            value={String(pet.weightKg ?? "")}
            onChangeText={(v) => patch("weightKg", v)}
            keyboardType="decimal-pad"
          />
          <Field
            style={{ flex: 1 }}
            label="키(cm)"
            value={String(pet.heightCm ?? "")}
            onChangeText={(v) => patch("heightCm", v)}
            keyboardType="decimal-pad"
          />
        </View>
        <View style={styles.columns}>
          <Field
            style={{ flex: 1 }}
            label="둘레(cm)"
            value={String(pet.circumference ?? "")}
            onChangeText={(v) => patch("circumference", v)}
            keyboardType="decimal-pad"
          />
          <Field
            style={{ flex: 1 }}
            label="다리 길이(cm)"
            value={String(pet.legLength ?? "")}
            onChangeText={(v) => patch("legLength", v)}
            keyboardType="decimal-pad"
          />
        </View>
      </Card>
      <Button title="저장" loading={busy} onPress={save} style={styles.save} />
      {original ? (
        <Button title="삭제" variant="ghost" onPress={remove} />
      ) : null}
    </Screen>
  );
}

export function HealthReportScreen({ navigation, route }) {
  const pet = route.params?.pet;
  const [report, setReport] = useState(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [openKey, setOpenKey] = useState(null);
  const load = async () => {
    setLoading(true);
    try {
      setReport(await api.getLatestHealthReport(pet.pet_id));
    } catch {
      setReport(null);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, [pet.pet_id]);
  const create = async () => {
    setBusy(true);
    try {
      setReport(await api.createHealthReport(pet.pet_id));
      setOpenKey(null);
    } catch (e) {
      Alert.alert("분석 실패", e.message);
    } finally {
      setBusy(false);
    }
  };
  const advice = parseHealthAdvice(report?.llm_result);
  const metrics = report?.input_summary?.computed_metrics;
  const quality = report?.input_summary?.data_quality;
  const risk = RISK[report?.risk_level] || RISK.unknown;
  const sections = healthSections(advice);

  return (
    <Screen>
      <Header
        title="AI 건강 분석"
        subtitle={`${pet.name}의 생활 리포트`}
        onBack={navigation.goBack}
      />
      <View style={styles.reportIntro}>
        <Sparkles size={17} color={colors.muted} />
        <Text style={styles.reportIntroText}>
          최근 7일의 급식·급수·활동 데이터를 AI가 분석해 건강 상태를 알려드려요.
        </Text>
      </View>

      {loading ? (
        <Card style={styles.reportLoading}>
          <RefreshCw size={25} color={colors.primary} />
          <Text style={styles.reportLoadingTitle}>최근 리포트를 불러오는 중이에요.</Text>
        </Card>
      ) : report ? (
        <>
          <Card style={styles.reportHero}>
            <View style={styles.reportLabelRow}>
              <View style={styles.reportLabel}>
                <Sparkles size={15} color={colors.primary} />
                <Text style={styles.reportLabelText}>AI 생활 리포트</Text>
              </View>
              {report.period ? (
                <Text style={styles.reportPeriod}>
                  {report.period.start} ~ {report.period.end}
                </Text>
              ) : null}
            </View>
            <View style={[styles.riskPill, { backgroundColor: risk.soft }]}>
              <risk.Icon size={15} color={risk.color} strokeWidth={2.8} />
              <Text style={[styles.riskText, { color: risk.color }]}>{risk.label}</Text>
            </View>
            <Text style={styles.reportSummary}>
              {advice.summary || "리포트 요약을 표시할 수 없어요."}
            </Text>
            <Text style={styles.reportMeta}>{pet.name} · 최근 7일 요약</Text>
            {metrics ? <MetricStrip metrics={metrics} /> : null}
            <Button
              title="새 리포트 생성"
              variant="secondary"
              icon={<RefreshCw size={17} color={colors.text} />}
              onPress={create}
              loading={busy}
              style={styles.regenerate}
            />
          </Card>

          {metrics ? <TrendPanel metrics={metrics} quality={quality} /> : null}

          <View style={styles.reportGrid}>
            {sections.map((section) => (
              <ReportSection
                key={section.key}
                section={section}
                open={openKey === section.key}
                onPress={() =>
                  setOpenKey((current) =>
                    current === section.key ? null : section.key,
                  )
                }
              />
            ))}
          </View>

          {advice.disclaimer ? (
            <View style={styles.disclaimer}>
              <Info size={16} color="#8B641C" />
              <Text style={styles.disclaimerText}>{advice.disclaimer}</Text>
            </View>
          ) : null}
        </>
      ) : (
        <Card style={styles.emptyReport}>
          <View style={styles.emptyReportIcon}>
            <Sparkles size={30} color={colors.primary} />
          </View>
          <Text style={styles.emptyReportTitle}>아직 생성된 리포트가 없어요</Text>
          <Text style={styles.emptyReportText}>
            버튼을 누르면 최근 7일 데이터를 분석해 리포트를 만들어요.
          </Text>
          <Button
            title="건강 리포트 생성"
            icon={<Sparkles size={17} color="#fff" />}
            onPress={create}
            loading={busy}
            style={styles.emptyReportButton}
          />
        </Card>
      )}
    </Screen>
  );
}

const RISK = {
  low: { label: "양호", color: "#2F6A2E", soft: "#7FB77E26", Icon: Check },
  medium: { label: "주의", color: "#8B641C", soft: "#F0B86033", Icon: ShieldAlert },
  high: { label: "경고", color: colors.danger, soft: colors.danger + "20", Icon: ShieldAlert },
  unknown: { label: "확인 필요", color: colors.text, soft: colors.cream, Icon: Info },
};

function parseHealthAdvice(value) {
  const empty = {
    summary: "",
    reference_comparison: [],
    key_findings: [],
    personalized_advice: [],
    watch_points: [],
    data_limitations: [],
    disclaimer: "",
  };
  if (!value) return empty;
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    return {
      ...empty,
      ...parsed,
      reference_comparison: Array.isArray(parsed.reference_comparison)
        ? parsed.reference_comparison
        : [],
      key_findings: Array.isArray(parsed.key_findings)
        ? parsed.key_findings
        : (parsed.observations || []).map((text) => ({
            title: "관찰 요약",
            evidence: text,
          })),
      personalized_advice: Array.isArray(parsed.personalized_advice)
        ? parsed.personalized_advice
        : (parsed.advice || []).map((text) => ({ action: text })),
      watch_points: Array.isArray(parsed.watch_points)
        ? parsed.watch_points
        : (parsed.warning_signs || []).map((text) => ({ item: text })),
      data_limitations: Array.isArray(parsed.data_limitations)
        ? parsed.data_limitations
        : [],
    };
  } catch {
    return { ...empty, summary: String(value) };
  }
}

function formatMetric(value, unit = "") {
  if (value == null || Number.isNaN(Number(value))) return "-";
  const n = Number(value);
  return `${Number.isInteger(n) ? n : n.toFixed(1)}${unit}`;
}

function MetricStrip({ metrics }) {
  return (
    <View style={styles.metricStrip}>
      <Metric label="급식" value={formatMetric(metrics.avg_food_g_per_day, "g")} />
      <Metric label="급수" value={formatMetric(metrics.avg_water_ml_per_day, "ml")} bordered />
      <Metric label="활동" value={formatMetric(metrics.avg_activity_level)} />
    </View>
  );
}

function Metric({ label, value, bordered }) {
  return (
    <View style={[styles.metric, bordered && styles.metricBorder]}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function TrendPanel({ metrics, quality }) {
  return (
    <Card style={styles.trendCard}>
      <View style={styles.trendTitleRow}>
        <View style={styles.trendTitleIcon}>
          <TrendingUp size={17} color={colors.primary} />
        </View>
        <Text style={styles.trendTitle}>이번 주 변화</Text>
      </View>
      <TrendRow
        icon={UtensilsCrossed}
        label="급식"
        value={formatMetric(metrics.avg_food_g_per_day, "g")}
        trend={metrics.food_trend}
        change={metrics.food_change_percent}
      />
      <TrendRow
        icon={Droplets}
        label="급수"
        value={formatMetric(metrics.avg_water_ml_per_day, "ml")}
        trend={metrics.water_trend}
        change={metrics.water_change_percent}
      />
      <TrendRow
        icon={HeartPulse}
        label="활동"
        value={formatMetric(metrics.avg_activity_level)}
        trend={metrics.activity_trend}
        change={metrics.activity_change_percent}
      />
      {quality ? (
        <Text style={styles.quality}>
          데이터 품질: 급식 {quality.feed_days}일 · 급수 {quality.water_days}일 · 활동{" "}
          {quality.activity_days}일
        </Text>
      ) : null}
    </Card>
  );
}

function TrendRow({ icon: Icon, label, value, trend, change }) {
  const up = trend === "up";
  const down = trend === "down";
  const TrendIcon = up ? TrendingUp : down ? TrendingDown : HeartPulse;
  const tone = up ? colors.success : down ? colors.danger : colors.muted;
  return (
    <View style={styles.trendRow}>
      <View style={styles.trendLeft}>
        <View style={styles.trendItemIcon}>
          <Icon size={17} color={colors.primary} />
        </View>
        <View>
          <Text style={styles.metricLabel}>{label}</Text>
          <Text style={styles.trendValue}>{value}</Text>
        </View>
      </View>
      <View style={styles.trendRight}>
        <View style={styles.trendState}>
          <TrendIcon size={16} color={tone} />
          <Text style={[styles.trendStateText, { color: tone }]}>
            {up ? "증가중" : down ? "감소중" : "유지중"}
          </Text>
        </View>
        {change != null && trend !== "stable" ? (
          <Text style={styles.trendChange}>
            지난주 대비 {change > 0 ? "+" : ""}
            {change}%
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function healthSections(advice) {
  return [
    {
      key: "reference",
      title: "품종·나이 기준 비교",
      Icon: Scale,
      color: colors.water,
      items: advice.reference_comparison,
      preview: advice.reference_comparison[0]?.metric,
      lines: (item) => [
        item.metric,
        item.judgment,
        item.reference && `기준 · ${item.reference}`,
        item.actual && `실제 · ${item.actual}`,
      ],
    },
    {
      key: "findings",
      title: "핵심 관찰",
      Icon: Search,
      color: colors.primary,
      items: advice.key_findings,
      preview: advice.key_findings[0]?.title,
      lines: (item) => [item.title, item.evidence, item.meaning],
    },
    {
      key: "advice",
      title: "맞춤 조언",
      Icon: Lightbulb,
      color: colors.success,
      items: advice.personalized_advice,
      preview: advice.personalized_advice[0]?.action,
      lines: (item) => [
        item.action,
        item.reason,
        item.check_after && `확인 시점 · ${item.check_after}`,
      ],
    },
    {
      key: "watch",
      title: "주의 신호",
      Icon: ShieldAlert,
      color: colors.warning,
      items: advice.watch_points,
      preview: advice.watch_points[0]?.item,
      lines: (item) => [
        item.item,
        item.why,
        item.when_to_consult_vet && `진료 상담 · ${item.when_to_consult_vet}`,
      ],
    },
    {
      key: "limitations",
      title: "분석 한계",
      Icon: Info,
      color: colors.muted,
      items: advice.data_limitations,
      preview: advice.data_limitations[0],
      lines: (item) => [typeof item === "string" ? item : JSON.stringify(item)],
    },
  ];
}

function ReportSection({ section, open, onPress }) {
  const { Icon } = section;
  return (
    <View style={styles.reportSectionWrap}>
      <Pressable
        onPress={section.items.length ? onPress : undefined}
        style={[
          styles.reportSection,
          open && { borderColor: section.color, borderWidth: 2 },
        ]}
      >
        <View style={[styles.sectionIcon, { backgroundColor: section.color + "20" }]}>
          <Icon size={21} color={section.color} />
        </View>
        <View style={styles.sectionMain}>
          <View style={styles.sectionHeading}>
            <Text style={styles.sectionName}>{section.title}</Text>
            <View style={[styles.countBadge, { backgroundColor: section.color + "20" }]}>
              <Text style={[styles.countText, { color: section.color }]}>
                {section.items.length}
              </Text>
            </View>
          </View>
          <Text style={styles.sectionPreview} numberOfLines={2}>
            {section.preview || "내용 없음"}
          </Text>
        </View>
        {section.items.length ? (
          <ChevronRight
            size={18}
            color={section.color}
            style={{ transform: [{ rotate: open ? "90deg" : "0deg" }] }}
          />
        ) : null}
      </Pressable>
      {open ? (
        <View style={[styles.sectionDetail, { backgroundColor: section.color + "0D" }]}>
          {section.items.map((item, index) => (
            <View
              key={index}
              style={[
                styles.detailItem,
                { borderLeftColor: section.color },
                index > 0 && { marginTop: 9 },
              ]}
            >
              {section
                .lines(item)
                .filter(Boolean)
                .map((line, lineIndex) => (
                  <Text
                    key={lineIndex}
                    style={lineIndex === 0 ? styles.detailTitle : styles.detailText}
                  >
                    {line}
                  </Text>
                ))}
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  userCard: { flexDirection: "row", alignItems: "center", gap: 14 },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.cream,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  image: { width: "100%", height: "100%" },
  userName: { color: colors.text, fontSize: 19, fontWeight: "900" },
  muted: { color: colors.muted, fontSize: 12, marginTop: 3 },
  smallButton: { minHeight: 38, paddingHorizontal: 14 },
  sectionTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "900",
    marginTop: 24,
    marginBottom: 11,
  },
  petRow: { flexDirection: "row", alignItems: "center", gap: 13 },
  petAvatar: {
    width: 60,
    height: 60,
    borderRadius: 22,
    backgroundColor: colors.cream,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  petName: { color: colors.text, fontSize: 18, fontWeight: "900" },
  menu: {
    minHeight: 62,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 15,
    backgroundColor: colors.surface,
    borderRadius: 19,
    marginBottom: 9,
  },
  menuIcon: {
    width: 39,
    height: 39,
    borderRadius: 14,
    backgroundColor: colors.cream,
    alignItems: "center",
    justifyContent: "center",
  },
  menuText: { flex: 1, color: colors.text, fontWeight: "800" },
  photoPicker: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignSelf: "center",
    backgroundColor: colors.cream,
    borderWidth: 2,
    borderColor: colors.line,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    marginBottom: 20,
  },
  gap: { marginTop: 15 },
  save: { marginTop: 18 },
  speciesRow: { flexDirection: "row", gap: 10 },
  species: {
    flex: 1,
    padding: 13,
    borderRadius: 16,
    backgroundColor: colors.cream,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "transparent",
  },
  speciesActive: { borderColor: colors.primary },
  columns: { flexDirection: "row", gap: 12, marginTop: 15 },
  reportIntro: { flexDirection: "row", gap: 9, marginBottom: 15, paddingHorizontal: 3 },
  reportIntroText: { flex: 1, color: colors.muted, fontSize: 12, lineHeight: 19 },
  reportLoading: { alignItems: "center", paddingVertical: 38, gap: 10 },
  reportLoadingTitle: { color: colors.text, fontWeight: "800" },
  reportHero: { padding: 22, marginBottom: 13 },
  reportLabelRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  reportLabel: { flexDirection: "row", alignItems: "center", gap: 6 },
  reportLabelText: { color: colors.muted, fontSize: 11, fontWeight: "900", letterSpacing: 0.4 },
  reportPeriod: { color: colors.muted, fontSize: 10, fontWeight: "600" },
  riskPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 6,
    marginTop: 18,
  },
  riskText: { fontSize: 12, fontWeight: "900" },
  reportSummary: { color: colors.text, fontSize: 17, lineHeight: 26, fontWeight: "700", marginTop: 13 },
  reportMeta: { color: colors.muted, fontSize: 11, fontWeight: "700", marginTop: 9 },
  metricStrip: {
    flexDirection: "row",
    backgroundColor: colors.cream + "AA",
    borderRadius: 18,
    paddingVertical: 13,
    marginTop: 18,
  },
  metric: { flex: 1, alignItems: "center" },
  metricBorder: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: colors.line },
  metricLabel: { color: colors.muted, fontSize: 11, fontWeight: "700" },
  metricValue: { color: colors.text, fontSize: 18, fontWeight: "900", marginTop: 4 },
  regenerate: { marginTop: 16 },
  trendCard: { marginBottom: 13, padding: 15 },
  trendTitleRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  trendTitleIcon: {
    width: 29,
    height: 29,
    borderRadius: 11,
    backgroundColor: colors.primary + "18",
    alignItems: "center",
    justifyContent: "center",
  },
  trendTitle: { color: colors.text, fontWeight: "900" },
  trendRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.cream,
    borderRadius: 17,
    padding: 12,
    marginTop: 7,
  },
  trendLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  trendItemIcon: {
    width: 38,
    height: 38,
    borderRadius: 15,
    backgroundColor: colors.primary + "18",
    alignItems: "center",
    justifyContent: "center",
  },
  trendValue: { color: colors.text, fontSize: 15, fontWeight: "900", marginTop: 2 },
  trendRight: { alignItems: "flex-end" },
  trendState: { flexDirection: "row", alignItems: "center", gap: 4 },
  trendStateText: { fontSize: 14, fontWeight: "900" },
  trendChange: { color: colors.muted, fontSize: 10, fontWeight: "700", marginTop: 2 },
  quality: { color: colors.muted, fontSize: 10, textAlign: "center", marginTop: 11 },
  reportGrid: { gap: 10 },
  reportSectionWrap: { gap: 7 },
  reportSection: {
    minHeight: 94,
    backgroundColor: colors.surface,
    borderRadius: 23,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  sectionIcon: { width: 43, height: 43, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  sectionMain: { flex: 1 },
  sectionHeading: { flexDirection: "row", alignItems: "center", gap: 6 },
  sectionName: { color: colors.text, fontSize: 15, fontWeight: "900" },
  countBadge: { borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2 },
  countText: { fontSize: 10, fontWeight: "900" },
  sectionPreview: { color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: 5 },
  sectionDetail: { borderRadius: 21, padding: 11 },
  detailItem: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderLeftWidth: 4,
    padding: 13,
  },
  detailTitle: { color: colors.text, fontSize: 14, fontWeight: "900", lineHeight: 20 },
  detailText: { color: colors.muted, fontSize: 12, lineHeight: 19, marginTop: 5 },
  disclaimer: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: colors.warning + "24",
    borderRadius: 17,
    padding: 13,
    marginTop: 12,
  },
  disclaimerText: { flex: 1, color: "#8B641C", fontSize: 11, lineHeight: 17, fontWeight: "700" },
  emptyReport: { alignItems: "center", paddingVertical: 28 },
  emptyReportIcon: {
    width: 59,
    height: 59,
    borderRadius: 30,
    backgroundColor: colors.primary + "18",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyReportTitle: { color: colors.text, fontSize: 15, fontWeight: "900", marginTop: 13 },
  emptyReportText: { color: colors.muted, fontSize: 12, lineHeight: 19, textAlign: "center", marginTop: 6 },
  emptyReportButton: { alignSelf: "stretch", marginTop: 17 },
});
