# Code Review Notes

## 2026-03-27 — Current Known Issues

### 🔴 Critical (must fix before next deploy)
- None currently

### 🟠 High Priority Issues
- `src/components/transactions/BankStatementImport.tsx:905,920` — Filter selects `w-[130px]`/`w-[150px]` fixed widths overflow on 360px phones → `w-full sm:w-[130px]`
- `src/components/transactions/ReceiptUploader.tsx:158` — Dialog `max-w-3xl` (768px) has no mobile constraint → `w-full sm:max-w-3xl`
- `src/components/transactions/ReceiptUploader.tsx:167` — iframe `h-[600px]` fixed, takes 92% of phone viewport → `h-[300px] sm:h-[600px]`
- `src/app/(dashboard)/reports/page.tsx:326` — 4 report tabs overflow on 375px phones → `overflow-x-auto` + `whitespace-nowrap`
- `src/app/(dashboard)/settings/page.tsx:207` — Settings 3 tabs with icons+text on 320px phone truncate → icon-only below `sm:`
- `src/app/(dashboard)/transactions/new/page.tsx:356` — 4 transaction type tabs overflow on 320px → overflow-x-auto
- `src/app/(dashboard)/settings/page.tsx:475` — Add-ons rows `flex items-center justify-between` breaks on 360px → `flex-col sm:flex-row`

### 🟡 Medium Issues (108 total in mobile audit — top items listed)
- Most dialogs missing `max-w-[calc(100vw-2rem)]` mobile constraint
- `src/components/transactions/SplitSection.tsx:177` — `grid-cols-2` participant layout cramped on 375px → `grid-cols-1 sm:grid-cols-2`
- `src/components/transactions/SplitSection.tsx:135,265` — Mode toggle and remove button `h-7` (28px) below 44px touch target
- `src/app/(dashboard)/reports/page.tsx:259` — Stats grid `md:grid-cols-4` should be `grid-cols-2 md:grid-cols-4`
- `src/components/shared/TagInput.tsx:70` — Badge remove button total height ~20px (way below 44px)
- Multiple form grids using `grid-cols-2` without `sm:` prefix — should be `grid-cols-1 sm:grid-cols-2`

### ✅ Recently Fixed
- Budget progress bars showing 0% — was using populated object as Map key (fixed 2026-03-27)
- Goal progress bar color not showing — was dynamic Tailwind class (fixed 2026-03-27)
- Edit transaction form pre-population — Mongoose populated objects in form values (fixed 2026-03-27)
- Goal double-counting — duplicate increment in POST route (fixed 2026-03-27)
- SelectItem empty string values — React error (fixed 2026-03-27)
- Trip edit save stuck — travelers type mismatch in Zod validation (fixed 2026-03-26)
- Stale service worker causing module factory errors (fixed 2026-03-26)
- Trip model not registered causing MissingSchemaError (fixed 2026-03-26)
