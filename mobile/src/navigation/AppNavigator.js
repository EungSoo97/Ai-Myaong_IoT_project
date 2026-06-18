import { ActivityIndicator, StyleSheet, View } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { BowlFood } from "phosphor-react-native/src/icons/BowlFood";
import { Cat } from "phosphor-react-native/src/icons/Cat";
import { GearSix } from "phosphor-react-native/src/icons/GearSix";
import { House } from "phosphor-react-native/src/icons/House";
import { VideoCamera } from "phosphor-react-native/src/icons/VideoCamera";
import { useAuth } from "../context/AuthContext";
import {
  LoginScreen,
  SignupScreen,
  SplashScreen,
} from "../screens/AuthScreens";
import {
  ActivityScreen,
  DashboardScreen,
  NotificationsScreen,
} from "../screens/HomeScreens";
import {
  DispenserScreen,
  VisionScreen,
} from "../screens/DeviceScreens";
import {
  HealthReportScreen,
  PetDetailScreen,
  ProfileEditScreen,
  ProfileScreen,
} from "../screens/ProfileScreens";
import { SettingsScreen } from "../screens/SettingsScreen";
import { CatRemote } from "../components/CatRemote";
import { colors } from "../theme";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const tabIcons = {
  Home: House,
  Vision: VideoCamera,
  Dispenser: BowlFood,
  SettingsTab: GearSix,
  Profile: Cat,
};

function MainTabs() {
  return (
    <View style={styles.tabsShell}>
      <Tab.Navigator
      screenOptions={({ route }) => {
        const Icon = tabIcons[route.name];
        return {
          headerShown: false,
          tabBarIcon: ({ color, size, focused }) => (
            <View style={[styles.tabIconChip, focused && styles.tabIconChipActive]}>
              <Icon
                color={color}
                size={focused ? size + 2 : size}
                weight={focused ? "fill" : "duotone"}
              />
            </View>
          ),
          tabBarActiveTintColor: colors.primaryDark,
          tabBarInactiveTintColor: colors.muted,
          tabBarStyle: styles.tabBar,
          tabBarLabelStyle: styles.tabLabel,
        };
      }}
      >
      <Tab.Screen
        name="Home"
        component={DashboardScreen}
        options={{ title: "대시보드" }}
      />
      <Tab.Screen
        name="Vision"
        component={VisionScreen}
        options={{ title: "로봇 비전" }}
      />
      <Tab.Screen
        name="Dispenser"
        component={DispenserScreen}
        options={{ title: "디스펜서" }}
      />
      <Tab.Screen
        name="SettingsTab"
        component={SettingsScreen}
        options={{ title: "설정" }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: "마이 페이지" }}
      />
      </Tab.Navigator>
      <CatRemote />
    </View>
  );
}

export function AppNavigator() {
  const { loading, authenticated } = useAuth();
  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {authenticated ? (
        <>
          <Stack.Screen name="Main" component={MainTabs} />
          <Stack.Screen name="Notifications" component={NotificationsScreen} />
          <Stack.Screen name="Activity" component={ActivityScreen} />
          <Stack.Screen name="ProfileEdit" component={ProfileEditScreen} />
          <Stack.Screen name="PetDetail" component={PetDetailScreen} />
          <Stack.Screen name="HealthReport" component={HealthReportScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
        </>
      ) : (
        <>
          <Stack.Screen name="Splash" component={SplashScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Signup" component={SignupScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  tabsShell: { flex: 1 },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  tabBar: {
    height: 82,
    paddingTop: 5,
    paddingBottom: 8,
    backgroundColor: colors.surface,
    borderTopColor: colors.line,
  },
  tabIconChip: {
    width: 42,
    height: 38,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  tabIconChipActive: { backgroundColor: colors.primary + "20" },
  tabLabel: { fontSize: 10, fontWeight: "700" },
});
