# Backlog — 2026-03-27

## 🔴 Critical
_(none currently)_

## 🟢 Polish (remaining)

- [ ] `src/app/(dashboard)/goals/page.tsx:258` — Add ₹ amounts below overall progress bar for context (S)

## ✅ Completed — Mobile UI Audit (all 108 items, 2026-03-27)

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
