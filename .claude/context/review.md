# Code Review Notes

## 2026-03-27 — Current Known Issues

### 🔴 Critical (must fix before next deploy)
- None currently

### 🟠 High Priority Issues
_(none — all fixed 2026-03-27)_

### 🟡 Medium Issues
_(none — all fixed 2026-03-27)_

### ✅ Recently Fixed
- All 108 mobile UI/UX issues from audit — grids, tap targets, dialog widths, select widths, font sizes, chart heights (fixed 2026-03-27)
- Budget progress bars showing 0% — was using populated object as Map key (fixed 2026-03-27)
- Goal progress bar color not showing — was dynamic Tailwind class (fixed 2026-03-27)
- Edit transaction form pre-population — Mongoose populated objects in form values (fixed 2026-03-27)
- Goal double-counting — duplicate increment in POST route (fixed 2026-03-27)
- SelectItem empty string values — React error (fixed 2026-03-27)
- Trip edit save stuck — travelers type mismatch in Zod validation (fixed 2026-03-26)
- Stale service worker causing module factory errors (fixed 2026-03-26)
- Trip model not registered causing MissingSchemaError (fixed 2026-03-26)
