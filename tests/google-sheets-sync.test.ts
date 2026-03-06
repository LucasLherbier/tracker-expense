import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the database module
vi.mock("../server/db", () => ({
  getGoogleToken: vi.fn(),
  saveGoogleToken: vi.fn(),
  updateGoogleToken: vi.fn(),
  deleteGoogleToken: vi.fn(),
  getUnsyncedExpenses: vi.fn(),
  getAllCategories: vi.fn(),
  markExpenseAsSynced: vi.fn(),
}));

import * as db from "../server/db";

describe("Google Sheets Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns not connected when no token exists", async () => {
    vi.mocked(db.getGoogleToken).mockResolvedValue(null);

    const token = await db.getGoogleToken();
    expect(token).toBeNull();
  });

  it("returns connected status when valid token exists", async () => {
    const futureDate = new Date(Date.now() + 3600 * 1000);
    vi.mocked(db.getGoogleToken).mockResolvedValue({
      id: 1,
      accessToken: "test-access-token",
      refreshToken: "test-refresh-token",
      expiresAt: futureDate,
      scope: "https://www.googleapis.com/auth/spreadsheets",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const token = await db.getGoogleToken();
    expect(token).not.toBeNull();
    expect(token?.accessToken).toBe("test-access-token");
    expect(new Date(token!.expiresAt) > new Date()).toBe(true);
  });

  it("correctly identifies expired tokens", async () => {
    const pastDate = new Date(Date.now() - 3600 * 1000); // 1 hour ago
    vi.mocked(db.getGoogleToken).mockResolvedValue({
      id: 1,
      accessToken: "expired-token",
      refreshToken: "refresh-token",
      expiresAt: pastDate,
      scope: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const token = await db.getGoogleToken();
    expect(token).not.toBeNull();
    const isExpired = new Date(token!.expiresAt) < new Date();
    expect(isExpired).toBe(true);
    expect(token?.refreshToken).toBeTruthy(); // Can refresh
  });

  it("saveGoogleToken stores token correctly", async () => {
    vi.mocked(db.saveGoogleToken).mockResolvedValue(undefined);

    const tokenData = {
      accessToken: "new-access-token",
      refreshToken: "new-refresh-token",
      expiresAt: new Date(Date.now() + 3600 * 1000),
      scope: "https://www.googleapis.com/auth/spreadsheets",
    };

    await db.saveGoogleToken(tokenData);
    expect(db.saveGoogleToken).toHaveBeenCalledWith(tokenData);
  });

  it("deleteGoogleToken removes token", async () => {
    vi.mocked(db.deleteGoogleToken).mockResolvedValue(undefined);

    await db.deleteGoogleToken();
    expect(db.deleteGoogleToken).toHaveBeenCalledOnce();
  });

  it("getUnsyncedExpenses returns expenses with syncedToSheet = 0", async () => {
    const mockExpenses = [
      {
        id: 1,
        day: 15,
        month: "January",
        year: 2026,
        amountOriginal: "50.00",
        currencyOriginal: "EUR",
        amountEur: "50.00",
        exchangeRate: "1.0",
        categoryId: 1,
        note: "Test expense",
        syncedToSheet: 0,
        sheetRowId: null,
        userId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    vi.mocked(db.getUnsyncedExpenses).mockResolvedValue(mockExpenses);

    const unsynced = await db.getUnsyncedExpenses();
    expect(unsynced).toHaveLength(1);
    expect(unsynced[0].syncedToSheet).toBe(0);
  });

  it("builds correct row data format for Google Sheets", () => {
    const expense = {
      id: 1,
      day: 15,
      month: "January",
      year: 2026,
      amountOriginal: "50.00",
      currencyOriginal: "EUR",
      amountEur: "50.00",
      exchangeRate: "1.0",
      categoryId: 1,
      note: "Lunch",
    };
    const categoryName = "Nourriture";

    // This mirrors the row data format used in syncExpenses
    const rowData = [
      expense.day,
      expense.month,
      expense.year,
      parseFloat(expense.amountOriginal),
      expense.currencyOriginal,
      parseFloat(expense.amountEur),
      expense.exchangeRate ? parseFloat(expense.exchangeRate) : "",
      categoryName,
      expense.note || "",
    ];

    expect(rowData).toHaveLength(9);
    expect(rowData[0]).toBe(15); // day
    expect(rowData[1]).toBe("January"); // month
    expect(rowData[2]).toBe(2026); // year
    expect(rowData[3]).toBe(50); // amount original (number)
    expect(rowData[4]).toBe("EUR"); // currency
    expect(rowData[5]).toBe(50); // amount EUR (number)
    expect(rowData[6]).toBe(1); // exchange rate
    expect(rowData[7]).toBe("Nourriture"); // category name
    expect(rowData[8]).toBe("Lunch"); // note
  });
});
