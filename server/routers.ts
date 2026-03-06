import { z } from "zod";
import * as db from "./db";
import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { ENV } from "./_core/env";
import { isServiceAccountConfigured } from "./google-service-account";
import {
  fetchAllExpenses,
  computeYearlyMetrics,
  computeHomeStats,
  getAvailableYears,
  appendExpenseToSheet,
  deleteExpenseFromSheet,
} from "./sheets-data";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ─── Categories (still used for the Add form dropdown) ────────────────────
  categories: router({
    list: publicProcedure.query(async () => db.getAllCategories()),
    seed: publicProcedure.mutation(async () => {
      await db.seedCategories();
      return { success: true };
    }),
  }),

  // ─── Google Sheets — single source of truth ───────────────────────────────
  sheet: router({
    /** Connection / configuration status */
    status: publicProcedure.query(async () => {
      const configured = isServiceAccountConfigured();
      return {
        connected: configured,
        isConfigured: configured,
        mode: "service_account" as const,
      };
    }),

    /** Read all expenses from the Journal tab */
    allExpenses: publicProcedure.query(async () => {
      if (!isServiceAccountConfigured()) {
        throw new Error("Service account not configured.");
      }
      return fetchAllExpenses();
    }),

    /** Home screen stats (current month / year) */
    homeStats: publicProcedure.query(async () => {
      if (!isServiceAccountConfigured()) {
        throw new Error("Service account not configured.");
      }
      const expenses = await fetchAllExpenses();
      return computeHomeStats(expenses);
    }),

    /** All distinct years present in the sheet */
    availableYears: publicProcedure.query(async () => {
      if (!isServiceAccountConfigured()) return [];
      const expenses = await fetchAllExpenses();
      return getAvailableYears(expenses);
    }),

    /** Yearly metrics: category × month matrix */
    yearlyMetrics: publicProcedure
      .input(z.object({ year: z.number() }))
      .query(async ({ input }) => {
        if (!isServiceAccountConfigured()) {
          throw new Error("Service account not configured.");
        }
        const expenses = await fetchAllExpenses();
        return computeYearlyMetrics(expenses, input.year);
      }),

    /** Add a new expense directly to the sheet */
    addExpense: publicProcedure
      .input(
        z.object({
          amountOriginal: z.number(),
          currency: z.string().length(3),
          day: z.number().min(1).max(31),
          month: z.string(),
          year: z.number().min(2000).max(2100),
          amountEur: z.number(),
          category: z.string(),
          note: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        if (!isServiceAccountConfigured()) {
          throw new Error("Service account not configured.");
        }
        const rowIndex = await appendExpenseToSheet({
          ...input,
          note: input.note || "",
        });
        return { success: true, rowIndex };
      }),

    /** Delete an expense row from the sheet */
    deleteExpense: publicProcedure
      .input(z.object({ rowIndex: z.number() }))
      .mutation(async ({ input }) => {
        if (!isServiceAccountConfigured()) {
          throw new Error("Service account not configured.");
        }
        await deleteExpenseFromSheet(input.rowIndex);
        return { success: true };
      }),
  }),

  // ─── Legacy local-DB routes (kept for backward compat, not used by UI) ────
  expenses: router({
    list: publicProcedure.query(async () => db.getAllExpenses()),
    create: publicProcedure
      .input(
        z.object({
          userId: z.number().optional(),
          day: z.number().min(1).max(31),
          month: z.string(),
          year: z.number().min(1900).max(2100),
          amountOriginal: z.string(),
          currencyOriginal: z.string().length(3),
          amountEur: z.string(),
          exchangeRate: z.string().optional(),
          categoryId: z.number(),
          note: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        await db.createExpense(input);
        return { success: true };
      }),
    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteExpense(input.id);
        return { success: true };
      }),
    unsynced: publicProcedure.query(async () => db.getUnsyncedExpenses()),
    markSynced: publicProcedure
      .input(z.object({ id: z.number(), sheetRowId: z.number().optional() }))
      .mutation(async ({ input }) => {
        await db.markExpenseAsSynced(input.id, input.sheetRowId);
        return { success: true };
      }),
  }),

  // ─── Legacy Google Sheets OAuth routes (kept for backward compat) ─────────
  googleSheets: router({
    status: publicProcedure.query(async () => {
      const saConfigured = isServiceAccountConfigured();
      if (saConfigured) {
        return { connected: true, isConfigured: true, mode: "service_account", expiresAt: null };
      }
      const isConfigured = !!(ENV.GOOGLE_CLIENT_ID && ENV.GOOGLE_CLIENT_SECRET && ENV.GOOGLE_SHEET_ID);
      return { connected: false, isConfigured, mode: "oauth", expiresAt: null };
    }),
    syncWithServiceAccount: publicProcedure.mutation(async () => {
      return { synced: 0, total: 0, errors: [] as string[] };
    }),
    syncExpenses: publicProcedure.mutation(async () => {
      return { synced: 0, total: 0, errors: [] as string[] };
    }),
  }),
});

export type AppRouter = typeof appRouter;
