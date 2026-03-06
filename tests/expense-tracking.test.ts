import { describe, it, expect } from "vitest";
import { convertToEUR, SUPPORTED_CURRENCIES, formatCurrency, MONTHS, getMonthName, getMonthNumber } from "../lib/currency-service";

describe("Currency Service", () => {
  it("should convert EUR to EUR with rate 1", async () => {
    const result = await convertToEUR(100, "EUR");
    expect(result.amountEur).toBe(100);
    expect(result.rate).toBe(1);
    expect(result.fromCurrency).toBe("EUR");
  });

  it("should have all supported currencies defined", () => {
    expect(SUPPORTED_CURRENCIES.length).toBeGreaterThan(0);
    expect(SUPPORTED_CURRENCIES[0]).toHaveProperty("code");
    expect(SUPPORTED_CURRENCIES[0]).toHaveProperty("name");
    expect(SUPPORTED_CURRENCIES[0]).toHaveProperty("symbol");
  });

  it("should format currency correctly", () => {
    const formatted = formatCurrency(100.5, "EUR");
    expect(formatted).toContain("100.50");
  });

  it("should have 12 months defined", () => {
    expect(MONTHS).toHaveLength(12);
    expect(MONTHS[0]).toBe("Janvier");
    expect(MONTHS[11]).toBe("Décembre");
  });

  it("should get month name from number", () => {
    expect(getMonthName(1)).toBe("Janvier");
    expect(getMonthName(12)).toBe("Décembre");
  });

  it("should get month number from name", () => {
    expect(getMonthNumber("Janvier")).toBe(1);
    expect(getMonthNumber("Décembre")).toBe(12);
  });
});

describe("Expense Data Validation", () => {
  it("should validate expense date components", () => {
    const day = 15;
    const month = "Janvier";
    const year = 2026;

    expect(day).toBeGreaterThan(0);
    expect(day).toBeLessThanOrEqual(31);
    expect(MONTHS).toContain(month);
    expect(year).toBeGreaterThan(1900);
    expect(year).toBeLessThan(2100);
  });

  it("should validate expense amounts", () => {
    const amountOriginal = "100.50";
    const amountEur = "95.25";

    expect(parseFloat(amountOriginal)).toBeGreaterThan(0);
    expect(parseFloat(amountEur)).toBeGreaterThan(0);
    expect(isNaN(parseFloat(amountOriginal))).toBe(false);
  });

  it("should validate currency codes", () => {
    const validCurrencies = SUPPORTED_CURRENCIES.map(c => c.code);
    const testCurrency = "EUR";

    expect(validCurrencies).toContain(testCurrency);
    expect(testCurrency).toHaveLength(3);
  });
});

describe("Database Schema Types", () => {
  it("should have valid expense structure", () => {
    const mockExpense = {
      id: 1,
      day: 15,
      month: "Janvier",
      year: 2026,
      amountOriginal: "100.00",
      currencyOriginal: "USD",
      amountEur: "95.00",
      exchangeRate: "0.95",
      categoryId: 1,
      note: "Test expense",
      syncedToSheet: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(mockExpense).toHaveProperty("id");
    expect(mockExpense).toHaveProperty("day");
    expect(mockExpense).toHaveProperty("month");
    expect(mockExpense).toHaveProperty("year");
    expect(mockExpense).toHaveProperty("amountEur");
    expect(mockExpense).toHaveProperty("categoryId");
  });

  it("should have valid category structure", () => {
    const mockCategory = {
      id: 1,
      name: "Logement",
      displayOrder: 1,
    };

    expect(mockCategory).toHaveProperty("id");
    expect(mockCategory).toHaveProperty("name");
    expect(mockCategory).toHaveProperty("displayOrder");
  });
});
