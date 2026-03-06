import { describe, it, expect } from "vitest";

// Load env vars the same way the server does
import "../scripts/load-env.js";

describe("Google Service Account credentials", () => {
  it("GOOGLE_SA_EMAIL is set and looks valid", () => {
    const email = process.env.GOOGLE_SA_EMAIL ?? "";
    expect(email).toBeTruthy();
    expect(email).toContain("@");
    expect(email).toContain("iam.gserviceaccount.com");
  });

  it("GOOGLE_SA_PRIVATE_KEY is set and looks like a PEM key", () => {
    const key = (process.env.GOOGLE_SA_PRIVATE_KEY ?? "").replace(/\\n/g, "\n");
    expect(key).toBeTruthy();
    expect(key).toContain("BEGIN PRIVATE KEY");
    expect(key).toContain("END PRIVATE KEY");
  });

  it("GOOGLE_SHEET_ID is set", () => {
    const sheetId = process.env.GOOGLE_SHEET_ID ?? "";
    expect(sheetId).toBeTruthy();
    expect(sheetId.length).toBeGreaterThan(10);
  });

  it("can obtain a service account access token from Google", async () => {
    const email = process.env.GOOGLE_SA_EMAIL ?? "";
    const rawKey = (process.env.GOOGLE_SA_PRIVATE_KEY ?? "").replace(/\\n/g, "\n");

    if (!email || !rawKey) {
      console.warn("Skipping live token test — credentials not set");
      return;
    }

    // Build JWT
    const TOKEN_URL = "https://oauth2.googleapis.com/token";
    const SCOPES = "https://www.googleapis.com/auth/spreadsheets";

    function base64url(input: string | Uint8Array): string {
      const bytes = typeof input === "string" ? new TextEncoder().encode(input) : input;
      let binary = "";
      bytes.forEach((b) => (binary += String.fromCharCode(b)));
      return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
    }

    const now = Math.floor(Date.now() / 1000);
    const header = { alg: "RS256", typ: "JWT" };
    const payload = { iss: email, scope: SCOPES, aud: TOKEN_URL, exp: now + 3600, iat: now };

    const headerB64 = base64url(JSON.stringify(header));
    const payloadB64 = base64url(JSON.stringify(payload));
    const signingInput = `${headerB64}.${payloadB64}`;

    const pemContents = rawKey
      .replace(/-----BEGIN PRIVATE KEY-----/, "")
      .replace(/-----END PRIVATE KEY-----/, "")
      .replace(/\s/g, "");
    const binaryDer = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));
    const cryptoKey = await crypto.subtle.importKey(
      "pkcs8",
      binaryDer.buffer,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const signature = await crypto.subtle.sign(
      "RSASSA-PKCS1-v1_5",
      cryptoKey,
      new TextEncoder().encode(signingInput)
    );
    const jwt = `${signingInput}.${base64url(new Uint8Array(signature))}`;

    const res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: jwt,
      }),
    });

    const data = await res.json();
    console.log("Token response status:", res.status);
    if (!res.ok) {
      console.error("Token error:", data);
    }

    expect(res.ok).toBe(true);
    expect(data.access_token).toBeTruthy();
    expect(data.token_type).toBe("Bearer");
  }, 15000); // 15s timeout for network call
});
