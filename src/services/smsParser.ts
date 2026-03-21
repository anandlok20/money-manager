export interface ParsedSMS {
  amount: number;
  type: 'EXPENSE' | 'INCOME';
  merchantName?: string;
  bankName?: string;
  accountLast4?: string;
  rawText: string;
  confidence: number;
  suggestedCategoryName?: string;
}

// Category keywords for auto-suggestion (mirrors scan-receipt route)
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'Food & Dining': [
    'swiggy', 'zomato', 'dominos', 'mcdonald', 'kfc', 'subway', 'restaurant',
    'cafe', 'coffee', 'pizza', 'burger', 'hotel', 'dhaba', 'chaayos',
    'haldiram', 'barbeque', 'biryani', 'starbucks',
  ],
  'Groceries': [
    'bigbasket', 'grofers', 'blinkit', 'dmart', 'reliance fresh', 'more',
    'spencer', 'nature basket', 'grocery', 'supermarket', 'mart',
  ],
  'Shopping': [
    'amazon', 'flipkart', 'myntra', 'ajio', 'mall', 'store', 'shop',
    'retail', 'fashion', 'lifestyle', 'pantaloons', 'westside',
  ],
  'Transportation': [
    'uber', 'ola', 'rapido', 'metro', 'petrol', 'diesel', 'fuel',
    'indian oil', 'hp petrol', 'bharat petroleum', 'toll', 'parking', 'rapido',
  ],
  'Healthcare': [
    'pharmacy', 'medical', 'hospital', 'clinic', 'apollo', 'medplus',
    'netmeds', '1mg', 'pharmeasy', 'diagnostic', 'lab',
  ],
  'Entertainment': [
    'movie', 'cinema', 'pvr', 'inox', 'bookmyshow', 'game', 'arcade',
    'hotstar', 'netflix', 'prime video', 'spotify',
  ],
  'Utilities': [
    'electricity', 'water bill', 'gas bill', 'recharge', 'broadband',
    'internet', 'jio', 'airtel', 'vi ', 'bsnl',
  ],
};

function suggestCategory(text: string): string | undefined {
  const lower = text.toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((k) => lower.includes(k))) return category;
  }
  return undefined;
}

interface SMSPattern {
  pattern: RegExp;
  bank: string;
  type: 'EXPENSE' | 'INCOME';
  amountGroup: number;
  merchantGroup?: number;
  accountGroup?: number;
}

const SMS_PATTERNS: SMSPattern[] = [
  // HDFC debit
  {
    pattern: /Rs\.?\s*([\d,]+(?:\.\d{1,2})?)\s+(?:has been\s+)?(?:debited|Debited)\s+from\s+(?:your\s+)?[Aa]\/[Cc][^\d]*(\d{4})/,
    bank: 'HDFC',
    type: 'EXPENSE',
    amountGroup: 1,
    accountGroup: 2,
  },
  // HDFC credit
  {
    pattern: /Rs\.?\s*([\d,]+(?:\.\d{1,2})?)\s+(?:has been\s+)?(?:credited|Credited)\s+to\s+(?:your\s+)?[Aa]\/[Cc][^\d]*(\d{4})/,
    bank: 'HDFC',
    type: 'INCOME',
    amountGroup: 1,
    accountGroup: 2,
  },
  // ICICI debit
  {
    pattern: /INR\s*([\d,]+(?:\.\d{1,2})?)\s+debited\s+from\s+[Aa]\/[Cc]\s+\w*(\d{4})/i,
    bank: 'ICICI',
    type: 'EXPENSE',
    amountGroup: 1,
    accountGroup: 2,
  },
  // ICICI credit
  {
    pattern: /INR\s*([\d,]+(?:\.\d{1,2})?)\s+credited\s+(?:to|in)\s+[Aa]\/[Cc]\s+\w*(\d{4})/i,
    bank: 'ICICI',
    type: 'INCOME',
    amountGroup: 1,
    accountGroup: 2,
  },
  // SBI debit
  {
    pattern: /[Aa]\/[Cc]\s+\w*(\d{4})\s+(?:is\s+)?debited\s+(?:by\s+)?Rs\.?\s*([\d,]+(?:\.\d{1,2})?)/i,
    bank: 'SBI',
    type: 'EXPENSE',
    amountGroup: 2,
    accountGroup: 1,
  },
  // SBI credit
  {
    pattern: /[Aa]\/[Cc]\s+\w*(\d{4})\s+credited\s+(?:by\s+)?Rs\.?\s*([\d,]+(?:\.\d{1,2})?)/i,
    bank: 'SBI',
    type: 'INCOME',
    amountGroup: 2,
    accountGroup: 1,
  },
  // Axis debit
  {
    pattern: /Rs\.?\s*([\d,]+(?:\.\d{1,2})?)\s+(?:has been\s+)?debited\s+from\s+[Aa]\/c\s+(?:No\.?\s+)?[Xx]*(\d{4})/i,
    bank: 'Axis',
    type: 'EXPENSE',
    amountGroup: 1,
    accountGroup: 2,
  },
  // Kotak debit
  {
    pattern: /INR\s*([\d,]+(?:\.\d{1,2})?)\s+debited\s+from\s+Kotak\s+Bank\s+[Aa]\/c\s+[Xx]*(\d{4})/i,
    bank: 'Kotak',
    type: 'EXPENSE',
    amountGroup: 1,
    accountGroup: 2,
  },
  // UPI debit (generic)
  {
    pattern: /Rs\.?\s*([\d,]+(?:\.\d{1,2})?)\s+debited\s+from\s+[Aa]\/c\s+[Xx]*(\d{4})\s+to\s+VPA\s+([\w.@-]+)\s+via\s+UPI/i,
    bank: 'UPI',
    type: 'EXPENSE',
    amountGroup: 1,
    accountGroup: 2,
    merchantGroup: 3,
  },
  // PhonePe / GPay sent
  {
    pattern: /(?:Money Sent|Sent)\s*[!.]?\s*Rs\.?\s*([\d,]+(?:\.\d{1,2})?)\s+(?:from\s+\S+\s+)?to\s+([\w\s]+?)(?:\s+via|\s+on|\.)/i,
    bank: 'PhonePe',
    type: 'EXPENSE',
    amountGroup: 1,
    merchantGroup: 2,
  },
  // PhonePe / GPay received
  {
    pattern: /(?:Money Received|Received)\s*[!.]?\s*Rs\.?\s*([\d,]+(?:\.\d{1,2})?)\s+from\s+([\w\s]+?)(?:\s+via|\s+on|\.)/i,
    bank: 'PhonePe',
    type: 'INCOME',
    amountGroup: 1,
    merchantGroup: 2,
  },
  // Paytm paid
  {
    pattern: /You\s+have\s+paid\s+Rs\.?\s*([\d,]+(?:\.\d{1,2})?)\s+to\s+([\w\s@.]+?)\s+on\s+Paytm/i,
    bank: 'Paytm',
    type: 'EXPENSE',
    amountGroup: 1,
    merchantGroup: 2,
  },
  // Amazon Pay
  {
    pattern: /Amazon\s+Pay\s+UPI\s+transaction\s+of\s+Rs\.?\s*([\d,]+(?:\.\d{1,2})?)/i,
    bank: 'Amazon Pay',
    type: 'EXPENSE',
    amountGroup: 1,
  },
  // Generic debit fallback
  {
    pattern: /(?:debited|deducted)\s+(?:of\s+)?(?:Rs\.?|INR)\s*([\d,]+(?:\.\d{1,2})?)/i,
    bank: 'Bank',
    type: 'EXPENSE',
    amountGroup: 1,
  },
  // Generic credit fallback
  {
    pattern: /(?:credited|received)\s+(?:of\s+)?(?:Rs\.?|INR)\s*([\d,]+(?:\.\d{1,2})?)/i,
    bank: 'Bank',
    type: 'INCOME',
    amountGroup: 1,
  },
];

function parseAmount(raw: string): number {
  return parseFloat(raw.replace(/,/g, '')) || 0;
}

export function parseSMS(text: string): ParsedSMS | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  for (const { pattern, bank, type, amountGroup, merchantGroup, accountGroup } of SMS_PATTERNS) {
    const match = trimmed.match(pattern);
    if (!match) continue;

    const amount = parseAmount(match[amountGroup] || '0');
    if (amount <= 0) continue;

    const merchantName = merchantGroup ? match[merchantGroup]?.trim() : undefined;
    const accountLast4 = accountGroup ? match[accountGroup]?.trim() : undefined;

    // Suggest category from merchant name or full SMS text
    const suggestedCategoryName = suggestCategory(merchantName || trimmed);

    return {
      amount,
      type,
      merchantName,
      bankName: bank,
      accountLast4,
      rawText: trimmed,
      confidence: merchantName ? 0.85 : 0.7,
      suggestedCategoryName,
    };
  }

  return null;
}

export function parseSMSBatch(messages: string[]): ParsedSMS[] {
  return messages
    .map((msg) => parseSMS(msg))
    .filter((result): result is ParsedSMS => result !== null);
}
