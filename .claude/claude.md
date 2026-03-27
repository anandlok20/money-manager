# Family Expense Manager — Project Instructions

## Project Overview
A full-stack personal finance app for families. Next.js 15 App Router + MongoDB + NextAuth. Deployed on Vercel. Users track income/expenses, budgets, goals, trips, investments, splits, and bank imports.

## Dev Commands
```bash
npm run dev          # Start dev server (Turbopack)
npx tsc --noEmit     # Type check (run before every commit)
npm run build        # Production build
npm run lint         # ESLint
```

## Tech Stack
- **Framework:** Next.js 15 App Router, React 19, TypeScript
- **Database:** MongoDB + Mongoose (`.lean()` for all reads)
- **Auth:** NextAuth v4 (`getServerSession(authOptions)`)
- **State:** TanStack React Query v5 (`useQuery`, `useMutation`)
- **Forms:** React Hook Form + Zod v4 (`zodResolver`)
- **UI:** ShadCN + Tailwind CSS
- **Charts:** Recharts with ResponsiveContainer
- **Notifications:** Sonner (`toast.success/error`)

## Key File Map
```
src/
├── app/
│   ├── (auth)/           — Login, register pages
│   ├── (dashboard)/      — All authenticated pages
│   │   ├── page.tsx      — Dashboard home
│   │   ├── transactions/ — List, new, [id] edit
│   │   ├── budgets/      — Monthly budgets
│   │   ├── goals/        — Savings goals
│   │   ├── trips/        — Trip expense tracking
│   │   ├── splits/       — Split expenses
│   │   ├── reports/      — Analytics
│   │   ├── members/      — Family members
│   │   ├── investments/  — Investment tracking
│   │   └── settings/     — User preferences
│   └── api/              — All API routes (Next.js Route Handlers)
├── components/
│   ├── layouts/          — DashboardLayout (sidebar + bottom nav)
│   ├── shared/           — EmptyState, TagInput, EmojiPicker
│   ├── transactions/     — BankStatementImport, SplitSection, etc.
│   └── ui/               — ShadCN components
├── lib/
│   ├── auth/             — NextAuth config
│   ├── mongodb/          — DB client + Mongoose models
│   ├── validations/      — Zod schemas
│   └── utils/            — formatCurrency, sanitize, etc.
├── services/
│   └── transactionService.ts  — Atomic transaction CRUD with MongoDB sessions
└── types/                — Shared TypeScript interfaces
public/
└── sw.js                 — Service worker (bump CACHE_VERSION on each deploy)
```

## Architecture Rules

### API Routes
- Always call `getServerSession(authOptions)` first — return 401 if no session
- Always call `connectToDatabase()` before any Mongoose operations
- Use `.lean()` on all read queries for performance
- Use `transactionService.ts` for create/update/delete transactions — it handles balance updates and goal progress atomically inside a MongoDB session
- **Never** duplicate goal/balance updates outside `transactionService`

### Mongoose Populate
- `.populate()` returns full objects `{_id, name, ...}`, NOT string IDs
- When setting form `values` from a populated query, extract `_id`: `typeof val === 'object' ? val._id : val`
- Model registration: if you `.populate('tripId')` in a route, that route must `import Trip from '...'` even if unused — Mongoose requires models to be registered

### Forms (React Hook Form + Zod)
- Avoid `z.preprocess` for numeric fields — handle NaN in `onSubmit` instead
- Zod v4 uses `{ error: ... }` not `{ message: ... }` for date field errors
- For Select components: **never** use `<SelectItem value="">` — use `"__none__"` as the empty sentinel value

### Service Worker
- `public/sw.js` caches assets. Bump `CACHE_VERSION` on each production deploy to clear stale caches
- Never cache `/_next/` paths — Next.js content-hashes its own chunks

## Coding Conventions
- Mobile-first Tailwind: always add `grid-cols-1 sm:grid-cols-2` not `grid-cols-2` on forms
- Dialogs need `max-w-[calc(100vw-2rem)] sm:max-w-lg` to avoid edge-bleed on phones
- Primary buttons: minimum `h-9` (36px), prefer `h-10`; never use `h-7` for tap targets
- `text-[10px]` is too small for mobile — minimum `text-xs` (12px) for UI text
- Fixed-width selects (`w-40`) need `w-full sm:w-40` pattern
- Tab bars with 4+ items need `overflow-x-auto` + `whitespace-nowrap` on triggers

## Session Context
At the start of each session, read these files to understand current state:
- `.claude/context/plan.md` — current backlog and priorities
- `.claude/context/changes.md` — what was changed recently
- `.claude/context/test-results.md` — last known build/type-check state
- `.claude/context/review.md` — known issues and review notes

After completing work, update:
- `.claude/context/changes.md` — append what you changed
- `.claude/context/test-results.md` — update after running tsc
- `.claude/files/results.md` — write task results/output
