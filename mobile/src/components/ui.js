import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronLeft } from "lucide-react-native";
import { colors, shadow } from "../theme";

export function Screen({ children, scroll = true, contentStyle, refreshControl }) {
  const content = scroll ? (
    <ScrollView
      contentContainerStyle={[styles.screenContent, contentStyle]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      refreshControl={refreshControl}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.screenContent, styles.flex, contentStyle]}>
      {children}
    </View>
  );
  return <SafeAreaView style={styles.safe}>{content}</SafeAreaView>;
}

export function Header({ title, subtitle, onBack, right }) {
  return (
    <View style={styles.header}>
      {onBack ? (
        <IconButton onPress={onBack}>
          <ChevronLeft size={22} color={colors.text} />
        </IconButton>
      ) : null}
      <View style={styles.headerText}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {right || null}
    </View>
  );
}

export function Card({ children, style }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Label({ children, style }) {
  return <Text style={[styles.label, style]}>{children}</Text>;
}

export function Field({
  label,
  icon,
  style,
  inputStyle,
  multiline,
  ...props
}) {
  return (
    <View style={style}>
      {label ? <Label>{label}</Label> : null}
      <View style={[styles.field, multiline && styles.multilineField]}>
        {icon ? <View style={styles.fieldIcon}>{icon}</View> : null}
        <TextInput
          {...props}
          multiline={multiline}
          placeholderTextColor={colors.muted}
          style={[styles.input, multiline && styles.multilineInput, inputStyle]}
        />
      </View>
    </View>
  );
}

export function Button({
  title,
  onPress,
  icon,
  variant = "primary",
  loading,
  disabled,
  style,
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        variant === "secondary" && styles.buttonSecondary,
        variant === "danger" && styles.buttonDanger,
        variant === "ghost" && styles.buttonGhost,
        (disabled || loading) && styles.disabled,
        pressed && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === "primary" || variant === "danger" ? "#fff" : colors.text}
        />
      ) : (
        <>
          {icon}
          <Text
            style={[
              styles.buttonText,
              (variant === "secondary" || variant === "ghost") &&
                styles.buttonSecondaryText,
            ]}
          >
            {title}
          </Text>
        </>
      )}
    </Pressable>
  );
}

export function IconButton({ children, onPress, style, disabled }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.iconButton,
        pressed && styles.pressed,
        style,
      ]}
    >
      {children}
    </Pressable>
  );
}

export function Pill({ children, tone = "primary", style }) {
  const palette = {
    primary: [colors.primary + "20", colors.primaryDark],
    success: [colors.success + "22", colors.success],
    warning: [colors.warning + "22", "#9A691E"],
    danger: [colors.danger + "20", colors.danger],
    neutral: [colors.cream, colors.text],
  }[tone];
  return (
    <View style={[styles.pill, { backgroundColor: palette[0] }, style]}>
      <Text style={[styles.pillText, { color: palette[1] }]}>{children}</Text>
    </View>
  );
}

export function Empty({ icon, title, description }) {
  return (
    <View style={styles.empty}>
      {icon}
      <Text style={styles.emptyTitle}>{title}</Text>
      {description ? <Text style={styles.emptyText}>{description}</Text> : null}
    </View>
  );
}

export const uiStyles = styles;

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safe: { flex: 1, backgroundColor: colors.background },
  screenContent: { padding: 20, paddingBottom: 40 },
  header: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    marginBottom: 16,
  },
  headerText: { flex: 1 },
  title: { color: colors.text, fontSize: 24, fontWeight: "800", letterSpacing: -0.4 },
  subtitle: { color: colors.muted, fontSize: 13, marginTop: 2 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 17,
    borderWidth: 1,
    borderColor: colors.line + "99",
    ...shadow,
  },
  label: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "700",
    marginLeft: 4,
    marginBottom: 7,
  },
  field: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    backgroundColor: colors.input,
    borderWidth: 1.5,
    borderColor: colors.line,
    paddingHorizontal: 14,
  },
  multilineField: { minHeight: 100, alignItems: "flex-start" },
  fieldIcon: { marginRight: 10 },
  input: { flex: 1, color: colors.text, fontSize: 16, paddingVertical: 13 },
  multilineInput: { minHeight: 90, textAlignVertical: "top" },
  button: {
    minHeight: 52,
    borderRadius: 24,
    paddingHorizontal: 18,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  buttonSecondary: { backgroundColor: colors.cream },
  buttonDanger: { backgroundColor: colors.danger },
  buttonGhost: { backgroundColor: "transparent" },
  buttonText: { color: "#fff", fontSize: 15, fontWeight: "800" },
  buttonSecondaryText: { color: colors.text },
  disabled: { opacity: 0.55 },
  pressed: { opacity: 0.72, transform: [{ scale: 0.985 }] },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    ...shadow,
  },
  pill: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  pillText: { fontSize: 11, fontWeight: "800" },
  empty: { alignItems: "center", paddingVertical: 48, paddingHorizontal: 20 },
  emptyTitle: {
    marginTop: 14,
    color: colors.text,
    fontSize: 18,
    fontWeight: "800",
  },
  emptyText: {
    marginTop: 6,
    color: colors.muted,
    textAlign: "center",
    lineHeight: 20,
  },
});
