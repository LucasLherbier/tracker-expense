# Expense Tracker — Technical Architecture

---

## What is this app?

A mobile expense tracker for a small team. Instead of manually filling in a Google Sheet, you log expenses directly from your Android phone — with automatic currency conversion to EUR at the date of the expense. The Google Sheet remains the single source of truth: the app reads and writes to it in real time, so the sheet stays up to date without any manual input.

Key features:
- Log expenses with date, amount, currency (auto-converted to EUR), category, and note
- Journal of all past expenses with search and delete
- Yearly metrics table (categories × months) matching the sheet structure
- Charts: category split and year-over-year evolution

---

## Overview

```
┌─────────────────────┐        HTTPS        ┌─────────────────────┐
│                     │ ──────────────────► │                     │
│   Android App       │                     │   Render Server     │
│   (APK on phone)    │ ◄────────────────── │   (Node.js)         │
│                     │    JSON / tRPC      │                     │
└─────────────────────┘                     └──────────┬──────────┘
                                                       │
                                          Google Sheets API
                                          (Service Account)
                                                       │
                                                       ▼
                                            ┌─────────────────────┐
                                            │   Google Sheet      │
                                            │  (Single source     │
                                            │   of truth)         │
                                            └─────────────────────┘
```

---

## Components

| Component | Technology | Role |
|---|---|---|
| **Android APK** | React Native + Expo | UI on your phone |
| **Backend Server** | Node.js + tRPC | Handles all Google Sheets API calls |
| **Data Storage** | Google Sheets | The only place data lives |
| **Build Service** | Expo EAS | Builds the APK in the cloud |
| **Hosting** | Render (free tier) | Runs the backend server 24/7 |

---

## Data Flow

### Adding an expense
```
Phone → Render Server → Google Sheets API → appends row to Journal tab
```

### Viewing metrics / journal
```
Google Sheets API → Render Server (computes metrics) → Phone displays result
```

### Deleting an expense
```
Phone → Render Server → Google Sheets API → deletes row from Journal tab
```

> The app has **no local database**. Every read and write goes directly to your Google Sheet.

---

## Deployment

### Backend (Render)
- Connected to your **GitHub repo** — auto-deploys on every `git push`
- Required environment variables set in Render dashboard:

| Variable | Purpose |
|---|---|
| `GOOGLE_SA_EMAIL` | Service account email |
| `GOOGLE_SA_PRIVATE_KEY` | Service account private key |
| `GOOGLE_SHEET_ID` | Your Google Sheet ID |
| `DATABASE_URL` | PostgreSQL URL (provided by Render) |

### Mobile App (APK)
- Built via **Expo EAS** cloud build service (free, ~10 min)
- The APK has the Render server URL hardcoded in `constants/oauth.ts`
- A new APK must be rebuilt whenever the server URL changes

---

## Updating the App

| What changed | Action needed |
|---|---|
| Backend logic only | Push to GitHub → Render auto-redeploys → no new APK needed |
| UI / mobile code | Push to GitHub → run `eas build` → install new APK |
| Both | Push to GitHub → Render redeploys → run `eas build` → install new APK |

---

## Rebuild the APK

```bash
# From your cloned GitHub repo folder
git pull
pnpm install
eas build --platform android --profile preview
```

EAS builds in the cloud and gives you a direct download link for the `.apk`.

---

## Key Files

| File | Purpose |
|---|---|
| `constants/oauth.ts` | Contains the Render server URL (line 16) |
| `app.config.ts` | App name, bundle ID, EAS project ID |
| `server/sheets-data.ts` | Reads and computes metrics from Google Sheets |
| `server/routers.ts` | All tRPC API routes |
| `server/google-service-account.ts` | Google Sheets authentication logic |
