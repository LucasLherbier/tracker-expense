import { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Platform,
  Modal,
  FlatList,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { trpc } from "@/lib/trpc";
import * as Haptics from "expo-haptics";
import { getDefaultCurrency, setDefaultCurrency } from "@/lib/settings-store";
import { SUPPORTED_CURRENCIES } from "@/lib/currency-service";

// Priority currencies shown first in the picker
const PRIORITY_CURRENCIES = ["EUR", "USD", "CAD", "GBP", "CHF"];
const orderedCurrencies = [
  ...SUPPORTED_CURRENCIES.filter((c) => PRIORITY_CURRENCIES.includes(c.code)),
  ...SUPPORTED_CURRENCIES.filter((c) => !PRIORITY_CURRENCIES.includes(c.code)),
];

export default function SyncScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [testing, setTesting] = useState(false);
  const [defaultCurrency, setDefaultCurrencyState] = useState("EUR");
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);

  // Load saved default currency on mount
  useEffect(() => {
    getDefaultCurrency().then(setDefaultCurrencyState);
  }, []);

  const handleSelectDefaultCurrency = async (code: string) => {
    await setDefaultCurrency(code);
    setDefaultCurrencyState(code);
    setShowCurrencyPicker(false);
    if (Platform.OS !== "web") {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

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

        {/* ── Input Currency for new expenses ── */}
        <View style={{ marginHorizontal: 16, marginBottom: 20 }}>
          <Text style={{ fontSize: 13, fontWeight: "700", color: "#9BA1A6", letterSpacing: 0.5, marginBottom: 12 }}>
            ADD EXPENSE — DEFAULT INPUT CURRENCY
          </Text>
          <View style={{ backgroundColor: "#F9FAFB", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "#E5E7EB" }}>
            <Text style={{ fontSize: 13, color: "#9BA1A6", marginBottom: 12, lineHeight: 18 }}>
              Sets the currency pre-selected when you fill in a new expense. All totals and displays across the app always use <Text style={{ fontWeight: "700", color: "#11181C" }}>€ EUR</Text>.
            </Text>
            <TouchableOpacity
              onPress={() => setShowCurrencyPicker(true)}
              style={{
                backgroundColor: "#fff",
                borderRadius: 12,
                borderWidth: 1.5,
                borderColor: "#0a7ea4",
                paddingHorizontal: 16,
                paddingVertical: 14,
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
              }}
            >
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  backgroundColor: "#EFF6FF",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ fontSize: 14, fontWeight: "700", color: "#0a7ea4" }}>
                  {SUPPORTED_CURRENCIES.find((c) => c.code === defaultCurrency)?.symbol || defaultCurrency}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: "600", color: "#11181C" }}>{defaultCurrency}</Text>
                <Text style={{ fontSize: 13, color: "#9BA1A6" }}>
                  {SUPPORTED_CURRENCIES.find((c) => c.code === defaultCurrency)?.name || ""}
                </Text>
              </View>
              <Text style={{ color: "#9BA1A6", fontSize: 14 }}>▾</Text>
            </TouchableOpacity>
          </View>
        </View>


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

      {/* ── Currency Picker Modal ── */}
      <Modal visible={showCurrencyPicker} transparent animationType="slide" onRequestClose={() => setShowCurrencyPicker(false)}>
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)" }}
          activeOpacity={1}
          onPress={() => setShowCurrencyPicker(false)}
        />
        <View
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: "#fff",
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            maxHeight: "70%",
            paddingBottom: 34,
          }}
        >
          <View style={{ alignItems: "center", paddingTop: 12, paddingBottom: 4 }}>
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: "#E5E7EB" }} />
          </View>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              paddingHorizontal: 20,
              paddingVertical: 14,
              borderBottomWidth: 0.5,
              borderBottomColor: "#E5E7EB",
            }}
          >
            <Text style={{ fontSize: 17, fontWeight: "700", color: "#11181C" }}>Default Currency</Text>
            <TouchableOpacity
              onPress={() => setShowCurrencyPicker(false)}
              style={{ backgroundColor: "#F3F4F6", borderRadius: 50, paddingHorizontal: 14, paddingVertical: 6 }}
            >
              <Text style={{ fontSize: 14, color: "#374151", fontWeight: "600" }}>Done</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={orderedCurrencies}
            keyExtractor={(item) => item.code}
            ListHeaderComponent={
              <Text style={{ fontSize: 12, fontWeight: "700", color: "#9BA1A6", letterSpacing: 0.5, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 4 }}>
                POPULAR
              </Text>
            }
            renderItem={({ item, index }) => {
              const isSelected = item.code === defaultCurrency;
              const showDivider = index === PRIORITY_CURRENCIES.length - 1;
              return (
                <>
                  <TouchableOpacity
                    onPress={() => handleSelectDefaultCurrency(item.code)}
                    style={{
                      paddingHorizontal: 20,
                      paddingVertical: 13,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 12,
                      backgroundColor: isSelected ? "#EFF6FF" : "transparent",
                    }}
                  >
                    <View
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        backgroundColor: isSelected ? "#DBEAFE" : "#F3F4F6",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Text style={{ fontSize: 14, fontWeight: "700", color: isSelected ? "#0a7ea4" : "#374151" }}>
                        {item.symbol}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 15, fontWeight: isSelected ? "700" : "500", color: isSelected ? "#0a7ea4" : "#11181C" }}>
                        {item.code}
                      </Text>
                      <Text style={{ fontSize: 13, color: "#9BA1A6" }}>{item.name}</Text>
                    </View>
                    {isSelected && <Text style={{ color: "#0a7ea4", fontSize: 18, fontWeight: "700" }}>✓</Text>}
                  </TouchableOpacity>
                  {showDivider && (
                    <View style={{ marginHorizontal: 20, marginVertical: 4 }}>
                      <View style={{ height: 1, backgroundColor: "#E5E7EB" }} />
                      <Text style={{ fontSize: 12, fontWeight: "700", color: "#9BA1A6", letterSpacing: 0.5, paddingTop: 8 }}>
                        ALL CURRENCIES
                      </Text>
                    </View>
                  )}
                </>
              );
            }}
          />
        </View>
      </Modal>
    </ScreenContainer>
  );
}
