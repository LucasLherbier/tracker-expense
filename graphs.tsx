import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Platform,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { trpc } from "@/lib/trpc";
import * as Haptics from "expo-haptics";

export default function SyncScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [testing, setTesting] = useState(false);

  const utils = trpc.useUtils();

  const { data: status, isLoading: statusLoading, refetch: refetchStatus } =
    trpc.sheet.status.useQuery(undefined, { staleTime: 30_000 });

  const { data: stats, isLoading: statsLoading, refetch: refetchStats } =
    trpc.sheet.homeStats.useQuery(undefined, {
      enabled: status?.connected === true,
      staleTime: 60_000,
    });

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchStatus(), refetchStats()]);
    setRefreshing(false);
  };

  const handleTestConnection = async () => {
    setTesting(true);
    try {
      await refetchStats();
      if (Platform.OS !== "web") {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      Alert.alert(
        "✓ Connection OK",
        `Successfully read data from your Google Sheet.`
      );
    } catch (err) {
      Alert.alert("Connection Failed", err instanceof Error ? err.message : "Could not reach Google Sheets.");
    } finally {
      setTesting(false);
    }
  };

  const handleRefreshAll = async () => {
    await utils.sheet.allExpenses.invalidate();
    await utils.sheet.homeStats.invalidate();
    await utils.sheet.availableYears.invalidate();
    if (Platform.OS !== "web") {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    Alert.alert("✓ Refreshed", "All data has been refreshed from your Google Sheet.");
  };

  const isConnected = status?.connected ?? false;

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0a7ea4" />}
      >
        {/* ── Header ── */}
        <View style={{ paddingHorizontal: 20, paddingTop: 24, marginBottom: 24 }}>
          <Text style={{ fontSize: 13, fontWeight: "600", color: "#9BA1A6", letterSpacing: 1, marginBottom: 4 }}>
            TEAM EXPENSES
          </Text>
          <Text style={{ fontSize: 32, fontWeight: "800", color: "#11181C", letterSpacing: -0.5 }}>
            Sync
          </Text>
        </View>

        {/* ── Status card ── */}
        <View style={{ marginHorizontal: 16, marginBottom: 20 }}>
          {statusLoading ? (
            <View style={{ backgroundColor: "#F9FAFB", borderRadius: 16, padding: 20, borderWidth: 1, borderColor: "#E5E7EB", alignItems: "center" }}>
              <ActivityIndicator color="#0a7ea4" />
              <Text style={{ marginTop: 8, color: "#9BA1A6", fontSize: 14 }}>Checking connection…</Text>
            </View>
          ) : (
            <View
              style={{
                backgroundColor: isConnected ? "#F0FDF4" : "#FFF7ED",
                borderRadius: 16,
                padding: 20,
                borderWidth: 1,
                borderColor: isConnected ? "#BBF7D0" : "#FED7AA",
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: isConnected ? 14 : 0 }}>
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    backgroundColor: isConnected ? "#16A34A" : "#D97706",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text style={{ fontSize: 22, color: "#fff" }}>{isConnected ? "✓" : "⚙"}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: "700", color: isConnected ? "#15803D" : "#92400E" }}>
                    {isConnected ? "Connected via Service Account" : "Service Account Not Configured"}
                  </Text>
                  <Text style={{ fontSize: 13, color: isConnected ? "#16A34A" : "#D97706", marginTop: 2 }}>
                    {isConnected
                      ? "Google Sheet is the live data source"
                      : "Follow the setup steps below"}
                  </Text>
                </View>
              </View>

              {isConnected && !statsLoading && stats && (
                <View
                  style={{
                    backgroundColor: "rgba(255,255,255,0.6)",
                    borderRadius: 10,
                    padding: 12,
                    flexDirection: "row",
                    justifyContent: "space-around",
                  }}
                >
                  <View style={{ alignItems: "center" }}>
                    <Text style={{ fontSize: 24, fontWeight: "800", color: "#15803D" }}>
                      {stats.currentYearExpenseCount.toLocaleString()}
                    </Text>
                    <Text style={{ fontSize: 12, color: "#16A34A" }}>entries this year</Text>
                  </View>
                  <View style={{ width: 1, backgroundColor: "#BBF7D0" }} />
                  <View style={{ alignItems: "center" }}>
                    <Text style={{ fontSize: 24, fontWeight: "800", color: "#15803D" }}>
                      € {stats.currentYearTotal.toLocaleString("fr-FR", { maximumFractionDigits: 0 })}
                    </Text>
                    <Text style={{ fontSize: 12, color: "#16A34A" }}>year total</Text>
                  </View>
                </View>
              )}
            </View>
          )}
        </View>

        {/* ── How it works ── */}
        <View style={{ marginHorizontal: 16, marginBottom: 20 }}>
          <Text style={{ fontSize: 13, fontWeight: "700", color: "#9BA1A6", letterSpacing: 0.5, marginBottom: 12 }}>
            HOW IT WORKS
          </Text>
          <View style={{ backgroundColor: "#F9FAFB", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "#E5E7EB", gap: 14 }}>
            {[
              { icon: "📊", title: "Live data", desc: "All screens (Home, Journal, Metrics) read directly from your Google Sheet — no local copy." },
              { icon: "✏️", title: "Direct write", desc: "Adding an expense writes it immediately to the Journal tab of your sheet." },
              { icon: "🗑", title: "Delete", desc: "Deleting in the Journal tab removes the row directly from the sheet." },
              { icon: "🔄", title: "Refresh", desc: "Pull down on any screen to reload the latest data from the sheet." },
            ].map((item) => (
              <View key={item.title} style={{ flexDirection: "row", gap: 12, alignItems: "flex-start" }}>
                <Text style={{ fontSize: 22, width: 32, textAlign: "center" }}>{item.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: "700", color: "#11181C" }}>{item.title}</Text>
                  <Text style={{ fontSize: 13, color: "#9BA1A6", marginTop: 2, lineHeight: 18 }}>{item.desc}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* ── Actions (only when connected) ── */}
        {isConnected && (
          <View style={{ marginHorizontal: 16, marginBottom: 20, gap: 12 }}>
            <Text style={{ fontSize: 13, fontWeight: "700", color: "#9BA1A6", letterSpacing: 0.5, marginBottom: 4 }}>
              ACTIONS
            </Text>

            <TouchableOpacity
              onPress={handleTestConnection}
              disabled={testing}
              style={{
                backgroundColor: "#0a7ea4",
                borderRadius: 14,
                paddingVertical: 16,
                alignItems: "center",
                flexDirection: "row",
                justifyContent: "center",
                gap: 8,
                opacity: testing ? 0.6 : 1,
              }}
            >
              {testing ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}>🔌  Test Connection</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleRefreshAll}
              style={{
                backgroundColor: "#F9FAFB",
                borderRadius: 14,
                paddingVertical: 16,
                alignItems: "center",
                flexDirection: "row",
                justifyContent: "center",
                gap: 8,
                borderWidth: 1,
                borderColor: "#E5E7EB",
              }}
            >
              <Text style={{ color: "#374151", fontSize: 16, fontWeight: "600" }}>🔄  Refresh All Data</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Column reference ── */}
        {isConnected && (
          <View style={{ marginHorizontal: 16, marginBottom: 20 }}>
            <Text style={{ fontSize: 13, fontWeight: "700", color: "#9BA1A6", letterSpacing: 0.5, marginBottom: 12 }}>
              SHEET COLUMN ORDER
            </Text>
            <View style={{ backgroundColor: "#F9FAFB", borderRadius: 14, padding: 16, borderWidth: 1, borderColor: "#E5E7EB" }}>
              {[
                { col: "A", label: "Amount (original)" },
                { col: "B", label: "Currency" },
                { col: "C", label: "Day" },
                { col: "D", label: "Month" },
                { col: "E", label: "Year" },
                { col: "F", label: "Amount in EUR" },
                { col: "G", label: "Category" },
                { col: "H", label: "Note" },
              ].map((item) => (
                <View
                  key={item.col}
                  style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 5 }}
                >
                  <View
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 6,
                      backgroundColor: "#0a7ea4",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text style={{ color: "#fff", fontSize: 13, fontWeight: "700" }}>{item.col}</Text>
                  </View>
                  <Text style={{ fontSize: 14, color: "#374151" }}>{item.label}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── Setup instructions (if not connected) ── */}
        {!isConnected && !statusLoading && (
          <View style={{ marginHorizontal: 16 }}>
            <Text style={{ fontSize: 13, fontWeight: "700", color: "#9BA1A6", letterSpacing: 0.5, marginBottom: 12 }}>
              SETUP INSTRUCTIONS
            </Text>
            <View style={{ backgroundColor: "#F9FAFB", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "#E5E7EB", gap: 16 }}>
              {[
                {
                  step: "1",
                  title: "Create a Service Account",
                  desc: "Go to Google Cloud Console → IAM & Admin → Service Accounts → Create Service Account.",
                },
                {
                  step: "2",
                  title: "Download JSON key",
                  desc: "Click your service account → Keys tab → Add Key → Create new key → JSON.",
                },
                {
                  step: "3",
                  title: "Share your Google Sheet",
                  desc: "Open your sheet → Share → add the service account email (client_email from JSON) with Editor access.",
                },
                {
                  step: "4",
                  title: "Add credentials to app",
                  desc: "In Manus Management UI → Settings → Secrets, add GOOGLE_SA_EMAIL and GOOGLE_SA_PRIVATE_KEY from the JSON file.",
                },
              ].map((item) => (
                <View key={item.step} style={{ flexDirection: "row", gap: 12 }}>
                  <View
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 14,
                      backgroundColor: "#0a7ea4",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Text style={{ color: "#fff", fontSize: 13, fontWeight: "700" }}>{item.step}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: "700", color: "#11181C" }}>{item.title}</Text>
                    <Text style={{ fontSize: 13, color: "#9BA1A6", marginTop: 3, lineHeight: 18 }}>{item.desc}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}
