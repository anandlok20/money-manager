# Code Review Notes

## 2026-03-27 — Current Known Issues

### 🔴 Critical (must fix before next deploy)
- None currently

### 🟠 High Priority Issues
_(none — all fixed 2026-03-27)_

### 🟡 Medium Issues
- **WhatsApp access token expires**: Meta temporary tokens expire in ~24h. User must generate a permanent token from Meta Business Manager or use a System User token. Currently stored in `.env.local` / Vercel env vars — needs periodic refresh or a permanent token setup.
- **WhatsApp 24h session window**: Free-form text messages (used for reminders) require the recipient to have sent a message to the business number within the last 24h, OR the number must be in the test recipient whitelist. For reliable production use, a pre-approved template should be used instead of free-form text.
- **49 unused-import lint warnings** remain across the codebase — non-blocking but should be cleaned up in a future pass.

### ✅ Recently Fixed (2026-04-29 audit pass)
- Habit streak/totalCompletions race condition (now atomic via MongoDB session)
- Reminders cron duplicate WhatsApp sends (atomic claim + constant-time auth)
- Card CVV/PIN silent plaintext fallback (throws on missing key)
- Budget rollover race condition + missing rollover cap
- XSS via unsanitized habit/goal text inputs
- `require()` import in members/access route
- Phone validation accepting `0000000000` (now strict E.164)
- Member password 6-char minimum (now 8)
- Scheduled payment orphan-on-crash recovery
- Loans `.populate('linkedVehicleId')` missing model registration
- Dashboard hydration mismatch + `useServiceWorker` cascading renders
- React Compiler purity violations in cards page + dashboard
- Trip endDate < startDate not validated
- Bulk transactions reporting success on total failure
- Email regex too loose
- Splits Zod `.default()` causing input/output type mismatch
- 9× `h-7 w-7` tap targets too small
- 3× dashboard `grid-cols-2` no mobile fallback
- 3× goals dialogs missing mobile max-width
- 12× dashboard CardHeader `flex-row` locked
- WhatsApp phone input missing mobile keyboard hints

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
