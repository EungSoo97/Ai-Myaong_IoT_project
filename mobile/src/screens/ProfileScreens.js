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
  Cake,
  Calendar,
  Camera,
  Check,
  ChevronRight,
  Droplets,
  HeartPulse,
  Info,
  KeyRound,
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
import {
  Button,
  Card,
  Empty,
  FeltCard,
  FeltMark,
  Field,
  Header,
  Pill,
  Screen,
} from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { petAgeLabel, toApiPet } from "../lib/pets";
import { colors } from "../theme";

const catFeedImage = require("../../assets/cat-animation/cat-feed/cat_12_feed.png");
const catSearchImage = require("../../assets/ai-analysis/cat_search.png");
const catAdviceImage = require("../../assets/ai-analysis/cat_advice.png");
const catDangerImage = require("../../assets/ai-analysis/cat_danger.png");

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
  const pet = pets[0];
  const googleLinked = account?.provider === "google";
  const hasLocalLogin = Boolean(user.userId);
  return (
    <Screen>
      <Header title="마이페이지" subtitle="펫 프로필과 계정을 관리해요" />
      <FeltCard contentStyle={styles.userCard}>
        <View style={styles.avatar}>
          {user.photo && !String(user.photo).includes("googleusercontent") ? (
            <Image source={{ uri: mediaUrl(user.photo) }} style={styles.image} />
          ) : (
            <PawPrint size={32} color={colors.primary} />
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
      </FeltCard>

      <Text style={styles.sectionTitle}>펫 프로필</Text>
      {pet ? (
        <Pressable onPress={() => navigation.navigate("PetDetail", { pet })}>
          <FeltCard contentStyle={styles.petProfileCard}>
            <View style={styles.petProfileTop}>
              <View style={styles.petHeroAvatar}>
                {pet.photo ? (
                  <Image source={{ uri: mediaUrl(pet.photo) }} style={styles.image} />
                ) : (
                  <PawPrint size={40} color={colors.primary} />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.petHeroName}>{pet.name}</Text>
                <Text style={styles.muted}>
                  {pet.breed || (pet.species === "CAT" ? "고양이" : "강아지")}
                </Text>
                <View style={styles.badgeRow}>
                  {petAgeLabel(pet) ? <Pill tone="neutral">{petAgeLabel(pet)}</Pill> : null}
                  {pet.weightKg ? <Pill>{pet.weightKg}kg</Pill> : null}
                </View>
              </View>
              <ChevronRight size={20} color={colors.muted} />
            </View>
            <View style={styles.petInfoGrid}>
              <InfoCell
                icon={<Cake size={15} color={colors.primaryDark} />}
                label="생일"
                value={pet.birthDate || "-"}
              />
              <InfoCell
                icon={<Calendar size={15} color={colors.primaryDark} />}
                label="등록 상태"
                value="함께하는 중"
              />
            </View>
          </FeltCard>
        </Pressable>
      ) : (
        <Pressable onPress={() => navigation.navigate("PetDetail")}>
          <FeltCard contentStyle={{ padding: 24 }}>
            <Empty
              icon={<PawPrint size={35} color={colors.primary} />}
              title="반려동물 등록하기"
              description="우리 아이를 등록하고 관리해 보세요."
            />
          </FeltCard>
        </Pressable>
      )}

      <Text style={styles.sectionTitle}>계정 연동</Text>
      <FeltCard contentStyle={styles.accountLinkCard}>
        <FeltMark>
          <Text style={styles.googleMark}>G</Text>
        </FeltMark>
        <View style={{ flex: 1 }}>
          <Text style={styles.menuText}>Google 계정</Text>
          <Text style={styles.muted}>
            {googleLinked ? user.email || "연결된 계정" : "연결된 소셜 계정이 없어요"}
          </Text>
        </View>
        <Pill tone={googleLinked ? "success" : "neutral"}>
          {googleLinked ? "연결됨" : "미연결"}
        </Pill>
      </FeltCard>

      <Text style={styles.sectionTitle}>계정 관리</Text>
      <FeltCard contentStyle={styles.actionList}>
        {googleLinked ? (
          <InfoRow
            icon={<KeyRound size={20} color={colors.text} />}
            label={hasLocalLogin ? "아이디/비밀번호 설정됨" : "아이디/비밀번호 미설정"}
            complete={hasLocalLogin}
          />
        ) : null}
        <MenuRow
          icon={<Bell size={20} color={colors.primaryDark} />}
          label="알림"
          onPress={() => navigation.navigate("Notifications")}
        />
        <MenuRow
          icon={<Wifi size={20} color={colors.water} />}
          label="기기와 Wi-Fi 설정"
          onPress={() => navigation.navigate("Settings")}
        />
        <MenuRow
          icon={<Settings size={20} color={colors.text} />}
          label="환경 설정"
          onPress={() => navigation.navigate("Settings")}
        />
        <MenuRow
          icon={<LogOut size={20} color={colors.text} />}
          label="로그아웃"
          onPress={logout}
        />
      </FeltCard>

      <Text style={styles.versionText}>AiMyaong v1.0.0 · 사료를 전하고 싶다던가</Text>
      <Pressable
        onPress={() =>
          Alert.alert("회원 탈퇴", "계정과 반려동물 정보가 모두 삭제됩니다.", [
            { text: "취소", style: "cancel" },
            { text: "탈퇴", style: "destructive", onPress: removeAccount },
          ])
        }
      >
        <Text style={styles.withdrawText}>회원 탈퇴</Text>
      </Pressable>
    </Screen>
  );
}

function MenuRow({ icon, label, onPress }) {
  return (
    <Pressable onPress={onPress} style={styles.menu}>
      <FeltMark style={styles.menuIcon}>{icon}</FeltMark>
      <Text style={styles.menuText}>{label}</Text>
      <ChevronRight size={19} color={colors.muted} />
    </Pressable>
  );
}

function InfoRow({ icon, label, complete }) {
  return (
    <View style={styles.menu}>
      <FeltMark style={styles.menuIcon}>{icon}</FeltMark>
      <Text style={styles.menuText}>{label}</Text>
      <Pill tone={complete ? "success" : "neutral"}>{complete ? "완료" : "대기"}</Pill>
    </View>
  );
}

function InfoCell({ icon, label, value }) {
  return (
    <View style={styles.infoCell}>
      <View style={styles.infoLabelRow}>
        {icon}
        <Text style={styles.infoLabel}>{label}</Text>
      </View>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
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
        <FeltCard contentStyle={styles.reportLoading}>
          <RefreshCw size={25} color={colors.primary} />
          <Text style={styles.reportLoadingTitle}>최근 리포트를 불러오는 중이에요.</Text>
        </FeltCard>
      ) : report ? (
        <>
          <FeltCard style={{ marginBottom: 13 }} contentStyle={styles.reportHero}>
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
          </FeltCard>

          {metrics ? <TrendPanel metrics={metrics} quality={quality} /> : null}

          <View style={styles.reportGrid}>
            {chunkSections(sections).map((row) => {
              const openSection = row.find((section) => openKey === section.key);
              return (
                <View key={row.map((section) => section.key).join("-")} style={styles.reportRowBlock}>
                  <View style={styles.reportRow}>
                    {row.map((section) => (
                      <ReportSection
                        key={section.key}
                        section={section}
                        wide={row.length === 1}
                        open={openKey === section.key}
                        onPress={() =>
                          setOpenKey((current) =>
                            current === section.key ? null : section.key,
                          )
                        }
                      />
                    ))}
                  </View>
                  {openSection ? <ReportSectionDetail section={openSection} /> : null}
                </View>
              );
            })}
          </View>

          {advice.disclaimer ? (
            <View style={styles.disclaimer}>
              <Info size={16} color="#8B641C" />
              <Text style={styles.disclaimerText}>{advice.disclaimer}</Text>
            </View>
          ) : null}
        </>
      ) : (
        <FeltCard contentStyle={styles.emptyReport}>
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
        </FeltCard>
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
    <FeltCard style={{ marginBottom: 13 }} contentStyle={styles.trendCard}>
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
    </FeltCard>
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
      image: catFeedImage,
      imageStyle: "feed",
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
      image: catSearchImage,
      imageStyle: "search",
      items: advice.key_findings,
      preview: advice.key_findings[0]?.title,
      lines: (item) => [item.title, item.evidence, item.meaning],
    },
    {
      key: "advice",
      title: "맞춤 조언",
      Icon: Lightbulb,
      color: colors.success,
      image: catAdviceImage,
      imageStyle: "advice",
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
      image: catDangerImage,
      imageStyle: "danger",
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
      image: null,
      items: advice.data_limitations,
      preview: advice.data_limitations[0],
      lines: (item) => [typeof item === "string" ? item : JSON.stringify(item)],
    },
  ];
}

function chunkSections(sections) {
  const rows = [];
  for (let index = 0; index < sections.length; index += 2) {
    rows.push(sections.slice(index, index + 2));
  }
  return rows;
}

function ReportSection({ section, open, onPress, wide }) {
  const { Icon } = section;
  return (
    <View style={[styles.reportSectionWrap, wide && styles.reportSectionWide]}>
      <Pressable
        onPress={section.items.length ? onPress : undefined}
        style={[
          styles.reportSection,
          wide && styles.reportSectionFull,
          open && { borderColor: section.color, borderWidth: 2 },
        ]}
      >
        <View style={[styles.sectionIcon, { backgroundColor: section.color + "20" }]}>
          <Icon size={21} color={section.color} />
        </View>
        <View style={[styles.countBadge, { backgroundColor: section.color + "20" }]}>
          <Text style={[styles.countText, { color: section.color }]}>
            {section.items.length}
          </Text>
        </View>
        <View style={styles.sectionMain}>
          <Text style={styles.sectionName}>{section.title}</Text>
          <Text style={styles.sectionPreview} numberOfLines={2}>
            {section.preview || "내용 없음"}
          </Text>
          {section.items.length ? (
            <View style={styles.sectionCta}>
              <Text style={[styles.sectionCtaText, { color: section.color }]}>
                {open ? "닫기" : "보기"}
              </Text>
              <ChevronRight
                size={18}
                color={section.color}
                style={{ transform: [{ rotate: open ? "-90deg" : "0deg" }] }}
              />
            </View>
          ) : null}
        </View>
        {section.image ? (
          <Image
            source={section.image}
            style={[
              styles.sectionCatImage,
              section.imageStyle === "search" && styles.sectionCatSearch,
              section.imageStyle === "advice" && styles.sectionCatAdvice,
              section.imageStyle === "danger" && styles.sectionCatDanger,
            ]}
            resizeMode="contain"
          />
        ) : null}
      </Pressable>
    </View>
  );
}

function ReportSectionDetail({ section }) {
  return (
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
  );
}

const styles = StyleSheet.create({
  userCard: { flexDirection: "row", alignItems: "center", gap: 14, padding: 19 },
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
  petProfileCard: { padding: 20 },
  petProfileTop: { flexDirection: "row", alignItems: "center", gap: 14 },
  petHeroAvatar: {
    width: 82,
    height: 82,
    borderRadius: 28,
    backgroundColor: colors.cream,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.line,
  },
  petHeroName: {
    color: colors.text,
    fontSize: 25,
    fontWeight: "900",
  },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 9 },
  petInfoGrid: {
    marginTop: 16,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    flexDirection: "row",
    gap: 12,
  },
  infoCell: {
    flex: 1,
    minHeight: 58,
    borderRadius: 17,
    padding: 11,
    backgroundColor: "#F4E1C8",
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#7A563326",
  },
  infoLabelRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  infoLabel: { color: colors.muted, fontSize: 11, fontWeight: "800" },
  infoValue: { color: colors.text, fontSize: 14, fontWeight: "900", marginTop: 4 },
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
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 16,
  },
  menuText: { flex: 1, color: colors.text, fontWeight: "800" },
  accountLinkCard: {
    minHeight: 76,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  googleMark: { color: "#4285F4", fontSize: 18, fontWeight: "900" },
  actionList: { paddingVertical: 2 },
  versionText: {
    color: colors.muted,
    textAlign: "center",
    fontSize: 11,
    marginTop: 24,
  },
  withdrawText: {
    color: colors.muted,
    opacity: 0.65,
    textAlign: "center",
    fontSize: 11,
    textDecorationLine: "underline",
    marginTop: 12,
  },
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
  reportGrid: {
    gap: 12,
  },
  reportRowBlock: {
    gap: 8,
  },
  reportRow: {
    flexDirection: "row",
    gap: 12,
  },
  reportSectionWrap: { flex: 1 },
  reportSectionWide: { flex: 1 },
  reportSection: {
    minHeight: 210,
    backgroundColor: "#FFFCF8",
    borderRadius: 28,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "#D8CEC2",
    padding: 15,
    overflow: "hidden",
  },
  reportSectionFull: {
    minHeight: 128,
  },
  sectionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#7A563326",
  },
  sectionMain: { flex: 1, marginTop: 20, paddingRight: 24 },
  sectionName: { color: colors.text, fontSize: 18, lineHeight: 23, fontWeight: "900" },
  countBadge: {
    position: "absolute",
    top: 18,
    right: 14,
    borderRadius: 999,
    minWidth: 27,
    height: 27,
    paddingHorizontal: 7,
    alignItems: "center",
    justifyContent: "center",
  },
  countText: { fontSize: 12, fontWeight: "900" },
  sectionPreview: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 14,
  },
  sectionCta: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    marginTop: 22,
  },
  sectionCtaText: { fontSize: 15, fontWeight: "900" },
  sectionCatImage: {
    position: "absolute",
    width: 74,
    height: 74,
    right: 5,
    bottom: 4,
  },
  sectionCatSearch: {
    width: 70,
    height: 70,
    right: 3,
    bottom: 6,
  },
  sectionCatAdvice: {
    width: 82,
    height: 82,
    right: -3,
    bottom: 0,
  },
  sectionCatDanger: {
    width: 78,
    height: 78,
    right: 0,
    bottom: 2,
  },
  sectionDetail: {
    borderRadius: 24,
    padding: 11,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#7A563326",
  },
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
