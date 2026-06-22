export const colors = {
  background: "#FFF9F1",
  surface: "#FFFFFF",
  cream: "#FBEFDD",
  input: "#FFF6E9",
  line: "#EFE3D2",
  text: "#4B3621",
  muted: "#9B8875",
  primary: "#F08D86",
  primaryDark: "#D6814A",
  food: "#F08D86",
  water: "#5BA4D9",
  success: "#7FB77E",
  warning: "#F0B860",
  danger: "#E26D5C",
  black: "#17130F",
};

export const navigationTheme = {
  dark: false,
  colors: {
    primary: colors.primary,
    background: colors.background,
    card: colors.surface,
    text: colors.text,
    border: colors.line,
    notification: colors.danger,
  },
  fonts: {
    regular: { fontFamily: "System", fontWeight: "400" },
    medium: { fontFamily: "System", fontWeight: "500" },
    bold: { fontFamily: "System", fontWeight: "700" },
    heavy: { fontFamily: "System", fontWeight: "800" },
  },
};

export const shadow = {
  shadowColor: "#6C4F34",
  shadowOffset: { width: 0, height: 5 },
  shadowOpacity: 0.09,
  shadowRadius: 12,
  elevation: 3,
};
