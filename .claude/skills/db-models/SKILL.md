---
name: db-models
description: Complete reference for all 22 MongoDB/Mongoose models in the Money Manager project — fields, types, refs, indexes, and relationships. Use when writing queries, building API routes, checking field names, understanding model structure, or adding new fields.
---

## Common Patterns Across All Models

- Every model has `userId: ObjectId (ref: User)` + `createdAt/updatedAt` timestamps
- Privacy models have `isPrivate: boolean` + `privateMemberId: ObjectId (ref: Member)`
- All reads use `.lean()` — never mutate a queried doc directly
- Populated refs return `{_id, name, ...}` objects — extract `._id` when setting form values

---

## Relationship Map

```
User (root)
 ├── Member            userId → User
 ├── Subscription      userId → User (unique/1:1)
 ├── CashAccount       userId → User (unique/1:1)
 ├── TaxProfile        userId → User (unique per financialYear)
 ├── BankAccount       userId → User
 ├── Card              userId → User, linkedBankId → BankAccount, linkedMemberId → Member
 ├── Investment        userId → User
 ├── Category          userId → User
 ├── Budget            userId → User, categoryId → Category
 ├── Goal              userId → User, linkedAccountId → BankAccount
 ├── Trip              userId → User
 ├── Loan              userId → User, linkedVehicleId → Vehicle
 ├── Vehicle           userId → User
 ├── Asset             userId → User
 ├── StoredDocument    userId → User
 ├── NetWorthSnapshot  userId → User
 ├── ScheduledPayment  userId → User, categoryId → Category, sourceBankId/sourceCardId, destinationBankId/destinationCardId/destinationInvestmentId, memberId → Member
 ├── SplitExpense      userId → User, transactionId → Transaction (unique), splits[].memberId → Member
 └── Transaction       userId → User
                          ├── categoryId → Category
                          ├── memberId → Member
                          ├── tripId → Trip
                          ├── goalId → Goal
                          ├── sourceBankId → BankAccount
                          ├── sourceCardId → Card
                          ├── destinationBankId → BankAccount
                          ├── destinationCardId → Card
                          └── destinationInvestmentId → Investment
```

---

## Models

### User
File: `src/lib/mongodb/models/User.ts`

| Field | Type | Notes |
|-------|------|-------|
| email | string | required, unique |
| passwordHash | string | required |
| name | string | required |
| currency | string | default: 'INR' |
| role | 'user' \| 'admin' | default: 'user' |
| hasSelectedPlan | boolean | default: false |
| lockEnabled | boolean | default: false |
| pinHash | string | optional |
| sensitiveDataPasswordHash | string | optional |

Indexes: `{ role: 1, createdAt: -1 }`

---

### Member
File: `src/lib/mongodb/models/Member.ts`

| Field | Type | Notes |
|-------|------|-------|
| userId | ObjectId | required, ref: User |
| name | string | required |
| type | MemberType | default: SELF (SELF\|FAMILY\|OTHER) |
| email | string | optional |
| phone | string | optional |
| dateOfBirth | Date | optional |
| relationship | string | optional |
| address | object | street, city, state, postalCode, country |
| isActive | boolean | default: true |
| accessCode | string | optional — used for member login |
| accessCodeEnabled | boolean | default: false |
| accessPasswordHash | string | optional |
| accessSetupComplete | boolean | default: false |
| passwordResetRequested | boolean | default: false |

Indexes: `{ userId: 1, isActive: 1 }`, `{ accessCode: 1 }` (unique, sparse)

---

### Transaction
File: `src/lib/mongodb/models/Transaction.ts`
**Always use `transactionService.ts` for create/update/delete — never write directly.**

| Field | Type | Notes |
|-------|------|-------|
| userId | ObjectId | required, ref: User |
| dateTime | Date | default: now |
| amount | number | required, min: 0 |
| type | TransactionType | required (EXPENSE\|INCOME\|TRANSFER_SELF\|INVESTMENT_CONTRIBUTION) |
| categoryId | ObjectId | optional, ref: Category |
| memberId | ObjectId | optional, ref: Member |
| tripId | ObjectId | optional, ref: Trip |
| goalId | ObjectId | optional, ref: Goal |
| sourceType | AccountType | optional (BANK\|CARD\|CASH\|INVESTMENT) |
| sourceBankId | ObjectId | optional, ref: BankAccount |
| sourceCardId | ObjectId | optional, ref: Card |
| destinationType | AccountType | optional |
| destinationBankId | ObjectId | optional, ref: BankAccount |
| destinationCardId | ObjectId | optional, ref: Card |
| destinationInvestmentId | ObjectId | optional, ref: Investment |
| paymentMode | string | upi\|neft\|rtgs\|imps\|cash\|cheque\|card\|netbanking\|other |
| referenceNumber | string | optional |
| receiptUrl | string | optional |
| cashPersonName | string | optional — free-text person for cash entries |
| tags | string[] | optional |
| note | string | optional |
| isPrivate | boolean | default: false |
| privateMemberId | ObjectId | optional, ref: Member |
| currency | string | default: 'INR' |
| originalAmount | number | optional — for foreign currency |
| originalCurrency | string | optional |

Indexes: `{ userId:1, dateTime:-1 }`, `{ userId:1, type:1 }`, `{ userId:1, categoryId:1 }`, `{ userId:1, memberId:1 }`, `{ userId:1, type:1, dateTime:-1, categoryId:1 }`, `{ note:'text', tags:'text' }`, `{ userId:1, tripId:1, dateTime:-1 }`, `{ userId:1, sourceBankId:1 }`, `{ userId:1, sourceCardId:1 }`, `{ userId:1, destinationInvestmentId:1 }`

---

### Category
File: `src/lib/mongodb/models/Category.ts`

| Field | Type | Notes |
|-------|------|-------|
| userId | ObjectId | required, ref: User |
| name | string | required |
| type | CategoryType | required (INCOME\|EXPENSE) |
| icon | string | optional — Lucide icon name |
| color | string | optional — hex color |
| isActive | boolean | default: true |

Indexes: `{ userId:1, type:1, isActive:1 }`

---

### BankAccount
File: `src/lib/mongodb/models/BankAccount.ts`

| Field | Type | Notes |
|-------|------|-------|
| userId | ObjectId | required, ref: User |
| bankName | string | required |
| accountHolderName | string | required |
| accountType | string | savings\|current\|salary\|fd\|rd\|nre\|nro\|other, default: 'savings' |
| accountNumber | string | optional |
| upiId | string | optional |
| ifscCode | string | optional |
| openingBalance | number | required, default: 0 |
| currentBalance | number | required, default: 0 — updated by transactionService |
| minimumBalance | number | default: 0 |
| minimumBalanceAlert | boolean | default: true |
| interestRate | number | optional |
| maturityDate | Date | optional |
| maturityAmount | number | optional |
| linkedMemberIds | ObjectId[] | ref: Member — members who use this account |
| isActive | boolean | default: true |
| isPrivate | boolean | default: false |
| privateMemberId | ObjectId | optional, ref: Member |

Indexes: `{ userId:1, isActive:1 }`, `{ userId:1, bankName:1 }`

---

### Card
File: `src/lib/mongodb/models/Card.ts`

| Field | Type | Notes |
|-------|------|-------|
| userId | ObjectId | required, ref: User |
| cardName | string | required |
| cardType | string | CREDIT\|DEBIT\|PREPAID\|FOREX\|VIRTUAL, default: 'CREDIT' |
| cardNetwork | string | VISA\|MASTERCARD\|RUPAY\|AMEX\|DINERS\|DISCOVER\|OTHER |
| last4Digits | string | optional, max 4 chars |
| expiryMonth | number | optional, 1–12 |
| expiryYear | number | optional |
| cvv | string | optional, AES-256-GCM encrypted |
| pin | string | optional, AES-256-GCM encrypted |
| billingCycleDay | number | optional, 1–31 |
| creditLimit | number | optional |
| currentBalance | number | default: 0 — updated by transactionService |
| spendingLimit | number | default: 0 |
| spendingLimitAlert | boolean | default: true |
| linkedBankId | ObjectId | optional, ref: BankAccount — bill payment account |
| linkedMemberId | ObjectId | optional, ref: Member |
| isActive | boolean | default: true |
| isPrivate | boolean | default: false |
| privateMemberId | ObjectId | optional, ref: Member |

Methods: `decryptCVV()`, `decryptPIN()`

Indexes: `{ userId:1, isActive:1 }`, `{ userId:1, cardType:1 }`

---

### CashAccount
File: `src/lib/mongodb/models/CashAccount.ts`
**Balance is always recomputed from transactions (totalIn - totalOut), not from stored value.**

| Field | Type | Notes |
|-------|------|-------|
| userId | ObjectId | required, ref: User, unique (1:1) |
| currentBalance | number | default: 0 |
| currency | string | default: 'INR' |

---

### Investment
File: `src/lib/mongodb/models/Investment.ts`

| Field | Type | Notes |
|-------|------|-------|
| userId | ObjectId | required, ref: User |
| name | string | required |
| type | InvestmentType | required (MUTUAL_FUND\|INSURANCE\|SHARE_MARKET\|PROPERTY\|VEHICLE\|GOLD_JEWELRY\|FIXED_DEPOSIT\|PPF\|NPS\|CRYPTO\|OTHER) |
| currentValue | number | default: 0 — updated by INVESTMENT_CONTRIBUTION transactions |
| isActive | boolean | default: true |

Indexes: `{ userId:1, isActive:1 }`

---

### Budget
File: `src/lib/mongodb/models/Budget.ts`

| Field | Type | Notes |
|-------|------|-------|
| userId | ObjectId | required, ref: User |
| categoryId | ObjectId | required, ref: Category |
| amount | number | required, min: 0 |
| month | number | required, 1–12 |
| year | number | required |
| rolloverEnabled | boolean | default: false |
| rolloverAmount | number | default: 0 — carried forward unspent |
| isActive | boolean | default: true |
| isPrivate | boolean | default: false |
| privateMemberId | ObjectId | optional, ref: Member |

Indexes: `{ userId:1, categoryId:1, month:1, year:1 }` (unique)

---

### Goal
File: `src/lib/mongodb/models/Goal.ts`

| Field | Type | Notes |
|-------|------|-------|
| userId | ObjectId | required, ref: User |
| name | string | required, max 100 |
| description | string | optional, max 500 |
| targetAmount | number | required, min: 1 |
| currentAmount | number | default: 0 — auto-incremented when transactions have goalId |
| deadline | Date | optional |
| icon | string | default: '🎯' |
| color | string | default: '#3b82f6' |
| status | string | active\|completed\|cancelled, default: 'active' |
| linkedAccountId | ObjectId | optional, ref: BankAccount |
| isPrivate | boolean | default: false |
| privateMemberId | ObjectId | optional, ref: Member |

Indexes: `{ userId:1, status:1 }`, `{ userId:1, deadline:1 }`

---

### Trip
File: `src/lib/mongodb/models/Trip.ts`

| Field | Type | Notes |
|-------|------|-------|
| userId | ObjectId | required, ref: User |
| name | string | required, max 100 |
| destination | string | required |
| startDate | Date | required |
| endDate | Date | required |
| budget | number | required, min: 0 |
| status | string | planned\|ongoing\|completed\|cancelled, default: 'planned' |
| totalExpenses | number | default: 0 — sum of trip-tagged transactions |
| totalIncome | number | default: 0 |
| travelers | ITripTraveler[] | name, phone, email, memberId, isOrganizer |
| tickets | ITripTicket[] | type, title, bookingRef, locations, times, carrier, seat, price, pdfUrl |
| hotels | ITripHotel[] | name, address, checkIn, checkOut, bookingRef, price, roomType, pdfUrl |
| placesToVisit | ITripPlace[] | name, category, address, plannedDate, estimatedCost, priority, visited, rating |
| cabs | ITripCab[] | type, driver info, vehicle info, locations, times, price, bookingRef |
| documents | array | name, url, type |
| isPrivate | boolean | default: false |
| privateMemberId | ObjectId | optional, ref: Member |

Indexes: `{ userId:1, status:1 }`, `{ userId:1, startDate:-1 }`

---

### Loan
File: `src/lib/mongodb/models/Loan.ts`

| Field | Type | Notes |
|-------|------|-------|
| userId | ObjectId | required, ref: User |
| lender | string | required |
| loanType | string | home\|car\|personal\|education\|gold\|other |
| principalAmount | number | required, min: 1 |
| interestRate | number | required, min: 0 |
| tenureMonths | number | required, min: 1 |
| emiAmount | number | required, min: 0 |
| disbursementDate | Date | required |
| startDate | Date | required |
| endDate | Date | optional |
| outstandingBalance | number | required, min: 0 |
| accountNumber | string | optional |
| linkedVehicleId | ObjectId | optional, ref: Vehicle |
| status | string | active\|closed\|defaulted, default: 'active' |
| isPrivate | boolean | default: false |
| privateMemberId | ObjectId | optional, ref: Member |

Indexes: `{ userId:1, status:1 }`

---

### SplitExpense
File: `src/lib/mongodb/models/SplitExpense.ts`

| Field | Type | Notes |
|-------|------|-------|
| userId | ObjectId | required, ref: User |
| transactionId | ObjectId | required, ref: Transaction, unique (1:1) |
| totalAmount | number | required |
| yourShare | number | required |
| direction | string | 'owed_to_me' \| 'i_owe', default: 'owed_to_me' |
| splits | ISplitItem[] | name, memberId?, amount, status (PENDING\|SETTLED), settledAt, settlementTransactionId |
| isPrivate | boolean | default: false |
| privateMemberId | ObjectId | optional, ref: Member |

Indexes: `{ userId:1, createdAt:-1 }`, `{ transactionId:1 }` (unique), `{ userId:1, 'splits.status':1 }`

---

### ScheduledPayment
File: `src/lib/mongodb/models/ScheduledPayment.ts`

| Field | Type | Notes |
|-------|------|-------|
| userId | ObjectId | required, ref: User |
| name | string | required |
| isActive | boolean | default: true |
| transactionType | TransactionType | required — EXPENSE\|INCOME\|TRANSFER_SELF\|INVESTMENT_CONTRIBUTION |
| categoryId | ObjectId | optional, ref: Category — required for EXPENSE/INCOME |
| frequency | Frequency | required (DAILY\|WEEKLY\|MONTHLY\|QUARTERLY\|YEARLY) |
| startDate | Date | required |
| endDate | Date | optional — auto-deactivates when passed |
| nextRunDate | Date | required, indexed |
| lastRunDate | Date | optional |
| failureCount | number | default: 0 — auto-pauses at 3 |
| lastError | string | optional |
| amount | number | required, min: 0 |
| note | string | optional |
| memberId | ObjectId | optional, ref: Member |
| sourceType | AccountType | required |
| sourceBankId | ObjectId | optional, ref: BankAccount |
| sourceCardId | ObjectId | optional, ref: Card |
| destinationType | AccountType | optional — only for TRANSFER_SELF/INVESTMENT_CONTRIBUTION |
| destinationBankId | ObjectId | optional, ref: BankAccount |
| destinationCardId | ObjectId | optional, ref: Card |
| destinationInvestmentId | ObjectId | optional, ref: Investment |

Indexes: `{ userId:1, isActive:1, nextRunDate:1 }`

---

### Vehicle
File: `src/lib/mongodb/models/Vehicle.ts`

| Field | Type | Notes |
|-------|------|-------|
| userId | ObjectId | required, ref: User |
| vehicleType | VehicleType | required |
| make / model / variant | string | required (make, model), optional (variant) |
| year / color | string/number | required |
| registrationNumber | string | required, uppercase |
| fuelType | FuelType | required |
| purchaseDate / purchasePrice / currentValue | Date/number | optional |
| Insurance fields | various | insuranceCompany, policyNumber, type, dates, premium |
| PUC fields | various | pucNumber, issueDate, expiryDate |
| Loan fields | various | hasLoan, loanProvider, loanAmount, emiAmount, loanStart/EndDate |
| documents | IVehicleDocument[] | type, documentNumber, issueDate, expiryDate, imageUrl, reminderDays |
| currentOdometer / lastServiceOdometer / nextServiceOdometer | number | optional |
| lastServiceDate / nextServiceDate | Date | optional |
| status | VehicleStatus | default: 'active' |
| isPrivate | boolean | default: false |
| privateMemberId | ObjectId | optional, ref: Member |

Indexes: `{ userId:1, registrationNumber:1 }` (unique), `{ userId:1, status:1 }`, `{ userId:1, insuranceEndDate:1 }`, `{ userId:1, pucExpiryDate:1 }`

---

### Asset
File: `src/lib/mongodb/models/Asset.ts`

| Field | Type | Notes |
|-------|------|-------|
| userId | ObjectId | required, ref: User |
| type | AssetType | required |
| name | string | required |
| purchaseDate | Date | required |
| purchaseValue / currentValue | number | required, min: 0 |
| maturityDate / maturityValue | Date/number | optional |
| isRecurring | boolean | default: false |
| recurringAmount / recurringFrequency / nextPaymentDate | various | optional |
| interestRate / expectedReturn | number | optional |
| location | object | address, city, state, pincode, area, areaUnit |
| insuranceDetails | object | policyNumber, sumAssured, premium, nominee, rider[] |
| accountNumber / folioNumber / policyNumber / institution / branch | string | optional |
| taxSection / taxBenefitAmount | string/number | optional |
| status | AssetStatus | default: 'active' |
| tags | string[] | optional |

Indexes: `{ userId:1, type:1 }`, `{ userId:1, status:1 }`, `{ userId:1, maturityDate:1 }`

---

### StoredDocument
File: `src/lib/mongodb/models/StoredDocument.ts`

| Field | Type | Notes |
|-------|------|-------|
| userId | ObjectId | required, ref: User |
| type | DocumentType | required |
| name | string | required |
| documentNumber | string | optional |
| issuedBy / issuedTo | string | optional |
| issueDate / expiryDate | Date | optional |
| metadata | Record<string, string\|number\|boolean> | default: {} |
| images / attachments | string[] | URLs |
| reminderDays | number | default: 30 |
| isActive | boolean | default: true |
| tags | string[] | optional |

Indexes: `{ userId:1, type:1 }`, `{ userId:1, expiryDate:1 }`, `{ userId:1, isActive:1 }`

---

### Subscription
File: `src/lib/mongodb/models/Subscription.ts`

| Field | Type | Notes |
|-------|------|-------|
| userId | ObjectId | required, ref: User, unique (1:1) |
| plan | string | 'free' \| 'premium', default: 'free' |
| status | string | active\|cancelled\|expired, default: 'active' |
| addons | IAddon[] | addonId, quantity, activatedAt |
| startDate | Date | default: now |
| endDate | Date | optional |

Indexes: `{ userId:1, status:1 }`

---

### NetWorthSnapshot
File: `src/lib/mongodb/models/NetWorthSnapshot.ts`

| Field | Type | Notes |
|-------|------|-------|
| userId | ObjectId | required, ref: User |
| date | Date | required |
| totalAssets | number | default: 0 |
| totalLiabilities | number | default: 0 |
| netWorth | number | default: 0 |
| breakdown | object | bankAccounts, cards, investments, cash (all default: 0) |

Indexes: `{ userId:1, date:-1 }`, `{ userId:1, date:1 }` (unique)

---

### TaxProfile
File: `src/lib/mongodb/models/TaxProfile.ts`

| Field | Type | Notes |
|-------|------|-------|
| userId | ObjectId | required, ref: User |
| financialYear | string | required, format: YYYY-YY |
| assessmentYear | string | required |
| regime | string | 'old' \| 'new', default: 'new' |
| status | string | draft\|calculated\|filed\|verified |
| residentialStatus | string | resident\|non_resident\|rnor |
| Income fields | number | salaryIncome, housePropertyIncome, businessIncome, otherIncome, exemptIncome |
| capitalGains | object | shortTerm, longTerm |
| deductions | ITaxDeduction[] | section, description, amount, maxLimit |
| standardDeduction | number | default: 75000 |
| hraExemption | number | default: 0 |
| Computed fields | number | grossTotalIncome, taxableIncome, totalTaxLiability, refundDue, taxPayable, etc. |
| tdsPaid / advanceTaxPaid / selfAssessmentTax | number | default: 0 |
| autoCalculate | boolean | default: true |

Indexes: `{ userId:1, financialYear:1 }` (unique)

---

### PricingConfig
File: `src/lib/mongodb/models/PricingConfig.ts`
Global config — not scoped to userId.

| Field | Type | Notes |
|-------|------|-------|
| freePlanPrice | number | default: 0 |
| premiumPlanPrice | number | default: 199 |
| freeLimits | IPlanLimits | banks, cards, goals, members, investments, reports, freeThemes |
| premiumLimits | IPlanLimits | same structure |
| addons | IAddonDefinition[] | id, name, emoji, description, price, type, category |
| isActive | boolean | default: true |

---

### PasswordResetToken
File: `src/lib/mongodb/models/PasswordResetToken.ts`

| Field | Type | Notes |
|-------|------|-------|
| userId | ObjectId | required, ref: User |
| token | string | required, unique |
| expiresAt | Date | required |
| used | boolean | default: false |

Indexes: `{ token:1 }`, `{ expiresAt:1 }` (TTL — auto-deletes expired tokens)
