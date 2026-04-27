# Recent Changes Log

## 2026-04-27 — Fix Mongoose bundled in browser (Habit Tracker)

### Bug Fixes
- **Root cause**: `habits/page.tsx` and `habits/[id]/page.tsx` were importing `HABIT_CATEGORIES` and `CATEGORY_META` directly from `src/lib/mongodb/models/Habit.ts`. That file imports `mongoose`, which requires Node-only modules (`dns`, `fs`, `net`, `tls`, `async_hooks`) — causing browser bundle errors.
- **Fix**: Extracted `HABIT_CATEGORIES`, `CATEGORY_META`, and `HabitCategory` type into `src/lib/constants/habits.ts` (zero dependencies). Both model and client pages now import from there.

### Files Added
- `src/lib/constants/habits.ts` — pure constants file (no mongoose), safe to import in client components

### Files Modified
- `src/lib/mongodb/models/Habit.ts` — removed inline constant definitions; imports from `@/lib/constants/habits` and re-exports them
- `src/lib/validations/habit.ts` — import `HABIT_CATEGORIES` from `@/lib/constants/habits` instead of model
- `src/app/(dashboard)/habits/page.tsx` — import constants from `@/lib/constants/habits`
- `src/app/(dashboard)/habits/[id]/page.tsx` — import constants from `@/lib/constants/habits`

### tsc: ✅ clean

---

## 2026-04-27 — Habit Tracker Feature

### New Features
- **Full Habit Tracker**: Add, edit, pause, delete habits. Log daily completions. Streak tracking with longest-streak calculation. Calendar heatmap + 15-week activity grid.
- **Categories**: 9 habit categories (Health, Fitness, Learning, Mindfulness, Productivity, Finance, Social, Creative, Other), each with a default icon and colour.
- **Today View**: Progress bar showing X/Y habits completed today. Habits split into Pending / Completed sections with one-tap check-off.
- **All Habits tab**: Category filter pills, manage all habits.
- **This Week tab**: Week overview strip + per-habit streak summary linking to detail page.
- **Habit detail page** (`/habits/[id]`): Today check card, streak/total/rate stat cards, 15-week rolling activity heatmap, monthly calendar (navigate prev/next month), completion history list, habit metadata panel.

### Files Added
- `src/lib/mongodb/models/Habit.ts` — Habit model with frequency, targetDays, streak, longestStreak, totalCompletions; compound indexes
- `src/lib/mongodb/models/HabitLog.ts` — HabitLog model, unique index on (habitId, date)
- `src/lib/validations/habit.ts` — createHabitSchema, updateHabitSchema, logHabitSchema (Zod)
- `src/app/api/habits/route.ts` — GET (list with today's completedToday flag), POST (create)
- `src/app/api/habits/[id]/route.ts` — GET, PUT, DELETE (cascade-deletes logs)
- `src/app/api/habits/[id]/logs/route.ts` — GET (monthly logs for calendar), POST (toggle completion + recalculate streak)
- `src/app/(dashboard)/habits/page.tsx` — Main habits page (Today / All Habits / This Week tabs, add/edit dialog, delete confirm)
- `src/app/(dashboard)/habits/[id]/page.tsx` — Habit detail: heatmap, calendar, stats, toggle, delete

### Files Modified
- `src/components/layouts/DashboardLayout.tsx` — Added `Repeat2` icon; added `{ name: 'Habits', href: '/habits', icon: Repeat2 }` under Planning; added `/habits` to `pageTitle` map
- `.env.local` — Added `ALLOWED_DEV_ORIGINS=192.168.1.14` so mobile phone can access the dev server

### tsc: ✅ clean

---

## 2026-04-04 — Scheduled Payments Audit & Improvement

### Bug Fixes
- **Root cause fixed**: `ScheduledPayment` model had no `transactionType` field — all scheduled payments created `TRANSFER_SELF` regardless of intent. Added `transactionType: TransactionType` (required) and `categoryId` (optional, required for EXPENSE/INCOME).
- **Error retry loop fixed**: On cron failure, `nextRunDate` was restored to the original past date → infinite retries. Now advances `nextRunDate` to the next scheduled slot on failure.
- **Auto-pause on 3 failures**: After 3 consecutive failures, `isActive` is set to `false`. Reactivating via PATCH also resets `failureCount`.

### New Features
- **`name` field**: Required label for each scheduled payment (e.g. "Rent Payment", "Netflix").
- **`endDate` field**: Optional stop date — cron auto-deactivates payment when `now > endDate`.
- **`failureCount` + `lastError`**: Track consecutive failures; shown as warning badge in list with error detail on hover.
- **EXPENSE/INCOME support**: Create scheduled expenses (e.g. rent) or income (e.g. salary) with correct transaction type and category.
- **Destination hidden for EXPENSE/INCOME**: Form only shows destination fields when type is Transfer or Investment.

### Files Modified
- `src/lib/mongodb/models/ScheduledPayment.ts` — added `name`, `transactionType`, `categoryId`, `endDate`, `failureCount`, `lastError`; made `destinationType` optional
- `src/lib/validations/scheduled-payment.ts` — added new fields; category-required refinement for EXPENSE/INCOME; destination-required refinement only for TRANSFER/INVESTMENT
- `src/app/api/scheduled-payments/process/route.ts` — use `payment.transactionType`, pass `categoryId`, check `endDate`, fixed error handling
- `src/app/api/scheduled-payments/route.ts` — added `populate('categoryId', 'name icon color')`
- `src/app/api/scheduled-payments/[id]/route.ts` — added `categoryId` populate everywhere; handle `endDate` in PUT; reset `failureCount` on PATCH reactivate
- `src/app/(dashboard)/scheduled-payments/new/page.tsx` — name, transaction type selector, category selector (filtered by type), end date picker
- `src/app/(dashboard)/scheduled-payments/[id]/edit/page.tsx` — same additions + pre-populate new fields from API
- `src/app/(dashboard)/scheduled-payments/page.tsx` — show name as card title, transaction type badge with color, endDate, failure warning, auto-paused badge, last error text

### tsc: ✅ clean

---

## 2026-04-04 — Cash Balance Fix + Member Cash View

### Bug Fixes
- `src/app/api/accounts/cash/route.ts` — balance now computed from `totalIn - totalOut` (all-time INCOME/EXPENSE transactions with sourceType=CASH) instead of stored `CashAccount.currentBalance` — always accurate, no drift

### New Features
- **Member cash view**: when a member logs in and opens `/accounts/cash`, they see cash the primary user gave them. Primary's EXPENSE tagged to member = cash member received (+). Primary's INCOME tagged to member = cash member returned (-). "Cash You Hold" = net cash member is holding. "Cash from Family" heading. Add Cash button hidden (member can't add cash entries). Labels adapt to member perspective throughout.

### tsc: ✅ clean

---

## 2026-04-04 — Cash Wallet Improvements + Hydration Fix

### Bug Fixes
- **Hydration mismatch** (`src/app/(dashboard)/page.tsx`): `localStorage` was read in `useState` initializer using `typeof window !== 'undefined'` — server renders `'family'`, client could render `'personal'` → React 19 hydration mismatch. Fixed by starting with `'family'` and using `useEffect` to load saved value after mount.

### Cash Wallet Enhancements
- `src/app/api/accounts/cash/route.ts` — GET now accepts `?year=&month=` query params; returns `totalIn`, `totalOut` (all-time) alongside monthly stats; uses `mongoose.Types.ObjectId` for aggregate `$match`
- `src/app/(dashboard)/accounts/cash/page.tsx` — added month navigator (prev/next arrows); "Cash in Hand" card shows all-time total with sub-line showing total in/out; monthly stat card now scoped to selected month; transaction list filtered to selected month; added `DialogDescription` to fix accessibility warning

### tsc: ✅ clean

---

## 2026-04-04 — Cash Wallet Feature

### New Files
- `src/lib/mongodb/models/CashAccount.ts` — new model: userId (unique), currentBalance, currency
- `src/app/api/accounts/cash/route.ts` — GET (balance + monthly stats + transactions), POST (add cash entry + optional split)
- `src/app/(dashboard)/accounts/cash/page.tsx` — Cash Wallet UI: balance cards, transaction list, Add Cash dialog

### Modified Files
- `src/lib/mongodb/models/Transaction.ts` — added `cashPersonName` field (free-text person for cash entries)
- `src/lib/mongodb/models/SplitExpense.ts` — added `direction: 'owed_to_me' | 'i_owe'` field
- `src/lib/validations/transaction.ts` — added `cashPersonName` to both create/update schemas
- `src/services/transactionService.ts` — imported CashAccount; added `cashPersonName` to params; EXPENSE/INCOME with `sourceType=CASH` now updates CashAccount.currentBalance atomically
- `src/app/api/splits/route.ts` — removed EXPENSE-only restriction (INCOME allowed for cash); direction auto-derived from transaction type
- `src/app/api/splits/[id]/settle/route.ts` — handles `i_owe` direction: creates EXPENSE (pay back) vs existing INCOME (receive back)
- `src/app/(dashboard)/splits/page.tsx` — added "I Owe" tab + summary card; "Pending" tab now filtered to `owed_to_me` direction only
- `src/components/layouts/DashboardLayout.tsx` — added `Banknote` import + "Cash" nav item under Accounts

### tsc: ✅ clean

---

## 2026-03-27 — Edit/Fetch Audit Fixes

### Bug Fixes

**Critical - Card edit populated field extraction:**
- `src/app/(dashboard)/accounts/cards/[id]/edit/page.tsx` — `linkedBankId` and `linkedMemberId` were set directly from the API response which returns populated Mongoose objects (`{ _id, bankName, ... }`), not strings. Zod would reject these on PUT with a 400 error every time a card with a linked bank or member was edited. Fixed by extracting `._id` string in `values`.
- Updated `CardAccount` interface: `linkedBankId?: string | { _id: string }` and `linkedMemberId?: string | { _id: string }`.

**High - Missing dashboard-summary React Query invalidation:**
- `src/app/(dashboard)/goals/page.tsx` — Added `dashboard-summary` invalidation to create, update, delete, and contribute mutations (goals show in dashboard).
- `src/app/(dashboard)/budgets/page.tsx` — Added `dashboard-summary` invalidation to create, update, and delete mutations (budgets show in dashboard).
- `src/app/(dashboard)/vehicles/new/page.tsx` — Added `dashboard-summary` invalidation (vehicles affect net worth on dashboard).
- `src/app/(dashboard)/vehicles/[id]/edit/page.tsx` — Added `dashboard-summary` invalidation.

### tsc: ✅ clean

---

## 2026-03-27 — Privacy Filter Fixes + Dashboard View Persistence

### Bug Fixes
- **Dashboard LRU cache key**: `'dashboard-member'` was shared across ALL members of the same family — member B could get member A's personal summary. Fixed by using `dashboard-member-{memberId}` key.
- **PUT handlers missing `privateMemberId`**: All 6 entity edit APIs updated `isPrivate` but never computed `privateMemberId`, so making an existing item private via edit wouldn't properly store the owner. Fixed in:
  - `src/app/api/accounts/banks/[id]/route.ts`
  - `src/app/api/accounts/cards/[id]/route.ts`
  - `src/app/api/loans/[id]/route.ts` — also added `isPrivate` to `updateLoanSchema` (was missing)
  - `src/app/api/trips/[id]/route.ts` — also added `isPrivate` to `updateTripSchema` (was missing)
  - `src/app/api/budgets/[id]/route.ts`
  - `src/app/api/goals/[id]/route.ts`
  - `src/app/api/transactions/[id]/route.ts` — passes `privateMemberId` alongside `validatedData` to `updateTransaction`
- **Dashboard view mode persistence**: `viewMode` state in `src/app/(dashboard)/page.tsx` now initialises from `localStorage('dashboard-view-mode')` and writes back on toggle — survives page reloads.

### tsc: ✅ clean

---

## 2026-03-27 — Mobile UI Audit Fixes (108 items)

### Files Modified
- `src/components/layouts/DashboardLayout.tsx`
  - Bottom nav labels: `text-[10px]` → `text-xs` (4 labels)
  - Mobile sidebar: `w-72` → `w-[min(288px,calc(100vw-3rem))]`
- `src/app/(dashboard)/reports/page.tsx`
  - Stats grid: `md:grid-cols-4` → `grid-cols-2 md:grid-cols-4`
  - Tabs: wrapped in `overflow-x-auto` scroll container, `inline-flex min-w-full`
  - Header: `flex-col sm:flex-row` + period select `w-full sm:w-40`
  - Daily trend row: tighter widths (`w-12`, `w-24`) + `min-w-0` on bar container
- `src/app/(dashboard)/settings/page.tsx`
  - Look & Feel tabs: icon + `truncate` text to prevent 320px truncation
  - Addon rows: `flex-col sm:flex-row` + button `h-7→h-9` + `self-end sm:self-auto`
  - Plan card: `flex-wrap` to prevent break on narrow phones
- `src/app/(dashboard)/transactions/new/page.tsx`
  - 3x `grid-cols-2` → `grid-cols-1 sm:grid-cols-2` (source, dest, payment grids)
- `src/app/(dashboard)/transactions/[id]/page.tsx`
  - Multiple `grid-cols-2` → `grid-cols-1 sm:grid-cols-2` (source, dest, payment)
- `src/app/(dashboard)/transactions/page.tsx`
  - Date range + amount range filter grids: `grid-cols-2` → `grid-cols-1 sm:grid-cols-2`
- `src/components/transactions/SplitSection.tsx`
  - Mode toggle buttons: `h-7` → `h-9`
  - Equal Split button: `h-7` → `h-9`
  - Remove participant button: `h-7 w-7` → `h-9 w-9`
  - Participant grid: `grid-cols-2` → `grid-cols-1 sm:grid-cols-2`
- `src/components/transactions/BankStatementImport.tsx`
  - Filter selects: `w-[130px]`/`w-[150px]` → `w-full sm:w-[130px]` / `w-full sm:w-[150px]`
- `src/components/transactions/ReceiptUploader.tsx`
  - Dialog: `max-w-3xl` → `w-full sm:max-w-3xl`
  - iframe: `h-[600px]` → `h-[300px] sm:h-[600px]`
- `src/components/transactions/SMSImport.tsx`
  - Category select: `w-40 h-8` → `w-full sm:w-40 h-9`
  - Member select: `w-36 h-8` → `w-full sm:w-36 h-9`
- `src/app/(dashboard)/budgets/page.tsx`
  - Summary grid: `md:grid-cols-4` → `grid-cols-2 md:grid-cols-4`
  - Month title: `min-w-48` → `min-w-[8rem] sm:min-w-48`
- `src/app/(dashboard)/goals/page.tsx`
  - Form grids (create + edit): `grid-cols-2` → `grid-cols-1 sm:grid-cols-2`
  - Icon picker buttons: `w-10 h-10` → `w-11 h-11` (44px tap target)
- `src/app/(dashboard)/trips/[id]/page.tsx`
  - All dialog form grids (ticket, hotel, place, cab): `grid-cols-2` → `grid-cols-1 sm:grid-cols-2`
- `src/app/(dashboard)/trips/new/page.tsx`
  - Date grid: `grid-cols-2` → `grid-cols-1 sm:grid-cols-2`
- `src/app/(dashboard)/splits/page.tsx`
  - Settle button: `h-7` → `h-9`
- `src/components/shared/TagInput.tsx`
  - Badge remove button: added `min-w-[1.25rem] min-h-[1.25rem]` tap target
- `src/components/shared/EmojiPicker.tsx`
  - Popover: `w-80` → `w-[min(320px,calc(100vw-2rem))]`
  - Emoji buttons: `w-8 h-8` → `w-9 h-9`
- `src/components/shared/EmptyState.tsx`
  - Action button: `w-full sm:w-auto` on mobile
- `src/app/(auth)/layout.tsx`
  - Title: `text-2xl` → `text-xl sm:text-2xl`
- `src/app/(dashboard)/page.tsx`
  - Chart placeholder containers: `h-[250px]` → `h-[180px] sm:h-[250px]`
- `src/app/(dashboard)/loans/new/page.tsx` — all form grids responsive
- `src/app/(dashboard)/loans/[id]/edit/page.tsx` — all form grids responsive
- `src/app/(dashboard)/loans/[id]/page.tsx` — EMI grid responsive
- `src/app/(dashboard)/scheduled-payments/new/page.tsx` — all form grids responsive
- `src/app/(dashboard)/scheduled-payments/[id]/edit/page.tsx` — all form grids responsive
- `src/app/(dashboard)/documents/new/page.tsx` — all form grids responsive
- `src/app/(dashboard)/accounts/cards/page.tsx` — Expiry/CVV grid responsive

### tsc: ✅ clean

---

## 2026-03-27 — Edit Transaction + Progress Bars + Split % Mode

### Files Modified
- `src/app/(dashboard)/transactions/[id]/page.tsx`
  - Added `extractId()` helper to pull `_id` from Mongoose populated objects
  - Fixed form `values` init — categoryId, memberId, sourceBankId, sourceCardId, tripId, goalId all now correctly set as string IDs
- `src/app/api/transactions/route.ts`
  - Added `import Trip from '...; void Trip;` — registers Trip model for populate('tripId')
  - Removed duplicate goal increment (was doubling currentAmount on every transaction create)
  - Removed unused `Goal`/`GoalStatus` imports
- `src/app/(dashboard)/budgets/page.tsx`
  - Fixed `spentByCategory` — was using populated object as Map key (`[object Object]`); now extracts `_id`
  - Updated `Transaction` interface: `categoryId?: string | { _id: string; name: string }`
- `src/app/(dashboard)/goals/page.tsx`
  - Replaced `[&>div]:bg-[${goal.color}]` dynamic Tailwind class (doesn't work at build time) with inline `style={{ backgroundColor: goal.color }}`
- `src/components/transactions/SplitSection.tsx`
  - Added `splitMode: 'amount' | 'percentage'` toggle
  - Added `percentage` field to `SplitParticipant` interface
  - Added "Equal Split" button
  - Cross-value display (enter % → see ₹, enter ₹ → see %)
- `src/app/(dashboard)/trips/page.tsx`
  - Added `TripSplitDialog` — trip expense split calculator
  - "Split Expenses" option in each trip card's dropdown menu
  - Mode toggle (By Amount / By %) + Equal Split button + live summary
  - Fixed budget progress: only shown when `trip.budget > 0`
- `src/components/transactions/BankStatementImport.tsx`
  - Fixed `SelectItem value=""` → `value="__none__"` (2 locations)
  - Updated `handleMemberChange` to treat `"__none__"` as clearing member
- `src/components/transactions/ImportTransactions.tsx`
  - Fixed `SelectItem value=""` → `value="__none__"`
- `src/components/transactions/SMSImport.tsx`
  - Fixed 3x `SelectItem value=""` → `value="__none__"` with proper handler updates
- `public/sw.js`
  - Bumped CACHE_VERSION 5→6
  - Added explicit `/_next/` bypass

### tsc: ✅ clean

---

## 2026-03-26 — Trip Edit, Mobile Tabs, Quick Expense Split, Import Member Column

### Files Modified
- `src/app/(dashboard)/trips/[id]/edit/page.tsx` — Fixed travelers type mismatch (objects→strings in form values), NaN budget handling
- `src/app/(dashboard)/trips/[id]/page.tsx` — Scrollable mobile tab bar, all dialog widths, Quick Expense split section, isSplit/myShare badges
- `src/app/api/trips/[id]/route.ts` — Split-aware totalExpenses using yourShare from SplitExpense model
- `src/app/(dashboard)/transactions/page.tsx` — staleTime/retry on queries, error state with retry button
- `src/components/transactions/BankStatementImport.tsx` — Member column, mobile card layout
- `src/app/api/transactions/import-parsed/route.ts` — Accept memberId in import payload
- `src/app/api/transactions/route.ts` — Initial Trip model import

### tsc: ✅ clean
