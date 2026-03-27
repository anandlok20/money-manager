You are running the **Deploy Checklist** for the Family Expense Manager project.

Run every step in order. Do not skip. Report pass/fail for each item.

---

## Pre-Deploy Checklist

### 1. Type Safety
```bash
npx tsc --noEmit
```
✅ Must be clean (0 errors) before deploy.

### 2. Build
```bash
npm run build
```
✅ Must succeed with no errors.

### 3. Lint
```bash
npm run lint
```
✅ No errors (warnings acceptable).

### 4. Service Worker Version
```bash
grep "CACHE_VERSION" public/sw.js
```
⚠️ If any new JS/CSS assets changed since last deploy, bump `CACHE_VERSION` by 1.
To check if SW needs bumping: `git diff HEAD~1 -- public/ src/` — if anything changed, bump it.

### 5. Environment Variables Check
Verify these exist (check `.env.local` or Vercel dashboard):
- `NEXTAUTH_SECRET` — must be set
- `NEXTAUTH_URL` — must match production URL
- `MONGODB_URI` — must point to production DB
- `NEXT_PUBLIC_APP_URL` — must be set

### 6. Database Migrations Check
```bash
# Check if any new Mongoose models were added
git diff HEAD~1 -- src/lib/mongodb/models/
```
If new models added, verify they have proper indexes defined.

### 7. API Route Security Audit (spot check)
```bash
# Every API route must have getServerSession check
grep -rL "getServerSession" src/app/api/ --include="*.ts"
```
Any files listed here = missing auth check = 🔴 BLOCK deploy.

### 8. Sensitive Data Check
```bash
# Make sure no secrets in source
git diff HEAD~1 -- . | grep -i "secret\|password\|token\|key" | grep "^+" | grep -v "//\|#"
```
Review any matches manually.

### 9. Final Commit State
```bash
git status
git log --oneline -5
```
✅ Working tree clean. All changes committed.

---

## Deploy Decision

| Check | Status |
|-------|--------|
| TypeScript | |
| Build | |
| Lint | |
| SW Version | |
| Env Vars | |
| Auth checks | |
| Clean commit | |

**DEPLOY: ✅ GO / 🔴 NO-GO**

If NO-GO, list blocking issues and fix them before proceeding.
