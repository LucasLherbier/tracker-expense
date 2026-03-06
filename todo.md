# Expense Tracker - TODO

## Setup & Configuration
- [x] Generate custom app logo
- [x] Configure app branding in app.config.ts
- [x] Set up database schema for expenses and categories
- [x] Add currency conversion service

## Core Features - Add Expense
- [x] Create Add Expense screen with form
- [x] Implement date picker (day, month, year)
- [x] Add amount input field with numeric keyboard
- [x] Create currency selector dropdown
- [x] Integrate real-time currency conversion to EUR
- [x] Add category picker with predefined categories
- [x] Implement note/comment text field
- [x] Add form validation
- [x] Save expense to local database
- [x] Show success feedback with haptics

## Core Features - Dashboard
- [x] Create Home/Dashboard screen
- [x] Display current month total expenses
- [ ] Add monthly spending trend chart (last 6 months)
- [x] Show quick stats cards (top category, yearly total)
- [x] Display recent expenses list (last 5)
- [x] Add floating action button to add expense
- [ ] Implement pull-to-refresh

## Core Features - Expenses List
- [ ] Create Expenses List screen
- [ ] Display all expenses in scrollable list
- [ ] Group expenses by month
- [ ] Add filter bar (year, month, category)
- [ ] Implement expense card component
- [ ] Add swipe-to-delete functionality
- [ ] Show empty state when no expenses

## Core Features - Yearly Metrics
- [x] Create Yearly Metrics screen
- [x] Build year selector
- [x] Implement horizontal scrollable table
- [x] Display categories vs months matrix
- [x] Calculate totals and percentages
- [ ] Add heatmap-style cell coloring
- [ ] Enable tap on cell to view details

## Core Features - Settings
- [ ] Create Settings screen
- [ ] Add theme toggle (light/dark)
- [ ] Add default currency selector
- [ ] Display app version

## Google Sheets Integration
- [x] Set up Google OAuth authentication flow
- [x] Add Google Sheets API client
- [x] Implement write to sheet (append new expenses)
- [x] Implement read from sheet (pull existing data)
- [x] Create sync service with queue
- [x] Add sync status indicator
- [x] Handle sync errors gracefully
- [x] Add manual sync button in Sync screen
- [ ] Add auto-sync toggle and frequency settings
- [x] Store sheet URL and connection status

## Database & Data Management
- [x] Create expenses table schema
- [x] Create categories table with predefined list
- [x] Add database migration scripts
- [x] Implement CRUD operations for expenses
- [x] Add data validation layer
- [x] Cache currency exchange rates

## UI/UX Polish
- [x] Add haptic feedback for key interactions
- [x] Implement loading states for async operations
- [x] Add error handling and user-friendly messages
- [x] Ensure responsive layout for different screen sizes
- [ ] Test dark mode appearance
- [ ] Add animations for screen transitions

## Testing & Deployment
- [x] Test expense creation flow
- [x] Test currency conversion accuracy
- [ ] Test Google Sheets sync (write and read) - requires OAuth setup
- [ ] Test offline functionality
- [ ] Test with real Google Sheet data - requires user setup
- [x] Create first checkpoint

## Google Sheets OAuth Flow
- [x] Add OAuth token storage table in database
- [x] Create server-side OAuth callback route
- [x] Implement token refresh logic
- [x] Add tRPC routes for OAuth status and sync
- [x] Build Connect/Disconnect Google button in Sync screen
- [ ] Implement auto-sync when adding new expense
- [ ] Show sync status per expense
- [ ] Test end-to-end sync to real Google Sheet (requires user to update redirect URI in Google Cloud Console)

## Bug Fixes (Round 2)
- [x] Add screen: show "Currency" label above the currency picker
- [x] Add screen: display selected currency value visibly (replaced Picker with modal selector)
- [x] Add screen: display selected category value visibly
- [x] Home screen: show current month category breakdown / metrics
- [x] Home screen: display spending by category for current month with progress bars
- [x] Sync: remove OAuth requirement - replaced with Google Service Account
- [x] Sync: fix "access blocked" Google verification error

## Feature Requests (Round 3)
- [x] Fix Google Sheets column order: A=expense, B=currency, C=day, D=month, E=year, F=EUR, G=category, H=notes
- [x] Smart row insertion: insert after last row where col G is non-null and col E != 0
- [x] Keep same cell format as the row above when inserting
- [x] Rebuild Metrics screen: year tabs (2025, 2026...), table with categories as rows and months as columns
- [x] Add Journal screen: all expenses in a list, grouped by month
- [x] Add delete button on each expense in Journal
- [x] Full UI/UX overhaul: better colors, typography, spacing, icons across all screens
- [x] Update tab bar icons to match new screens (Home, Add, Journal, Metrics, Sync)

## Architecture Redesign — Google Sheets as Single Source of Truth
- [x] Build server route: read all rows from Journal sheet
- [x] Build server route: compute yearly metrics from sheet data
- [x] Build server route: compute home screen stats from sheet data
- [x] Rewrite Add Expense to write directly to Google Sheets (no local DB)
- [x] Rewrite Home screen to read from Google Sheets
- [x] Rewrite Journal screen to read from Google Sheets
- [x] Rewrite Metrics screen to read from Google Sheets
- [x] Sync tab updated to reflect live-write architecture (no batch sync needed)
- [x] Add delete expense from Google Sheets (delete row)
- [x] Handle loading/error states for all sheet reads

## Feature Requests (Round 4) — COMPLETED
- [x] Category icons: add emoji/logo next to each category name in all screens
- [x] Metrics: sort rows by total amount descending
- [x] Home: show only current month expenses in Recent section
- [x] Add screen: prioritize EUR, USD, CAD at top of currency list
- [x] New Graphs tab: category split (pie/donut chart, all years or by year)
- [x] New Graphs tab: total evolution by year (bar chart)
- [x] Improve tab bar colors and button styling

## Feature Requests (Round 5) — COMPLETED
- [x] Graphs: remove year/All time toggle button — added "All Time" as first tab in year selector
- [x] Graphs: remove "Total Annual Spending" section when a specific year is selected (only shown for All Time)
- [x] Journal: smart search parses "Avril 2025", "april 2025", "avr 2025" etc. into month+year filter
- [x] Home: shows latest 10 expenses of current month only, removed "See all" link
- [x] Nav bar: warm off-white background, teal active highlight, Add button same height as other icons
