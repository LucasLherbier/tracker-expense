/**
 * Google Sheets API Service
 * 
 * This service handles syncing expenses to Google Sheets.
 * Requires Google Cloud credentials to be configured.
 */

import { ENV } from "@/server/_core/env";

export interface SheetExpense {
  day: number;
  month: string;
  year: number;
  amountOriginal: string;
  currencyOriginal: string;
  amountEur: string;
  exchangeRate?: string;
  category: string;
  note?: string;
}

/**
 * Check if Google Sheets sync is configured
 */
export function isGoogleSheetsConfigured(): boolean {
  return !!(
    ENV.GOOGLE_CLIENT_ID &&
    ENV.GOOGLE_CLIENT_SECRET &&
    ENV.GOOGLE_SHEET_ID
  );
}

/**
 * Append expense to Google Sheet
 * This is a placeholder - actual implementation requires OAuth flow
 */
export async function appendExpenseToSheet(
  expense: SheetExpense,
  accessToken: string
): Promise<{ success: boolean; rowId?: number; error?: string }> {
  if (!isGoogleSheetsConfigured()) {
    return {
      success: false,
      error: "Google Sheets is not configured. Please add credentials in Settings.",
    };
  }

  try {
    const sheetId = ENV.GOOGLE_SHEET_ID;
    const range = "Journal!A:I"; // Assuming Journal sheet with columns A-I

    // Format the row data matching your Google Sheet structure
    const rowData = [
      expense.day,
      expense.month,
      expense.year,
      parseFloat(expense.amountOriginal),
      expense.currencyOriginal,
      parseFloat(expense.amountEur),
      expense.exchangeRate ? parseFloat(expense.exchangeRate) : "",
      expense.category,
      expense.note || "",
    ];

    // Call Google Sheets API
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}:append?valueInputOption=USER_ENTERED`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          values: [rowData],
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      console.error("Google Sheets API error:", error);
      return {
        success: false,
        error: `Failed to sync to Google Sheets: ${error.error?.message || "Unknown error"}`,
      };
    }

    const result = await response.json();
    
    // Extract row number from the update range
    // Format: 'Journal!A123:I123'
    const updatedRange = result.updates?.updatedRange || "";
    const rowMatch = updatedRange.match(/!A(\d+)/);
    const rowId = rowMatch ? parseInt(rowMatch[1]) : undefined;

    return {
      success: true,
      rowId,
    };
  } catch (error) {
    console.error("Error syncing to Google Sheets:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Fetch expenses from Google Sheet
 * This is a placeholder - actual implementation requires OAuth flow
 */
export async function fetchExpensesFromSheet(
  accessToken: string
): Promise<{ success: boolean; expenses?: SheetExpense[]; error?: string }> {
  if (!isGoogleSheetsConfigured()) {
    return {
      success: false,
      error: "Google Sheets is not configured. Please add credentials in Settings.",
    };
  }

  try {
    const sheetId = ENV.GOOGLE_SHEET_ID;
    const range = "Journal!A2:I"; // Skip header row

    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      console.error("Google Sheets API error:", error);
      return {
        success: false,
        error: `Failed to fetch from Google Sheets: ${error.error?.message || "Unknown error"}`,
      };
    }

    const result = await response.json();
    const rows = result.values || [];

    const expenses: SheetExpense[] = rows.map((row: any[]) => ({
      day: parseInt(row[0]) || 1,
      month: row[1] || "",
      year: parseInt(row[2]) || new Date().getFullYear(),
      amountOriginal: row[3]?.toString() || "0",
      currencyOriginal: row[4] || "EUR",
      amountEur: row[5]?.toString() || "0",
      exchangeRate: row[6]?.toString(),
      category: row[7] || "",
      note: row[8] || "",
    }));

    return {
      success: true,
      expenses,
    };
  } catch (error) {
    console.error("Error fetching from Google Sheets:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get OAuth URL for Google Sheets authorization
 */
export function getGoogleAuthUrl(redirectUri: string): string {
  const clientId = ENV.GOOGLE_CLIENT_ID;
  const scope = "https://www.googleapis.com/auth/spreadsheets";
  
  const params = new URLSearchParams({
    client_id: clientId || "",
    redirect_uri: redirectUri,
    response_type: "code",
    scope,
    access_type: "offline",
    prompt: "consent",
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/**
 * Exchange authorization code for access token
 */
export async function exchangeCodeForToken(
  code: string,
  redirectUri: string
): Promise<{ success: boolean; accessToken?: string; refreshToken?: string; error?: string }> {
  try {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        code,
        client_id: ENV.GOOGLE_CLIENT_ID || "",
        client_secret: ENV.GOOGLE_CLIENT_SECRET || "",
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return {
        success: false,
        error: error.error_description || "Failed to exchange code for token",
      };
    }

    const data = await response.json();

    return {
      success: true,
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
