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
  Modal,
  ScrollView,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { trpc } from "@/lib/trpc";
import * as Haptics from "expo-haptics";
import {
  convertToEUR,
  SUPPORTED_CURRENCIES,
  MONTHS,
} from "@/lib/currency-service";
import { getCategoryConfig, CATEGORY_NAMES } from "@/lib/category-config";

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

const PRIORITY_CURRENCIES = ["EUR", "USD", "CAD", "GBP", "CHF"];
const orderedCurrencies = [
  ...SUPPORTED_CURRENCIES.filter((c) => PRIORITY_CURRENCIES.includes(c.code)),
  ...SUPPORTED_CURRENCIES.filter((c) => !PRIORITY_CURRENCIES.includes(c.code)),
];

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

// ─── Mini picker modals used inside the edit sheet ───────────────────────────

function PickerModal<T extends string | number>({
  visible,
  title,
  items,
  selected,
  onSelect,
  onClose,
}: {
  visible: boolean;
  title: string;
  items: { label: string; value: T }[];
  selected: T;
  onSelect: (v: T) => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity
        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)" }}
        activeOpacity={1}
        onPress={onClose}
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
          maxHeight: "60%",
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
          <Text style={{ fontSize: 17, fontWeight: "700", color: "#11181C" }}>{title}</Text>
          <TouchableOpacity
            onPress={onClose}
            style={{ backgroundColor: "#F3F4F6", borderRadius: 50, paddingHorizontal: 14, paddingVertical: 6 }}
          >
            <Text style={{ fontSize: 14, color: "#374151", fontWeight: "600" }}>Done</Text>
          </TouchableOpacity>
        </View>
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.value)}
          renderItem={({ item }) => {
            const isSel = item.value === selected;
            return (
              <TouchableOpacity
                onPress={() => { onSelect(item.value); onClose(); }}
                style={{
                  paddingHorizontal: 20,
                  paddingVertical: 14,
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  backgroundColor: isSel ? "#EFF6FF" : "transparent",
                }}
              >
                <Text style={{ fontSize: 16, color: isSel ? "#0a7ea4" : "#11181C", fontWeight: isSel ? "600" : "400" }}>
                  {item.label}
                </Text>
                {isSel && <Text style={{ color: "#0a7ea4", fontSize: 18, fontWeight: "700" }}>✓</Text>}
              </TouchableOpacity>
            );
          }}
        />
      </View>
    </Modal>
  );
}

// ─── Edit Expense Modal ───────────────────────────────────────────────────────

function EditExpenseModal({
  expense,
  onClose,
  onSaved,
}: {
  expense: SheetExpense;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [day, setDay] = useState(String(expense.day));
  const [month, setMonth] = useState(expense.month);
  const [year, setYear] = useState(String(expense.year));
  const [amount, setAmount] = useState(String(expense.amountOriginal));
  const [currency, setCurrency] = useState(expense.currency);
  const [amountEur, setAmountEur] = useState(String(expense.amountEur));
  const [category, setCategory] = useState(expense.category);
  const [note, setNote] = useState(expense.note);
  const [converting, setConverting] = useState(false);
  const [saving, setSaving] = useState(false);

  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  const updateExpense = trpc.sheet.updateExpense.useMutation();
  const utils = trpc.useUtils();

  const handleAmountChange = (val: string) => {
    setAmount(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num > 0) {
      convertAmount(num, currency);
    } else {
      setAmountEur("");
    }
  };

  const handleCurrencyChange = (code: string) => {
    setCurrency(code);
    const num = parseFloat(amount);
    if (!isNaN(num) && num > 0) {
      convertAmount(num, code);
    }
  };

  const convertAmount = async (num: number, fromCurrency: string) => {
    setConverting(true);
    try {
      const result = await convertToEUR(num, fromCurrency);
      setAmountEur(result.amountEur.toFixed(2));
    } catch {
      // keep previous value
    } finally {
      setConverting(false);
    }
  };

  const handleSave = async () => {
    if (!day || !month || !year) return Alert.alert("Validation", "Please enter a valid date.");
    const amtNum = parseFloat(amount);
    if (!amount || isNaN(amtNum) || amtNum <= 0) return Alert.alert("Validation", "Please enter a valid amount.");
    if (!category) return Alert.alert("Validation", "Please select a category.");
    if (!amountEur) return Alert.alert("Please wait", "Currency conversion is still in progress.");

    setSaving(true);
    try {
      await updateExpense.mutateAsync({
        rowIndex: expense.rowIndex,
        day: parseInt(day),
        month,
        year: parseInt(year),
        amountOriginal: amtNum,
        currency,
        amountEur: parseFloat(amountEur),
        category,
        note: note || undefined,
      });

      utils.sheet.allExpenses.invalidate();
      utils.sheet.homeStats.invalidate();

      if (Platform.OS !== "web") {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      onSaved();
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : "Failed to save changes.");
    } finally {
      setSaving(false);
    }
  };

  const selectedCurrencyInfo = orderedCurrencies.find((c) => c.code === currency);
  const selectedCatCfg = getCategoryConfig(category);

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "#F9FAFB" }}>
        {/* Header */}
        <View
          style={{
            backgroundColor: "#fff",
            paddingTop: Platform.OS === "ios" ? 56 : 24,
            paddingBottom: 16,
            paddingHorizontal: 20,
            borderBottomWidth: 1,
            borderBottomColor: "#E5E7EB",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <TouchableOpacity onPress={onClose}>
            <Text style={{ fontSize: 16, color: "#0a7ea4", fontWeight: "600" }}>Cancel</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 17, fontWeight: "700", color: "#11181C" }}>Edit Expense</Text>
          <TouchableOpacity onPress={handleSave} disabled={saving || converting}>
            {saving ? (
              <ActivityIndicator size="small" color="#0a7ea4" />
            ) : (
              <Text style={{ fontSize: 16, color: saving || converting ? "#9BA1A6" : "#0a7ea4", fontWeight: "700" }}>
                Save
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Date */}
          <Text style={{ fontSize: 13, fontWeight: "600", color: "#9BA1A6", letterSpacing: 0.5, marginBottom: 8 }}>
            DATE
          </Text>
          <View style={{ flexDirection: "row", gap: 10, marginBottom: 20 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 12, color: "#9BA1A6", marginBottom: 6 }}>Day</Text>
              <TextInput
                style={{
                  backgroundColor: "#fff",
                  borderWidth: 1.5,
                  borderColor: "#E5E7EB",
                  borderRadius: 12,
                  paddingHorizontal: 14,
                  paddingVertical: 13,
                  fontSize: 16,
                  color: "#11181C",
                  fontWeight: "500",
                  textAlign: "center",
                }}
                value={day}
                onChangeText={setDay}
                keyboardType="number-pad"
                placeholder="DD"
                placeholderTextColor="#C9CDD2"
                maxLength={2}
              />
            </View>
            <View style={{ flex: 2 }}>
              <Text style={{ fontSize: 12, color: "#9BA1A6", marginBottom: 6 }}>Month</Text>
              <TouchableOpacity
                onPress={() => setShowMonthPicker(true)}
                style={{
                  backgroundColor: "#fff",
                  borderWidth: 1.5,
                  borderColor: "#E5E7EB",
                  borderRadius: 12,
                  paddingHorizontal: 14,
                  paddingVertical: 13,
                  flexDirection: "row",
                  alignItems: "center",
                }}
              >
                <Text style={{ flex: 1, fontSize: 15, color: "#11181C", fontWeight: "500" }}>{month}</Text>
                <Text style={{ color: "#9BA1A6" }}>▾</Text>
              </TouchableOpacity>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 12, color: "#9BA1A6", marginBottom: 6 }}>Year</Text>
              <TextInput
                style={{
                  backgroundColor: "#fff",
                  borderWidth: 1.5,
                  borderColor: "#E5E7EB",
                  borderRadius: 12,
                  paddingHorizontal: 14,
                  paddingVertical: 13,
                  fontSize: 16,
                  color: "#11181C",
                  fontWeight: "500",
                  textAlign: "center",
                }}
                value={year}
                onChangeText={setYear}
                keyboardType="number-pad"
                placeholder="YYYY"
                placeholderTextColor="#C9CDD2"
                maxLength={4}
              />
            </View>
          </View>

          {/* Amount */}
          <Text style={{ fontSize: 13, fontWeight: "600", color: "#9BA1A6", letterSpacing: 0.5, marginBottom: 8 }}>
            AMOUNT
          </Text>
          <TextInput
            style={{
              backgroundColor: "#fff",
              borderWidth: 1.5,
              borderColor: "#E5E7EB",
              borderRadius: 12,
              paddingHorizontal: 16,
              paddingVertical: 14,
              fontSize: 26,
              color: "#11181C",
              fontWeight: "700",
              marginBottom: 10,
            }}
            value={amount}
            onChangeText={handleAmountChange}
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor="#C9CDD2"
          />

          {/* Currency */}
          <Text style={{ fontSize: 12, color: "#9BA1A6", marginBottom: 6 }}>Currency</Text>
          <TouchableOpacity
            onPress={() => setShowCurrencyPicker(true)}
            style={{
              backgroundColor: "#fff",
              borderWidth: 1.5,
              borderColor: "#E5E7EB",
              borderRadius: 12,
              paddingHorizontal: 14,
              paddingVertical: 13,
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              marginBottom: 10,
            }}
          >
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                backgroundColor: "#EFF6FF",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: "700", color: "#0a7ea4" }}>
                {selectedCurrencyInfo?.symbol ?? currency}
              </Text>
            </View>
            <Text style={{ flex: 1, fontSize: 15, color: "#11181C", fontWeight: "500" }}>
              {currency}  —  {selectedCurrencyInfo?.name ?? ""}
            </Text>
            <Text style={{ color: "#9BA1A6" }}>▾</Text>
          </TouchableOpacity>

          {/* Conversion indicator */}
          {converting && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <ActivityIndicator size="small" color="#0a7ea4" />
              <Text style={{ fontSize: 14, color: "#9BA1A6" }}>Converting…</Text>
            </View>
          )}
          {amountEur !== "" && !converting && (
            <View
              style={{
                backgroundColor: currency === "EUR" ? "#F0FDF4" : "#EFF6FF",
                borderRadius: 12,
                padding: 12,
                borderWidth: 1,
                borderColor: currency === "EUR" ? "#BBF7D0" : "#BFDBFE",
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                marginBottom: 20,
              }}
            >
              <Text style={{ fontSize: 20, fontWeight: "800", color: currency === "EUR" ? "#16A34A" : "#0a7ea4" }}>
                € {parseFloat(amountEur).toFixed(2)}
              </Text>
            </View>
          )}

          {/* Category */}
          <Text style={{ fontSize: 13, fontWeight: "600", color: "#9BA1A6", letterSpacing: 0.5, marginBottom: 8 }}>
            CATEGORY
          </Text>
          <TouchableOpacity
            onPress={() => setShowCategoryPicker(true)}
            style={{
              backgroundColor: "#fff",
              borderWidth: 1.5,
              borderColor: "#E5E7EB",
              borderRadius: 12,
              paddingHorizontal: 14,
              paddingVertical: 13,
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              marginBottom: 20,
            }}
          >
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                backgroundColor: selectedCatCfg?.bgColor ?? "#F3F4F6",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ fontSize: 20 }}>{selectedCatCfg?.icon ?? "📦"}</Text>
            </View>
            <Text style={{ flex: 1, fontSize: 15, color: "#11181C", fontWeight: "500" }}>{category}</Text>
            <Text style={{ color: "#9BA1A6" }}>▾</Text>
          </TouchableOpacity>

          {/* Note */}
          <Text style={{ fontSize: 13, fontWeight: "600", color: "#9BA1A6", letterSpacing: 0.5, marginBottom: 8 }}>
            NOTE (OPTIONAL)
          </Text>
          <TextInput
            style={{
              backgroundColor: "#fff",
              borderWidth: 1.5,
              borderColor: "#E5E7EB",
              borderRadius: 12,
              paddingHorizontal: 16,
              paddingVertical: 14,
              fontSize: 16,
              color: "#11181C",
              minHeight: 80,
              textAlignVertical: "top",
              marginBottom: 28,
            }}
            value={note}
            onChangeText={setNote}
            placeholder="Add a description…"
            placeholderTextColor="#C9CDD2"
            multiline
            numberOfLines={3}
          />

          {/* Save button */}
          <TouchableOpacity
            onPress={handleSave}
            disabled={saving || converting}
            style={{
              backgroundColor: "#0a7ea4",
              borderRadius: 16,
              paddingVertical: 17,
              alignItems: "center",
              opacity: saving || converting ? 0.5 : 1,
            }}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={{ color: "#fff", fontSize: 17, fontWeight: "700" }}>Save Changes</Text>
            )}
          </TouchableOpacity>
        </ScrollView>

        {/* Sub-pickers */}
        <PickerModal
          visible={showMonthPicker}
          title="Select Month"
          items={MONTHS.map((m) => ({ label: m, value: m }))}
          selected={month}
          onSelect={setMonth}
          onClose={() => setShowMonthPicker(false)}
        />
        <PickerModal
          visible={showCurrencyPicker}
          title="Select Currency"
          items={orderedCurrencies.map((c) => ({ label: `${c.code}  —  ${c.name}`, value: c.code }))}
          selected={currency}
          onSelect={handleCurrencyChange}
          onClose={() => setShowCurrencyPicker(false)}
        />
        <PickerModal
          visible={showCategoryPicker}
          title="Select Category"
          items={CATEGORY_NAMES.map((n) => ({ label: n, value: n }))}
          selected={category}
          onSelect={setCategory}
          onClose={() => setShowCategoryPicker(false)}
        />
      </View>
    </Modal>
  );
}

// ─── Main Journal Screen ──────────────────────────────────────────────────────

export default function JournalScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [deletingRow, setDeletingRow] = useState<number | null>(null);
  const [editingExpense, setEditingExpense] = useState<SheetExpense | null>(null);

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
      return (expenses as SheetExpense[]).filter((e) => {
        const monthMatch = structured.month ? e.month === structured.month : true;
        const yearMatch = structured.year ? e.year === structured.year : true;
        return monthMatch && yearMatch;
      });
    }

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

        {/* Content — tappable to edit */}
        <TouchableOpacity
          style={{ flex: 1, padding: 13 }}
          onPress={() => setEditingExpense(expense)}
          activeOpacity={0.7}
        >
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
              {/* Edit hint */}
              <Text style={{ fontSize: 11, color: "#C9CDD2", marginTop: 3 }}>✏️ tap to edit</Text>
            </View>
          </View>
        </TouchableOpacity>

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

      {/* ── Edit Modal ── */}
      {editingExpense && (
        <EditExpenseModal
          expense={editingExpense}
          onClose={() => setEditingExpense(null)}
          onSaved={() => setEditingExpense(null)}
        />
      )}
    </ScreenContainer>
  );
}
