import fs from "fs";

// Load service account credentials from Render secret file if available
function loadServiceAccountFromFile(): { email: string; privateKey: string } {
  const secretPath = "/etc/secrets/dynamic-poet.json";
  try {
    if (fs.existsSync(secretPath)) {
      const json = JSON.parse(fs.readFileSync(secretPath, "utf-8"));
      return {
        email: json.client_email ?? "",
        privateKey: json.private_key ?? "",
      };
    }
  } catch (e) {
    console.warn("[env] Could not load service account from secret file:", e);
  }
  return { email: "", privateKey: "" };
}

const saFromFile = loadServiceAccountFromFile();

export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  // Google Sheets integration (OAuth)
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ?? "",
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ?? "",
  GOOGLE_SHEET_ID: process.env.GOOGLE_SHEET_ID ?? "",
  // Google Sheets integration (Service Account)
  // Prefers secret file (/etc/secrets/dynamic-poet.json) over individual env vars
  GOOGLE_SA_EMAIL: saFromFile.email || process.env.GOOGLE_SA_EMAIL || "",
  GOOGLE_SA_PRIVATE_KEY: saFromFile.privateKey || (process.env.GOOGLE_SA_PRIVATE_KEY ?? "").replace(/\\n/g, "\n"),
};
