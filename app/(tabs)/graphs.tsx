import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { trpc } from "@/lib/trpc";
import Svg, { Path, Circle, G, Rect, Text as SvgText } from "react-native-svg";
import { getCategoryColor, getCategoryConfig } from "@/lib/category-config";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CHART_WIDTH = SCREEN_WIDTH - 32;

// ─── Donut chart ──────────────────────────────────────────────────────────────
function DonutChart({
  data,
  size = 160,
}: {
  data: { label: string; value: number; color: string }[];
  size?: number;
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return null;

  const cx = size / 2;
  const cy = size / 2;
  const outerR = size / 2 - 4;
  const innerR = outerR * 0.55;
  let currentAngle = -Math.PI / 2;

  const slices = data.map((d) => {
    const angle = (d.value / total) * 2 * Math.PI;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    currentAngle = endAngle;
    const x1 = cx + outerR * Math.cos(startAngle);
    const y1 = cy + outerR * Math.sin(startAngle);
    const x2 = cx + outerR * Math.cos(endAngle);
    const y2 = cy + outerR * Math.sin(endAngle);
    const ix1 = cx + innerR * Math.cos(endAngle);
    const iy1 = cy + innerR * Math.sin(endAngle);
    const ix2 = cx + innerR * Math.cos(startAngle);
    const iy2 = cy + innerR * Math.sin(startAngle);
    const largeArc = angle > Math.PI ? 1 : 0;
    const pathD = [
      `M ${x1} ${y1}`,
      `A ${outerR} ${outerR} 0 ${largeArc} 1 ${x2} ${y2}`,
      `L ${ix1} ${iy1}`,
      `A ${innerR} ${innerR} 0 ${largeArc} 0 ${ix2} ${iy2}`,
      "Z",
    ].join(" ");
    return { ...d, pathD };
  });

  return (
    <Svg width={size} height={size}>
      {slices.map((s, i) => (
        <Path key={i} d={s.pathD} fill={s.color} />
      ))}
      <Circle cx={cx} cy={cy} r={innerR - 2} fill="#fff" />
    </Svg>
  );
}

// ─── Bar chart ────────────────────────────────────────────────────────────────
function BarChart({
  data,
  width = CHART_WIDTH,
  height = 200,
}: {
  data: { label: string; value: number; color?: string }[];
  width?: number;
  height?: number;
}) {
  if (data.length === 0) return null;
  const maxVal = Math.max(...data.map((d) => d.value), 1);
  const barAreaHeight = height - 40;
  const barWidth = Math.max(20, (width - 40) / data.length - 8);
  const gap = (width - 40 - barWidth * data.length) / (data.length + 1);

  return (
    <Svg width={width} height={height}>
      {data.map((d, i) => {
        const barH = Math.max(2, (d.value / maxVal) * barAreaHeight);
        const x = 20 + gap + i * (barWidth + gap);
        const y = barAreaHeight - barH;
        const color = d.color || "#0a7ea4";
        const label = d.label.length > 4 ? d.label.slice(0, 4) : d.label;
        const valLabel = d.value >= 10000
          ? `${(d.value / 1000).toFixed(0)}k`
          : d.value >= 1000
          ? `${(d.value / 1000).toFixed(1)}k`
          : d.value.toFixed(0);
        return (
          <G key={i}>
            <Rect x={x} y={y} width={barWidth} height={barH} rx={6} fill={color} opacity={0.9} />
            {barH > 20 && (
              <SvgText x={x + barWidth / 2} y={y - 4} fontSize={9} fontWeight="700" fill="#374151" textAnchor="middle">
                {valLabel}
              </SvgText>
            )}
            <SvgText x={x + barWidth / 2} y={height - 6} fontSize={10} fill="#9BA1A6" textAnchor="middle">
              {label}
            </SvgText>
          </G>
        );
      })}
    </Svg>
  );
}

// ─── Constants ────────────────────────────────────────────────────────────────
const MONTHS_SHORT = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"];
const MONTHS_FULL = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

// "All time" sentinel value
const ALL_TIME = 0;

export default function GraphsScreen() {
  const currentYear = new Date().getFullYear();
  // 0 = All time, otherwise a specific year
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);

  const { data: availableYearsRaw = [] } = trpc.sheet.availableYears.useQuery();
  const availableYears = availableYearsRaw.length > 0 ? availableYearsRaw : [currentYear];

  const { data: yearlyData, isLoading: loadingYear } = trpc.sheet.yearlyMetrics.useQuery(
    { year: selectedYear === ALL_TIME ? currentYear : selectedYear },
    { enabled: selectedYear !== ALL_TIME, staleTime: 60_000 }
  );

  const { data: allExpenses = [], isLoading: loadingAll } = trpc.sheet.allExpenses.useQuery(
    undefined,
    { staleTime: 120_000 }
  );

  const isLoading = (selectedYear !== ALL_TIME ? loadingYear : false) || loadingAll;
  const isAllTime = selectedYear === ALL_TIME;

  // ── Monthly bar chart (only for specific year) ──
  const monthlyBarData = MONTHS_FULL.map((m, i) => {
    const monthData = yearlyData?.months.find((md) => md.month === m);
    return { label: MONTHS_SHORT[i], value: monthData?.total ?? 0, color: "#0a7ea4" };
  });

  // ── Category pie data ──
  const categoryTotals: Record<string, number> = {};
  const sourceExpenses = isAllTime
    ? allExpenses
    : allExpenses.filter((e) => e.year === selectedYear);

  for (const e of sourceExpenses) {
    categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amountEur;
  }

  const pieData = Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([label, value], idx) => ({
      label,
      value,
      color: getCategoryColor(label, idx),
    }));
  const pieTotal = pieData.reduce((s, d) => s + d.value, 0);

  // ── Yearly totals bar chart (only for All Time) ──
  const yearlyTotals = [...availableYears]
    .sort((a, b) => a - b)
    .map((yr) => ({
      label: String(yr),
      value: allExpenses.filter((e) => e.year === yr).reduce((s, e) => s + e.amountEur, 0),
      color: yr === currentYear ? "#0a7ea4" : "#93C5FD",
    }));

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        {/* ── Header ── */}
        <View style={{ paddingHorizontal: 20, paddingTop: 24, marginBottom: 20 }}>
          <Text style={{ fontSize: 13, fontWeight: "600", color: "#9BA1A6", letterSpacing: 1, marginBottom: 4 }}>
            TEAM EXPENSES
          </Text>
          <Text style={{ fontSize: 32, fontWeight: "800", color: "#11181C", letterSpacing: -0.5 }}>
            Graphs
          </Text>
        </View>

        {/* ── Year tabs (including All Time) ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8, marginBottom: 20 }}
        >
          {/* All Time tab first */}
          <TouchableOpacity
            onPress={() => setSelectedYear(ALL_TIME)}
            style={{
              paddingHorizontal: 20,
              paddingVertical: 10,
              borderRadius: 20,
              backgroundColor: selectedYear === ALL_TIME ? "#0a7ea4" : "#F3F4F6",
              borderWidth: selectedYear === ALL_TIME ? 0 : 1,
              borderColor: "#E5E7EB",
            }}
          >
            <Text style={{ fontSize: 15, fontWeight: "700", color: selectedYear === ALL_TIME ? "#fff" : "#374151" }}>
              All Time
            </Text>
          </TouchableOpacity>

          {/* Year tabs */}
          {[...availableYears].sort((a, b) => b - a).map((year) => (
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
              <Text style={{ fontSize: 15, fontWeight: "700", color: selectedYear === year ? "#fff" : "#374151" }}>
                {year}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {isLoading && (
          <View style={{ paddingVertical: 60, alignItems: "center", gap: 12 }}>
            <ActivityIndicator size="large" color="#0a7ea4" />
            <Text style={{ fontSize: 14, color: "#9BA1A6" }}>Loading from Google Sheets…</Text>
          </View>
        )}

        {!isLoading && (
          <>
            {/* ── Monthly bar chart — only for specific year ── */}
            {!isAllTime && (
              <View style={{ marginHorizontal: 16, marginBottom: 24 }}>
                <Text style={{ fontSize: 17, fontWeight: "700", color: "#11181C", marginBottom: 4 }}>
                  Monthly Spending — {selectedYear}
                </Text>
                <Text style={{ fontSize: 13, color: "#9BA1A6", marginBottom: 16 }}>
                  Total € per month
                </Text>
                <View style={{ backgroundColor: "#F9FAFB", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "#E5E7EB" }}>
                  <BarChart data={monthlyBarData} width={CHART_WIDTH - 32} height={200} />
                </View>
              </View>
            )}

            {/* ── Year-over-year bar chart — only for All Time ── */}
            {isAllTime && yearlyTotals.length > 0 && (
              <View style={{ marginHorizontal: 16, marginBottom: 24 }}>
                <Text style={{ fontSize: 17, fontWeight: "700", color: "#11181C", marginBottom: 4 }}>
                  Year-over-Year
                </Text>
                <Text style={{ fontSize: 13, color: "#9BA1A6", marginBottom: 16 }}>
                  Total annual spending (€)
                </Text>
                <View style={{ backgroundColor: "#F9FAFB", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "#E5E7EB" }}>
                  <BarChart data={yearlyTotals} width={CHART_WIDTH - 32} height={200} />
                  <View style={{ marginTop: 12, gap: 6 }}>
                    {[...yearlyTotals].reverse().map((d) => (
                      <View key={d.label} style={{ flexDirection: "row", justifyContent: "space-between" }}>
                        <Text style={{ fontSize: 14, fontWeight: "600", color: "#374151" }}>{d.label}</Text>
                        <Text style={{ fontSize: 14, fontWeight: "700", color: "#11181C" }}>
                          € {d.value.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            )}

            {/* ── Category donut chart ── */}
            <View style={{ marginHorizontal: 16, marginBottom: 24 }}>
              <Text style={{ fontSize: 17, fontWeight: "700", color: "#11181C", marginBottom: 4 }}>
                By Category
              </Text>
              <Text style={{ fontSize: 13, color: "#9BA1A6", marginBottom: 16 }}>
                {isAllTime ? "All-time spending split" : `Spending split for ${selectedYear}`}
              </Text>

              <View style={{ backgroundColor: "#F9FAFB", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "#E5E7EB" }}>
                {pieData.length > 0 ? (
                  <>
                    {/* Donut + legend */}
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
                      <DonutChart data={pieData} size={160} />
                      <View style={{ flex: 1, gap: 6 }}>
                        {pieData.slice(0, 6).map((d) => (
                          <View key={d.label} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                            <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: d.color, flexShrink: 0 }} />
                            <Text style={{ fontSize: 11, color: "#374151", flex: 1 }} numberOfLines={1}>
                              {getCategoryConfig(d.label).icon} {d.label}
                            </Text>
                            <Text style={{ fontSize: 11, fontWeight: "700", color: "#11181C" }}>
                              {pieTotal > 0 ? Math.round((d.value / pieTotal) * 100) : 0}%
                            </Text>
                          </View>
                        ))}
                        {pieData.length > 6 && (
                          <Text style={{ fontSize: 11, color: "#9BA1A6" }}>+{pieData.length - 6} more</Text>
                        )}
                      </View>
                    </View>

                    {/* Full list */}
                    <View style={{ marginTop: 16, gap: 8 }}>
                      {pieData.map((d, idx) => {
                        const pct = pieTotal > 0 ? (d.value / pieTotal) * 100 : 0;
                        return (
                          <View key={d.label}>
                            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                                <Text style={{ fontSize: 16 }}>{getCategoryConfig(d.label).icon}</Text>
                                <Text style={{ fontSize: 13, fontWeight: "600", color: "#374151" }}>{d.label}</Text>
                              </View>
                              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                                <Text style={{ fontSize: 13, fontWeight: "700", color: "#11181C" }}>
                                  € {d.value.toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                </Text>
                                <Text style={{ fontSize: 12, color: "#9BA1A6", width: 32, textAlign: "right" }}>
                                  {pct.toFixed(0)}%
                                </Text>
                              </View>
                            </View>
                            <View style={{ height: 5, backgroundColor: "#E5E7EB", borderRadius: 3, overflow: "hidden" }}>
                              <View style={{ height: 5, width: `${pct}%`, backgroundColor: d.color, borderRadius: 3 }} />
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  </>
                ) : (
                  <Text style={{ textAlign: "center", color: "#9BA1A6", paddingVertical: 20 }}>No data for this period</Text>
                )}
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}
