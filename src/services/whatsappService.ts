/**
 * WhatsApp Business API Service
 * Uses Meta's Cloud API for sending WhatsApp messages
 */

const WHATSAPP_API_URL = 'https://graph.facebook.com/v18.0';

interface WhatsAppMessageResponse {
  messaging_product: string;
  contacts: Array<{ input: string; wa_id: string }>;
  messages: Array<{ id: string }>;
}

interface WhatsAppError {
  error: {
    message: string;
    type: string;
    code: number;
    fbtrace_id: string;
  };
}

export interface SendMessageParams {
  to: string; // Phone number with country code (e.g., +919876543210)
  message: string;
}

export interface SendTemplateParams {
  to: string;
  templateName: string;
  languageCode?: string;
  components?: Array<{
    type: 'header' | 'body' | 'button';
    parameters: Array<{
      type: 'text' | 'currency' | 'date_time';
      text?: string;
      currency?: { fallback_value: string; code: string; amount_1000: number };
      date_time?: { fallback_value: string };
    }>;
  }>;
}

/**
 * Format phone number for WhatsApp API
 * Removes +, spaces, and ensures proper format
 */
function formatPhoneNumber(phone: string): string {
  // Remove all non-digit characters
  let cleaned = phone.replace(/\D/g, '');
  
  // If it starts with 0, remove it and add country code
  if (cleaned.startsWith('0')) {
    cleaned = '91' + cleaned.substring(1);
  }
  
  // If it doesn't have country code (assuming India), add 91
  if (cleaned.length === 10) {
    cleaned = '91' + cleaned;
  }
  
  return cleaned;
}

/**
 * Send a text message via WhatsApp
 */
export async function sendWhatsAppMessage({ to, message }: SendMessageParams): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

    if (!phoneNumberId || !accessToken) {
      throw new Error('WhatsApp credentials not configured');
    }

    const formattedPhone = formatPhoneNumber(to);

    const response = await fetch(
      `${WHATSAPP_API_URL}/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: formattedPhone,
          type: 'text',
          text: {
            preview_url: false,
            body: message,
          },
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      const errorData = data as WhatsAppError;
      console.error('WhatsApp API Error:', errorData);
      return { success: false, error: errorData.error?.message || 'Failed to send message' };
    }

    const successData = data as WhatsAppMessageResponse;
    return { success: true, messageId: successData.messages[0]?.id };
  } catch (error) {
    console.error('WhatsApp send error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Send a template message via WhatsApp
 * Templates need to be pre-approved by Meta
 */
export async function sendWhatsAppTemplate({ to, templateName, languageCode = 'en', components }: SendTemplateParams): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

    if (!phoneNumberId || !accessToken) {
      throw new Error('WhatsApp credentials not configured');
    }

    const formattedPhone = formatPhoneNumber(to);

    const templatePayload: Record<string, unknown> = {
      name: templateName,
      language: { code: languageCode },
    };

    if (components) {
      templatePayload.components = components;
    }

    const response = await fetch(
      `${WHATSAPP_API_URL}/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: formattedPhone,
          type: 'template',
          template: templatePayload,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      const errorData = data as WhatsAppError;
      console.error('WhatsApp Template API Error:', errorData);
      return { success: false, error: errorData.error?.message || 'Failed to send template' };
    }

    const successData = data as WhatsAppMessageResponse;
    return { success: true, messageId: successData.messages[0]?.id };
  } catch (error) {
    console.error('WhatsApp template send error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Format currency for messages
 */
export function formatCurrencyForMessage(amount: number, currency: string = 'INR'): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Build daily expense summary message
 */
export function buildDailyExpenseSummary(data: {
  date: string;
  totalExpense: number;
  totalIncome: number;
  transactionCount: number;
  topCategories: Array<{ name: string; amount: number }>;
  currency: string;
}): string {
  const { date, totalExpense, totalIncome, transactionCount, topCategories, currency } = data;
  
  let message = `📊 *Daily Expense Summary*\n`;
  message += `📅 ${date}\n\n`;
  message += `💸 Total Spent: ${formatCurrencyForMessage(totalExpense, currency)}\n`;
  message += `💰 Total Income: ${formatCurrencyForMessage(totalIncome, currency)}\n`;
  message += `📝 Transactions: ${transactionCount}\n`;
  
  if (topCategories.length > 0) {
    message += `\n📁 *Top Categories:*\n`;
    topCategories.slice(0, 5).forEach((cat, index) => {
      message += `${index + 1}. ${cat.name}: ${formatCurrencyForMessage(cat.amount, currency)}\n`;
    });
  }
  
  message += `\n_View details in Money Manager app_`;
  return message;
}

/**
 * Build net worth summary message
 */
export function buildNetWorthSummary(data: {
  netWorth: number;
  totalBankBalance: number;
  totalInvestments: number;
  totalLiabilities: number;
  monthlyIncome: number;
  monthlyExpense: number;
  currency: string;
}): string {
  const { netWorth, totalBankBalance, totalInvestments, totalLiabilities, monthlyIncome, monthlyExpense, currency } = data;
  
  let message = `💰 *Net Worth Summary*\n\n`;
  message += `🏦 Total Net Worth: ${formatCurrencyForMessage(netWorth, currency)}\n\n`;
  message += `*Assets:*\n`;
  message += `🏦 Bank Balance: ${formatCurrencyForMessage(totalBankBalance, currency)}\n`;
  message += `📈 Investments: ${formatCurrencyForMessage(totalInvestments, currency)}\n\n`;
  if (totalLiabilities > 0) {
    message += `*Liabilities:*\n`;
    message += `💳 Total: ${formatCurrencyForMessage(totalLiabilities, currency)}\n\n`;
  }
  message += `*This Month:*\n`;
  message += `💵 Income: ${formatCurrencyForMessage(monthlyIncome, currency)}\n`;
  message += `💸 Expenses: ${formatCurrencyForMessage(monthlyExpense, currency)}\n`;
  message += `💎 Savings: ${formatCurrencyForMessage(monthlyIncome - monthlyExpense, currency)}`;
  
  return message;
}

/**
 * Build monthly summary message
 */
export function buildMonthlySummary(data: {
  month: string;
  year: number;
  totalIncome: number;
  totalExpense: number;
  savings: number;
  savingsRate: number;
  categoryBreakdown: Array<{ name: string; amount: number; percentage: number }>;
  currency: string;
}): string {
  const { month, year, totalIncome, totalExpense, savings, savingsRate, categoryBreakdown, currency } = data;
  
  let message = `📅 *Monthly Summary - ${month} ${year}*\n\n`;
  message += `💵 Income: ${formatCurrencyForMessage(totalIncome, currency)}\n`;
  message += `💸 Expenses: ${formatCurrencyForMessage(totalExpense, currency)}\n`;
  message += `💎 Savings: ${formatCurrencyForMessage(savings, currency)} (${savingsRate.toFixed(1)}%)\n\n`;
  
  if (categoryBreakdown.length > 0) {
    message += `📊 *Expense Breakdown:*\n`;
    categoryBreakdown.slice(0, 8).forEach((cat) => {
      message += `• ${cat.name}: ${formatCurrencyForMessage(cat.amount, currency)} (${cat.percentage.toFixed(1)}%)\n`;
    });
  }
  
  return message;
}

/**
 * Build alert message
 */
export function buildAlertMessage(type: 'low_balance' | 'due_date' | 'scheduled_payment' | 'vehicle_alert' | 'budget_exceeded' | 'spending_limit', data: Record<string, unknown>): string {
  switch (type) {
    case 'low_balance':
      return `⚠️ *Low Balance Alert*\n\n🏦 Account: ${data.accountName}\n💰 Current Balance: ${data.currentBalance}\n📉 Minimum Required: ${data.minimumBalance}\n\n_Please add funds to avoid issues._`;
    
    case 'due_date':
      return `📅 *Payment Due Reminder*\n\n📝 ${data.name}\n💰 Amount: ${data.amount}\n⏰ Due: ${data.dueDate}\n\n_Don't forget to make the payment!_`;
    
    case 'scheduled_payment':
      return `🔄 *Scheduled Payment*\n\n📝 ${data.name}\n💰 Amount: ${data.amount}\n📅 Date: ${data.date}\n${data.status === 'executed' ? '✅ Payment executed successfully' : '⏳ Payment scheduled'}\n\n_Check your account for confirmation._`;
    
    case 'vehicle_alert':
      return `🚗 *Vehicle Alert*\n\n🚙 ${data.vehicleName}\n📋 ${data.alertType}: ${data.message}\n⏰ ${data.dueDate ? `Due: ${data.dueDate}` : ''}\n\n_Take action to avoid penalties._`;
    
    case 'budget_exceeded':
      return `🚨 *Budget Exceeded!*\n\n📁 Category: ${data.category}\n💰 Budget: ${data.budgetAmount}\n💸 Spent: ${data.spent}\n📊 Over by: ${data.overAmount}\n\n_Consider reducing expenses in this category._`;
    
    case 'spending_limit':
      return `💳 *Spending Limit Alert*\n\n💳 Card: ${data.cardName}\n💰 Limit: ${data.spendingLimit}\n💸 Spent: ${data.currentSpending}\n📊 Over by: ${data.overAmount}\n\n_Your card spending has exceeded the set limit._`;
    
    default:
      return `📢 *Alert*\n\n${JSON.stringify(data)}`;
  }
}

/**
 * Check if WhatsApp is configured
 */
export function isWhatsAppConfigured(): boolean {
  return !!(
    process.env.WHATSAPP_PHONE_NUMBER_ID &&
    process.env.WHATSAPP_ACCESS_TOKEN
  );
}
