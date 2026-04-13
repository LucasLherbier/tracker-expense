/**
 * App-level settings, persisted via AsyncStorage.
 * Currently tracks: default currency for new expenses.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY_DEFAULT_CURRENCY = "@tracker_expense/default_currency";

/** Read the user-selected default currency. Falls back to "EUR". */
export async function getDefaultCurrency(): Promise<string> {
  try {
    const value = await AsyncStorage.getItem(KEY_DEFAULT_CURRENCY);
    return value || "EUR";
  } catch {
    return "EUR";
  }
}

/** Persist a new default currency. */
export async function setDefaultCurrency(code: string): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY_DEFAULT_CURRENCY, code);
  } catch {
    // silently fail — not critical
  }
}
