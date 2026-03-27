# Recent Changes Log

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
