import { useState } from "react";
import {
  ScrollView,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { trpc } from "@/lib/trpc";
import { useRouter } from "expo-router";
import { getCategoryConfig, getCategoryColor } from "@/lib/category-config";

export default function HomeScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const { data: stats, isLoading, error, refetch } = trpc.sheet.homeStats.useQuery(undefined, {
    staleTime: 60_000,
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const now = new Date();
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  const currentMonthLabel = `${monthNames[now.getMonth()]} ${now.getFullYear()}`;

  if (isLoading) {
    return (
      <ScreenContainer>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12 }}>
          <ActivityIndicator size="large" color="#0a7ea4" />
          <Text style={{ fontSize: 15, color: "#9BA1A6" }}>Loading from Google Sheets…</Text>
        </View>
      </ScreenContainer>
    );
  }

  if (error) {
    return (
      <ScreenContainer>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, gap: 12 }}>
          <Text style={{ fontSize: 40 }}>⚠️</Text>
          <Text style={{ fontSize: 17, fontWeight: "700", color: "#11181C", textAlign: "center" }}>
            Could not load data
          </Text>
          <Text style={{ fontSize: 14, color: "#9BA1A6", textAlign: "center", lineHeight: 20 }}>
            {error.message}
          </Text>
          <TouchableOpacity
            onPress={() => refetch()}
            style={{ backgroundColor: "#0a7ea4", borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12, marginTop: 8 }}
          >
            <Text style={{ color: "#fff", fontWeight: "700" }}>Retry</Text>
          </TouchableOpacity>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0a7ea4" />}
      >
        {/* ── Header ── */}
        <View style={{ paddingHorizontal: 20, paddingTop: 24, marginBottom: 20 }}>
          <Text style={{ fontSize: 13, fontWeight: "600", color: "#9BA1A6", letterSpacing: 1, marginBottom: 4 }}>
            TEAM EXPENSES
          </Text>
          <Text style={{ fontSize: 32, fontWeight: "800", color: "#11181C", letterSpacing: -0.5 }}>
            Overview
          </Text>
        </View>

        {/* ── Current month hero card ── */}
        <View style={{ marginHorizontal: 16, marginBottom: 12 }}>
          <View style={{ backgroundColor: "#0a7ea4", borderRadius: 20, padding: 22 }}>
            <Text style={{ fontSize: 13, color: "rgba(255,255,255,0.75)", fontWeight: "600", letterSpacing: 0.5, marginBottom: 6 }}>
              {currentMonthLabel.toUpperCase()}
            </Text>
            <Text style={{ fontSize: 44, fontWeight: "800", color: "#fff", letterSpacing: -1 }}>
              € {(stats?.currentMonthTotal ?? 0).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
            <Text style={{ fontSize: 14, color: "rgba(255,255,255,0.7)", marginTop: 6 }}>
              {stats?.currentMonthExpenseCount ?? 0} expense{(stats?.currentMonthExpenseCount ?? 0) !== 1 ? "s" : ""} this month
            </Text>
          </View>
        </View>

        {/* ── Year total ── */}
        <View style={{ marginHorizontal: 16, marginBottom: 20 }}>
          <View
            style={{
              backgroundColor: "#F9FAFB",
              borderRadius: 16,
              padding: 16,
              borderWidth: 1,
              borderColor: "#E5E7EB",
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <View>
              <Text style={{ fontSize: 13, color: "#9BA1A6", marginBottom: 4 }}>{now.getFullYear()} total</Text>
              <Text style={{ fontSize: 26, fontWeight: "800", color: "#11181C" }}>
                € {(stats?.currentYearTotal ?? 0).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={{ fontSize: 13, color: "#9BA1A6", marginBottom: 4 }}>expenses</Text>
              <Text style={{ fontSize: 26, fontWeight: "800", color: "#374151" }}>
                {stats?.currentYearExpenseCount ?? 0}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Category breakdown ── */}
        {(stats?.categoryBreakdown?.length ?? 0) > 0 && (
          <View style={{ marginHorizontal: 16, marginBottom: 20 }}>
            <Text style={{ fontSize: 13, fontWeight: "700", color: "#9BA1A6", letterSpacing: 0.5, marginBottom: 12 }}>
              {monthNames[now.getMonth()].toUpperCase()} BY CATEGORY
            </Text>
            <View style={{ backgroundColor: "#F9FAFB", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "#E5E7EB", gap: 14 }}>
              {stats!.categoryBreakdown.map((item, idx) => (
                <View key={item.category}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <Text style={{ fontSize: 18 }}>{getCategoryConfig(item.category).icon}</Text>
                      <Text style={{ fontSize: 14, fontWeight: "600", color: "#374151" }}>{item.category}</Text>
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <Text style={{ fontSize: 14, fontWeight: "700", color: "#11181C" }}>
                        € {item.total.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </Text>
                      <Text style={{ fontSize: 12, color: "#9BA1A6", width: 34, textAlign: "right" }}>
                        {item.percentage}%
                      </Text>
                    </View>
                  </View>
                  <View style={{ height: 6, backgroundColor: "#E5E7EB", borderRadius: 3, overflow: "hidden" }}>
                    <View
                      style={{
                        height: 6,
                        width: `${item.percentage}%`,
                        backgroundColor: getCategoryColor(item.category, idx),
                        borderRadius: 3,
                      }}
                    />
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── Recent expenses (current month, up to 10) ── */}
        {(stats?.recentExpenses?.length ?? 0) > 0 && (
          <View style={{ marginHorizontal: 16, marginBottom: 20 }}>
            <View style={{ marginBottom: 12 }}>
              <Text style={{ fontSize: 17, fontWeight: "700", color: "#11181C" }}>
                {monthNames[now.getMonth()]} Expenses
              </Text>
            </View>
            <View style={{ gap: 8 }}>
              {stats!.recentExpenses.map((expense, idx) => (
                <View
                  key={`${expense.rowIndex}-${idx}`}
                  style={{
                    backgroundColor: "#fff",
                    borderRadius: 14,
                    padding: 14,
                    borderWidth: 1,
                    borderColor: "#E5E7EB",
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 12,
                      backgroundColor: getCategoryConfig(expense.category).bgColor,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text style={{ fontSize: 20 }}>{getCategoryConfig(expense.category).icon}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: "600", color: "#11181C" }} numberOfLines={1}>
                      {expense.category}
                    </Text>
                    <Text style={{ fontSize: 13, color: "#9BA1A6", marginTop: 2 }}>
                      {expense.day} {expense.month} {expense.year}
                      {expense.note ? `  ·  ${expense.note}` : ""}
                    </Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={{ fontSize: 16, fontWeight: "700", color: "#11181C" }}>
                      € {expense.amountEur.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </Text>
                    {expense.currency !== "EUR" && (
                      <Text style={{ fontSize: 12, color: "#9BA1A6" }}>
                        {expense.currency} {expense.amountOriginal.toFixed(2)}
                      </Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── Empty state ── */}
        {!isLoading && (stats?.currentYearExpenseCount ?? 0) === 0 && (
          <View style={{ alignItems: "center", paddingTop: 60, gap: 12 }}>
            <Text style={{ fontSize: 48 }}>📊</Text>
            <Text style={{ fontSize: 17, fontWeight: "700", color: "#11181C" }}>No expenses yet</Text>
            <Text style={{ fontSize: 14, color: "#9BA1A6" }}>Add your first expense to get started</Text>
          </View>
        )}

        {/* ── Add button ── */}
        <View style={{ paddingHorizontal: 16 }}>
          <TouchableOpacity
            onPress={() => router.push("/(tabs)/add-expense")}
            style={{
              backgroundColor: "#0a7ea4",
              borderRadius: 16,
              paddingVertical: 18,
              alignItems: "center",
              flexDirection: "row",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <Text style={{ color: "#fff", fontSize: 18, fontWeight: "700" }}>+ Add Expense</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
