# Expense Tracker Mobile App - Design Document

## App Overview
A mobile expense tracking application for Android that allows users to input team expenses with automatic currency conversion and sync with Google Sheets. The app provides comprehensive metrics and visualizations organized by year, month, and category.

## Design Philosophy
This app follows **Apple Human Interface Guidelines (HIG)** and mainstream iOS mobile app design standards to feel like a first-party native app. The design assumes **mobile portrait orientation (9:16)** and **one-handed usage** patterns.

## Color Palette
- **Primary**: #0a7ea4 (Teal blue - represents financial trust and clarity)
- **Background Light**: #ffffff (Clean white for data clarity)
- **Background Dark**: #151718 (Deep charcoal for comfortable night viewing)
- **Surface Light**: #f5f5f5 (Subtle gray for card elevation)
- **Surface Dark**: #1e2022 (Slightly lighter than background)
- **Success**: #22C55E (Green for positive actions)
- **Warning**: #F59E0B (Amber for currency alerts)
- **Error**: #EF4444 (Red for validation errors)

## Screen List

### 1. Home/Dashboard Screen
**Purpose**: Quick overview of expense metrics and recent activity

**Primary Content**:
- Current month total expenses (large, prominent)
- Monthly spending trend chart (last 6 months)
- Quick stats cards: Top category this month, Total this year
- Recent expenses list (last 5 entries)
- Floating action button (FAB) to add new expense

**Functionality**:
- Pull-to-refresh to sync with Google Sheets
- Tap on recent expense to view details
- Tap on stats cards to navigate to detailed views

### 2. Add Expense Screen
**Purpose**: Input form for new expense entries

**Primary Content**:
- Date picker (Day, Month, Year) with calendar icon
- Amount input field (large, numeric keyboard)
- Currency selector dropdown (EUR, USD, GBP, JPY, etc.)
- Real-time conversion display showing EUR equivalent
- Category picker (dropdown or bottom sheet with all categories)
- Note/Comment text field (multiline, optional)
- Save button (primary action, bottom of screen)

**Functionality**:
- Auto-convert currency to EUR on amount/currency change
- Show exchange rate and date used for conversion
- Validate all required fields before save
- Haptic feedback on successful save
- Return to previous screen after save

### 3. Expenses List Screen
**Purpose**: Browse all expenses with filtering options

**Primary Content**:
- Filter bar at top (Year, Month, Category dropdowns)
- Scrollable list of expenses grouped by month
- Each expense card shows: Date, Amount (original + EUR), Category, Note
- Empty state when no expenses match filters

**Functionality**:
- Pull-to-refresh to sync
- Tap expense to view/edit details
- Swipe actions: Delete expense
- Infinite scroll pagination

### 4. Yearly Metrics Screen
**Purpose**: Detailed breakdown by year, month, and category (matching Google Sheet structure)

**Primary Content**:
- Year selector at top
- Horizontal scrollable table showing:
  - Rows: Categories (Nourriture, Restaurant, Transport, etc.)
  - Columns: Months (Jan-Dec) + Total + Percentage
  - Values: Expense amounts in EUR
- Summary row: Total and Total without taxes
- Color-coded cells (heatmap style) to highlight high spending

**Functionality**:
- Swipe horizontally to view all months
- Tap on cell to see detailed expenses for that category/month
- Export table as image or share

### 5. Settings Screen
**Purpose**: App configuration and Google Sheets connection

**Primary Content**:
- Google Sheets connection section:
  - Connected account display
  - Connect/Disconnect button
  - Sheet URL input
  - Last sync timestamp
- Sync settings:
  - Auto-sync toggle
  - Sync frequency selector
  - Manual sync button
- App preferences:
  - Default currency selector
  - Theme toggle (Light/Dark)
- About section: Version, Privacy policy

**Functionality**:
- OAuth flow for Google Sheets authorization
- Test connection to verify sheet access
- Show sync status and errors

## Key User Flows

### Flow 1: Add New Expense
1. User taps FAB on Home screen
2. Add Expense screen opens
3. User selects date (defaults to today)
4. User enters amount (e.g., "50")
5. User selects currency (e.g., "USD")
6. App shows real-time conversion: "50 USD = 46.50 EUR (rate: 0.93, Feb 10, 2026)"
7. User selects category from dropdown (e.g., "Restaurant")
8. User optionally adds note (e.g., "Team lunch")
9. User taps Save button
10. App saves to local database
11. App syncs to Google Sheets in background
12. Success haptic feedback
13. Return to Home screen with updated metrics

### Flow 2: View Yearly Breakdown
1. User taps on "Yearly Metrics" tab
2. Yearly Metrics screen loads with current year
3. User sees table with categories vs months
4. User swipes horizontally to view all months
5. User taps on a cell (e.g., "Restaurant - March")
6. Detail modal shows all restaurant expenses in March
7. User can tap on individual expense to edit
8. User closes modal to return to table

### Flow 3: Connect Google Sheets
1. User opens Settings screen
2. User taps "Connect Google Sheets" button
3. OAuth web browser opens
4. User signs in to Google account
5. User authorizes app to access sheets
6. Browser closes, returns to app
7. User pastes Google Sheet URL
8. App validates connection
9. User taps "Start Sync" button
10. App pulls existing data from sheet
11. Success message shows with sync timestamp

### Flow 4: View and Filter Expenses
1. User taps on "Expenses" tab
2. Expenses List screen shows all expenses
3. User taps "Filter" button
4. Filter sheet slides up from bottom
5. User selects Year: 2025, Month: November, Category: Restaurant
6. User taps "Apply"
7. List updates to show only matching expenses
8. User can tap on expense to view details
9. User can swipe left to delete

## Navigation Structure
**Bottom Tab Bar** (4 tabs):
1. **Home** (house icon) - Dashboard screen
2. **Add** (plus icon) - Add Expense screen
3. **Expenses** (list icon) - Expenses List screen
4. **Metrics** (chart icon) - Yearly Metrics screen
5. **Settings** (gear icon) - Settings screen

## Typography
- **Headings**: SF Pro Display / System Bold, 24-28pt
- **Body**: SF Pro Text / System Regular, 16pt
- **Captions**: SF Pro Text / System Regular, 14pt
- **Numbers**: SF Pro Display / System Semibold, 18-32pt (for amounts)

## Component Patterns

### Expense Card
- White/dark surface background
- Rounded corners (12pt)
- Padding: 16pt
- Shadow: subtle elevation
- Layout: Date (top-left), Amount (top-right, bold), Category badge (bottom-left), Note (bottom, muted)

### Input Fields
- Height: 48pt (easy thumb reach)
- Border: 1pt, rounded 8pt
- Focus state: primary color border
- Error state: error color border with message below

### Category Badge
- Pill shape (rounded 16pt)
- Background: category-specific color (light tint)
- Text: category name in primary color
- Padding: 6pt horizontal, 4pt vertical

### Buttons
- Primary: Filled with primary color, white text, 48pt height
- Secondary: Outlined with border, primary text
- Destructive: Red background for delete actions
- Disabled: 50% opacity

## Data Visualization
- **Monthly trend chart**: Line chart with gradient fill, showing last 6 months
- **Category breakdown**: Horizontal bar chart showing top 5 categories
- **Yearly table**: Heatmap-style coloring (light to dark based on amount)

## Offline Support
- All expenses saved locally first (AsyncStorage)
- Sync queue for pending uploads
- Sync status indicator (green dot = synced, yellow = pending, red = error)
- Pull-to-refresh triggers sync attempt

## No User Authentication Required
The app uses local storage by default. Google Sheets integration is optional and configured in Settings. Users can use the app without any account or login.

## Accessibility
- Minimum touch target: 44x44pt
- High contrast text (WCAG AA compliant)
- VoiceOver/TalkBack support for all interactive elements
- Dynamic type support for text scaling
