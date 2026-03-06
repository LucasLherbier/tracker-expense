import { describe, it, expect } from "vitest";
import { ENV } from "../server/_core/env";

describe("Google Sheets Configuration", () => {
  it("should have Google Sheets environment variables defined", () => {
    // Check that the ENV object has the Google Sheets properties
    expect(ENV).toHaveProperty("GOOGLE_CLIENT_ID");
    expect(ENV).toHaveProperty("GOOGLE_CLIENT_SECRET");
    expect(ENV).toHaveProperty("GOOGLE_SHEET_ID");
  });

  it("should allow empty Google Sheets credentials for local-only mode", () => {
    // The app should work without Google Sheets credentials
    // They can be empty strings for local-only operation
    expect(typeof ENV.GOOGLE_CLIENT_ID).toBe("string");
    expect(typeof ENV.GOOGLE_CLIENT_SECRET).toBe("string");
    expect(typeof ENV.GOOGLE_SHEET_ID).toBe("string");
  });
});
