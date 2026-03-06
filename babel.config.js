import { eq, and, desc, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, categories, expenses, exchangeRates, googleTokens, InsertCategory, InsertExpense, InsertExchangeRate, InsertGoogleToken } from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

/**
 * Categories
 */

export async function getAllCategories() {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(categories).orderBy(categories.displayOrder);
}

export async function createCategory(data: InsertCategory) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.insert(categories).values(data);
}

export async function seedCategories() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const existingCategories = await getAllCategories();
  if (existingCategories.length > 0) {
    return; // Already seeded
  }
  
  const categoryList = [
    { name: "Logement", displayOrder: 1 },
    { name: "Nourriture", displayOrder: 2 },
    { name: "Restaurant", displayOrder: 3 },
    { name: "Bar/Café", displayOrder: 4 },
    { name: "Transport", displayOrder: 5 },
    { name: "Sports", displayOrder: 6 },
    { name: "Aviron", displayOrder: 7 },
    { name: "Vacances", displayOrder: 8 },
    { name: "Week End", displayOrder: 9 },
    { name: "Soirée", displayOrder: 10 },
    { name: "Multimédia", displayOrder: 11 },
    { name: "Vêtements", displayOrder: 12 },
    { name: "Cadeau", displayOrder: 13 },
    { name: "Spectacles", displayOrder: 14 },
    { name: "Santé", displayOrder: 15 },
    { name: "Education", displayOrder: 16 },
    { name: "Administratif", displayOrder: 17 },
    { name: "Autres", displayOrder: 18 },
    { name: "Impôts", displayOrder: 19 },
  ];
  
  await db.insert(categories).values(categoryList);
}

/**
 * Expenses
 */

export async function getAllExpenses(userId?: number) {
  const db = await getDb();
  if (!db) return [];
  
  const query = db.select().from(expenses);
  
  if (userId) {
    return query.where(eq(expenses.userId, userId)).orderBy(desc(expenses.createdAt));
  }
  
  return query.orderBy(desc(expenses.createdAt));
}

export async function getExpensesByFilter(filters: {
  userId?: number;
  year?: number;
  month?: string;
  categoryId?: number;
}) {
  const db = await getDb();
  if (!db) return [];
  
  const conditions = [];
  
  if (filters.userId) {
    conditions.push(eq(expenses.userId, filters.userId));
  }
  if (filters.year) {
    conditions.push(eq(expenses.year, filters.year));
  }
  if (filters.month) {
    conditions.push(eq(expenses.month, filters.month));
  }
  if (filters.categoryId) {
    conditions.push(eq(expenses.categoryId, filters.categoryId));
  }
  
  if (conditions.length === 0) {
    return getAllExpenses(filters.userId);
  }
  
  return db.select().from(expenses).where(and(...conditions)).orderBy(desc(expenses.createdAt));
}

export async function createExpense(data: InsertExpense) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.insert(expenses).values(data);
}

export async function updateExpense(id: number, data: Partial<InsertExpense>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(expenses).set(data).where(eq(expenses.id, id));
}

export async function deleteExpense(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(expenses).where(eq(expenses.id, id));
}

export async function getUnsyncedExpenses() {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(expenses).where(eq(expenses.syncedToSheet, 0)).orderBy(expenses.createdAt);
}

export async function markExpenseAsSynced(id: number, sheetRowId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(expenses).set({ 
    syncedToSheet: 1,
    sheetRowId: sheetRowId 
  }).where(eq(expenses.id, id));
}

/**
 * Yearly metrics - aggregated by year, month, and category
 */
export async function getYearlyMetrics(year: number, userId?: number) {
  const db = await getDb();
  if (!db) return [];
  
  const conditions = [eq(expenses.year, year)];
  if (userId) {
    conditions.push(eq(expenses.userId, userId));
  }
  
  // Get all expenses for the year grouped by month and category
  const result = await db
    .select({
      month: expenses.month,
      categoryId: expenses.categoryId,
      total: sql<string>`SUM(CAST(${expenses.amountEur} AS DECIMAL(10,2)))`,
    })
    .from(expenses)
    .where(and(...conditions))
    .groupBy(expenses.month, expenses.categoryId);
  
  return result;
}

/**
 * Exchange rates cache
 */

export async function getCachedExchangeRate(fromCurrency: string, toCurrency: string, date: Date) {
  const db = await getDb();
  if (!db) return null;
  
  // Get rate from the same day
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  
  const result = await db
    .select()
    .from(exchangeRates)
    .where(
      and(
        eq(exchangeRates.fromCurrency, fromCurrency),
        eq(exchangeRates.toCurrency, toCurrency),
        sql`${exchangeRates.date} >= ${startOfDay}`,
        sql`${exchangeRates.date} <= ${endOfDay}`
      )
    )
    .limit(1);
  
  return result[0] || null;
}

export async function cacheExchangeRate(data: InsertExchangeRate) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.insert(exchangeRates).values(data);
}

/**
 * Google OAuth tokens
 */

export async function getGoogleToken() {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select().from(googleTokens).orderBy(desc(googleTokens.updatedAt)).limit(1);
  return result[0] || null;
}

export async function saveGoogleToken(data: InsertGoogleToken) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Delete any existing tokens first (single-user app)
  await db.delete(googleTokens);
  await db.insert(googleTokens).values(data);
}

export async function updateGoogleToken(id: number, data: Partial<InsertGoogleToken>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(googleTokens).set(data).where(eq(googleTokens.id, id));
}

export async function deleteGoogleToken() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(googleTokens);
}
