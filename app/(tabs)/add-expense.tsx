import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
  Modal,
  FlatList,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { trpc } from "@/lib/trpc";
import {
  convertToEUR,
  SUPPORTED_CURRENCIES,
  MONTHS,
  getMonthName,
} from "@/lib/currency-service";
import { getCategoryConfig, CATEGORY_NAMES } from "@/lib/category-config";
import { getDefaultCurrency } from "@/lib/settings-store";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";

// ─── Priority currencies shown first ─────────────────────────────────────────
const PRIORITY_CURRENCIES = ["EUR", "USD", "CAD"];
const orderedCurrencies = [
  ...SUPPORTED_CURRENCIES.filter((c) => PRIORITY_CURRENCIES.includes(c.code)),
  ...SUPPORTED_CURRENCIES.filter((c) => !PRIORITY_CURRENCIES.includes(c.code)),
];

// ─── Generic bottom-sheet picker ─────────────────────────────────────────────
function PickerModal<T extends string | number>({
  visible,
  title,
  items,
  selected,
  onSelect,
  onClose,
  renderItem,
}: {
  visible: boolean;
  title: string;
  items: { label: string; value: T; icon?: string; color?: string; bgColor?: string }[];
  selected: T;
  onSelect: (value: T) => void;
  onClose: () => void;
  renderItem?: (item: { label: string; value: T; icon?: string; color?: string; bgColor?: string }, isSelected: boolean) => React.ReactNode;
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
          maxHeight: "70%",
          paddingBottom: 34,
        }}
      >
        {/* Drag handle */}
        <View style={{ alignItems: "center", paddingTop: 12, paddingBottom: 4 }}>
          <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: "#E5E7EB" }} />
        </View>
        {/* Header */}
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
            const isSelected = item.value === selected;
            if (renderItem) return <>{renderItem(item, isSelected)}</>;
            return (
              <TouchableOpacity
                onPress={() => { onSelect(item.value); onClose(); }}
                style={{
                  paddingHorizontal: 20,
                  paddingVertical: 15,
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  backgroundColor: isSelected ? "#EFF6FF" : "transparent",
                }}
              >
                <Text style={{ fontSize: 16, color: isSelected ? "#0a7ea4" : "#11181C", fontWeight: isSelected ? "600" : "400" }}>
                  {item.label}
                </Text>
                {isSelected && <Text style={{ color: "#0a7ea4", fontSize: 18, fontWeight: "700" }}>✓</Text>}
              </TouchableOpacity>
            );
          }}
        />
      </View>
    </Modal>
  );
}

// ─── Field label ──────────────────────────────────────────────────────────────
function FieldLabel({ label }: { label: string }) {
  return (
    <Text style={{ fontSize: 13, fontWeight: "600", color: "#9BA1A6", letterSpacing: 0.5, marginBottom: 8 }}>
      {label.toUpperCase()}
    </Text>
  );
}

// ─── Selector button ──────────────────────────────────────────────────────────
function SelectorButton({
  value,
  onPress,
  placeholder,
  icon,
  iconBg,
}: {
  value: string;
  onPress: () => void;
  placeholder?: string;
  icon?: string;
  iconBg?: string;
}) {
  const isEmpty = !value || value === placeholder;
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        backgroundColor: "#F9FAFB",
        borderWidth: 1.5,
        borderColor: "#E5E7EB",
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
      }}
    >
      {icon && (
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            backgroundColor: iconBg || "#F3F4F6",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ fontSize: 18 }}>{icon}</Text>
        </View>
      )}
      <Text
        style={{
          fontSize: 16,
          color: isEmpty ? "#9BA1A6" : "#11181C",
          flex: 1,
          fontWeight: isEmpty ? "400" : "500",
        }}
        numberOfLines={1}
      >
        {value || placeholder || "Select…"}
      </Text>
      <Text style={{ color: "#9BA1A6", fontSize: 14 }}>▾</Text>
    </TouchableOpacity>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function AddExpenseScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [converting, setConverting] = useState(false);

  const today = new Date();
  const [day, setDay] = useState(today.getDate().toString());
  const [month, setMonth] = useState(getMonthName(today.getMonth() + 1));
  const [year, setYear] = useState(today.getFullYear().toString());
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("EUR");
  const [categoryName, setCategoryName] = useState<string>(CATEGORY_NAMES[0]);
  const [note, setNote] = useState("");
  const [amountEur, setAmountEur] = useState("");
  const [exchangeRate, setExchangeRate] = useState("");

  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  const addExpense = trpc.sheet.addExpense.useMutation();

  // Load user's default currency preference on mount
  useEffect(() => {
    getDefaultCurrency().then((code) => {
      setCurrency(code);
    });
  }, []);

  useEffect(() => {
    const num = parseFloat(amount);
    if (amount && !isNaN(num) && num > 0) {
      doConvert(num);
    } else {
      setAmountEur("");
      setExchangeRate("");
    }
  }, [amount, currency]);

  const doConvert = async (num: number) => {
    setConverting(true);
    try {
      const result = await convertToEUR(num, currency);
      setAmountEur(result.amountEur.toString());
      setExchangeRate(result.rate.toString());
    } catch {
      Alert.alert("Conversion Error", "Could not fetch exchange rate. Check your connection.");
    } finally {
      setConverting(false);
    }
  };

  const handleSave = async () => {
    if (!day || !month || !year) return Alert.alert("Validation", "Please enter a valid date.");
    const amtNum = parseFloat(amount);
    if (!amount || isNaN(amtNum) || amtNum <= 0) return Alert.alert("Validation", "Please enter a valid amount.");
    if (!categoryName) return Alert.alert("Validation", "Please select a category.");
    if (!amountEur) return Alert.alert("Please wait", "Currency conversion is still in progress.");

    setLoading(true);
    try {
      await addExpense.mutateAsync({
        day: parseInt(day),
        month,
        year: parseInt(year),
        amountOriginal: amtNum,
        currency,
        amountEur: parseFloat(amountEur),
        category: categoryName,
        note: note || undefined,
      });

      if (Platform.OS !== "web") {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      setDay(today.getDate().toString());
      setMonth(getMonthName(today.getMonth() + 1));
      setYear(today.getFullYear().toString());
      setAmount("");
      const savedCurrency = await getDefaultCurrency();
      setCurrency(savedCurrency);
      setCategoryName(CATEGORY_NAMES[0]);
      setNote("");
      setAmountEur("");
      setExchangeRate("");

      Alert.alert("✓ Saved", "Expense added to your Google Sheet.", [
        { text: "Add another" },
        { text: "View journal", onPress: () => router.push("/(tabs)/journal") },
      ]);
    } catch {
      Alert.alert("Error", "Failed to save expense. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const selectedCurrency = orderedCurrencies.find((c) => c.code === currency);
  const selectedCurrencyLabel = selectedCurrency
    ? `${selectedCurrency.code}  —  ${selectedCurrency.name}`
    : currency;

  const selectedCategoryLabel = categoryName;
  const selectedCategoryConfig = getCategoryConfig(categoryName);

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 100 }}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={{ fontSize: 30, fontWeight: "800", color: "#11181C", letterSpacing: -0.5, marginBottom: 28 }}>
          Add Expense
        </Text>

        {/* ── Date ── */}
        <View style={{ marginBottom: 22 }}>
          <FieldLabel label="Date" />
          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 12, color: "#9BA1A6", marginBottom: 6 }}>Day</Text>
              <TextInput
                style={{
                  backgroundColor: "#F9FAFB",
                  borderWidth: 1.5,
                  borderColor: "#E5E7EB",
                  borderRadius: 12,
                  paddingHorizontal: 14,
                  paddingVertical: 14,
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
              <SelectorButton value={month} onPress={() => setShowMonthPicker(true)} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 12, color: "#9BA1A6", marginBottom: 6 }}>Year</Text>
              <TextInput
                style={{
                  backgroundColor: "#F9FAFB",
                  borderWidth: 1.5,
                  borderColor: "#E5E7EB",
                  borderRadius: 12,
                  paddingHorizontal: 14,
                  paddingVertical: 14,
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
        </View>

        {/* ── Amount ── */}
        <View style={{ marginBottom: 22 }}>
          <FieldLabel label="Amount" />
          <TextInput
            style={{
              backgroundColor: "#F9FAFB",
              borderWidth: 1.5,
              borderColor: "#E5E7EB",
              borderRadius: 12,
              paddingHorizontal: 16,
              paddingVertical: 16,
              fontSize: 28,
              color: "#11181C",
              fontWeight: "700",
              marginBottom: 10,
              letterSpacing: -0.5,
            }}
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor="#C9CDD2"
          />

          {/* Currency selector */}
          <Text style={{ fontSize: 12, color: "#9BA1A6", marginBottom: 6 }}>Currency</Text>
          <SelectorButton
            value={selectedCurrencyLabel}
            onPress={() => setShowCurrencyPicker(true)}
            placeholder="Select currency…"
            icon={selectedCurrency ? selectedCurrency.symbol : undefined}
            iconBg="#EFF6FF"
          />

          {/* Conversion result */}
          {converting && (
            <View style={{ marginTop: 10, flexDirection: "row", alignItems: "center", gap: 8 }}>
              <ActivityIndicator size="small" color="#0a7ea4" />
              <Text style={{ fontSize: 14, color: "#9BA1A6" }}>Converting to EUR…</Text>
            </View>
          )}
          {amountEur && !converting && (
            <View
              style={{
                marginTop: 10,
                backgroundColor: currency === "EUR" ? "#F0FDF4" : "#EFF6FF",
                borderRadius: 12,
                padding: 14,
                borderWidth: 1,
                borderColor: currency === "EUR" ? "#BBF7D0" : "#BFDBFE",
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Text style={{ fontSize: 22, fontWeight: "800", color: currency === "EUR" ? "#16A34A" : "#0a7ea4" }}>
                € {parseFloat(amountEur).toFixed(2)}
              </Text>
              {currency !== "EUR" && exchangeRate && (
                <Text style={{ fontSize: 13, color: "#6B7280" }}>
                  (1 {currency} = {parseFloat(exchangeRate).toFixed(4)} €)
                </Text>
              )}
            </View>
          )}
        </View>

        {/* ── Category ── */}
        <View style={{ marginBottom: 22 }}>
          <FieldLabel label="Category" />
          <SelectorButton
            value={selectedCategoryLabel}
            onPress={() => setShowCategoryPicker(true)}
            placeholder="Select category…"
            icon={selectedCategoryConfig?.icon}
            iconBg={selectedCategoryConfig?.bgColor}
          />
        </View>

        {/* ── Note ── */}
        <View style={{ marginBottom: 28 }}>
          <FieldLabel label="Note (optional)" />
          <TextInput
            style={{
              backgroundColor: "#F9FAFB",
              borderWidth: 1.5,
              borderColor: "#E5E7EB",
              borderRadius: 12,
              paddingHorizontal: 16,
              paddingVertical: 14,
              fontSize: 16,
              color: "#11181C",
              minHeight: 90,
              textAlignVertical: "top",
            }}
            value={note}
            onChangeText={setNote}
            placeholder="Add a description…"
            placeholderTextColor="#C9CDD2"
            multiline
            numberOfLines={3}
          />
        </View>

        {/* ── Save ── */}
        <TouchableOpacity
          onPress={handleSave}
          disabled={loading || converting}
          style={{
            backgroundColor: "#0a7ea4",
            borderRadius: 16,
            paddingVertical: 18,
            alignItems: "center",
            opacity: loading || converting ? 0.5 : 1,
          }}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={{ color: "#fff", fontSize: 18, fontWeight: "700" }}>Save Expense</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* ── Modals ── */}
      <PickerModal
        visible={showMonthPicker}
        title="Select Month"
        items={MONTHS.map((m) => ({ label: m, value: m }))}
        selected={month}
        onSelect={setMonth}
        onClose={() => setShowMonthPicker(false)}
      />

      {/* Currency picker with priority section */}
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
            <Text style={{ fontSize: 17, fontWeight: "700", color: "#11181C" }}>Select Currency</Text>
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
              const isSelected = item.code === currency;
              const showDivider = index === PRIORITY_CURRENCIES.length - 1;
              return (
                <>
                  <TouchableOpacity
                    onPress={() => { setCurrency(item.code); setShowCurrencyPicker(false); }}
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

      {/* Category picker with icons */}
      <Modal visible={showCategoryPicker} transparent animationType="slide" onRequestClose={() => setShowCategoryPicker(false)}>
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)" }}
          activeOpacity={1}
          onPress={() => setShowCategoryPicker(false)}
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
            <Text style={{ fontSize: 17, fontWeight: "700", color: "#11181C" }}>Select Category</Text>
            <TouchableOpacity
              onPress={() => setShowCategoryPicker(false)}
              style={{ backgroundColor: "#F3F4F6", borderRadius: 50, paddingHorizontal: 14, paddingVertical: 6 }}
            >
              <Text style={{ fontSize: 14, color: "#374151", fontWeight: "600" }}>Done</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={CATEGORY_NAMES}
            keyExtractor={(name) => name}
            renderItem={({ item }) => {
              const isSelected = item === categoryName;
              const cfg = getCategoryConfig(item);
              return (
                <TouchableOpacity
                  onPress={() => { setCategoryName(item); setShowCategoryPicker(false); }}
                  style={{
                    paddingHorizontal: 20,
                    paddingVertical: 13,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 14,
                    backgroundColor: isSelected ? "#EFF6FF" : "transparent",
                  }}
                >
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 12,
                      backgroundColor: isSelected ? cfg.bgColor : "#F3F4F6",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text style={{ fontSize: 20 }}>{cfg.icon}</Text>
                  </View>
                  <Text style={{ fontSize: 16, fontWeight: isSelected ? "700" : "400", color: isSelected ? "#0a7ea4" : "#11181C", flex: 1 }}>
                    {item}
                  </Text>
                  {isSelected && <Text style={{ color: "#0a7ea4", fontSize: 18, fontWeight: "700" }}>✓</Text>}
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </Modal>
    </ScreenContainer>
  );
}
