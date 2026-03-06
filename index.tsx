import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Platform, View, Text } from "react-native";
import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";

// A warm off-white background that works in both light and dark contexts
const TAB_BG = "#F7F8FA";
const TAB_BORDER = "#E4E6EB";
const ACTIVE_COLOR = "#0a7ea4";
const INACTIVE_COLOR = "#9BA1A6";
const ACTIVE_BG = "#E6F4FA";

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const bottomPadding = Platform.OS === "web" ? 10 : Math.max(insets.bottom, 6);
  // Fixed height: icon (28) + label (12) + gap (4) + top padding (8) + bottom padding
  const tabBarHeight = 56 + bottomPadding;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          paddingTop: 8,
          paddingBottom: bottomPadding,
          height: tabBarHeight,
          backgroundColor: TAB_BG,
          borderTopColor: TAB_BORDER,
          borderTopWidth: 1,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -1 },
          shadowOpacity: 0.05,
          shadowRadius: 6,
          elevation: 10,
        },
        // Use custom tabBarLabel to keep all labels at the same baseline
        tabBarActiveTintColor: ACTIVE_COLOR,
        tabBarInactiveTintColor: INACTIVE_COLOR,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "600",
          letterSpacing: 0.1,
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) => (
            <View style={{
              width: 30,
              height: 28,
              borderRadius: 8,
              backgroundColor: focused ? ACTIVE_BG : "transparent",
              alignItems: "center",
              justifyContent: "center",
            }}>
              <IconSymbol size={20} name="house.fill" color={color} />
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name="journal"
        options={{
          title: "Journal",
          tabBarIcon: ({ color, focused }) => (
            <View style={{
              width: 30,
              height: 28,
              borderRadius: 8,
              backgroundColor: focused ? ACTIVE_BG : "transparent",
              alignItems: "center",
              justifyContent: "center",
            }}>
              <IconSymbol size={20} name="list.bullet.rectangle" color={color} />
            </View>
          ),
        }}
      />

      {/* ── Add button — same height as other tabs ── */}
      <Tabs.Screen
        name="add-expense"
        options={{
          title: "Add",
          tabBarIcon: ({ focused }) => (
            <View style={{
              width: 44,
              height: 28,
              borderRadius: 10,
              backgroundColor: ACTIVE_COLOR,
              alignItems: "center",
              justifyContent: "center",
              shadowColor: ACTIVE_COLOR,
              shadowOffset: { width: 0, height: 3 },
              shadowOpacity: 0.3,
              shadowRadius: 6,
              elevation: 6,
            }}>
              <IconSymbol size={18} name="plus.circle.fill" color="#fff" />
            </View>
          ),
          tabBarActiveTintColor: ACTIVE_COLOR,
          tabBarInactiveTintColor: ACTIVE_COLOR,
          tabBarLabelStyle: {
            fontSize: 10,
            fontWeight: "700",
            color: ACTIVE_COLOR,
            marginTop: 2,
          },
        }}
      />

      <Tabs.Screen
        name="graphs"
        options={{
          title: "Graphs",
          tabBarIcon: ({ color, focused }) => (
            <View style={{
              width: 30,
              height: 28,
              borderRadius: 8,
              backgroundColor: focused ? ACTIVE_BG : "transparent",
              alignItems: "center",
              justifyContent: "center",
            }}>
              <IconSymbol size={20} name="chart.pie.fill" color={color} />
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name="metrics"
        options={{
          title: "Metrics",
          tabBarIcon: ({ color, focused }) => (
            <View style={{
              width: 30,
              height: 28,
              borderRadius: 8,
              backgroundColor: focused ? ACTIVE_BG : "transparent",
              alignItems: "center",
              justifyContent: "center",
            }}>
              <IconSymbol size={20} name="chart.bar.fill" color={color} />
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name="sync"
        options={{
          title: "Sync",
          tabBarIcon: ({ color, focused }) => (
            <View style={{
              width: 30,
              height: 28,
              borderRadius: 8,
              backgroundColor: focused ? ACTIVE_BG : "transparent",
              alignItems: "center",
              justifyContent: "center",
            }}>
              <IconSymbol size={20} name="arrow.triangle.2.circlepath" color={color} />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}
