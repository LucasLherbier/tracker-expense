/**
 * Currency conversion service using ExchangeRate-API
 * Free tier: 1500 requests/month, no API key required
 */

export interface ExchangeRateResponse {
  result: string;
  base_code: string;
  rates: Record<string, number>;
  time_last_update_unix: number;
}

export interface ConversionResult {
  amountEur: number;
  rate: number;
  fromCurrency: string;
  date: Date;
}

/**
 * Get exchange rate from API or cache
 */
export async function convertToEUR(
  amount: number,
  fromCurrency: string,
  date?: Date
): Promise<ConversionResult> {
  if (fromCurrency === "EUR") {
    return {
      amountEur: amount,
      rate: 1,
      fromCurrency: "EUR",
      date: date || new Date(),
    };
  }

  try {
    // Use the free ExchangeRate-API (no key required)
    const response = await fetch(
      `https://api.exchangerate-api.com/v4/latest/${fromCurrency}`
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch exchange rate: ${response.statusText}`);
    }

    const data: ExchangeRateResponse = await response.json();

    if (!data.rates.EUR) {
      throw new Error(`EUR rate not found for ${fromCurrency}`);
    }

    const rate = data.rates.EUR;
    const amountEur = amount * rate;

    return {
      amountEur: parseFloat(amountEur.toFixed(2)),
      rate: parseFloat(rate.toFixed(6)),
      fromCurrency,
      date: date || new Date(),
    };
  } catch (error) {
    console.error("Currency conversion error:", error);
    throw new Error(
      `Failed to convert ${fromCurrency} to EUR. Please check your internet connection.`
    );
  }
}

/**
 * List of supported currencies
 */
export const SUPPORTED_CURRENCIES = [
  { code: "EUR", name: "Euro", symbol: "€" },
  { code: "USD", name: "US Dollar", symbol: "$" },
  { code: "GBP", name: "British Pound", symbol: "£" },
  { code: "JPY", name: "Japanese Yen", symbol: "¥" },
  { code: "CHF", name: "Swiss Franc", symbol: "CHF" },
  { code: "CAD", name: "Canadian Dollar", symbol: "C$" },
  { code: "AUD", name: "Australian Dollar", symbol: "A$" },
  { code: "CNY", name: "Chinese Yuan", symbol: "¥" },
  { code: "INR", name: "Indian Rupee", symbol: "₹" },
  { code: "BRL", name: "Brazilian Real", symbol: "R$" },
  { code: "MXN", name: "Mexican Peso", symbol: "MX$" },
  { code: "ZAR", name: "South African Rand", symbol: "R" },
  { code: "SEK", name: "Swedish Krona", symbol: "kr" },
  { code: "NOK", name: "Norwegian Krone", symbol: "kr" },
  { code: "DKK", name: "Danish Krone", symbol: "kr" },
  { code: "PLN", name: "Polish Zloty", symbol: "zł" },
  { code: "THB", name: "Thai Baht", symbol: "฿" },
  { code: "SGD", name: "Singapore Dollar", symbol: "S$" },
  { code: "HKD", name: "Hong Kong Dollar", symbol: "HK$" },
  { code: "NZD", name: "New Zealand Dollar", symbol: "NZ$" },
];

/**
 * Format amount with currency symbol
 */
export function formatCurrency(amount: number, currencyCode: string): string {
  const currency = SUPPORTED_CURRENCIES.find((c) => c.code === currencyCode);
  const symbol = currency?.symbol || currencyCode;

  return `${symbol} ${amount.toFixed(2)}`;
}

/**
 * Get currency symbol
 */
export function getCurrencySymbol(currencyCode: string): string {
  const currency = SUPPORTED_CURRENCIES.find((c) => c.code === currencyCode);
  return currency?.symbol || currencyCode;
}

/**
 * List of months in French (matching Google Sheet format)
 */
export const MONTHS = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
];

/**
 * Get month name from number (1-12)
 */
export function getMonthName(monthNumber: number): string {
  return MONTHS[monthNumber - 1] || "Janvier";
}

/**
 * Get month number from name (1-12)
 */
export function getMonthNumber(monthName: string): number {
  const index = MONTHS.indexOf(monthName);
  return index >= 0 ? index + 1 : 1;
}
