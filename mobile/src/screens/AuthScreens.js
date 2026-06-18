import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  Cat,
  ChevronLeft,
  Dog,
  Lock,
  LogIn,
  Mail,
  PawPrint,
  User,
} from "lucide-react-native";
import { useAuth } from "../context/AuthContext";
import { Button, Card, Field, Screen } from "../components/ui";
import { colors } from "../theme";

function Brand() {
  return (
    <View style={styles.brand}>
      <View style={styles.logo}>
        <PawPrint size={34} color={colors.primary} />
      </View>
      <Text style={styles.brandTitle}>
        Ai<Text style={{ color: colors.primary }}>:</Text>Myaong
      </Text>
      <Text style={styles.brandSub}>사료를 전하고 싶다던가 🐾</Text>
    </View>
  );
}

export function SplashScreen({ navigation }) {
  return (
    <Screen scroll={false} contentStyle={styles.splash}>
      <Brand />
      <View style={styles.cat}>
        <Cat size={106} strokeWidth={1.3} color={colors.primaryDark} />
      </View>
      <Text style={styles.splashText}>
        우리 아이의 하루를{"\n"}조금 더 가까이에서 지켜봐요.
      </Text>
      <Button
        title="시작하기"
        onPress={() => navigation.navigate("Login")}
        style={styles.full}
      />
      <Pressable onPress={() => navigation.navigate("Signup")}>
        <Text style={styles.link}>처음이신가요? 회원가입</Text>
      </Pressable>
    </Screen>
  );
}

export function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!username.trim() || !password) {
      setError("아이디와 비밀번호를 입력해 주세요.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await login(username.trim(), password);
    } catch (e) {
      setError(e.message || "로그인에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Screen contentStyle={styles.authScreen}>
        <Pressable style={styles.back} onPress={() => navigation.goBack()}>
          <ChevronLeft color={colors.text} />
        </Pressable>
        <Brand />
        <Card style={styles.form}>
          <Field
            icon={<User size={19} color={colors.muted} />}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoComplete="username"
            placeholder="아이디"
          />
          <Field
            style={styles.gap}
            icon={<Lock size={19} color={colors.muted} />}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="current-password"
            placeholder="비밀번호"
            onSubmitEditing={submit}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button
            title="들어가기"
            icon={<LogIn size={18} color="#fff" />}
            onPress={submit}
            loading={busy}
            style={styles.submit}
          />
        </Card>
        <View style={styles.rowLinks}>
          <Pressable
            onPress={() =>
              Alert.alert(
                "아이디 찾기",
                "현재 백엔드에 아이디 찾기 API가 없어 웹과 동일하게 안내 화면만 제공됩니다.",
              )
            }
          >
            <Text style={styles.smallLink}>아이디 찾기</Text>
          </Pressable>
          <Text style={styles.divider}>·</Text>
          <Pressable
            onPress={() =>
              Alert.alert(
                "비밀번호 찾기",
                "현재 백엔드에 재설정 메일 API가 없어 관리자에게 문의해 주세요.",
              )
            }
          >
            <Text style={styles.smallLink}>비밀번호 찾기</Text>
          </Pressable>
        </View>
        <Button
          title="회원가입"
          variant="secondary"
          onPress={() => navigation.navigate("Signup")}
        />
      </Screen>
    </KeyboardAvoidingView>
  );
}

const blankPet = {
  name: "",
  species: "DOG",
  breed: "",
  gender: "M",
  birthDate: "",
  weightKg: "",
  heightCm: "",
};

export function SignupScreen({ navigation }) {
  const { signup } = useAuth();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [checked, setChecked] = useState(false);
  const [user, setUser] = useState({
    username: "",
    email: "",
    password: "",
    confirm: "",
    nickname: "",
  });
  const [pet, setPet] = useState(blankPet);
  const patchUser = (key, value) =>
    setUser((current) => ({ ...current, [key]: value }));
  const patchPet = (key, value) =>
    setPet((current) => ({ ...current, [key]: value }));

  const checkUsername = async () => {
    if (!user.username.trim()) return setError("아이디를 입력해 주세요.");
    setBusy(true);
    try {
      const result = await (
        await import("../api/client")
      ).api.checkUsername(user.username.trim());
      setChecked(Boolean(result.available));
      setError(
        result.available
          ? ""
          : "이미 사용 중인 아이디입니다.",
      );
      if (result.available) Alert.alert("확인", "사용 가능한 아이디입니다.");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const next = () => {
    if (
      !user.username.trim() ||
      !checked ||
      !user.nickname.trim() ||
      !user.email.includes("@") ||
      user.password.length < 8 ||
      user.password !== user.confirm
    ) {
      setError(
        "중복 확인, 이메일, 닉네임과 8자 이상의 일치하는 비밀번호를 확인해 주세요.",
      );
      return;
    }
    setError("");
    setStep(1);
  };

  const finish = async () => {
    if (!pet.name.trim() || !pet.breed.trim()) {
      setError("반려동물 이름과 품종을 입력해 주세요.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await signup({
        username: user.username.trim(),
        email: user.email.trim(),
        password: user.password,
        nickname: user.nickname.trim(),
        pets: [
          {
            name: pet.name.trim(),
            species: pet.species,
            breed: pet.breed.trim(),
            gender: pet.gender,
            birth_date: pet.birthDate || null,
            weight_kg: pet.weightKg ? Number(pet.weightKg) : null,
            height_cm: pet.heightCm ? Number(pet.heightCm) : null,
          },
        ],
      });
    } catch (e) {
      setError(e.message || "회원가입에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Screen>
        <View style={styles.signupHeader}>
          <Pressable
            style={styles.backInline}
            onPress={() => (step ? setStep(0) : navigation.goBack())}
          >
            <ChevronLeft color={colors.text} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.signupTitle}>회원가입</Text>
            <Text style={styles.brandSub}>
              {step === 0 ? "집사 정보" : "반려동물 정보"} · {step + 1}/2
            </Text>
          </View>
        </View>
        <View style={styles.progress}>
          <View style={[styles.progressFill, { width: step ? "100%" : "50%" }]} />
        </View>

        {step === 0 ? (
          <Card style={styles.form}>
            <Field
              label="아이디"
              value={user.username}
              onChangeText={(v) => {
                patchUser("username", v);
                setChecked(false);
              }}
              autoCapitalize="none"
              icon={<User size={18} color={colors.muted} />}
              placeholder="로그인 아이디"
            />
            <Button
              title={checked ? "사용 가능" : "중복 확인"}
              variant="secondary"
              onPress={checkUsername}
              loading={busy}
              style={styles.checkButton}
            />
            <Field
              style={styles.gap}
              label="닉네임"
              value={user.nickname}
              onChangeText={(v) => patchUser("nickname", v)}
              placeholder="집사 이름"
            />
            <Field
              style={styles.gap}
              label="이메일"
              value={user.email}
              onChangeText={(v) => patchUser("email", v)}
              keyboardType="email-address"
              autoCapitalize="none"
              icon={<Mail size={18} color={colors.muted} />}
              placeholder="name@example.com"
            />
            <Field
              style={styles.gap}
              label="비밀번호"
              value={user.password}
              onChangeText={(v) => patchUser("password", v)}
              secureTextEntry
              icon={<Lock size={18} color={colors.muted} />}
              placeholder="8자 이상"
            />
            <Field
              style={styles.gap}
              label="비밀번호 확인"
              value={user.confirm}
              onChangeText={(v) => patchUser("confirm", v)}
              secureTextEntry
              placeholder="한 번 더 입력"
            />
          </Card>
        ) : (
          <Card style={styles.form}>
            <Text style={styles.sectionTitle}>어떤 아이와 함께하나요?</Text>
            <View style={styles.choiceRow}>
              {[
                ["DOG", Dog, "강아지"],
                ["CAT", Cat, "고양이"],
              ].map(([value, Icon, label]) => (
                <Pressable
                  key={value}
                  onPress={() => patchPet("species", value)}
                  style={[
                    styles.choice,
                    pet.species === value && styles.choiceActive,
                  ]}
                >
                  <Icon
                    size={25}
                    color={
                      pet.species === value ? colors.primary : colors.muted
                    }
                  />
                  <Text style={styles.choiceText}>{label}</Text>
                </Pressable>
              ))}
            </View>
            <Field
              style={styles.gap}
              label="이름"
              value={pet.name}
              onChangeText={(v) => patchPet("name", v)}
              placeholder="반려동물 이름"
            />
            <Field
              style={styles.gap}
              label="품종"
              value={pet.breed}
              onChangeText={(v) => patchPet("breed", v)}
              placeholder="예: 코리안 숏헤어"
            />
            <Field
              style={styles.gap}
              label="생년월일"
              value={pet.birthDate}
              onChangeText={(v) => patchPet("birthDate", v)}
              placeholder="YYYY-MM-DD"
            />
            <View style={styles.twoColumns}>
              <Field
                style={{ flex: 1 }}
                label="몸무게(kg)"
                value={pet.weightKg}
                onChangeText={(v) => patchPet("weightKg", v)}
                keyboardType="decimal-pad"
                placeholder="4.2"
              />
              <Field
                style={{ flex: 1 }}
                label="키(cm)"
                value={pet.heightCm}
                onChangeText={(v) => patchPet("heightCm", v)}
                keyboardType="decimal-pad"
                placeholder="30"
              />
            </View>
          </Card>
        )}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button
          title={step === 0 ? "다음" : "가입 완료"}
          onPress={step === 0 ? next : finish}
          loading={busy}
          style={styles.submit}
        />
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  splash: { justifyContent: "center", alignItems: "center" },
  authScreen: { paddingTop: 12 },
  brand: { alignItems: "center" },
  logo: {
    width: 68,
    height: 68,
    borderRadius: 25,
    backgroundColor: colors.cream,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  brandTitle: { fontSize: 32, fontWeight: "900", color: colors.text },
  brandSub: { color: colors.muted, marginTop: 5, fontWeight: "600" },
  cat: { marginVertical: 42 },
  splashText: {
    color: colors.text,
    textAlign: "center",
    fontSize: 19,
    lineHeight: 28,
    fontWeight: "700",
    marginBottom: 30,
  },
  full: { width: "100%" },
  link: { color: colors.primaryDark, fontWeight: "800", marginTop: 18 },
  back: { marginBottom: 10, alignSelf: "flex-start" },
  form: { marginTop: 28 },
  gap: { marginTop: 15 },
  submit: { marginTop: 20 },
  error: {
    color: colors.danger,
    marginTop: 14,
    lineHeight: 19,
    fontWeight: "700",
  },
  rowLinks: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    marginVertical: 20,
  },
  smallLink: { color: colors.muted, fontSize: 13, fontWeight: "700" },
  divider: { color: colors.line },
  signupHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },
  backInline: { paddingVertical: 10, paddingRight: 5 },
  signupTitle: { fontSize: 26, fontWeight: "900", color: colors.text },
  progress: {
    height: 7,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: colors.line,
  },
  progressFill: {
    height: "100%",
    backgroundColor: colors.primary,
    borderRadius: 8,
  },
  checkButton: { marginTop: 10, minHeight: 44 },
  sectionTitle: {
    color: colors.text,
    fontWeight: "800",
    fontSize: 17,
    marginBottom: 12,
  },
  choiceRow: { flexDirection: "row", gap: 12 },
  choice: {
    flex: 1,
    borderRadius: 18,
    padding: 15,
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.input,
    borderWidth: 1.5,
    borderColor: colors.line,
  },
  choiceActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + "12",
  },
  choiceText: { color: colors.text, fontWeight: "800" },
  twoColumns: { flexDirection: "row", gap: 12, marginTop: 15 },
});
