import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { trpc } from "@/lib/trpc";

const MONTHS_SHORT = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"];
const MONTHS_FULL = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

import { getCategoryConfig, getCategoryColor } from "@/lib/category-config";

export default function MetricsScreen() {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);

  // Fetch available years from the sheet
  const { data: availableYearsRaw = [] } = trpc.sheet.availableYears.useQuery();
  const availableYears = availableYearsRaw.length > 0 ? availableYearsRaw : [currentYear];

  // Fetch yearly metrics from Google Sheets
  const { data: yearlyData, isLoading, error, refetch } = trpc.sheet.yearlyMetrics.useQuery(
    { year: selectedYear },
    { staleTime: 60_000 }
  );

  // Build the matrix from the server response
  const categories = yearlyData?.categories ?? [];
  const months = yearlyData?.months ?? [];
  const grandTotal = yearlyData?.grandTotal ?? 0;

  // Map month name → short label
  const monthShortLabel = (monthName: string) => {
    const idx = MONTHS_FULL.indexOf(monthName);
    return idx >= 0 ? MONTHS_SHORT[idx] : monthName.slice(0, 3);
  };

  // Only show months that have any data
  const activeMonths = months.filter((m) => m.total > 0);

  // Category totals
  const categoryTotals: Record<string, number> = {};
  for (const cat of categories) {
    categoryTotals[cat] = months.reduce((s, m) => s + (m.categories[cat] ?? 0), 0);
  }
  // Sort categories by total descending
  const activeCategories = categories
    .filter((c) => categoryTotals[c] > 0)
    .sort((a, b) => (categoryTotals[b] ?? 0) - (categoryTotals[a] ?? 0));

  // Max value for heat-map scaling
  const maxCellValue = Math.max(
    1,
    ...activeCategories.flatMap((cat) =>
      activeMonths.map((m) => m.categories[cat] ?? 0)
    )
  );

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        {/* ── Header ── */}
        <View style={{ paddingHorizontal: 20, paddingTop: 24, marginBottom: 20 }}>
          <Text style={{ fontSize: 13, fontWeight: "600", color: "#9BA1A6", letterSpacing: 1, marginBottom: 4 }}>
            TEAM EXPENSES
          </Text>
          <Text style={{ fontSize: 32, fontWeight: "800", color: "#11181C", letterSpacing: -0.5 }}>
            Metrics
          </Text>
        </View>

        {/* ── Year tabs ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8, marginBottom: 20 }}
        >
          {availableYears.map((year) => (
            <TouchableOpacity
              key={year}
              onPress={() => setSelectedYear(year)}
              style={{
                paddingHorizontal: 20,
                paddingVertical: 10,
                borderRadius: 20,
                backgroundColor: selectedYear === year ? "#0a7ea4" : "#F3F4F6",
                borderWidth: selectedYear === year ? 0 : 1,
                borderColor: "#E5E7EB",
              }}
            >
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: "700",
                  color: selectedYear === year ? "#fff" : "#374151",
                }}
              >
                {year}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ── Loading / Error ── */}
        {isLoading && (
          <View style={{ paddingVertical: 60, alignItems: "center", gap: 12 }}>
            <ActivityIndicator size="large" color="#0a7ea4" />
            <Text style={{ fontSize: 14, color: "#9BA1A6" }}>Loading from Google Sheets…</Text>
          </View>
        )}

        {error && (
          <View style={{ paddingHorizontal: 20, paddingVertical: 40, alignItems: "center", gap: 12 }}>
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

        {/* ── Year summary card ── */}
        {!isLoading && !error && yearlyData && (
          <View style={{ marginHorizontal: 16, marginBottom: 20 }}>
            <View
              style={{
                backgroundColor: "#0a7ea4",
                borderRadius: 16,
                padding: 18,
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <View>
                <Text style={{ fontSize: 13, color: "rgba(255,255,255,0.75)", marginBottom: 4 }}>
                  {selectedYear} Grand Total
                </Text>
                <Text style={{ fontSize: 28, fontWeight: "800", color: "#fff" }}>
                  € {grandTotal.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={{ fontSize: 13, color: "rgba(255,255,255,0.75)", marginBottom: 4 }}>
                  Categories
                </Text>
                <Text style={{ fontSize: 28, fontWeight: "800", color: "#fff" }}>
                  {activeCategories.length}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* ── Heatmap table ── */}
        {!isLoading && !error && activeCategories.length > 0 && activeMonths.length > 0 && (
          <View style={{ marginHorizontal: 16, marginBottom: 20 }}>
            <Text style={{ fontSize: 13, fontWeight: "700", color: "#9BA1A6", letterSpacing: 0.5, marginBottom: 12 }}>
              CATEGORY × MONTH (€)
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View>
                {/* Header row */}
                <View style={{ flexDirection: "row", marginBottom: 4 }}>
                  <View style={{ width: 110 }} />
                  {activeMonths.map((m) => (
                    <View key={m.month} style={{ width: 64, alignItems: "center" }}>
                      <Text style={{ fontSize: 11, fontWeight: "700", color: "#9BA1A6" }}>
                        {monthShortLabel(m.month)}
                      </Text>
                    </View>
                  ))}
                  <View style={{ width: 72, alignItems: "flex-end", paddingRight: 4 }}>
                    <Text style={{ fontSize: 11, fontWeight: "700", color: "#9BA1A6" }}>TOTAL</Text>
                  </View>
                </View>

                {/* Data rows */}
                {activeCategories.map((cat, catIdx) => {
                  const catTotal = categoryTotals[cat] ?? 0;
                  const color = getCategoryColor(cat, catIdx);
                  return (
                    <View
                      key={cat}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        marginBottom: 6,
                        backgroundColor: "#F9FAFB",
                        borderRadius: 10,
                        paddingVertical: 8,
                      }}
                    >
                      {/* Category label */}
                      <View style={{ width: 110, paddingLeft: 8, flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <Text style={{ fontSize: 16 }}>{getCategoryConfig(cat).icon}</Text>
                        <Text style={{ fontSize: 11, fontWeight: "600", color: "#374151", flexShrink: 1 }} numberOfLines={1}>
                          {cat}
                        </Text>
                      </View>

                      {/* Month cells */}
                      {activeMonths.map((m) => {
                        const val = m.categories[cat] ?? 0;
                        const intensity = val > 0 ? Math.max(0.1, val / maxCellValue) : 0;
                        return (
                          <View
                            key={m.month}
                            style={{
                              width: 64,
                              alignItems: "center",
                              paddingVertical: 4,
                              paddingHorizontal: 2,
                            }}
                          >
                            <View
                              style={{
                                backgroundColor: val > 0 ? `${color}${Math.round(intensity * 180).toString(16).padStart(2, "0")}` : "transparent",
                                borderRadius: 6,
                                paddingVertical: 5,
                                paddingHorizontal: 4,
                                width: 60,
                                alignItems: "center",
                              }}
                            >
                              <Text
                                style={{
                                  fontSize: 11,
                                  fontWeight: val > 0 ? "700" : "400",
                                  color: val > 0 ? (intensity > 0.6 ? "#fff" : color) : "#D1D5DB",
                                }}
                              >
                                {val > 0 ? (val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val.toFixed(0)) : "—"}
                              </Text>
                            </View>
                          </View>
                        );
                      })}

                      {/* Row total */}
                      <View style={{ width: 72, alignItems: "flex-end", paddingRight: 8 }}>
                        <Text style={{ fontSize: 12, fontWeight: "700", color: "#11181C" }}>
                          {catTotal >= 1000
                            ? `€ ${(catTotal / 1000).toFixed(1)}k`
                            : `€ ${catTotal.toFixed(0)}`}
                        </Text>
                      </View>
                    </View>
                  );
                })}

                {/* Month totals row */}
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginTop: 6,
                    paddingVertical: 8,
                    borderTopWidth: 1,
                    borderTopColor: "#E5E7EB",
                  }}
                >
                  <View style={{ width: 110, paddingLeft: 10 }}>
                    <Text style={{ fontSize: 12, fontWeight: "700", color: "#374151" }}>TOTAL</Text>
                  </View>
                  {activeMonths.map((m) => (
                    <View key={m.month} style={{ width: 64, alignItems: "center" }}>
                      <Text style={{ fontSize: 11, fontWeight: "700", color: "#0a7ea4" }}>
                        {m.total >= 1000 ? `€ ${(m.total / 1000).toFixed(1)}k` : `€ ${m.total.toFixed(0)}`}
                      </Text>
                    </View>
                  ))}
                  <View style={{ width: 72, alignItems: "flex-end", paddingRight: 8 }}>
                    <Text style={{ fontSize: 12, fontWeight: "800", color: "#0a7ea4" }}>
                      {grandTotal >= 1000 ? `€ ${(grandTotal / 1000).toFixed(1)}k` : `€ ${grandTotal.toFixed(0)}`}
                    </Text>
                  </View>
                </View>
              </View>
            </ScrollView>
          </View>
        )}

        {/* ── Category totals list ── */}
        {!isLoading && !error && activeCategories.length > 0 && (
          <View style={{ marginHorizontal: 16, marginBottom: 20 }}>
            <Text style={{ fontSize: 13, fontWeight: "700", color: "#9BA1A6", letterSpacing: 0.5, marginBottom: 12 }}>
              BY CATEGORY
            </Text>
            <View style={{ gap: 8 }}>
              {activeCategories
                .sort((a, b) => (categoryTotals[b] ?? 0) - (categoryTotals[a] ?? 0))
                .map((cat, idx) => {
                  const total = categoryTotals[cat] ?? 0;
                  const pct = grandTotal > 0 ? (total / grandTotal) * 100 : 0;
                  const color = getCategoryColor(cat, idx);
                  return (
                    <View
                      key={cat}
                      style={{
                        backgroundColor: "#F9FAFB",
                        borderRadius: 12,
                        padding: 14,
                        borderWidth: 1,
                        borderColor: "#E5E7EB",
                      }}
                    >
                      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                          <Text style={{ fontSize: 18 }}>{getCategoryConfig(cat).icon}</Text>
                          <Text style={{ fontSize: 14, fontWeight: "600", color: "#374151" }}>{cat}</Text>
                        </View>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                          <Text style={{ fontSize: 14, fontWeight: "700", color: "#11181C" }}>
                            € {total.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </Text>
                          <Text style={{ fontSize: 12, color: "#9BA1A6", width: 34, textAlign: "right" }}>
                            {pct.toFixed(0)}%
                          </Text>
                        </View>
                      </View>
                      <View style={{ height: 5, backgroundColor: "#E5E7EB", borderRadius: 3, overflow: "hidden" }}>
                        <View style={{ height: 5, width: `${pct}%`, backgroundColor: color, borderRadius: 3 }} />
                      </View>
                    </View>
                  );
                })}
            </View>
          </View>
        )}

        {/* ── Empty state ── */}
        {!isLoading && !error && activeCategories.length === 0 && (
          <View style={{ alignItems: "center", paddingTop: 60, gap: 12 }}>
            <Text style={{ fontSize: 48 }}>📊</Text>
            <Text style={{ fontSize: 17, fontWeight: "700", color: "#11181C" }}>No data for {selectedYear}</Text>
            <Text style={{ fontSize: 14, color: "#9BA1A6" }}>Select a different year or add expenses</Text>
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}
