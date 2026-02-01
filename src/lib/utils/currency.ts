const currencySymbols: Record<string, string> = {
  INR: '₹',
  USD: '$',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  AUD: 'A$',
  CAD: 'C$',
  CHF: 'CHF',
  CNY: '¥',
  SGD: 'S$',
  AED: 'د.إ',
  THB: '฿',
  MYR: 'RM',
  NZD: 'NZ$',
  KRW: '₩',
};

const currencyLocales: Record<string, string> = {
  INR: 'en-IN',
  USD: 'en-US',
  EUR: 'de-DE',
  GBP: 'en-GB',
  JPY: 'ja-JP',
  AUD: 'en-AU',
  CAD: 'en-CA',
  CHF: 'de-CH',
  CNY: 'zh-CN',
  SGD: 'en-SG',
  AED: 'ar-AE',
  THB: 'th-TH',
  MYR: 'ms-MY',
  NZD: 'en-NZ',
  KRW: 'ko-KR',
};

// Approximate exchange rates (base: USD) - these would ideally come from an API
// Updated periodically
const exchangeRates: Record<string, number> = {
  USD: 1,
  INR: 83.5,
  EUR: 0.92,
  GBP: 0.79,
  JPY: 157.5,
  AUD: 1.53,
  CAD: 1.37,
  CHF: 0.88,
  CNY: 7.27,
  SGD: 1.35,
  AED: 3.67,
  THB: 36.5,
  MYR: 4.72,
  NZD: 1.64,
  KRW: 1385,
};

export function formatCurrency(
  amount: number,
  currency: string = 'INR',
  compact: boolean = false
): string {
  const locale = currencyLocales[currency] || 'en-IN';

  const options: Intl.NumberFormatOptions = {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  };

  if (compact && Math.abs(amount) >= 1000) {
    options.notation = 'compact';
    options.compactDisplay = 'short';
  }

  return new Intl.NumberFormat(locale, options).format(amount);
}

export function getCurrencySymbol(currency: string = 'INR'): string {
  return currencySymbols[currency] || currency;
}

export function parseCurrencyInput(value: string): number {
  // Remove currency symbols and formatting
  const cleanValue = value.replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(cleanValue);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Convert amount from one currency to another
 */
export function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string
): number {
  if (fromCurrency === toCurrency) return amount;
  
  const fromRate = exchangeRates[fromCurrency] || 1;
  const toRate = exchangeRates[toCurrency] || 1;
  
  // Convert to USD first, then to target currency
  const amountInUSD = amount / fromRate;
  const convertedAmount = amountInUSD * toRate;
  
  return Math.round(convertedAmount * 100) / 100;
}

/**
 * Get exchange rate between two currencies
 */
export function getExchangeRate(fromCurrency: string, toCurrency: string): number {
  if (fromCurrency === toCurrency) return 1;
  
  const fromRate = exchangeRates[fromCurrency] || 1;
  const toRate = exchangeRates[toCurrency] || 1;
  
  return toRate / fromRate;
}

/**
 * Format amount with conversion display
 */
export function formatWithConversion(
  amount: number,
  originalCurrency: string,
  displayCurrency: string
): string {
  const formatted = formatCurrency(amount, originalCurrency);
  
  if (originalCurrency === displayCurrency) {
    return formatted;
  }
  
  const converted = convertCurrency(amount, originalCurrency, displayCurrency);
  const convertedFormatted = formatCurrency(converted, displayCurrency);
  
  return `${formatted} (≈ ${convertedFormatted})`;
}

export const supportedCurrencies = [
  { code: 'INR', name: 'Indian Rupee', symbol: '₹', flag: '🇮🇳' },
  { code: 'USD', name: 'US Dollar', symbol: '$', flag: '🇺🇸' },
  { code: 'EUR', name: 'Euro', symbol: '€', flag: '🇪🇺' },
  { code: 'GBP', name: 'British Pound', symbol: '£', flag: '🇬🇧' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥', flag: '🇯🇵' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', flag: '🇦🇺' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', flag: '🇨🇦' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', flag: '🇸🇬' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF', flag: '🇨🇭' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', flag: '🇨🇳' },
  { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ', flag: '🇦🇪' },
  { code: 'THB', name: 'Thai Baht', symbol: '฿', flag: '🇹🇭' },
  { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM', flag: '🇲🇾' },
  { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$', flag: '🇳🇿' },
  { code: 'KRW', name: 'South Korean Won', symbol: '₩', flag: '🇰🇷' },
];

export { exchangeRates };
