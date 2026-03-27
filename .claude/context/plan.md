# Backlog — 2026-03-27

## 🔴 Critical
_(none currently)_

## 🟠 High Priority — Mobile UX (top issues from 108-issue audit)

- [ ] `src/components/ui/dialog.tsx` — Add `max-w-[calc(100vw-2rem)]` to base DialogContent so ALL dialogs get mobile padding at once (M)
- [ ] `src/components/transactions/ReceiptUploader.tsx:158,167` — Dialog `max-w-3xl` + iframe `h-[600px]` break on mobile → `w-full sm:max-w-3xl` + `h-[300px] sm:h-[600px]` (S)
- [ ] `src/app/(dashboard)/reports/page.tsx:326` — 4 report tabs overflow on 375px → `overflow-x-auto whitespace-nowrap` (S)
- [ ] `src/app/(dashboard)/reports/page.tsx:236,259,491` — Filter bar, stats grid (need `grid-cols-2`), daily trend row overflow (M)
- [ ] `src/app/(dashboard)/settings/page.tsx:207,475,410` — Settings tabs truncate, add-ons rows and plan card break on 360px (M)
- [ ] `src/app/(dashboard)/transactions/new/page.tsx:356,492` — Tab overflow + account grid `grid-cols-2` cramped (S)
- [ ] `src/components/transactions/BankStatementImport.tsx:905,1075` — Filter select widths + ScrollArea height not responsive (S)
- [ ] `src/components/transactions/SplitSection.tsx:135,177,265` — Button heights below 44px + grid cramped on mobile (S)
- [ ] `src/components/layouts/DashboardLayout.tsx:436,525` — Sidebar `w-72` too wide on 320px + nav labels `text-[10px]` too small (S)

## 🟡 Medium — Mobile UX (remaining from audit)

- [ ] `src/app/(dashboard)/transactions/[id]/page.tsx:510,780` — `grid-cols-2` form fields → `grid-cols-1 sm:grid-cols-2` (S)
- [ ] `src/app/(dashboard)/budgets/page.tsx:347,517` — Month nav fixed width + dialog missing mobile max-w (S)
- [ ] `src/app/(dashboard)/goals/page.tsx:280,348` — Dialog mobile padding + icon picker 44px tap target (S)
- [ ] `src/app/(dashboard)/trips/[id]/page.tsx:41,43` — Quick Expense + all trip dialogs missing mobile max-w (S)
- [ ] `src/app/(dashboard)/trips/new/page.tsx:146,242` — Date grid + traveler input layout on mobile (S)
- [ ] `src/app/(dashboard)/splits/page.tsx:73,74` — Settle button `h-7` + row layout on 320px (S)
- [ ] `src/components/shared/TagInput.tsx:70,79` — Badge remove button 20px tap target + min-w on narrow phones (S)
- [ ] `src/components/shared/EmojiPicker.tsx:63,82` — Popover `w-80` edge bleed on 375px + emoji buttons 32px (S)
- [ ] `src/components/transactions/SMSImport.tsx:253,276` — Select widths `w-40`/`w-36` fixed → `w-full sm:w-*` (S)
- [ ] `src/app/(dashboard)/members/page.tsx:172` — Dropdown menu can render off-screen on narrow phones (S)
- [ ] All dashboard chart heights — fixed `h-[250px]` → responsive `h-[180px] sm:h-[250px]` (S)

## 🟢 Polish

- [ ] `src/app/(dashboard)/page.tsx:198` — Summary card values `text-2xl` → `text-lg sm:text-2xl` for long currency values (S)
- [ ] `src/components/shared/EmptyState.tsx:40` — Action button `w-full sm:w-auto` on mobile (S)
- [ ] `src/app/(auth)/layout.tsx:18` — Auth title `text-xl sm:text-2xl` for 320px phones (S)
- [ ] `src/app/(dashboard)/goals/page.tsx:258` — Add ₹ amounts below overall progress bar for context (S)
- [ ] All `grid-cols-*` without explicit `grid-cols-1` base — add explicit mobile base class throughout (M)

## ✅ Completed — Mobile UI Audit (108 items, 2026-03-27)

- [x] dialog.tsx base — already had `max-w-[calc(100%-2rem)]` (verified)
- [x] DashboardLayout — bottom nav `text-[10px]` → `text-xs`, sidebar `w-72` → responsive
- [x] reports/page.tsx — tabs scrollable, stats `grid-cols-2 md:grid-cols-4`, header flex-col, trend row tighter
- [x] settings/page.tsx — tabs truncate-safe, addon rows flex-col on mobile, plan card flex-wrap, button h-9
- [x] transactions/new/page.tsx — 3 grids → `grid-cols-1 sm:grid-cols-2`
- [x] transactions/[id]/page.tsx — all account/payment grids → responsive
- [x] transactions/page.tsx — date/amount filter grids → responsive
- [x] SplitSection.tsx — buttons h-7→h-9, grid responsive, remove icon h-9 w-9
- [x] BankStatementImport.tsx — filter selects `w-full sm:w-[130px/150px]`
- [x] ReceiptUploader.tsx — dialog `w-full sm:max-w-3xl`, iframe `h-[300px] sm:h-[600px]`
- [x] SMSImport.tsx — selects `w-full sm:w-*` + `h-9`
- [x] budgets/page.tsx — stats `grid-cols-2 md:grid-cols-4`, month title min-w responsive
- [x] goals/page.tsx — form grids responsive, icon picker `w-11 h-11`
- [x] trips/[id]/page.tsx — all dialog form grids responsive
- [x] trips/new/page.tsx — date grid responsive
- [x] splits/page.tsx — settle button h-7→h-9
- [x] TagInput.tsx — remove button min tap area `1.25rem`
- [x] EmojiPicker.tsx — popover `min(320px,100vw-2rem)`, emoji buttons `w-9 h-9`
- [x] EmptyState.tsx — action button `w-full sm:w-auto`
- [x] auth/layout.tsx — title `text-xl sm:text-2xl`
- [x] dashboard/page.tsx — chart placeholders `h-[180px] sm:h-[250px]`
- [x] loans/new, loans/[id]/edit, loans/[id]/page — form grids responsive
- [x] scheduled-payments/new, [id]/edit — form grids responsive
- [x] documents/new — form grids responsive
- [x] accounts/cards — expiry/CVV grid responsive

## ✅ Completed — Earlier Sessions

- [x] Edit transaction form pre-population (populated objects vs string IDs)
- [x] Goal progress double-counting (duplicate increment removed from POST route)
- [x] Budget progress bars showing 0% (categoryId populated object as Map key)
- [x] Goal progress bar color (dynamic Tailwind class → inline style)
- [x] SelectItem empty string values → `"__none__"` sentinel
- [x] Trip split calculator dialog in trips list page
- [x] SplitSection percentage mode + Equal Split button
- [x] Trip edit save stuck (travelers type mismatch)
- [x] Mobile tab bar in trip detail (overflow-x-auto)
- [x] Quick Expense split in trip detail
- [x] Bank statement import mobile card view
- [x] Bank statement import member column
- [x] Service worker v6 + `/_next/` bypass
- [x] Mongoose Trip model registration in transactions route
- [x] Transaction loading reliability (staleTime, retry, error state)
