import { useState, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  TextInput,
  Platform,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { trpc } from "@/lib/trpc";
import * as Haptics from "expo-haptics";

const MONTHS_FULL = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

// Month aliases: handles French abbreviations and English names
const MONTH_ALIASES: Record<string, string> = {
  // French full
  janvier: "Janvier", février: "Février", mars: "Mars", avril: "Avril",
  mai: "Mai", juin: "Juin", juillet: "Juillet", août: "Août",
  septembre: "Septembre", octobre: "Octobre", novembre: "Novembre", décembre: "Décembre",
  // French abbreviated
  jan: "Janvier", fév: "Février", fev: "Février", mar: "Mars", avr: "Avril",
  jui: "Juin", juil: "Juillet", aou: "Août", sep: "Septembre",
  oct: "Octobre", nov: "Novembre", déc: "Décembre", dec: "Décembre",
  // English
  january: "Janvier", february: "Février", march: "Mars", april: "Avril",
  may: "Mai", june: "Juin", july: "Juillet", august: "Août",
  september: "Septembre", october: "Octobre", november: "Novembre", december: "Décembre",
};

/**
 * Parse a search query like "Avril 2025" or "2025 avril" into
 * { month: "Avril", year: 2025 }. Returns null if no structured match.
 */
function parseMonthYearQuery(q: string): { month?: string; year?: number } | null {
  const parts = q.trim().toLowerCase().split(/[\s,/-]+/);
  let month: string | undefined;
  let year: number | undefined;
  for (const part of parts) {
    const num = parseInt(part, 10);
    if (!isNaN(num) && num > 1900 && num < 2100) {
      year = num;
    } else if (MONTH_ALIASES[part]) {
      month = MONTH_ALIASES[part];
    }
  }
  if (month || year) return { month, year };
  return null;
}

const CATEGORY_COLORS = [
  "#0a7ea4", "#22C55E", "#F59E0B", "#EF4444", "#8B5CF6",
  "#EC4899", "#14B8A6", "#F97316", "#6366F1", "#84CC16",
];

function getCategoryColor(category: string): string {
  let hash = 0;
  for (let i = 0; i < category.length; i++) {
    hash = (hash * 31 + category.charCodeAt(i)) % CATEGORY_COLORS.length;
  }
  return CATEGORY_COLORS[Math.abs(hash)];
}

type SheetExpense = {
  rowIndex: number;
  amountOriginal: number;
  currency: string;
  day: number;
  month: string;
  year: number;
  amountEur: number;
  category: string;
  note: string;
};

type ListItem =
  | { type: "header"; key: string; title: string; total: number }
  | { type: "expense"; expense: SheetExpense };

export default function JournalScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [deletingRow, setDeletingRow] = useState<number | null>(null);

  const utils = trpc.useUtils();

  const { data: expenses = [], isLoading, error, refetch } = trpc.sheet.allExpenses.useQuery(undefined, {
    staleTime: 60_000,
  });

  const deleteExpense = trpc.sheet.deleteExpense.useMutation({
    onSuccess: () => {
      utils.sheet.allExpenses.invalidate();
      utils.sheet.homeStats.invalidate();
    },
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleDelete = (expense: SheetExpense) => {
    Alert.alert(
      "Delete Expense",
      `Delete € ${expense.amountEur.toFixed(2)} — ${expense.category}\n${expense.day} ${expense.month} ${expense.year}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setDeletingRow(expense.rowIndex);
            try {
              await deleteExpense.mutateAsync({ rowIndex: expense.rowIndex });
              if (Platform.OS !== "web") {
                await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              }
            } catch (err) {
              Alert.alert("Error", err instanceof Error ? err.message : "Failed to delete expense.");
            } finally {
              setDeletingRow(null);
            }
          },
        },
      ]
    );
  };

  // Filter by search query — supports natural language like "Avril 2025"
  const filtered = useMemo(() => {
    if (!search.trim()) return expenses;
    const q = search.toLowerCase().trim();
    const structured = parseMonthYearQuery(q);

    if (structured && (structured.month || structured.year)) {
      // Structured month/year filter
      return (expenses as SheetExpense[]).filter((e) => {
        const monthMatch = structured.month ? e.month === structured.month : true;
        const yearMatch = structured.year ? e.year === structured.year : true;
        return monthMatch && yearMatch;
      });
    }

    // Fallback: free-text search
    return (expenses as SheetExpense[]).filter(
      (e) =>
        e.category.toLowerCase().includes(q) ||
        e.note.toLowerCase().includes(q) ||
        e.month.toLowerCase().includes(q) ||
        String(e.year).includes(q) ||
        e.currency.toLowerCase().includes(q)
    );
  }, [expenses, search]);

  // Group by year + month (newest first), then flatten for FlatList
  const listData: ListItem[] = useMemo(() => {
    const sorted = [...(filtered as SheetExpense[])].sort((a, b) => {
      if (b.year !== a.year) return b.year - a.year;
      const bm = MONTHS_FULL.indexOf(b.month);
      const am = MONTHS_FULL.indexOf(a.month);
      if (bm !== am) return bm - am;
      return b.day - a.day;
    });

    const map = new Map<string, SheetExpense[]>();
    for (const e of sorted) {
      const key = `${e.year}-${e.month}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    }

    const items: ListItem[] = [];
    for (const [key, data] of map.entries()) {
      const total = data.reduce((s, e) => s + e.amountEur, 0);
      items.push({ type: "header", key, title: `${data[0].month} ${data[0].year}`, total });
      for (const expense of data) {
        items.push({ type: "expense", expense });
      }
    }
    return items;
  }, [filtered]);

  const renderItem = ({ item }: { item: ListItem }) => {
    if (item.type === "header") {
      return (
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            paddingHorizontal: 20,
            paddingTop: 20,
            paddingBottom: 8,
          }}
        >
          <Text style={{ fontSize: 15, fontWeight: "700", color: "#374151" }}>{item.title}</Text>
          <Text style={{ fontSize: 14, fontWeight: "700", color: "#0a7ea4" }}>
            € {item.total.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Text>
        </View>
      );
    }

    const { expense } = item;
    const color = getCategoryColor(expense.category);
    const isDeleting = deletingRow === expense.rowIndex;

    return (
      <View
        style={{
          marginHorizontal: 16,
          marginBottom: 8,
          backgroundColor: "#fff",
          borderRadius: 14,
          borderWidth: 1,
          borderColor: "#E5E7EB",
          flexDirection: "row",
          alignItems: "center",
          overflow: "hidden",
          opacity: isDeleting ? 0.5 : 1,
        }}
      >
        {/* Left color accent */}
        <View style={{ width: 4, alignSelf: "stretch", backgroundColor: color }} />

        {/* Content */}
        <View style={{ flex: 1, padding: 13 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={{ fontSize: 15, fontWeight: "600", color: "#11181C" }} numberOfLines={1}>
                {expense.category}
              </Text>
              {expense.note ? (
                <Text style={{ fontSize: 13, color: "#9BA1A6", marginTop: 2 }} numberOfLines={1}>
                  {expense.note}
                </Text>
              ) : null}
              <Text style={{ fontSize: 12, color: "#C9CDD2", marginTop: 3 }}>
                {expense.day} {expense.month} {expense.year}
              </Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={{ fontSize: 16, fontWeight: "700", color: "#11181C" }}>
                € {expense.amountEur.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Text>
              {expense.currency !== "EUR" && (
                <Text style={{ fontSize: 12, color: "#9BA1A6", marginTop: 2 }}>
                  {expense.currency} {expense.amountOriginal.toFixed(2)}
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* Delete button */}
        <TouchableOpacity
          onPress={() => handleDelete(expense)}
          disabled={isDeleting}
          style={{
            paddingHorizontal: 14,
            alignSelf: "stretch",
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "#FEF2F2",
          }}
        >
          {isDeleting ? (
            <ActivityIndicator size="small" color="#EF4444" />
          ) : (
            <Text style={{ fontSize: 16 }}>🗑</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <ScreenContainer>
      {/* ── Header ── */}
      <View style={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 12 }}>
        <Text style={{ fontSize: 13, fontWeight: "600", color: "#9BA1A6", letterSpacing: 1, marginBottom: 4 }}>
          TEAM EXPENSES
        </Text>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ fontSize: 32, fontWeight: "800", color: "#11181C", letterSpacing: -0.5 }}>
            Journal
          </Text>
          {!isLoading && (
            <Text style={{ fontSize: 14, color: "#9BA1A6" }}>
              {(expenses as SheetExpense[]).length.toLocaleString()} entries
            </Text>
          )}
        </View>
      </View>

      {/* ── Search ── */}
      <View style={{ paddingHorizontal: 16, marginBottom: 12 }}>
        <View
          style={{
            backgroundColor: "#F3F4F6",
            borderRadius: 12,
            paddingHorizontal: 14,
            paddingVertical: 10,
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Text style={{ fontSize: 15, color: "#9BA1A6" }}>🔍</Text>
          <TextInput
            style={{ flex: 1, fontSize: 15, color: "#11181C" }}
            placeholder="Search: Avril 2025, Restaurant, note…"
            placeholderTextColor="#9BA1A6"
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Text style={{ fontSize: 15, color: "#9BA1A6" }}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── Loading ── */}
      {isLoading && (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12 }}>
          <ActivityIndicator size="large" color="#0a7ea4" />
          <Text style={{ fontSize: 15, color: "#9BA1A6" }}>Loading from Google Sheets…</Text>
        </View>
      )}

      {/* ── Error ── */}
      {error && !isLoading && (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, gap: 12 }}>
          <Text style={{ fontSize: 40 }}>⚠️</Text>
          <Text style={{ fontSize: 15, color: "#EF4444", textAlign: "center" }}>{error.message}</Text>
          <TouchableOpacity
            onPress={() => refetch()}
            style={{ backgroundColor: "#0a7ea4", borderRadius: 12, paddingHorizontal: 20, paddingVertical: 10 }}
          >
            <Text style={{ color: "#fff", fontWeight: "700" }}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── List ── */}
      {!isLoading && !error && (
        <FlatList
          data={listData}
          keyExtractor={(item, idx) =>
            item.type === "header"
              ? `header-${item.key}`
              : `expense-${item.expense.rowIndex}-${idx}`
          }
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0a7ea4" />}
          contentContainerStyle={{ paddingBottom: 100 }}
          initialNumToRender={30}
          maxToRenderPerBatch={50}
          windowSize={10}
          ListEmptyComponent={
            <View style={{ alignItems: "center", paddingTop: 60, gap: 12 }}>
              <Text style={{ fontSize: 48 }}>📋</Text>
              <Text style={{ fontSize: 17, fontWeight: "700", color: "#11181C" }}>
                {search ? "No results found" : "No expenses yet"}
              </Text>
              <Text style={{ fontSize: 14, color: "#9BA1A6" }}>
                {search ? "Try a different search term" : "Add your first expense to get started"}
              </Text>
            </View>
          }
        />
      )}
    </ScreenContainer>
  );
}
