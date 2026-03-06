/**
 * Google Sheets sync using a Service Account (JWT-based auth).
 *
 * No OAuth popup required. The service account email is shared on the Google Sheet
 * with "Editor" access, and the server signs its own JWT to get an access token.
 *
 * Setup (one-time):
 * 1. In Google Cloud Console → IAM → Service Accounts → Create
 * 2. Download the JSON key file
 * 3. Copy client_email and private_key into env vars GOOGLE_SA_EMAIL and GOOGLE_SA_PRIVATE_KEY
 * 4. Share your Google Sheet with the service account email (Editor access)
 */

import { ENV } from "./_core/env";

const SCOPES = "https://www.googleapis.com/auth/spreadsheets";
const TOKEN_URL = "https://oauth2.googleapis.com/token";

let cachedToken: { token: string; expiresAt: number } | null = null;

/**
 * Build a base64url-encoded string (no padding)
 */
function base64url(input: string | Uint8Array): string {
  const bytes =
    typeof input === "string" ? new TextEncoder().encode(input) : input;
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Import a PEM private key for signing
 */
async function importPrivateKey(pem: string): Promise<CryptoKey> {
  // Strip PEM headers and whitespace
  const pemContents = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s/g, "");

  const binaryDer = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));

  return crypto.subtle.importKey(
    "pkcs8",
    binaryDer.buffer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
}

/**
 * Create and sign a JWT for the service account
 */
async function createJWT(email: string, privateKeyPem: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: email,
    scope: SCOPES,
    aud: TOKEN_URL,
    exp: now + 3600,
    iat: now,
  };

  const headerB64 = base64url(JSON.stringify(header));
  const payloadB64 = base64url(JSON.stringify(payload));
  const signingInput = `${headerB64}.${payloadB64}`;

  const key = await importPrivateKey(privateKeyPem);
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(signingInput)
  );

  const sigB64 = base64url(new Uint8Array(signature));
  return `${signingInput}.${sigB64}`;
}

/**
 * Get a valid access token for the service account (with caching)
 */
export async function getServiceAccountToken(): Promise<string> {
  // Return cached token if still valid (with 60s buffer)
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.token;
  }

  const email = ENV.GOOGLE_SA_EMAIL;
  const privateKey = ENV.GOOGLE_SA_PRIVATE_KEY;

  if (!email || !privateKey) {
    throw new Error(
      "Service account credentials not configured. Set GOOGLE_SA_EMAIL and GOOGLE_SA_PRIVATE_KEY."
    );
  }

  const jwt = await createJWT(email, privateKey);

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(
      `Failed to get service account token: ${err.error_description || err.error || "Unknown error"}`
    );
  }

  const data = await res.json();
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };

  return cachedToken.token;
}

/**
 * Check if service account credentials are configured
 */
export function isServiceAccountConfigured(): boolean {
  return !!(ENV.GOOGLE_SA_EMAIL && ENV.GOOGLE_SA_PRIVATE_KEY && ENV.GOOGLE_SHEET_ID);
}
