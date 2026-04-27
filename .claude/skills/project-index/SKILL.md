---
name: project-index
description: Complete living index of every file, feature, API route, function, component, model, and utility in the Money Manager project. Read this FIRST before any fix or implementation to get full context without exploring the codebase. MUST be updated whenever any file is added, removed, or significantly changed.
---

## HOW TO USE THIS FILE
Before implementing any feature or fix:
1. Find the relevant section below to locate the exact files involved
2. Check "Key Functions" to know what already exists (don't reimplement)
3. Check "Patterns & Rules" for project conventions to follow

After making changes — update the relevant sections below to keep this index current.

---

## STACK
- **Framework:** Next.js 15 App Router, React 19, TypeScript
- **Database:** MongoDB + Mongoose (always `.lean()` on reads)
- **Auth:** NextAuth v4 — `getServerSession(authOptions)` in every API route
- **State:** TanStack React Query v5 (`useQuery`, `useMutation`)
- **Forms:** React Hook Form + Zod v4 (`zodResolver`)
- **UI:** ShadCN + Tailwind CSS (mobile-first: `grid-cols-1 sm:grid-cols-2`)
- **Charts:** Recharts with `ResponsiveContainer`
- **Notifications:** Sonner (`toast.success/error`)
- **Deploy:** Vercel

---

## CRITICAL RULES (always follow)
- Never write to Transaction/BankAccount/Card/Investment balances directly — always use `transactionService.ts`
- Never duplicate goal/balance updates outside `transactionService`
- Never use `<SelectItem value="">` — use `"__none__"` sentinel
- Never read `localStorage` in `useState` initializer — use `useEffect`
- When populating a ref (`.populate('tripId')`), import the model even if unused
- Populated refs return `{_id, name, ...}` not strings — extract `._id` in form values: `typeof val === 'object' ? val._id : val`
- Privacy filter: `buildPrivacyFilter(session.user)` must be applied to all queries
- Bump `CACHE_VERSION` in `public/sw.js` on every production deploy
- Dialogs: `max-w-[calc(100vw-2rem)] sm:max-w-lg`
- Primary buttons: minimum `h-9`; never `h-7` for tap targets

---

## SERVICES (`src/services/`)

### transactionService.ts — ALWAYS use for transaction CRUD
- `createTransaction(params: CreateTransactionParams)` — atomic: creates TX + updates balances + goal progress in MongoDB session
- `updateTransaction(transactionId, userId, updates)` — reverses old balances, applies new
- `deleteTransaction(transactionId, userId)` — deletes TX + reverses all balance/goal changes
- `applyTransactionToBalances(params, session)` — internal: applies impact to BankAccount/Card/Investment/CashAccount
- `reverseTransactionFromBalances(transaction, session)` — internal: reverses impact

**CreateTransactionParams fields:** userId, type, amount, dateTime, note?, categoryId?, memberId?, tripId?, goalId?, sourceType?, sourceBankId?, sourceCardId?, destinationType?, destinationBankId?, destinationCardId?, destinationInvestmentId?, paymentMode?, referenceNumber?, receiptUrl?, receiptFileName?, cashPersonName?, tags?, isPrivate?, privateMemberId?

### balanceService.ts
- `updateAccountBalance({ accountType, accountId, amount, session })` — increments currentBalance (bank/card) or currentValue (investment)
- `getAccountId(accountType, sourceBankId, sourceCardId)` — resolves source account ID
- `getDestinationAccountId(accountType, destBankId, destCardId, destInvestmentId)` — resolves destination ID

### scheduledPaymentService.ts
- `calculateNextRunDate(currentDate, frequency: Frequency)` — returns next Date based on frequency enum
- `executeScheduledPayment(payment)` — creates transaction, returns next run date
- `resolveTransactionType(payment)` — returns INVESTMENT_CONTRIBUTION | TRANSFER_SELF | EXPENSE

### smsParser.ts
- `parseSMS(text: string): ParsedSMS | null` — extracts amount, type, merchant, bank, accountLast4, confidence, suggestedCategoryName
- `parseSMSBatch(messages: string[]): ParsedSMS[]`
- **ParsedSMS:** { amount, type: TransactionType, merchantName?, bankName?, accountLast4?, rawText, confidence, suggestedCategoryName? }

---

## LIB: AUTH (`src/lib/auth/`)

### config.ts
- `authOptions` — NextAuth config, Credentials provider
  - Path 1: email + password → primary user JWT (id, email, name, currency, role, hasSelectedPlan, lockEnabled)
  - Path 2: accessCode + password → member JWT (adds isMemberUser: true, memberId)
  - First login seeds PricingConfig; ADMIN_EMAIL/ADMIN_PASSWORD env creates admin user
  - New registration → creates 18 default categories atomically

### session.ts
- `getSession()` — returns NextAuth session or null
- `getCurrentUser()` — returns session.user or undefined
- `requireAuth()` — redirects to /login if no session
- `getUserId()` — calls requireAuth(), returns user.id

---

## LIB: MONGODB (`src/lib/mongodb/`)

### client.ts
- `connectToDatabase()` — pooled connection: maxPoolSize 10, minPoolSize 5

### Models (all in `src/lib/mongodb/models/`)

| Model | File | Key fields |
|-------|------|-----------|
| User | User.ts | email, passwordHash, name, currency, role, hasSelectedPlan, lockEnabled, pinHash |
| Member | Member.ts | userId, name, type(SELF/FAMILY/OTHER), accessCode, accessPasswordHash, accessCodeEnabled, isActive |
| Transaction | Transaction.ts | userId, dateTime, amount, type, categoryId, memberId, tripId, goalId, sourceType, sourceBankId, sourceCardId, destinationType, destinationBankId, destinationCardId, destinationInvestmentId, paymentMode, cashPersonName, tags, isPrivate, privateMemberId |
| BankAccount | BankAccount.ts | userId, bankName, accountHolderName, accountNumber, currentBalance, openingBalance, minimumBalance, linkedMemberIds, isActive, isPrivate |
| Card | Card.ts | userId, cardName, cardType, last4Digits, expiryMonth, expiryYear, cvv(encrypted), pin(encrypted), billingCycleDay, creditLimit, currentBalance, spendingLimit, linkedBankId, linkedMemberId, isActive, isPrivate |
| CashAccount | CashAccount.ts | userId(unique), currentBalance, currency — balance always recomputed from transactions, stored value only for reference |
| Investment | Investment.ts | userId, name, type(InvestmentType), currentValue, isActive |
| Category | Category.ts | userId, name, type(INCOME/EXPENSE), icon, color, isActive |
| Budget | Budget.ts | userId, categoryId, amount, month(1-12), year, rolloverEnabled, rolloverAmount, isActive, isPrivate — unique index on (userId, categoryId, month, year) |
| Goal | Goal.ts | userId, name, targetAmount, currentAmount(auto-incremented), deadline, icon, color, status(active/completed/cancelled), linkedAccountId, isPrivate |
| Trip | Trip.ts | userId, name, destination, startDate, endDate, budget, status, totalExpenses, travelers[], tickets[], hotels[], placesToVisit[], cabs[], isPrivate |
| SplitExpense | SplitExpense.ts | userId, transactionId(unique), totalAmount, yourShare, direction('owed_to_me'/'i_owe'), splits[{name, memberId, amount, status(PENDING/SETTLED), settlementTransactionId}], isPrivate |
| ScheduledPayment | ScheduledPayment.ts | userId, name, isActive, transactionType, categoryId, frequency, startDate, endDate, nextRunDate, lastRunDate, failureCount(auto-pause at 3), lastError, amount, note, sourceType, sourceBankId, sourceCardId, destinationType, destinationBankId, destinationCardId, destinationInvestmentId |
| Loan | Loan.ts | userId, lender, loanType, principalAmount, interestRate, tenureMonths, emiAmount, disbursementDate, outstandingBalance, linkedVehicleId, status(active/closed/defaulted), isPrivate |
| Vehicle | Vehicle.ts | userId, vehicleType, make, model, year, registrationNumber, fuelType, purchasePrice, currentValue, insurance fields, PUC fields, service fields, hasLoan, documents[], status, isPrivate |
| Asset | Asset.ts | userId, type(AssetType), name, purchaseDate, purchaseValue, currentValue, maturityDate, maturityValue, interestRate, location{}, insuranceDetails{}, status, tags |
| StoredDocument | StoredDocument.ts | userId, type(DocumentType), name, documentNumber, issueDate, expiryDate, images[], attachments[], reminderDays, isActive, tags |
| Subscription | Subscription.ts | userId(unique), plan('free'/'premium'), status, addons[{addonId, quantity, activatedAt}], startDate, endDate |
| NetWorthSnapshot | NetWorthSnapshot.ts | userId, date(unique per user), totalAssets, totalLiabilities, netWorth, breakdown{bankAccounts, cards, investments, cash} |
| TaxProfile | TaxProfile.ts | userId, financialYear(YYYY-YY, unique per user), regime('old'/'new'), salaryIncome, capitalGains, deductions[], totalTaxLiability, tdsPaid, refundDue, autoCalculate |
| PricingConfig | PricingConfig.ts | global (no userId), freePlanPrice, premiumPlanPrice, freeLimits{banks,cards,goals,members}, premiumLimits, addons[] |
| PasswordResetToken | PasswordResetToken.ts | userId, token(unique), expiresAt(TTL), used |

---

## LIB: VALIDATIONS (`src/lib/validations/`)

| File | Exports |
|------|---------|
| auth.ts | `registerSchema`, `loginSchema`, `updateProfileSchema`, `changePinSchema`, `verifyPinSchema` |
| transaction.ts | `transactionSchema` (with refinements: EXPENSE/INCOME→categoryId required; TRANSFER_SELF→source≠dest; INVESTMENT_CONTRIBUTION→destInvestment required), `transactionFiltersSchema`, `updateTransactionSchema` |
| account.ts | `bankAccountSchema`, `cardSchema`, + partial update versions |
| member.ts | `memberSchema`, partial update version |
| investment.ts | `investmentSchema`, partial update version |
| category.ts | `categorySchema` (icon, color hex validation), partial update |
| scheduled-payment.ts | `scheduledPaymentSchema` (refinements: EXPENSE/INCOME→categoryId; TRANSFER/INVESTMENT→destination required), `updateScheduledPaymentSchema` |
| trip.ts | `tripSchema`, `updateTripSchema` |
| loan.ts | `loanSchema`, `updateLoanSchema` |
| budget.ts | `budgetSchema`, `updateBudgetSchema` |
| goal.ts | `goalSchema`, `updateGoalSchema` |

---

## LIB: UTILITIES (`src/lib/utils/`)

| File | Key Exports |
|------|------------|
| utils.ts | `cn(...inputs)` — Tailwind className merge |
| currency.ts | `formatCurrency(amount, currency, compact?)`, `getCurrencySymbol(currency)`, `convertCurrency(amount, from, to)`, `supportedCurrencies[]` |
| dates.ts | `formatDate(date, fmt?)`, `formatRelativeDate(date)` → "Today 2:30 PM" / "Yesterday", `formatTimeAgo(date)`, `getMonthName(date)`, `toISODateString(date)` |
| api.ts | `validateObjectId(id)` → NextResponse 400 or null, `sanitizeTextFields(obj)`, `handleApiError(error, fallback)`, `withErrorHandler(handler)` |
| sanitize.ts | `stripHtml(str)`, `sanitizeText(str)`, `sanitizeUrl(url)` (blocks private IPs), `sanitizeEmail(email)`, `sanitizeObject(obj, config)` |
| privacy.ts | `buildPrivacyFilter(session)` → `{}` for primary user, `{$or:[{isPrivate:{$ne:true}},{privateMemberId:memberId}]}` for members |
| subscription.ts | `getUserSubscription(userId)`, `canAccessFeature(feature, sub, config)`, `canCreateResource(userId, resource, currentCount)`, `getSubscriptionSummary(userId)` |
| apiFeatureGate.ts | `checkFeatureAccess(userId, feature)` → NextResponse 403 or null |
| featureGate.ts | `requireFeatureAccess(feature)` → server-side redirect |

---

## TYPES (`src/types/index.ts`)

### Enums
- `TransactionType`: EXPENSE, INCOME, TRANSFER_SELF, INVESTMENT_CONTRIBUTION
- `AccountType`: BANK, CARD, CASH, INVESTMENT
- `CategoryType`: INCOME, EXPENSE
- `MemberType`: SELF, FAMILY, OTHER
- `InvestmentType`: MUTUAL_FUND, INSURANCE, SHARE_MARKET, PROPERTY, VEHICLE, GOLD_JEWELRY, FIXED_DEPOSIT, PPF, NPS, CRYPTO, OTHER
- `Frequency`: DAILY, WEEKLY, MONTHLY, QUARTERLY, YEARLY

### API Response Types
- `ApiResponse<T>`: { success, data?, error?, message? }
- `PaginatedResponse<T>`: { data, total, page, limit, totalPages }

### Dashboard Types
- `DashboardSummary`: totalBankBalance, totalCardBalance, totalInvestmentValue, netWorth, monthlyIncome, monthlyExpense, recentTransactions

---

## HOOKS (`src/hooks/`)

| File | Exports |
|------|---------|
| useMediaQuery.ts | `useMediaQuery(query)`, `useIsMobile()` (≤767px), `useIsTablet()`, `useIsDesktop()` |
| useSubscription.ts | `useSubscription()` → { subscription, isLoading, hasAddon(id), canAccessFeature(feature), isPremium, refetch } |
| useServiceWorker.ts | `useServiceWorker()` → { isReady, isOffline } |

---

## COMPONENTS

### Layouts (`src/components/layouts/`)
- **DashboardLayout.tsx** — sidebar + bottom mobile nav; nav items: Dashboard, Accounts (Banks/Cards/Cash/Assets), Transactions, Budgets, Goals, Investments, Members, Categories, Splits, Trips, Loans, Tax, Documents, Scheduled Payments, Vehicles, Reports, Settings; each can have `gatedFeature`

### Dashboard (`src/components/dashboard/`)
- **Charts.tsx** — Recharts expense/income charts
- **BudgetAlerts.tsx** — budget status cards; props: `{ currency, showAll, compact }`
- **BalanceAlerts.tsx** — low balance / spending limit warnings
- **GettingStarted.tsx** — onboarding checklist
- **NetWorthHistory.tsx** — net worth trend chart
- **DevaInsights.tsx** — AI insights placeholder

### Transactions (`src/components/transactions/`)
- **SplitSection.tsx** — split UI within transaction form; amount/percentage toggle, equal split button; props: `{ participants, onChange, totalAmount }`
- **BankStatementImport.tsx** — CSV/OFX parser; member column; mobile card layout
- **SMSImport.tsx** — SMS bank message importer (calls smsParser)
- **ReceiptUploader.tsx** — upload receipt, extract amount/merchant
- **ImportTransactions.tsx** — generic import UI
- **DuplicateWarning.tsx** — shows potential duplicate transactions

### Shared (`src/components/shared/`)
- **EmptyState.tsx** — props: `{ icon, title, description, actionLabel?, actionHref?, onAction? }`
- **TagInput.tsx** — multi-tag input
- **EmojiPicker.tsx** — emoji selector; popover `w-[min(320px,calc(100vw-2rem))]`
- **UpgradeGate.tsx** — props: `{ feature, hasAccess, children, type?, addonPrice? }`; blurs children if no access
- **DynamicIcon.tsx** — renders Lucide icon by name string
- **CommandPalette.tsx** — keyboard shortcut command palette
- **SensitiveDataPassword.tsx** — password gate before showing CVV/PIN etc.

---

## API ROUTES (`src/app/api/`)

### Transactions
| Route | Methods | Description |
|-------|---------|-------------|
| `/api/transactions` | GET, POST | List (filterable by type/category/member/date/amount/page) + Create |
| `/api/transactions/[id]` | GET, PUT, DELETE | Single transaction CRUD |
| `/api/transactions/scan-receipt` | POST | Claude Vision API receipt scan |
| `/api/transactions/parse-statement` | POST | CSV bank statement parser |
| `/api/transactions/import` | POST | Bulk import |
| `/api/transactions/import-parsed` | POST | Import pre-parsed rows (accepts memberId) |
| `/api/transactions/import-sms` | POST | Bulk SMS import |
| `/api/transactions/tags` | GET | List all tags for user |
| `/api/transactions/bulk` | POST | Bulk CRUD |
| `/api/transactions/duplicates` | GET | Find duplicates |
| `/api/transactions/export` | GET | CSV/PDF export |
| `/api/transactions/[id]/receipt` | POST | Upload receipt file |

### Accounts
| Route | Methods | Description |
|-------|---------|-------------|
| `/api/accounts/banks` | GET, POST | List (incl. balance sum) + Create (subscription limit check) |
| `/api/accounts/banks/[id]` | GET, PUT, DELETE | Single bank CRUD |
| `/api/accounts/cards` | GET, POST | List + Create (subscription limit check) |
| `/api/accounts/cards/[id]` | GET, PUT, DELETE | Single card CRUD |
| `/api/accounts/cash` | GET, POST | Get balance (computed from transactions) + Add cash entry |

### Other Resources
| Route | Methods | Description |
|-------|---------|-------------|
| `/api/assets` + `/[id]` | GET, POST, PUT, DELETE | Asset CRUD |
| `/api/investments` + `/[id]` | GET, POST, PUT, DELETE | Investment CRUD |
| `/api/goals` + `/[id]` | GET, POST, PUT, DELETE | Goal CRUD |
| `/api/budgets` + `/[id]` | GET, POST, PUT, DELETE | Budget CRUD |
| `/api/budgets/alerts` | GET | Budget overspend alerts |
| `/api/categories` + `/[id]` | GET, POST, PUT, DELETE | Category CRUD |
| `/api/members` + `/[id]` | GET, POST, PUT, DELETE | Member CRUD |
| `/api/members/[id]/password` | PUT | Change member access password |
| `/api/members/[id]/access` | POST | Enable/disable member access code |
| `/api/trips` + `/[id]` | GET, POST, PUT, DELETE | Trip CRUD |
| `/api/splits` + `/[id]` | GET, POST, PUT | Split CRUD |
| `/api/splits/[id]/settle` | POST | Mark split settled (creates settlement transaction) |
| `/api/loans` + `/[id]` | GET, POST, PUT, DELETE | Loan CRUD |
| `/api/vehicles` + `/[id]` | GET, POST, PUT, DELETE | Vehicle CRUD |
| `/api/tax` + `/[id]` | GET, POST, PUT, DELETE | Tax profile CRUD |
| `/api/tax/[id]/calculate` | POST | Calculate tax liability |
| `/api/documents` + `/[id]` | GET, POST, PUT, DELETE | Document CRUD |
| `/api/scheduled-payments` + `/[id]` | GET, POST, PUT, PATCH, DELETE | Scheduled payment CRUD; PATCH toggles isActive |
| `/api/scheduled-payments/process` | GET, POST | Cron handler — executes due payments |

### Dashboard & Auth
| Route | Methods | Description |
|-------|---------|-------------|
| `/api/dashboard/summary` | GET | Aggregated summary (LRU cached); accepts `?viewMode=family/personal&memberId=` |
| `/api/dashboard/net-worth` | GET | Net worth history snapshots |
| `/api/dashboard/alerts` | GET | Combined alerts (balance, budgets, expiry) |
| `/api/auth/register` | POST | Register user + create subscription + SELF member + 18 default categories |
| `/api/auth/[...nextauth]` | * | NextAuth routes |
| `/api/auth/forgot-password` | POST | Request reset email |
| `/api/auth/reset-password` | POST | Reset with code |
| `/api/auth/member-setup` | POST | Member account setup |
| `/api/subscription` | GET | User subscription + pricing config |
| `/api/settings/sensitive-password` | POST | Change password |
| `/api/setup-status` | GET | Onboarding completion check |

### Cron Jobs
| Route | Description |
|-------|-------------|
| `/api/cron/budget-rollover` | Monthly — rolls over unspent budget amounts |
| `/api/cron/net-worth-snapshot` | Daily — saves net worth snapshot |
| `/api/scheduled-payments/process` | Called by cron — processes due scheduled payments; auto-pauses after 3 failures |

---

## DASHBOARD PAGES (`src/app/(dashboard)/`)

| Page | File | Key Features |
|------|------|-------------|
| Home | `page.tsx` | Summary cards, income/expense charts, recent transactions, budget alerts, goals, net worth; viewMode toggle (family/personal) persisted in localStorage |
| Transaction List | `transactions/page.tsx` | Filterable/searchable list, pagination, import button |
| New Transaction | `transactions/new/page.tsx` | Full form: type selector, category, amount, account, split section, receipt upload, tags |
| Transaction Detail | `transactions/[id]/page.tsx` | View/edit single transaction, receipt viewer |
| Banks | `accounts/banks/page.tsx` | List with balance, linked members |
| Cards | `accounts/cards/page.tsx` | List with expiry, balance, link to bank |
| Cash Wallet | `accounts/cash/page.tsx` | Month navigator, Cash in Hand (all-time), monthly stats, transaction list; member view shows "Cash from Family" heading, hides Add button |
| Assets | `accounts/assets/page.tsx` | FD, PPF, gold, real estate etc. |
| Budgets | `budgets/page.tsx` | Monthly budgets by category, progress bars, alerts, rollover |
| Goals | `goals/page.tsx` | Progress bars, target date, link to bank account, contribute button |
| Investments | `investments/page.tsx` | By type, current value, contribution history |
| Members | `members/page.tsx` | Family list, access code management |
| Categories | `categories/page.tsx` | Income + expense categories, icons, colors |
| Splits | `splits/page.tsx` | Tabs: Owed to Me (pending), I Owe, All, Settled; summary cards; settle button |
| Trips | `trips/page.tsx` | Trip cards, budget progress (only when budget > 0), Split Expenses dialog |
| Trip Detail | `trips/[id]/page.tsx` | Tabs: Overview, Tickets, Hotels, Places, Cabs; scrollable mobile tabs; Quick Expense split section |
| Loans | `loans/page.tsx` | EMI calculator, outstanding balance, linked vehicle |
| Scheduled Payments | `scheduled-payments/page.tsx` | List with name, type badge (colored), next run date, endDate, failure warnings, auto-paused badge |
| Reports | `reports/page.tsx` | Analytics: trends, category breakdown, daily log; gated: premium |
| Settings | `settings/page.tsx` | Profile, currency, PIN, password, subscription, plan, add-ons, themes |

---

## AUTH PAGES (`src/app/(auth)/`)

| Page | File |
|------|------|
| Login | `login/page.tsx` — email/password + member access code toggle |
| Register | `register/page.tsx` — name, email, password |
| Forgot Password | `forgot-password/page.tsx` |
| Reset Password | `reset-password/page.tsx` |
| Select Plan | `select-plan/page.tsx` — free/premium + add-ons |
| Join | `join/page.tsx` — family member invitation link |

---

## SERVICE WORKER (`public/sw.js`)
- `CACHE_VERSION = '6'` — bump on every deploy
- Skips: POST/PUT/DELETE, `/api/`, `/_next/`
- Navigation: network-first → fallback to cache
- Static assets (`/icons/`, `.css`): cache-first
- Default: network-first

---

## REACT QUERY CACHE KEYS (important for invalidation)
- `'transactions'` — transaction list
- `'dashboard-summary'` — dashboard home
- `'budget-alerts'` — budget alert component
- `'scheduled-payments'` — scheduled payments list
- `'scheduled-payment', id` — single scheduled payment
- `'bank-accounts'` — bank list
- `'cards'` — card list
- `'investments'` — investment list
- `'members'` — member list
- `'categories'` — category list
- `'goals'` — goals list
- `'budgets'` — budgets list
- `'trips'` — trips list
- `'splits'` — splits list
- `'cash-account'` — cash wallet

---

## HOW TO KEEP THIS FILE UPDATED

After every code change, update the relevant section(s) above:
- **New file added** → add row/entry in the correct section
- **New function/export** → add to Key Functions list
- **New API route** → add to API Routes table
- **New model field** → update Models table
- **File deleted/renamed** → remove/update the entry
- **New React Query key** → add to cache keys list

This file is the single source of truth for project structure. Keeping it current means zero codebase exploration needed for future tasks.
