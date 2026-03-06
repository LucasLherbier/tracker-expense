# Expense Tracker Mobile App

A mobile expense tracking application built with React Native and Expo, designed to sync with Google Sheets.

## Features

### ✅ Implemented

- **Add Expenses**: Input expenses with date, amount, currency, category, and notes
- **Real-time Currency Conversion**: Automatically converts any currency to EUR using live exchange rates
- **Dashboard**: View current month total, yearly total, and recent expenses
- **Yearly Metrics**: Comprehensive table showing expenses by category and month
- **Local Database**: All expenses stored securely in MySQL database
- **Multi-Currency Support**: 20+ currencies supported
- **Category Management**: 19 predefined expense categories (matching your Google Sheet)

### 🔄 Partially Implemented

- **Google Sheets Sync**: Infrastructure ready, requires OAuth configuration

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm package manager
- iOS Simulator or Android Emulator (or physical device with Expo Go)

### Installation

1. Install dependencies:
   ```bash
   cd expense-tracker-mobile
   pnpm install
   ```

2. Start the development server:
   ```bash
   pnpm dev
   ```

3. Open the app:
   - **iOS**: Scan QR code with Camera app
   - **Android**: Scan QR code with Expo Go app
   - **Web**: Opens automatically in browser

## App Structure

### Screens

1. **Home (Dashboard)**
   - Current month expenses summary
   - Yearly total
   - Recent expenses list
   - Quick "Add Expense" button

2. **Add Expense**
   - Date picker (day, month, year)
   - Amount input with currency selector
   - Real-time currency conversion to EUR
   - Category dropdown
   - Optional note field
   - Form validation

3. **Metrics**
   - Year selector
   - Scrollable table: categories × months
   - Monthly and category totals
   - Grand total for the year
   - Summary statistics

4. **Sync**
   - Google Sheets sync status
   - Unsynced expenses count
   - Configuration guide
   - Manual export instructions

### Database Schema

**Categories Table**
- id (primary key)
- name (category name)
- displayOrder (sort order)

**Expenses Table**
- id (primary key)
- userId (optional, for multi-user support)
- day, month, year (date components)
- amountOriginal (original amount entered)
- currencyOriginal (original currency code)
- amountEur (converted amount in EUR)
- exchangeRate (conversion rate used)
- categoryId (foreign key to categories)
- note (optional text)
- syncedToSheet (0 or 1)
- sheetRowId (row number in Google Sheet)
- createdAt, updatedAt (timestamps)

**Exchange Rates Table** (cache)
- id (primary key)
- fromCurrency
- toCurrency
- rate
- date

## Google Sheets Integration

### Current Status

The app includes the infrastructure for Google Sheets sync, but requires OAuth configuration to function.

### Setup Instructions

1. **Create Google Cloud Project**
   - Go to https://console.cloud.google.com/
   - Create a new project
   - Enable Google Sheets API

2. **Create OAuth 2.0 Credentials**
   - Go to "Credentials" section
   - Create OAuth 2.0 Client ID
   - Application type: Web application
   - Add authorized redirect URI: `your-app-url/oauth/callback`

3. **Configure Environment Variables**
   - `GOOGLE_CLIENT_ID`: Your OAuth client ID
   - `GOOGLE_CLIENT_SECRET`: Your OAuth client secret
   - `GOOGLE_SHEET_ID`: Your Google Sheet ID (from the URL)

4. **Google Sheet Structure**
   The app expects a sheet named "Journal" with these columns:
   - A: Day (number)
   - B: Month (text, e.g., "Janvier")
   - C: Year (number)
   - D: Amount Original (number)
   - E: Currency Original (text, e.g., "USD")
   - F: Amount EUR (number)
   - G: Exchange Rate (number)
   - H: Category (text)
   - I: Note (text)

### Sync Features (When Configured)

- **Automatic Upload**: New expenses sync to Google Sheets
- **Bidirectional Sync**: Import existing expenses from Google Sheets
- **Conflict Resolution**: Local database is source of truth
- **Offline Support**: Expenses saved locally, synced when online

## Currency Conversion

The app uses the free ExchangeRate-API (https://www.exchangerate-api.com/) for real-time currency conversion.

**Supported Currencies:**
EUR, USD, GBP, JPY, CHF, CAD, AUD, CNY, INR, BRL, MXN, ZAR, SEK, NOK, DKK, PLN, THB, SGD, HKD, NZD

**Features:**
- Real-time conversion as you type
- Automatic rate caching
- Offline fallback (uses last known rate)
- No API key required (free tier: 1500 requests/month)

## Categories

The app includes 19 predefined categories matching your Google Sheet:

1. Logement
2. Nourriture
3. Restaurant
4. Bar/Café
5. Transport
6. Sports
7. Aviron
8. Vacances
9. Week End
10. Soirée
11. Multimédia
12. Vêtements
13. Cadeau
14. Spectacles
15. Santé
16. Education
17. Administratif
18. Autres
19. Impôts

## API Endpoints

The app uses tRPC for type-safe API calls:

### Categories
- `categories.list`: Get all categories
- `categories.seed`: Initialize categories

### Expenses
- `expenses.list`: Get all expenses (with optional filters)
- `expenses.create`: Create new expense
- `expenses.update`: Update existing expense
- `expenses.delete`: Delete expense
- `expenses.unsynced`: Get expenses not yet synced to Google Sheets
- `expenses.markSynced`: Mark expense as synced

### Metrics
- `metrics.yearly`: Get yearly metrics by category and month

## Development

### Project Structure

```
expense-tracker-mobile/
├── app/
│   ├── (tabs)/
│   │   ├── index.tsx          # Home screen
│   │   ├── add-expense.tsx    # Add expense form
│   │   ├── metrics.tsx        # Yearly metrics table
│   │   └── sync.tsx           # Google Sheets sync
│   └── _layout.tsx
├── components/
│   ├── screen-container.tsx   # Safe area wrapper
│   └── ui/
├── lib/
│   ├── currency-service.ts    # Currency conversion
│   ├── google-sheets-service.ts # Google Sheets API
│   ├── trpc.ts                # API client
│   └── utils.ts
├── server/
│   ├── db.ts                  # Database functions
│   ├── routers.ts             # API routes
│   └── _core/
├── drizzle/
│   └── schema.ts              # Database schema
└── tests/
```

### Adding New Features

1. **Add Database Table**: Edit `drizzle/schema.ts`
2. **Add Database Functions**: Edit `server/db.ts`
3. **Add API Routes**: Edit `server/routers.ts`
4. **Create UI Screen**: Add file in `app/(tabs)/`
5. **Update Tab Bar**: Edit `app/(tabs)/_layout.tsx`

### Testing

```bash
# Run all tests
pnpm test

# Run specific test
pnpm test tests/google-sheets.test.ts

# Type checking
pnpm check
```

## Deployment

### Database

The app uses MySQL database. Make sure to:
1. Run migrations: `pnpm db:push`
2. Seed categories on first run (automatic)

### Environment Variables

Required for production:
- `DATABASE_URL`: MySQL connection string
- `JWT_SECRET`: Session secret
- `GOOGLE_CLIENT_ID`: (optional) Google OAuth client ID
- `GOOGLE_CLIENT_SECRET`: (optional) Google OAuth secret
- `GOOGLE_SHEET_ID`: (optional) Target Google Sheet ID

### Building

```bash
# Build for production
pnpm build

# Start production server
pnpm start
```

## Known Limitations

1. **Google Sheets Sync**: Requires OAuth flow completion
2. **Offline Mode**: Currency conversion requires internet
3. **Multi-User**: User authentication not fully implemented
4. **Attachments**: No support for receipt photos (yet)

## Future Enhancements

- [ ] Complete OAuth flow for Google Sheets
- [ ] Add receipt photo upload
- [ ] Implement expense search and filters
- [ ] Add expense editing
- [ ] Create expense categories management
- [ ] Add budget tracking
- [ ] Implement recurring expenses
- [ ] Add expense reports (PDF export)
- [ ] Multi-language support

## Support

For issues or questions:
1. Check the Sync screen for configuration status
2. Review the console logs for errors
3. Verify database connection
4. Test currency conversion API availability

## License

Private project - All rights reserved
