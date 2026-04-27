---
name: project-architecture
description: Explains the overall architecture of the Money Manager app — how data flows, key patterns, models, auth, and design decisions. Use when the user asks how the project works, wants an overview, or needs onboarding context.
---

## Architecture Overview

**Stack**: Next.js 15 App Router + React 19 + TypeScript + MongoDB/Mongoose + NextAuth v4 + TanStack React Query v5 + ShadCN + Tailwind CSS. Deployed on Vercel.

---

## Top-Level Structure

```
Browser
  │
  ├── React Query (useQuery/useMutation)
  ▼
Next.js App Router
  ├── (auth)/         — login, register, join as member
  └── (dashboard)/    — all protected pages
          │
          ▼
  /api/** Route Handlers
          ├── getServerSession()   ← auth check on every request
          ├── connectToDatabase()
          ├── Zod validation
          ├── transactionService  ← atomic ops via MongoDB session
          └── MongoDB / Mongoose
```

---

## Data Flow

**Reading** (e.g. dashboard):
1. `useQuery('dashboard-summary')` fires on page load
2. API aggregates Bank/Card/Investment/Transaction data
3. Applies **privacy filter** — members only see what they're allowed to
4. Result cached in LRU cache, returned as JSON
5. React renders Recharts charts + summary cards

**Writing** (e.g. adding a transaction):
1. React Hook Form + Zod validates client-side
2. `POST /api/transactions` — server re-validates with Zod
3. `transactionService.createTransaction()` opens a **MongoDB session** (atomic):
   - Creates Transaction document
   - Increments/decrements bank/card balance
   - Updates Goal progress if tagged
   - Invalidates dashboard cache
   - Commits — or rolls back everything on failure
4. React Query invalidates `'transactions'` cache → list refreshes

---

## Key Design Patterns

| Pattern | Where | Why |
|---|---|---|
| MongoDB sessions | `src/services/transactionService.ts` | Balance + transaction always stay in sync |
| `.lean()` on all reads | Every GET route | 3–5× faster than full Mongoose docs |
| Privacy filter (`buildPrivacyFilter`) | All queries | Members can't see others' private entries |
| Zod `.refine()` chains | `src/lib/validations/` | Cross-field rules (category required for EXPENSE, etc.) |
| React Query cache invalidation | All mutations | Instant re-renders after writes |
| LRU server cache | Dashboard API | Avoids re-aggregating on every page load |
| `extractId()` pattern | Edit forms | `.populate()` returns objects `{_id, name}` not strings — extract `._id` before setting form values |

---

## 22 Mongoose Models (Core Relationships)

```
User
 └─ BankAccount, Card, Investment   (accounts)
 └─ Transaction                     (core ledger — links everything)
      ├─ Category
      ├─ Member
      ├─ Goal           ← auto-increments currentAmount
      ├─ Trip           ← groups trip expenses
      └─ SplitExpense   ← tracks who owes what + direction
 └─ Budget              (monthly spending limits per category)
 └─ ScheduledPayment    (cron-driven recurring transactions)
 └─ CashAccount         (tracks physical cash balance)
 └─ Loan, Vehicle, Asset, StoredDocument  (net worth)
 └─ Subscription        (free/premium feature gating)
 └─ TaxProfile, NetWorthSnapshot
```

---

## Auth & Family Member System

Two login types share the same JWT:

```
Primary User login  →  full access, sees everything
Family Member login →  isMemberUser: true, memberId: "..."
                       buildPrivacyFilter() restricts all queries
                       Cannot see other members' private data
```

- Members join via **access code** — no separate account
- `getServerSession(authOptions)` called first in every API route
- JWT strategy, 7-day max age

---

## API Route Template

Every route follows this pattern:

```typescript
export async function GET/POST(request: NextRequest) {
  const session = await getServerSession(authOptions); // 1. Auth
  if (!session?.user?.id) return 401;

  await connectToDatabase();                           // 2. Connect

  const data = schema.parse(body);                    // 3. Validate

  const query = { userId, ...buildPrivacyFilter() };  // 4. Privacy

  const result = await Model.find(query).lean();      // 5. Query

  return NextResponse.json({ success: true, data });  // 6. Return
}
```

**Model registration**: If you `.populate('tripId')`, that route must `import Trip from '...'` even if unused — Mongoose requires models to be registered before populate works.

---

## Transaction Types

Four types cover all financial flows:

| Type | Use case | Needs |
|---|---|---|
| `EXPENSE` | Spending money | category, source account |
| `INCOME` | Receiving money | category, source account |
| `TRANSFER_SELF` | Moving between own accounts | source + destination |
| `INVESTMENT_CONTRIBUTION` | Investing money | source bank + investment |

---

## Key Files

| File | Purpose |
|---|---|
| `src/types/index.ts` | All enums (TransactionType, AccountType, Frequency, etc.) + interfaces |
| `src/lib/auth/config.ts` | NextAuth provider, JWT/session logic, `registerUser()` |
| `src/lib/mongodb/client.ts` | Connection pooling, global singleton |
| `src/services/transactionService.ts` | Atomic CRUD — always use this, never update balances directly |
| `src/lib/utils/privacy.ts` | `buildPrivacyFilter()` — applied to all queries |
| `src/components/layouts/DashboardLayout.tsx` | Main layout, sidebar nav, bottom mobile nav |
| `public/sw.js` | Service worker — bump `CACHE_VERSION` on each deploy |
