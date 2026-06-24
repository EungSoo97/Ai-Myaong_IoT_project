import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { useVideoPlayer, VideoView } from "expo-video";
import {
  ArrowRight,
  Cat,
  ChevronLeft,
  Check,
  Dog,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  LogIn,
  Mail,
  Search,
  User,
} from "lucide-react-native";
import { useAuth } from "../context/AuthContext";
import { Button, Card, Field, Screen } from "../components/ui";
import { colors } from "../theme";

const AUTH_BACKGROUND_MP4 =
  "https://pybrgtwclllhaanexose.supabase.co/storage/v1/object/public/myaong/asset/CalicoCatSwap_logo_removed.mp4";
const DEFAULT_GOOGLE_WEB_CLIENT_ID =
  "1034586846978-d24vdc078j1ae041c1d77anqrc3s005j.apps.googleusercontent.com";

WebBrowser.maybeCompleteAuthSession();

function Brand({ compact = false }) {
  return (
    <View style={[styles.brand, compact && styles.brandCard]}>
      <Text style={[styles.brandTitle, compact && styles.brandTitleLarge]}>
        Ai<Text style={{ color: colors.primary }}>:</Text>Myaong
      </Text>
      <Text style={styles.brandSub}>사료를 전하고 싶다던가 🐾</Text>
    </View>
  );
}

export function SplashScreen({ navigation }) {
  const intro = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(intro, {
        toValue: 1,
        duration: 450,
        useNativeDriver: true,
      }),
      Animated.delay(850),
      Animated.timing(intro, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
    const timer = setTimeout(
      () => navigation.replace("Login"),
      1800,
    );
    return () => clearTimeout(timer);
  }, [intro, navigation]);

  return (
    <View style={styles.splashBackground}>
      <Animated.View
        style={[
          styles.splashLogo,
          {
            opacity: intro,
            transform: [
              {
                translateY: intro.interpolate({
                  inputRange: [0, 1],
                  outputRange: [10, 0],
                }),
              },
              {
                scale: intro.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.9, 1],
                }),
              },
            ],
          },
        ]}
      >
        <Brand />
      </Animated.View>
    </View>
  );
}

export function LoginScreen({ navigation }) {
  const { googleLogin, login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [showLoginCard, setShowLoginCard] = useState(false);
  const nativeGoogleClientId = Platform.select({
    android: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    ios: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    default: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  });
  const googleClientId =
    nativeGoogleClientId ||
    process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ||
    DEFAULT_GOOGLE_WEB_CLIENT_ID;
  const googleConfigured =
    Platform.OS === "web" || Boolean(nativeGoogleClientId);
  const [googleRequest, googleResponse, promptGoogleAsync] =
    Google.useAuthRequest({
      clientId: googleClientId,
      scopes: ["openid", "profile", "email"],
      selectAccount: true,
    });
  const player = useVideoPlayer(AUTH_BACKGROUND_MP4, (videoPlayer) => {
    videoPlayer.loop = true;
    videoPlayer.muted = true;
    videoPlayer.play();
  });

  useEffect(() => {
    if (!googleResponse) return;
    if (googleResponse.type !== "success") {
      if (googleResponse.type === "error") {
        setError(
          googleResponse.error?.message || "Google 로그인에 실패했습니다.",
        );
      }
      setGoogleBusy(false);
      return;
    }

    const accessToken =
      googleResponse.authentication?.accessToken ||
      googleResponse.params?.access_token;
    if (!accessToken) {
      setError("Google 인증 토큰을 받지 못했습니다.");
      setGoogleBusy(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const response = await fetch(
          "https://www.googleapis.com/oauth2/v3/userinfo",
          { headers: { Authorization: `Bearer ${accessToken}` } },
        );
        if (!response.ok) {
          throw new Error(`Google 프로필 조회 실패 (${response.status})`);
        }
        const profile = await response.json();
        if (!cancelled) {
          await googleLogin({
            email: profile.email,
            name:
              profile.name ||
              profile.given_name ||
              profile.email?.split("@")[0],
            picture: profile.picture,
            sub: profile.sub,
          });
        }
      } catch (e) {
        if (!cancelled) {
          setError(e.message || "Google 로그인에 실패했습니다.");
        }
      } finally {
        if (!cancelled) setGoogleBusy(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [googleLogin, googleResponse]);

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
      style={styles.authRoot}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <VideoView
        player={player}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        nativeControls={false}
      />
      <View style={styles.authVideoTint} />
      <SafeAreaView style={styles.authSafe}>
        <ScrollView
          contentContainerStyle={styles.authScroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          scrollEnabled={showLoginCard}
        >
          <Brand compact />

          <View
            style={[
              styles.loginSpacer,
              showLoginCard && styles.loginSpacerOpen,
            ]}
          />

          <Pressable
            onPress={() => setShowLoginCard(true)}
            disabled={showLoginCard}
            style={({ pressed }) => [
              styles.startLoginButton,
              showLoginCard && styles.startLoginButtonHidden,
              pressed && styles.startLoginButtonPressed,
            ]}
          >
            <LogIn size={18} color="#fff" />
            <Text style={styles.startLoginButtonText}>로그인</Text>
          </Pressable>

          {showLoginCard ? (
            <View style={styles.loginDrawer}>
              <Card style={styles.form}>
                <Pressable
                  onPress={() => setShowLoginCard(false)}
                  style={styles.collapseButton}
                >
                  <Text style={styles.collapseButtonText}>접기</Text>
                </Pressable>
                <Field
                  icon={<User size={19} color={colors.muted} />}
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                  autoComplete="username"
                  placeholder="아이디를 입력해 주세요"
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
                <View style={styles.orRow}>
                  <View style={styles.orLine} />
                  <Text style={styles.orText}>또는</Text>
                  <View style={styles.orLine} />
                </View>
                <Pressable
                  onPress={async () => {
                    setError("");
                    if (!googleConfigured) {
                      setError(
                        `Google Cloud Console에서 ${Platform.OS === "android" ? "Android" : "iOS"} OAuth Client ID를 발급한 뒤 모바일 .env에 설정해 주세요.`,
                      );
                      return;
                    }
                    setGoogleBusy(true);
                    try {
                      await promptGoogleAsync();
                    } catch (e) {
                      setError(e.message || "Google 로그인을 열 수 없습니다.");
                      setGoogleBusy(false);
                    }
                  }}
                  disabled={!googleRequest || googleBusy}
                  style={({ pressed }) => [
                    styles.googleButton,
                    (!googleRequest || googleBusy) && styles.googleButtonDisabled,
                    pressed && styles.startLoginButtonPressed,
                  ]}
                >
                  <Text style={styles.googleMark}>G</Text>
                  <Text style={styles.googleButtonText}>
                    {googleBusy
                      ? "Google 로그인 중…"
                      : "Google 계정으로 로그인"}
                  </Text>
                </Pressable>
              </Card>

              <View style={styles.loginActions}>
                <Pressable
                  onPress={() => navigation.navigate("FindId")}
                >
                  <Text style={styles.smallLink}>아이디 찾기</Text>
                </Pressable>
                <Text style={styles.divider}>·</Text>
                <Pressable
                  onPress={() => navigation.navigate("FindPassword")}
                >
                  <Text style={styles.smallLink}>비밀번호 찾기</Text>
                </Pressable>
                <Text style={styles.divider}>·</Text>
                <Pressable onPress={() => navigation.navigate("Signup")}>
                  <Text style={styles.signupLink}>회원가입</Text>
                </Pressable>
              </View>
            </View>
          ) : null}
        </ScrollView>
      </SafeAreaView>
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

function fullUserId(email) {
  return (
    email
      .split("@")[0]
      ?.replace(/[^a-zA-Z0-9]/g, "") || "myaong"
  );
}

function maskUserId(id) {
  const head = id.slice(0, 2);
  return `${head}${"*".repeat(Math.max(id.length - 2, 3))}`;
}

function makeCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function isStrongPassword(value) {
  return (
    value.length >= 8 &&
    /[A-Za-z]/.test(value) &&
    /\d/.test(value) &&
    /[^A-Za-z0-9]/.test(value)
  );
}

function AuthHelperHeader({ title, subtitle, navigation }) {
  return (
    <View style={styles.signupHeader}>
      <Pressable style={styles.backInline} onPress={() => navigation.goBack()}>
        <ChevronLeft color={colors.text} />
      </Pressable>
      <View style={{ flex: 1 }}>
        <Text style={styles.signupTitle}>{title}</Text>
        <Text style={styles.brandSub}>{subtitle}</Text>
      </View>
    </View>
  );
}

function VerificationFields({
  email,
  setEmail,
  code,
  setCode,
  sentCode,
  setSentCode,
  verified,
  setVerified,
  setError,
}) {
  const send = () => {
    if (!email.includes("@")) {
      setError("올바른 이메일을 입력해 주세요.");
      return;
    }
    const next = makeCode();
    setSentCode(next);
    setVerified(false);
    setCode("");
    setError("");
    Alert.alert("인증번호", `개발용 인증번호는 ${next} 입니다.`);
  };

  const verify = () => {
    if (!sentCode) {
      setError("먼저 인증번호를 받아 주세요.");
      return;
    }
    if (code.trim() !== sentCode) {
      setError("인증번호가 일치하지 않습니다.");
      return;
    }
    setVerified(true);
    setError("");
    Alert.alert("확인", "이메일 인증이 완료되었습니다.");
  };

  return (
    <>
      <Field
        style={styles.gap}
        label="이메일"
        value={email}
        onChangeText={(value) => {
          setEmail(value);
          setVerified(false);
        }}
        keyboardType="email-address"
        autoCapitalize="none"
        icon={<Mail size={18} color={colors.muted} />}
        placeholder="name@example.com"
      />
      <Button
        title={sentCode ? "인증번호 다시 받기" : "인증번호 받기"}
        variant="secondary"
        onPress={send}
        style={styles.checkButton}
      />
      {sentCode ? (
        <View style={styles.verifyRow}>
          <Field
            style={{ flex: 1 }}
            label="인증번호"
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            placeholder="6자리"
            editable={!verified}
          />
          <Button
            title={verified ? "완료" : "확인"}
            variant={verified ? "secondary" : "primary"}
            onPress={verify}
            disabled={verified}
            style={styles.verifyButton}
          />
        </View>
      ) : null}
    </>
  );
}

export function FindIdScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sentCode, setSentCode] = useState("");
  const [verified, setVerified] = useState(false);
  const [result, setResult] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [error, setError] = useState("");

  const submit = () => {
    if (!verified) {
      setError("이메일 인증을 완료해 주세요.");
      return;
    }
    const full = fullUserId(email);
    setResult({ full, masked: maskUserId(full) });
    setError("");
  };

  return (
    <Screen>
      <AuthHelperHeader
        title="아이디 찾기"
        subtitle="가입한 이메일로 아이디를 찾아요"
        navigation={navigation}
      />
      <Card style={styles.form}>
        <View style={styles.helperIcon}>
          <Search size={25} color={colors.primary} />
        </View>
        {result ? (
          <>
            <Text style={styles.helperTitle}>이런 아이디로 가입되어 있어요</Text>
            <Pressable
              onPress={() => setRevealed((value) => !value)}
              style={styles.resultBox}
            >
              <Text style={styles.resultText}>
                {revealed ? result.full : result.masked}
              </Text>
              {revealed ? (
                <EyeOff size={19} color={colors.muted} />
              ) : (
                <Eye size={19} color={colors.muted} />
              )}
            </Pressable>
            <Button
              title="로그인하러 가기"
              icon={<LogIn size={18} color="#fff" />}
              onPress={() => navigation.navigate("Login")}
              style={styles.submit}
            />
          </>
        ) : (
          <>
            <Text style={styles.helperText}>
              가입 시 등록한 이메일을 인증하면 아이디를 알려드려요.
            </Text>
            <VerificationFields
              email={email}
              setEmail={setEmail}
              code={code}
              setCode={setCode}
              sentCode={sentCode}
              setSentCode={setSentCode}
              verified={verified}
              setVerified={setVerified}
              setError={setError}
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Button
              title="아이디 찾기"
              icon={<Search size={18} color="#fff" />}
              onPress={submit}
              style={styles.submit}
            />
          </>
        )}
      </Card>
    </Screen>
  );
}

export function FindPasswordScreen({ navigation }) {
  const [userId, setUserId] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sentCode, setSentCode] = useState("");
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState("");

  const submit = () => {
    if (!userId.trim()) {
      setError("아이디를 입력해 주세요.");
      return;
    }
    if (!verified) {
      setError("이메일 인증을 완료해 주세요.");
      return;
    }
    setError("");
    navigation.navigate("ResetPassword", {
      userId: userId.trim(),
      email,
    });
  };

  return (
    <Screen>
      <AuthHelperHeader
        title="비밀번호 찾기"
        subtitle="아이디와 이메일로 본인 확인을 해요"
        navigation={navigation}
      />
      <Card style={styles.form}>
        <View style={styles.helperIcon}>
          <KeyRound size={25} color={colors.primary} />
        </View>
        <Text style={styles.helperText}>
          아이디 입력 후 이메일을 인증하면 비밀번호를 새로 설정할 수 있어요.
        </Text>
        <Field
          style={styles.gap}
          label="아이디"
          value={userId}
          onChangeText={setUserId}
          autoCapitalize="none"
          icon={<User size={18} color={colors.muted} />}
          placeholder="로그인 아이디"
        />
        <VerificationFields
          email={email}
          setEmail={setEmail}
          code={code}
          setCode={setCode}
          sentCode={sentCode}
          setSentCode={setSentCode}
          verified={verified}
          setVerified={setVerified}
          setError={setError}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button
          title="비밀번호 재설정하기"
          icon={<ArrowRight size={18} color="#fff" />}
          onPress={submit}
          style={styles.submit}
        />
      </Card>
    </Screen>
  );
}

export function ResetPasswordScreen({ navigation }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const submit = () => {
    if (!isStrongPassword(password)) {
      setError("비밀번호는 8자 이상이며 영문·숫자·특수문자를 포함해야 합니다.");
      return;
    }
    if (password !== confirm) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }
    setError("");
    setDone(true);
  };

  return (
    <Screen>
      <AuthHelperHeader
        title="비밀번호 재설정"
        subtitle={done ? "변경이 완료되었어요" : "새 비밀번호를 설정해요"}
        navigation={navigation}
      />
      <Card style={styles.form}>
        <View style={styles.helperIcon}>
          {done ? (
            <Check size={27} color={colors.success} />
          ) : (
            <KeyRound size={25} color={colors.primary} />
          )}
        </View>
        {done ? (
          <>
            <Text style={styles.helperTitle}>비밀번호가 변경되었어요</Text>
            <Text style={styles.helperText}>
              새 비밀번호로 다시 로그인해 주세요.
            </Text>
            <Button
              title="로그인하러 가기"
              icon={<LogIn size={18} color="#fff" />}
              onPress={() => navigation.navigate("Login")}
              style={styles.submit}
            />
          </>
        ) : (
          <>
            <Text style={styles.helperText}>
              새로 사용할 비밀번호를 입력해 주세요.
            </Text>
            <Field
              style={styles.gap}
              label="새 비밀번호"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              icon={<Lock size={18} color={colors.muted} />}
              placeholder="8자 이상, 영문·숫자·특수문자"
            />
            <Field
              style={styles.gap}
              label="새 비밀번호 확인"
              value={confirm}
              onChangeText={setConfirm}
              secureTextEntry
              placeholder="비밀번호 재입력"
            />
            {confirm ? (
              <Text
                style={[
                  styles.matchText,
                  password === confirm ? styles.matchOk : styles.matchBad,
                ]}
              >
                {password === confirm
                  ? "비밀번호가 일치해요"
                  : "비밀번호가 일치하지 않아요"}
              </Text>
            ) : null}
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Button
              title="비밀번호 변경하기"
              icon={<Check size={18} color="#fff" />}
              onPress={submit}
              style={styles.submit}
            />
          </>
        )}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  splashBackground: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  splashLogo: { alignItems: "center" },
  authScreen: { paddingTop: 12 },
  brand: { alignItems: "center" },
  brandCard: {
    width: "90%",
    maxWidth: 390,
    marginTop: 45,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.5)",
    backgroundColor: "rgba(255,250,244,0.42)",
  },
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
  brandTitleLarge: { fontSize: 46, lineHeight: 50 },
  brandSub: { color: colors.muted, marginTop: 5, fontWeight: "600" },
  authRoot: { flex: 1, backgroundColor: colors.background },
  authVideoTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(62, 42, 28, 0.08)",
  },
  authSafe: { flex: 1 },
  authScroll: {
    flexGrow: 1,
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  loginSpacer: { flex: 1, minHeight: 150 },
  loginSpacerOpen: { flex: 0, minHeight: 16 },
  startLoginButton: {
    position: "relative",
    top: -40,
    width: "90%",
    maxWidth: 360,
    minHeight: 44,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.primary,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.42)",
    shadowColor: "#2D1E14",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 5,
  },
  startLoginButtonHidden: { opacity: 0 },
  startLoginButtonPressed: { opacity: 0.9, transform: [{ scale: 0.97 }] },
  startLoginButtonText: { color: "#fff", fontSize: 15, fontWeight: "900" },
  loginDrawer: {
    width: "90%",
    maxWidth: 360,
    alignItems: "center",
    marginTop: -32,
    paddingBottom: 12,
  },
  collapseButton: {
    alignSelf: "center",
    minHeight: 28,
    justifyContent: "center",
    marginBottom: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.45)",
    backgroundColor: "rgba(255,250,244,0.5)",
  },
  collapseButtonText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "900",
  },
  loginActions: {
    width: "100%",
    minHeight: 40,
    marginTop: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.4)",
    backgroundColor: "rgba(255,250,244,0.45)",
  },
  signupLink: { color: colors.primaryDark, fontSize: 13, fontWeight: "900" },
  orRow: {
    marginTop: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  orLine: { flex: 1, height: 1, backgroundColor: colors.line },
  orText: { color: colors.muted, fontSize: 12, fontWeight: "800" },
  googleButton: {
    minHeight: 48,
    marginTop: 14,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: "rgba(255,255,255,0.82)",
  },
  googleButtonDisabled: { opacity: 0.58 },
  googleMark: { color: "#4285F4", fontSize: 19, fontWeight: "900" },
  googleButtonText: { color: colors.text, fontSize: 15, fontWeight: "800" },
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
  form: {
    width: "100%",
    marginTop: 0,
    backgroundColor: "rgba(255,250,244,0.5)",
    borderColor: "rgba(255,255,255,0.5)",
  },
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
  helperIcon: {
    width: 58,
    height: 58,
    borderRadius: 20,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.cream,
    borderWidth: 1,
    borderColor: colors.line,
    marginBottom: 14,
  },
  helperTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 10,
  },
  helperText: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
  },
  verifyRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    marginTop: 15,
  },
  verifyButton: {
    width: 84,
    minHeight: 54,
    borderRadius: 18,
  },
  resultBox: {
    minHeight: 58,
    marginTop: 12,
    borderRadius: 18,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: colors.input,
    borderWidth: 1.5,
    borderColor: colors.line,
  },
  resultText: {
    color: colors.primaryDark,
    fontSize: 20,
    fontWeight: "900",
  },
  matchText: {
    marginTop: 8,
    marginLeft: 4,
    fontSize: 12,
    fontWeight: "800",
  },
  matchOk: { color: colors.success },
  matchBad: { color: colors.danger },
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
