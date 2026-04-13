/**
 * Google Sheets Data Service
 * Google Sheet = single source of truth.
 * All reads come from the Journal tab; all writes go directly to the Journal tab.
 *
 * Column layout (1-indexed):
 *   A (0) = amount original
 *   B (1) = currency
 *   C (2) = day
 *   D (3) = month (French name, e.g. "Mars")
 *   E (4) = year
 *   F (5) = amount EUR
 *   G (6) = category
 *   H (7) = notes
 */

import { getServiceAccountToken } from "./google-service-account";
import { ENV } from "./_core/env";

export interface SheetExpense {
  /** 1-based row index in the sheet (row 1 = header) */
  rowIndex: number;
  amountOriginal: number;
  currency: string;
  day: number;
  month: string;   // French month name
  year: number;
  amountEur: number;
  category: string;
  note: string;
}

export interface MonthlyMetrics {
  month: string;
  categories: Record<string, number>; // category -> total EUR
  total: number;
}

export interface YearlyMetrics {
  year: number;
  months: MonthlyMetrics[];
  categories: string[];
  grandTotal: number;
}

export interface HomeStats {
  currentMonthTotal: number;
  currentMonthExpenseCount: number;
  currentYearTotal: number;
  currentYearExpenseCount: number;
  categoryBreakdown: { category: string; total: number; percentage: number }[];
  recentExpenses: SheetExpense[];
}

const MONTHS_FR = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

function monthIndex(monthName: string): number {
  const idx = MONTHS_FR.findIndex(
    (m) => m.toLowerCase() === monthName.toLowerCase()
  );
  return idx >= 0 ? idx : -1;
}

/**
 * Fetch all rows from the Journal sheet and parse them into SheetExpense objects.
 * Rows where col G (category) is empty or col E (year) is 0 / empty are skipped.
 */
export async function fetchAllExpenses(): Promise<SheetExpense[]> {
  const token = await getServiceAccountToken();
  const sheetId = ENV.GOOGLE_SHEET_ID;

  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Journal!A:H`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!res.ok) {
    const err = await res.json();
    throw new Error(`Failed to read sheet: ${err.error?.message || res.statusText}`);
  }

  const data = await res.json();
  const rows: string[][] = data.values || [];

  const expenses: SheetExpense[] = [];

  // Row 0 is the header — start from index 1
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const category = row[6]?.trim();
    const yearStr = row[4]?.trim();

    // Skip rows where category is empty or year is 0/empty
    if (!category || !yearStr || yearStr === "0") continue;

    const year = parseInt(yearStr, 10);
    if (isNaN(year) || year === 0) continue;

    const amountOriginal = parseFloat(row[0]) || 0;
    const currency = row[1]?.trim() || "EUR";
    const day = parseInt(row[2], 10) || 1;
    const month = row[3]?.trim() || "";
    const amountEur = parseFloat(row[5]) || 0;
    const note = row[7]?.trim() || "";

    expenses.push({
      rowIndex: i + 1, // 1-based (row 1 = header, so data starts at row 2)
      amountOriginal,
      currency,
      day,
      month,
      year,
      amountEur,
      category,
      note,
    });
  }

  return expenses;
}

/**
 * Compute yearly metrics (category × month matrix) for a given year.
 */
export function computeYearlyMetrics(expenses: SheetExpense[], year: number): YearlyMetrics {
  const yearExpenses = expenses.filter((e) => e.year === year);

  // Collect all categories that appear this year
  const categorySet = new Set<string>();
  for (const e of yearExpenses) categorySet.add(e.category);
  const categories = Array.from(categorySet).sort();

  // Build month buckets
  const monthMap = new Map<string, Record<string, number>>();
  for (const m of MONTHS_FR) {
    const catTotals: Record<string, number> = {};
    for (const cat of categories) catTotals[cat] = 0;
    monthMap.set(m, catTotals);
  }

  for (const e of yearExpenses) {
    const bucket = monthMap.get(e.month);
    if (bucket && e.category in bucket) {
      bucket[e.category] += e.amountEur;
    } else if (bucket) {
      bucket[e.category] = (bucket[e.category] || 0) + e.amountEur;
    }
  }

  const months: MonthlyMetrics[] = MONTHS_FR.map((m) => {
    const cats = monthMap.get(m) || {};
    const total = Object.values(cats).reduce((s, v) => s + v, 0);
    return { month: m, categories: cats, total };
  });

  const grandTotal = months.reduce((s, m) => s + m.total, 0);

  return { year, months, categories, grandTotal };
}

/**
 * Compute home screen stats for the current month/year.
 */
export function computeHomeStats(expenses: SheetExpense[]): HomeStats {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = MONTHS_FR[now.getMonth()];

  const thisMonthExpenses = expenses.filter(
    (e) => e.year === currentYear && e.month === currentMonth
  );
  const thisYearExpenses = expenses.filter((e) => e.year === currentYear);

  const currentMonthTotal = thisMonthExpenses.reduce((s, e) => s + e.amountEur, 0);
  const currentYearTotal = thisYearExpenses.reduce((s, e) => s + e.amountEur, 0);

  // Category breakdown for current month
  const catMap = new Map<string, number>();
  for (const e of thisMonthExpenses) {
    catMap.set(e.category, (catMap.get(e.category) || 0) + e.amountEur);
  }
  const categoryBreakdown = Array.from(catMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([category, total]) => ({
      category,
      total,
      percentage: currentMonthTotal > 0 ? Math.round((total / currentMonthTotal) * 100) : 0,
    }));

  // Most recent 10 expenses of the current month, sorted by day desc
  const recentExpenses = [...thisMonthExpenses]
    .sort((a, b) => b.day - a.day)
    .slice(0, 10);

  return {
    currentMonthTotal: parseFloat(currentMonthTotal.toFixed(2)),
    currentMonthExpenseCount: thisMonthExpenses.length,
    currentYearTotal: parseFloat(currentYearTotal.toFixed(2)),
    currentYearExpenseCount: thisYearExpenses.length,
    categoryBreakdown,
    recentExpenses,
  };
}

/**
 * Get all distinct years present in the sheet (sorted descending).
 */
export function getAvailableYears(expenses: SheetExpense[]): number[] {
  const years = new Set<number>();
  for (const e of expenses) years.add(e.year);
  return Array.from(years).sort((a, b) => b - a);
}

/**
 * Append a new expense row to the Journal sheet.
 * Inserts after the last valid row (col G non-empty, col E non-zero),
 * inheriting formatting from the row above.
 */
export async function appendExpenseToSheet(expense: {
  amountOriginal: number;
  currency: string;
  day: number;
  month: string;
  year: number;
  amountEur: number;
  category: string;
  note: string;
}): Promise<number> {
  const token = await getServiceAccountToken();
  const sheetId = ENV.GOOGLE_SHEET_ID;

  // Read existing data to find the last valid row
  const readRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Journal!A:H`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  let insertAfterRow = 1;
  let journalSheetId = 0; // sheet gid for Journal tab

  if (readRes.ok) {
    const readData = await readRes.json();
    const rows: string[][] = readData.values || [];
    for (let i = rows.length - 1; i >= 0; i--) {
      const row = rows[i];
      const colG = row[6]?.trim();
      const colE = row[4]?.trim();
      if (colG && colE && colE !== "0") {
        insertAfterRow = i + 1; // 1-based
        break;
      }
    }
  }

  // Get the actual sheet ID (gid) for the Journal tab
  const metaRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?fields=sheets.properties`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (metaRes.ok) {
    const meta = await metaRes.json();
    const journalSheet = meta.sheets?.find(
      (s: { properties: { title: string; sheetId: number } }) =>
        s.properties.title === "Journal"
    );
    if (journalSheet) journalSheetId = journalSheet.properties.sheetId;
  }

  const insertRow = insertAfterRow + 1; // insert one row after the last valid row

  // Insert a blank row inheriting format from above
  const insertRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}:batchUpdate`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        requests: [
          {
            insertDimension: {
              range: {
                sheetId: journalSheetId,
                dimension: "ROWS",
                startIndex: insertRow - 1, // 0-based
                endIndex: insertRow,
              },
              inheritFromBefore: true,
            },
          },
        ],
      }),
    }
  );

  const rowData = [
    expense.amountOriginal,
    expense.currency,
    expense.day,
    expense.month,
    expense.year,
    expense.amountEur,
    expense.category,
    expense.note,
  ];

  if (insertRes.ok) {
    // Write data into the newly inserted row
    const writeRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Journal!A${insertRow}:H${insertRow}?valueInputOption=USER_ENTERED`,
      {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ values: [rowData] }),
      }
    );
    if (!writeRes.ok) {
      const err = await writeRes.json();
      throw new Error(`Failed to write row: ${err.error?.message}`);
    }
  } else {
    // Fallback: simple append
    const appendRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Journal!A:H:append?valueInputOption=USER_ENTERED`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ values: [rowData] }),
      }
    );
    if (!appendRes.ok) {
      const err = await appendRes.json();
      throw new Error(`Failed to append row: ${err.error?.message}`);
    }
  }

  return insertRow;
}

/**
 * Update an existing expense row in the Journal sheet.
 * Overwrites columns A-H of the given 1-based rowIndex.
 */
export async function updateExpenseInSheet(
  rowIndex: number,
  expense: {
    amountOriginal: number;
    currency: string;
    day: number;
    month: string;
    year: number;
    amountEur: number;
    category: string;
    note: string;
  }
): Promise<void> {
  const token = await getServiceAccountToken();
  const sheetId = ENV.GOOGLE_SHEET_ID;

  const rowData = [
    expense.amountOriginal,
    expense.currency,
    expense.day,
    expense.month,
    expense.year,
    expense.amountEur,
    expense.category,
    expense.note,
  ];

  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Journal!A${rowIndex}:H${rowIndex}?valueInputOption=USER_ENTERED`,
    {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ values: [rowData] }),
    }
  );

  if (!res.ok) {
    const err = await res.json();
    throw new Error(`Failed to update row ${rowIndex}: ${err.error?.message}`);
  }
}

/**
 * Delete an expense row from the Journal sheet by its 1-based row index.
 */
export async function deleteExpenseFromSheet(rowIndex: number, journalSheetGid?: number): Promise<void> {
  const token = await getServiceAccountToken();
  const sheetId = ENV.GOOGLE_SHEET_ID;

  let sheetGid = journalSheetGid ?? 0;

  if (!journalSheetGid) {
    const metaRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?fields=sheets.properties`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (metaRes.ok) {
      const meta = await metaRes.json();
      const journalSheet = meta.sheets?.find(
        (s: { properties: { title: string; sheetId: number } }) =>
          s.properties.title === "Journal"
      );
      if (journalSheet) sheetGid = journalSheet.properties.sheetId;
    }
  }

  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}:batchUpdate`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId: sheetGid,
                dimension: "ROWS",
                startIndex: rowIndex - 1, // 0-based
                endIndex: rowIndex,
              },
            },
          },
        ],
      }),
    }
  );

  if (!res.ok) {
    const err = await res.json();
    throw new Error(`Failed to delete row ${rowIndex}: ${err.error?.message}`);
  }
}
