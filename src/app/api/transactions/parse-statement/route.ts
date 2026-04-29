import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { connectToDatabase } from '@/lib/mongodb/client';
import Category from '@/lib/mongodb/models/Category';
import BankAccount from '@/lib/mongodb/models/BankAccount';
import { TransactionType } from '@/types';

interface PDFData {
  text: string;
  numpages: number;
  info: Record<string, unknown>;
}

// Extract text from PDF buffer using pdf-parse v1
async function parsePDFBuffer(buffer: Buffer): Promise<string> {
  // Import from lib to avoid the test file loading issue
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require('pdf-parse/lib/pdf-parse.js') as (buffer: Buffer) => Promise<PDFData>;
  const data = await pdfParse(buffer);
  return data.text;
}

interface ParsedTransaction {
  date: string;
  description: string;
  amount: number;
  type: TransactionType;
  balance?: number;
  reference?: string;
  narration?: string;
  chequeNo?: string;
  valueDate?: string;
  transactionId?: string;
  merchantName?: string;
  paymentMode?: string;
  suggestedCategory?: string;
  suggestedCategoryId?: string;
  isTransfer: boolean;
  isInvestment: boolean;
  confidence: number;
  rawText?: string;
}

interface StatementMetadata {
  bankDetected: string;
  accountNumber?: string;
  accountHolder?: string;
  openingBalance?: number;
  closingBalance?: number;
  statementPeriod?: {
    from: string;
    to: string;
  };
}

// Extract metadata from statement text
function extractStatementMetadata(text: string, bank: string): StatementMetadata {
  const metadata: StatementMetadata = { bankDetected: bank };
  
  // Try to find account number
  const accountPatterns = [
    /Account\s*(?:No|Number|#)[\s.:]*(\d{9,18})/i,
    /A\/C\s*(?:No|Number)?[\s.:]*(\d{9,18})/i,
    /(?:Savings|Current|SB)\s*(?:Account)?[\s.:]*(\d{9,18})/i,
    /Account\s*ID[\s.:]*(\d{9,18})/i,
  ];
  
  for (const pattern of accountPatterns) {
    const match = text.match(pattern);
    if (match) {
      metadata.accountNumber = match[1];
      break;
    }
  }
  
  // Try to find account holder name
  const namePatterns = [
    /(?:Account\s*Holder|Customer\s*Name|Name)[\s.:]+([A-Z][A-Z\s.]+)/i,
    /(?:Mr\.|Mrs\.|Ms\.|Dr\.)\s+([A-Z][A-Z\s.]+)/,
  ];
  
  for (const pattern of namePatterns) {
    const match = text.match(pattern);
    if (match) {
      metadata.accountHolder = match[1].trim();
      break;
    }
  }
  
  // Try to find opening/closing balance
  const openingPatterns = [
    /Opening\s*Balance[\s.:]*(?:₹|Rs\.?|INR)?\s*([\d,]+\.?\d*)/i,
    /Balance\s*(?:B\/F|Brought\s*Forward)[\s.:]*(?:₹|Rs\.?|INR)?\s*([\d,]+\.?\d*)/i,
    /Op(?:ening)?\.?\s*Bal(?:ance)?[\s.:]*(?:₹|Rs\.?|INR)?\s*([\d,]+\.?\d*)/i,
  ];
  
  const closingPatterns = [
    /Closing\s*Balance[\s.:]*(?:₹|Rs\.?|INR)?\s*([\d,]+\.?\d*)/i,
    /Balance\s*(?:C\/F|Carried\s*Forward)[\s.:]*(?:₹|Rs\.?|INR)?\s*([\d,]+\.?\d*)/i,
    /Cl(?:osing)?\.?\s*Bal(?:ance)?[\s.:]*(?:₹|Rs\.?|INR)?\s*([\d,]+\.?\d*)/i,
    /Available\s*Balance[\s.:]*(?:₹|Rs\.?|INR)?\s*([\d,]+\.?\d*)/i,
  ];
  
  for (const pattern of openingPatterns) {
    const match = text.match(pattern);
    if (match) {
      metadata.openingBalance = parseFloat(match[1].replace(/,/g, ''));
      break;
    }
  }
  
  for (const pattern of closingPatterns) {
    const match = text.match(pattern);
    if (match) {
      metadata.closingBalance = parseFloat(match[1].replace(/,/g, ''));
      break;
    }
  }
  
  // Try to find statement period
  const periodPatterns = [
    /(?:Statement\s*)?Period[\s.:]+(\d{1,2}[-\/\.]\d{1,2}[-\/\.]\d{2,4})\s*(?:to|-)\s*(\d{1,2}[-\/\.]\d{1,2}[-\/\.]\d{2,4})/i,
    /From[\s.:]+(\d{1,2}[-\/\.]\d{1,2}[-\/\.]\d{2,4})\s*(?:to|-)\s*(\d{1,2}[-\/\.]\d{1,2}[-\/\.]\d{2,4})/i,
    /(\d{1,2}\s+[A-Za-z]{3}\s+\d{4})\s*(?:to|-)\s*(\d{1,2}\s+[A-Za-z]{3}\s+\d{4})/i,
    /(\d{1,2}[-][A-Za-z]{3}[-]\d{4})\s*(?:to|-)\s*(\d{1,2}[-][A-Za-z]{3}[-]\d{4})/i,
  ];
  
  for (const pattern of periodPatterns) {
    const match = text.match(pattern);
    if (match) {
      metadata.statementPeriod = {
        from: match[1],
        to: match[2],
      };
      break;
    }
  }
  
  return metadata;
}

// Extract additional transaction details from description
function extractTransactionDetails(description: string, rawText?: string): {
  narration?: string;
  reference?: string;
  chequeNo?: string;
  transactionId?: string;
  merchantName?: string;
  paymentMode?: string;
  valueDate?: string;
} {
  const details: {
    narration?: string;
    reference?: string;
    chequeNo?: string;
    transactionId?: string;
    merchantName?: string;
    paymentMode?: string;
    valueDate?: string;
  } = {};
  
  const text = rawText || description;
  
  // Extract UPI reference
  const upiRefMatch = text.match(/UPI[\/\-]?(\d{12,})/i);
  if (upiRefMatch) {
    details.reference = upiRefMatch[1];
    details.paymentMode = 'UPI';
  }
  
  // Extract IMPS reference
  const impsRefMatch = text.match(/IMPS[\/\-]?(\d{12,})/i);
  if (impsRefMatch) {
    details.reference = impsRefMatch[1];
    details.paymentMode = 'IMPS';
  }
  
  // Extract NEFT reference
  const neftRefMatch = text.match(/NEFT[\/\-]?(\w{16,})/i);
  if (neftRefMatch) {
    details.reference = neftRefMatch[1];
    details.paymentMode = 'NEFT';
  }
  
  // Extract RTGS reference
  const rtgsRefMatch = text.match(/RTGS[\/\-]?(\w{16,})/i);
  if (rtgsRefMatch) {
    details.reference = rtgsRefMatch[1];
    details.paymentMode = 'RTGS';
  }
  
  // Extract cheque number
  const chequeMatch = text.match(/(?:CHQ|Cheque|Chq)\s*(?:No|#)?[\s.:]*(\d{6,})/i);
  if (chequeMatch) {
    details.chequeNo = chequeMatch[1];
    details.paymentMode = 'Cheque';
  }
  
  // Extract ATM transaction
  if (/ATM\s*(WDL|Withdrawal|Cash)/i.test(text)) {
    details.paymentMode = 'ATM';
  }
  
  // Extract POS transaction
  if (/POS\s*(Purchase|TXN)?/i.test(text)) {
    details.paymentMode = 'POS';
  }
  
  // Extract value date
  const valueDateMatch = text.match(/Value\s*(?:Date|Dt)?[\s.:]*(\d{1,2}[-\/\.]\d{1,2}[-\/\.]\d{2,4})/i);
  if (valueDateMatch) {
    details.valueDate = valueDateMatch[1];
  }
  
  // Extract transaction ID
  const txnIdMatch = text.match(/(?:TXN|Trans(?:action)?)\s*(?:ID|No)?[\s.:]*(\w{12,})/i);
  if (txnIdMatch) {
    details.transactionId = txnIdMatch[1];
  }
  
  // Extract merchant name from common patterns
  // UPI format: UPI-NAME-UPIID
  const upiMerchantMatch = text.match(/UPI[\/\-]\d+[\/\-]([A-Za-z][A-Za-z0-9\s]+?)(?:[\/\-]|@|\d{10,}|$)/i);
  if (upiMerchantMatch) {
    details.merchantName = upiMerchantMatch[1].trim();
  }
  
  // Try to extract merchant from common patterns
  const merchantPatterns = [
    /(?:Paid\s*to|Payment\s*to|Transfer\s*to)[\s.:]+([A-Za-z][A-Za-z\s.]+)/i,
    /(?:From|By)[\s.:]+([A-Za-z][A-Za-z\s.]+)/i,
  ];
  
  if (!details.merchantName) {
    for (const pattern of merchantPatterns) {
      const match = text.match(pattern);
      if (match) {
        details.merchantName = match[1].trim();
        break;
      }
    }
  }
  
  // Set narration if different from cleaned description
  if (rawText && rawText.length > description.length + 10) {
    details.narration = rawText;
  }
  
  return details;
}

// Keywords for identifying transaction types
const TRANSFER_KEYWORDS = [
  'imps', 'neft', 'rtgs', 'upi', 'transfer', 'trf', 'fund transfer',
  'self transfer', 'own account', 'internal transfer', 'a/c transfer',
  'mob trf', 'net banking', 'to self', 'from self'
];

const INVESTMENT_KEYWORDS = [
  'mutual fund', 'mf purchase', 'sip', 'ppf', 'nps', 'nsc', 'fd',
  'fixed deposit', 'recurring deposit', 'rd', 'stock', 'share',
  'demat', 'zerodha', 'groww', 'upstox', 'kuvera', 'coin',
  'lic', 'insurance premium', 'ulip', 'elss', 'etf'
];

const SALARY_KEYWORDS = [
  'salary', 'sal credit', 'payroll', 'wages', 'stipend', 'pension',
  'bonus', 'incentive', 'commission'
];

const EXPENSE_CATEGORIES: Record<string, string[]> = {
  'Food & Dining': ['swiggy', 'zomato', 'restaurant', 'cafe', 'food', 'dominos', 'pizza', 'mcdonald', 'kfc', 'burger'],
  'Shopping': ['amazon', 'flipkart', 'myntra', 'ajio', 'mall', 'retail', 'store', 'mart', 'bazaar'],
  'Transportation': ['uber', 'ola', 'rapido', 'metro', 'petrol', 'diesel', 'fuel', 'parking', 'toll'],
  'Utilities': ['electricity', 'water', 'gas', 'broadband', 'internet', 'wifi', 'mobile', 'recharge', 'dth'],
  'Entertainment': ['netflix', 'prime', 'hotstar', 'spotify', 'movie', 'cinema', 'pvr', 'inox', 'game'],
  'Healthcare': ['hospital', 'clinic', 'pharmacy', 'medical', 'doctor', 'apollo', 'medplus', 'netmeds'],
  'Education': ['school', 'college', 'university', 'course', 'udemy', 'coursera', 'tuition', 'coaching'],
  'Rent': ['rent', 'house rent', 'accommodation', 'pg rent', 'hostel'],
  'Insurance': ['insurance', 'premium', 'policy'],
  'EMI': ['emi', 'loan', 'installment', 'repayment'],
};

function identifyTransactionType(description: string, amount: number, isCredit: boolean): {
  type: TransactionType;
  isTransfer: boolean;
  isInvestment: boolean;
  suggestedCategory?: string;
} {
  const descLower = description.toLowerCase();
  
  // Check for transfers
  const isTransfer = TRANSFER_KEYWORDS.some(keyword => descLower.includes(keyword));
  
  // Check for investments
  const isInvestment = INVESTMENT_KEYWORDS.some(keyword => descLower.includes(keyword));
  
  // Check for salary
  const isSalary = SALARY_KEYWORDS.some(keyword => descLower.includes(keyword));
  
  let type: TransactionType;
  let suggestedCategory: string | undefined;
  
  if (isTransfer && !isInvestment) {
    type = TransactionType.TRANSFER_SELF;
  } else if (isInvestment) {
    type = TransactionType.INVESTMENT_CONTRIBUTION;
    suggestedCategory = 'Investment';
  } else if (isCredit) {
    type = TransactionType.INCOME;
    if (isSalary) {
      suggestedCategory = 'Salary';
    } else {
      suggestedCategory = 'Other Income';
    }
  } else {
    type = TransactionType.EXPENSE;
    // Try to identify expense category
    for (const [category, keywords] of Object.entries(EXPENSE_CATEGORIES)) {
      if (keywords.some(keyword => descLower.includes(keyword))) {
        suggestedCategory = category;
        break;
      }
    }
    if (!suggestedCategory) {
      suggestedCategory = 'Others';
    }
  }
  
  return { type, isTransfer, isInvestment, suggestedCategory };
}

function parseCSV(content: string): ParsedTransaction[] {
  const lines = content.split('\n').filter(line => line.trim());
  const transactions: ParsedTransaction[] = [];
  
  // Try to detect header row and column positions
  let headerIndex = -1;
  let dateCol = -1, descCol = -1, debitCol = -1, creditCol = -1, balanceCol = -1, refCol = -1;
  
  for (let i = 0; i < Math.min(10, lines.length); i++) {
    const line = lines[i].toLowerCase();
    if (line.includes('date') && (line.includes('description') || line.includes('narration') || line.includes('particular'))) {
      headerIndex = i;
      const cols = lines[i].split(',').map(c => c.toLowerCase().trim());
      
      cols.forEach((col, idx) => {
        if (col.includes('date') && dateCol === -1) dateCol = idx;
        if (col.includes('description') || col.includes('narration') || col.includes('particular')) descCol = idx;
        if (col.includes('debit') || col.includes('withdrawal') || col.includes('dr')) debitCol = idx;
        if (col.includes('credit') || col.includes('deposit') || col.includes('cr')) creditCol = idx;
        if (col.includes('balance') || col.includes('closing')) balanceCol = idx;
        if (col.includes('ref') || col.includes('transaction') || col.includes('utr')) refCol = idx;
      });
      break;
    }
  }
  
  // If no header found, try common formats
  if (headerIndex === -1) {
    headerIndex = 0;
    dateCol = 0;
    descCol = 1;
    debitCol = 2;
    creditCol = 3;
    balanceCol = 4;
  }
  
  // Parse transactions
  for (let i = headerIndex + 1; i < lines.length; i++) {
    try {
      const cols = parseCSVLine(lines[i]);
      if (cols.length < 3) continue;
      
      const dateStr = cols[dateCol]?.trim();
      const description = cols[descCol]?.trim() || '';
      const debitStr = cols[debitCol]?.trim().replace(/[₹,\s]/g, '') || '0';
      const creditStr = cols[creditCol]?.trim().replace(/[₹,\s]/g, '') || '0';
      const balanceStr = balanceCol >= 0 ? cols[balanceCol]?.trim().replace(/[₹,\s]/g, '') : undefined;
      const reference = refCol >= 0 ? cols[refCol]?.trim() : undefined;
      
      const debit = parseFloat(debitStr) || 0;
      const credit = parseFloat(creditStr) || 0;
      
      if (!dateStr || (debit === 0 && credit === 0)) continue;
      
      const isCredit = credit > 0;
      const amount = isCredit ? credit : debit;
      
      const { type, isTransfer, isInvestment, suggestedCategory } = identifyTransactionType(
        description,
        amount,
        isCredit
      );
      
      transactions.push({
        date: dateStr,
        description,
        amount,
        type,
        balance: balanceStr ? parseFloat(balanceStr) : undefined,
        reference,
        suggestedCategory,
        isTransfer,
        isInvestment,
        confidence: suggestedCategory ? 0.7 : 0.5,
      });
    } catch (e) {
      console.error('Error parsing line:', lines[i], e);
    }
  }
  
  return transactions;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  
  return result;
}

// Detect which bank the statement is from
function detectBank(text: string): string {
  const textLower = text.toLowerCase();
  
  // Bank detection patterns
  const bankPatterns: { bank: string; patterns: string[] }[] = [
    { bank: 'HDFC', patterns: ['hdfc bank', 'hdfcbank', 'hdfc ltd'] },
    { bank: 'ICICI', patterns: ['icici bank', 'icicibank'] },
    { bank: 'SBI', patterns: ['state bank of india', 'sbi', 'onlinesbi'] },
    { bank: 'Axis', patterns: ['axis bank', 'axisbank'] },
    { bank: 'Kotak', patterns: ['kotak mahindra', 'kotak bank'] },
    { bank: 'Yes Bank', patterns: ['yes bank', 'yesbank'] },
    { bank: 'PNB', patterns: ['punjab national bank', 'pnb'] },
    { bank: 'Bank of Baroda', patterns: ['bank of baroda', 'bob', 'baroda'] },
    { bank: 'Canara', patterns: ['canara bank'] },
    { bank: 'Union Bank', patterns: ['union bank of india', 'union bank'] },
    { bank: 'IDFC First', patterns: ['idfc first', 'idfc bank'] },
    { bank: 'IndusInd', patterns: ['indusind bank', 'indusind'] },
    { bank: 'Federal Bank', patterns: ['federal bank'] },
    { bank: 'RBL', patterns: ['rbl bank'] },
    { bank: 'Bandhan', patterns: ['bandhan bank'] },
    { bank: 'AU Small Finance', patterns: ['au small finance', 'au bank'] },
    { bank: 'Equitas', patterns: ['equitas small finance'] },
    { bank: 'IDBI', patterns: ['idbi bank'] },
    { bank: 'Indian Bank', patterns: ['indian bank'] },
    { bank: 'UCO Bank', patterns: ['uco bank'] },
    { bank: 'Central Bank', patterns: ['central bank of india'] },
    { bank: 'IOB', patterns: ['indian overseas bank', 'iob'] },
    { bank: 'Karnataka Bank', patterns: ['karnataka bank'] },
    { bank: 'South Indian Bank', patterns: ['south indian bank'] },
    { bank: 'City Union Bank', patterns: ['city union bank'] },
    { bank: 'DCB', patterns: ['dcb bank', 'development credit bank'] },
    { bank: 'Karur Vysya', patterns: ['karur vysya bank', 'kvb'] },
    { bank: 'Dhanlaxmi', patterns: ['dhanlaxmi bank'] },
    { bank: 'Lakshmi Vilas', patterns: ['lakshmi vilas bank'] },
    { bank: 'Tamilnad Mercantile', patterns: ['tamilnad mercantile bank', 'tmb'] },
    { bank: 'Nainital', patterns: ['nainital bank'] },
    { bank: 'J&K Bank', patterns: ['jammu and kashmir bank', 'j&k bank'] },
    // International banks
    { bank: 'Citi', patterns: ['citibank', 'citi bank'] },
    { bank: 'HSBC', patterns: ['hsbc bank', 'hsbc'] },
    { bank: 'Standard Chartered', patterns: ['standard chartered'] },
    { bank: 'Deutsche', patterns: ['deutsche bank'] },
    { bank: 'DBS', patterns: ['dbs bank'] },
    { bank: 'Barclays', patterns: ['barclays bank'] },
  ];
  
  for (const { bank, patterns } of bankPatterns) {
    if (patterns.some(p => textLower.includes(p))) {
      return bank;
    }
  }
  
  return 'Generic';
}

// HDFC Bank specific parser
// Format: DD/MM/YYYYNarrationWithdrawalsDepositsClosing Balance
function parseHDFCStatement(text: string): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  
  // HDFC date pattern at start of line: DD/MM/YYYY
  const datePattern = /^(\d{2}\/\d{2}\/\d{4})/;
  
  // HDFC PDF format: 
  // Line 1: DD/MM/YYYYDescription part 1
  // Line 2: Description part 2
  // Line N: WITHDRAWAL DEPOSIT BALANCE concatenated (e.g., "36.000.0044,425.84")
  // Each amount ends with .XX (2 decimal places), amounts are just concatenated
  
  // Parse 3 amounts from concatenated string like "42,000.000.001,36,568.75"
  const parseThreeAmounts = (str: string): number[] => {
    // Match amounts with Indian number format: optional lakhs, thousands, decimal
    // Pattern: digits with optional commas, ending in .XX
    const amountPattern = /(\d{1,3}(?:,\d{2,3})*(?:,\d{3})*|\d+)\.\d{2}/g;
    
    const matches: number[] = [];
    let match;
    while ((match = amountPattern.exec(str)) !== null) {
      const fullMatch = match[0];
      const numValue = parseFloat(fullMatch.replace(/,/g, ''));
      matches.push(numValue);
    }
    
    // Take last 3 matches as [withdrawal, deposit, balance]
    if (matches.length >= 3) {
      return matches.slice(-3);
    } else if (matches.length === 2) {
      return matches;
    }
    
    return [];
  };
  
  // First pass: Group lines by transaction
  interface TxnBlock {
    dateLine: string;
    followingLines: string[];
  }
  const txnBlocks: TxnBlock[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (datePattern.test(line)) {
      // Skip lines that are just value date references
      if (line.includes('Value Dt') || line.includes('Ref ')) continue;
      txnBlocks.push({ dateLine: line, followingLines: [] });
    } else if (txnBlocks.length > 0) {
      // Skip headers/footers
      const skipPatterns = /^(page|statement|opening balance|closing balance|total|date|txn date|narration|withdrawal|deposit|balance|customer id|account|joint|limit|savings|branch|rtgs|ifsc|micr|currency|nomination|rm name|rm contact|rm email)/i;
      if (!skipPatterns.test(line) && line.length > 0) {
        txnBlocks[txnBlocks.length - 1].followingLines.push(line);
      }
    }
  }
  
  // Second pass: Parse each transaction block
  for (const block of txnBlocks) {
    const dateMatch = block.dateLine.match(datePattern);
    if (!dateMatch) continue;
    
    const date = dateMatch[1];
    
    // Find the amounts line - look backwards for line with multiple decimals
    let amountsLine: string | null = null;
    let amountsLineIdx = -1;
    
    for (let i = block.followingLines.length - 1; i >= 0; i--) {
      const line = block.followingLines[i];
      // Check if line has multiple .XX patterns and ends with digits
      const decimalCount = (line.match(/\.\d{2}/g) || []).length;
      if (decimalCount >= 2 && /\d{2}$/.test(line)) {
        amountsLine = line;
        amountsLineIdx = i;
        break;
      }
    }
    
    if (!amountsLine) continue;
    
    const amounts = parseThreeAmounts(amountsLine);
    if (amounts.length < 2) continue;
    
    let withdrawal = 0, deposit = 0, balance = 0;
    
    if (amounts.length >= 3) {
      withdrawal = amounts[0];
      deposit = amounts[1];
      balance = amounts[2];
    } else if (amounts.length === 2) {
      withdrawal = amounts[0];
      balance = amounts[1];
    }
    
    // Build description from date line (after date) and following lines (before amounts line)
    let description = block.dateLine.substring(date.length).trim();
    for (let i = 0; i < amountsLineIdx; i++) {
      description += ' ' + block.followingLines[i];
    }
    
    // Clean up description
    description = description.replace(/\s+/g, ' ').trim();
    description = description.replace(/Value\s+Dt\s+\d{2}\/\d{2}\/\d{4}\s+Ref\s+\w+/gi, '').trim();
    description = description.replace(/Ref\s+\d+\s*$/gi, '').trim();
    
    // Skip opening balance entries
    if (description.toLowerCase().includes('opening balance')) continue;
    
    let amount = 0;
    let isCredit = false;
    
    if (deposit > 0 && withdrawal === 0) {
      amount = deposit;
      isCredit = true;
    } else if (withdrawal > 0) {
      amount = withdrawal;
      isCredit = false;
    }
    
    // Sanity check
    if (amount > 0 && amount < 100000000 && description.length > 0) {
      const { type, isTransfer, isInvestment, suggestedCategory } = identifyTransactionType(
        description, amount, isCredit
      );
      
      transactions.push({
        date, description, amount, type, balance,
        isTransfer, isInvestment, suggestedCategory, confidence: 0.85
      });
    }
  }
  
  return transactions;
}

// ICICI Bank specific parser
function parseICICIStatement(text: string): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  
  // ICICI formats: DD-MM-YYYY or DD/MM/YYYY
  const datePattern = /^(\d{2}[-\/]\d{2}[-\/]\d{4})\s+(\d{2}[-\/]\d{2}[-\/]\d{4})?\s*(.+)/;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(datePattern);
    
    if (match) {
      const date = match[1].replace(/-/g, '/');
      const remaining = match[3] || '';

      // Extract amounts (ICICI shows withdrawal, deposit, balance)
      const amounts = remaining.match(/[\d,]+\.\d{2}/g) || [];
      
      if (amounts.length >= 2) {
        const withdrawal = parseFloat(amounts[0]?.replace(/,/g, '') || '0');
        const deposit = parseFloat(amounts[1]?.replace(/,/g, '') || '0');
        const balance = amounts[2] ? parseFloat(amounts[2].replace(/,/g, '')) : undefined;
        
        // Get description before first amount
        const firstAmountIdx = remaining.indexOf(amounts[0] || "");
        const description = remaining.substring(0, firstAmountIdx).trim();
        
        const isCredit = deposit > 0;
        const amount = isCredit ? deposit : withdrawal;
        
        if (amount > 0 && description) {
          const { type, isTransfer, isInvestment, suggestedCategory } = identifyTransactionType(
            description, amount, isCredit
          );
          
          transactions.push({
            date, description, amount, type, balance,
            isTransfer, isInvestment, suggestedCategory, confidence: 0.8
          });
        }
      }
    }
  }
  
  return transactions;
}

// SBI Bank specific parser
function parseSBIStatement(text: string): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  
  // SBI date pattern: DD MMM YYYY or DD-MMM-YYYY
  const datePattern = /^(\d{1,2}\s+[A-Za-z]{3}\s+\d{4}|\d{2}-[A-Za-z]{3}-\d{4})\s+(.+)/;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(datePattern);
    
    if (match) {
      const date = match[1];
      const remaining = match[2];
      
      // SBI format: Date | Description | Ref No | Debit | Credit | Balance
      const amounts = remaining.match(/[\d,]+\.\d{2}/g) || [];
      
      if (amounts.length >= 1) {
        // Get description - everything before first number that looks like amount or ref
        let description = remaining;
        const firstAmountMatch = remaining.match(/\d[\d,]*\.\d{2}/);
        if (firstAmountMatch) {
          description = remaining.substring(0, remaining.indexOf(firstAmountMatch[0])).trim();
        }
        
        // Clean up description (remove ref numbers)
        description = description.replace(/\d{10,}/g, '').trim();
        
        // Determine debit/credit
        let amount = 0;
        let isCredit = false;
        
        if (amounts.length >= 3) {
          const debit = parseFloat(amounts[amounts.length - 3]?.replace(/,/g, '') || '0');
          const credit = parseFloat(amounts[amounts.length - 2]?.replace(/,/g, '') || '0');
          
          if (credit > 0) {
            amount = credit;
            isCredit = true;
          } else {
            amount = debit;
            isCredit = false;
          }
        } else {
          amount = parseFloat(amounts[0]?.replace(/,/g, '') || '0');
          isCredit = remaining.toLowerCase().includes(' cr');
        }
        
        if (amount > 0 && description) {
          const { type, isTransfer, isInvestment, suggestedCategory } = identifyTransactionType(
            description, amount, isCredit
          );
          
          transactions.push({
            date, description, amount, type,
            isTransfer, isInvestment, suggestedCategory, confidence: 0.8
          });
        }
      }
    }
  }
  
  return transactions;
}

// Axis Bank specific parser
function parseAxisStatement(text: string): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  
  // Axis date pattern: DD-MM-YYYY
  const datePattern = /^(\d{2}-\d{2}-\d{4})\s+(.+)/;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(datePattern);
    
    if (match) {
      const date = match[1].replace(/-/g, '/');
      const remaining = match[2];
      
      // Extract amounts
      const amounts = remaining.match(/[\d,]+\.\d{2}/g) || [];
      
      if (amounts.length >= 1) {
        // Description is before first amount
        const firstAmountIdx = remaining.indexOf(amounts[0] || "");
        const description = remaining.substring(0, firstAmountIdx).trim();
        
        // Axis shows DR/CR indicator
        let isCredit = remaining.includes(' CR') || remaining.includes(' Cr');
        const isDebit = remaining.includes(' DR') || remaining.includes(' Dr');
        if (isDebit) isCredit = false;
        
        let amount = 0;
        if (amounts.length >= 3) {
          const debit = parseFloat(amounts[0]?.replace(/,/g, '') || '0');
          const credit = parseFloat(amounts[1]?.replace(/,/g, '') || '0');
          amount = credit > 0 ? credit : debit;
          isCredit = credit > 0;
        } else {
          amount = parseFloat(amounts[0]?.replace(/,/g, '') || '0');
        }
        
        if (amount > 0 && description) {
          const { type, isTransfer, isInvestment, suggestedCategory } = identifyTransactionType(
            description, amount, isCredit
          );
          
          transactions.push({
            date, description, amount, type,
            isTransfer, isInvestment, suggestedCategory, confidence: 0.8
          });
        }
      }
    }
  }
  
  return transactions;
}

// Kotak Bank specific parser - Enhanced for actual Kotak format
// Format: DD MMM, YYYY DESCRIPTION REF# ±AMOUNT BALANCE
function parseKotakStatement(text: string): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  
  // Kotak date patterns
  // Format 1: "02 Dec, 2024" - with comma
  // Format 2: "DD-MMM-YYYY"
  const datePatterns = [
    /^(\d{2}\s+[A-Za-z]{3},?\s+\d{4})/,  // DD MMM, YYYY or DD MMM YYYY
    /^(\d{2}-[A-Za-z]{3}-\d{4})/,         // DD-MMM-YYYY
    /^(\d{2}\/\d{2}\/\d{4})/,              // DD/MM/YYYY
    /^(\d{2}-\d{2}-\d{4})/,                // DD-MM-YYYY
  ];
  
  // Join consecutive lines that might be split descriptions
  const processedLines: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let hasDate = false;
    for (const pattern of datePatterns) {
      if (pattern.test(line)) {
        hasDate = true;
        break;
      }
    }
    
    if (hasDate) {
      processedLines.push(line);
    } else if (processedLines.length > 0 && line.length > 0) {
      // Skip headers/footers
      const skipPatterns = /^(page|statement|opening|closing|total|date|narration|particulars|debit|credit|balance|portfolio|summary|assets|deposit|kotak|ref\.no|crn|home branch|ifsc|micr|variant|currency)/i;
      if (!skipPatterns.test(line) && !line.includes('...')) {
        // Check if line contains amounts - might be continuation
        if (/[+-]?[\d,]+\.\d{2}/.test(line) || line.length > 5) {
          processedLines[processedLines.length - 1] += ' ' + line;
        }
      }
    }
  }
  
  for (const line of processedLines) {
    let date: string | null = null;
    let remaining = '';
    
    for (const pattern of datePatterns) {
      const match = line.match(pattern);
      if (match) {
        date = match[1];
        remaining = line.substring(match[0].length).trim();
        break;
      }
    }
    
    if (!date) continue;
    
    // Skip opening/closing balance lines
    if (remaining.includes('OPENING BALANCE') || remaining.includes('Closing Balance')) continue;
    
    // Skip Sweep transfers TO (internal transfers) but keep FROM
    if (remaining.toLowerCase().includes('sweep trf to:') || remaining.toLowerCase().includes('sweep transfer to')) continue;
    
    // Look for amounts with +/- prefix (Kotak uses this format)
    // Pattern: +42,000.00 or -15,000.00
    const signedAmounts = remaining.match(/[+-][\d,]+\.\d{2}/g) || [];
    // Also look for unsigned amounts
    const unsignedAmounts = remaining.match(/(?<![+-])[\d,]+\.\d{2}/g) || [];
    
    let amount = 0;
    let isCredit = false;
    let balance: number | undefined;
    let description = '';
    
    if (signedAmounts.length > 0) {
      // Kotak format with +/- amounts
      const amountStr = signedAmounts[0];
      isCredit = amountStr?.startsWith('+') || false;
      amount = parseFloat(amountStr?.replace(/[+,]/g, '') || '0');
      if (amountStr?.startsWith('-')) {
        amount = Math.abs(amount);
        isCredit = false;
      }
      
      // Balance is usually the last unsigned amount
      if (unsignedAmounts.length > 0) {
        balance = parseFloat(unsignedAmounts[unsignedAmounts.length - 1]?.replace(/,/g, '') || '0');
      }
      
      // Description is everything before the signed amount
      const amountIdx = remaining.indexOf(signedAmounts[0] || "");
      description = remaining.substring(0, amountIdx).trim();
    } else if (unsignedAmounts.length >= 2) {
      // Old Kotak format: Debit | Credit | Balance or Amount | Balance
      const amounts = unsignedAmounts;
      
      // Check for DR/CR indicators
      const hasDR = remaining.toUpperCase().includes(' DR') || remaining.includes('(DR)');
      const hasCR = remaining.toUpperCase().includes(' CR') || remaining.includes('(CR)');
      
      if (amounts.length >= 3) {
        // Format: Debit | Credit | Balance
        const debit = parseFloat(amounts[0]?.replace(/,/g, '') || '0');
        const credit = parseFloat(amounts[1]?.replace(/,/g, '') || '0');
        balance = parseFloat(amounts[2]?.replace(/,/g, '') || '0');
        
        if (credit > 0 && debit === 0) {
          amount = credit;
          isCredit = true;
        } else if (debit > 0) {
          amount = debit;
          isCredit = false;
        }
      } else {
        // Amount | Balance
        amount = parseFloat(amounts[0]?.replace(/,/g, '') || '0');
        balance = parseFloat(amounts[1]?.replace(/,/g, '') || '0');
        isCredit = hasCR && !hasDR;
      }
      
      // Description is before first amount
      const firstAmountIdx = remaining.indexOf(amounts[0] || "");
      description = remaining.substring(0, firstAmountIdx).trim();
    }
    
    // Clean up description
    description = description.replace(/\s+/g, ' ').trim();
    description = description.replace(/\s*\(?(DR|CR)\)?\.?\s*/gi, '').trim();
    // Remove reference numbers like UPI-433731884684
    description = description.replace(/UPI-\d+/g, '').trim();
    description = description.replace(/NACHDR\d+/g, '').trim();
    
    // Skip internal sweep TO transfers (but keep FROM as transfers)
    const isSweepTo = description.toLowerCase().includes('sweep trf to');
    
    if (amount > 0 && amount < 10000000 && description.length > 0 && !isSweepTo) {
      const { type, isTransfer, isInvestment, suggestedCategory } = identifyTransactionType(
        description, amount, isCredit
      );
      
      transactions.push({
        date, description, amount, type, balance,
        isTransfer, isInvestment, suggestedCategory, confidence: 0.85
      });
    }
  }
  
  return transactions;
}

// IDBI Bank specific parser
// Format: DD-MM-YYYY AT LOCATION ,DESCRIPTION Withdrawal Deposit Balance Cr/Dr
function parseIDBIStatement(text: string): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  
  // IDBI uses DD-MM-YYYY format
  const datePattern = /^(\d{2}-\d{2}-\d{4})/;
  
  // Process lines - join continuations (IDBI wraps long descriptions)
  const processedLines: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (datePattern.test(line)) {
      processedLines.push(line);
    } else if (processedLines.length > 0 && line.length > 0) {
      // Skip headers/footers/summaries
      const skipPatterns = /^(page|statement|opening|closing|total|date|particulars|debit|credit|balance|customer id|account|summary|assets|details|important|gstin|sac|ckyc)/i;
      if (!skipPatterns.test(line)) {
        // Join with previous line
        processedLines[processedLines.length - 1] += ' ' + line;
      }
    }
  }
  
  for (const line of processedLines) {
    const dateMatch = line.match(datePattern);
    if (!dateMatch) continue;
    
    const date = dateMatch[1];
    const remaining = line.substring(dateMatch[0].length).trim();
    
    // Skip B/F (Brought Forward) lines
    if (remaining.includes('B/F') || remaining.includes('OPENING BALANCE')) continue;
    
    // IDBI format: "AT LOCATION ,Description Withdrawal Deposit Balance Cr"
    // Example: "AT ADITYAPUR, JAMSHEDPUR ,UPI/210588798948/PhonePe 130.00 0.00 7,991.66 Cr"
    
    // Find all amounts in the line
    const amounts = remaining.match(/[\d,]+\.\d{2}/g) || [];
    
    // Need at least 3 amounts: withdrawal, deposit, balance (one of withdrawal/deposit is 0.00)
    if (amounts.length < 3) continue;
    
    // Balance is the last amount, followed by Cr or Dr
    const balanceStr = amounts[amounts.length - 1];
    const balance = parseFloat(balanceStr?.replace(/,/g, '') || '0');
    
    // Withdrawal is second-to-last, Deposit is third-to-last
    const depositStr = amounts[amounts.length - 2];
    const withdrawalStr = amounts[amounts.length - 3];
    
    const withdrawal = parseFloat(withdrawalStr?.replace(/,/g, '') || '0');
    const deposit = parseFloat(depositStr?.replace(/,/g, '') || '0');
    
    // Find description - everything from start up to the first amount
    const firstAmountIdx = remaining.indexOf(amounts[0] || "");
    let description = remaining.substring(0, firstAmountIdx).trim();
    
    // Clean description - remove location prefix
    description = description.replace(/^AT\s+[^,]+,\s*[^,]+\s*,?\s*/i, '');
    description = description.replace(/\s+/g, ' ').trim();
    description = description.replace(/^,\s*/, '');
    
    let amount = 0;
    let isCredit = false;
    
    if (withdrawal > 0 && deposit === 0) { 
      amount = withdrawal; 
      isCredit = false; 
    } else if (deposit > 0 && withdrawal === 0) { 
      amount = deposit; 
      isCredit = true; 
    } else if (withdrawal > 0) { 
      amount = withdrawal; 
      isCredit = false; 
    } else if (deposit > 0) {
      amount = deposit;
      isCredit = true;
    }
    
    // Sanity check - amounts should be reasonable (< 10 million)
    if (amount > 0 && amount < 10000000 && description.length > 0) {
      const { type, isTransfer, isInvestment, suggestedCategory } = identifyTransactionType(
        description, amount, isCredit
      );
      
      transactions.push({
        date, description, amount, type, balance,
        isTransfer, isInvestment, suggestedCategory, confidence: 0.85
      });
    }
  }
  
  return transactions;
}

// Yes Bank specific parser
function parseYesBankStatement(text: string): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  
  // Yes Bank typically uses DD/MM/YYYY format
  const datePattern = /^(\d{2}\/\d{2}\/\d{4})\s+(.+)/;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(datePattern);
    
    if (match) {
      const date = match[1];
      const remaining = match[2];
      
      const amounts = remaining.match(/[\d,]+\.\d{2}/g) || [];
      
      if (amounts.length >= 1) {
        const firstAmountIdx = remaining.indexOf(amounts[0] || "");
        const description = remaining.substring(0, firstAmountIdx).trim();
        
        let amount = 0;
        let isCredit = false;
        
        if (amounts.length >= 2) {
          const val1 = parseFloat(amounts[0]?.replace(/,/g, '') || '0');
          const val2 = parseFloat(amounts[1]?.replace(/,/g, '') || '0');
          // Yes Bank sometimes shows amount and balance only
          amount = val1;
          isCredit = remaining.toLowerCase().includes(' cr') || 
                     description.toLowerCase().includes('credit') ||
                     description.toLowerCase().includes('deposit');
        } else {
          amount = parseFloat(amounts[0]?.replace(/,/g, '') || '0');
          isCredit = remaining.toLowerCase().includes(' cr');
        }
        
        if (amount > 0 && description) {
          const { type, isTransfer, isInvestment, suggestedCategory } = identifyTransactionType(
            description, amount, isCredit
          );
          
          transactions.push({
            date, description, amount, type,
            isTransfer, isInvestment, suggestedCategory, confidence: 0.8
          });
        }
      }
    }
  }
  
  return transactions;
}

// IDFC First Bank specific parser
function parseIDFCStatement(text: string): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  
  // IDFC uses DD-MMM-YYYY format typically
  const datePattern = /^(\d{2}-[A-Za-z]{3}-\d{4})\s+(.+)/;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(datePattern);
    
    if (match) {
      const date = match[1];
      const remaining = match[2];
      
      const amounts = remaining.match(/[\d,]+\.\d{2}/g) || [];
      
      if (amounts.length >= 1) {
        const firstAmountIdx = remaining.indexOf(amounts[0] || "");
        const description = remaining.substring(0, firstAmountIdx).trim();
        
        let amount = 0;
        let isCredit = false;
        
        if (amounts.length >= 3) {
          const debit = parseFloat(amounts[0]?.replace(/,/g, '') || '0');
          const credit = parseFloat(amounts[1]?.replace(/,/g, '') || '0');
          amount = credit > 0 ? credit : debit;
          isCredit = credit > 0;
        } else {
          amount = parseFloat(amounts[0]?.replace(/,/g, '') || '0');
          isCredit = remaining.toLowerCase().includes(' cr');
        }
        
        if (amount > 0 && description) {
          const { type, isTransfer, isInvestment, suggestedCategory } = identifyTransactionType(
            description, amount, isCredit
          );
          
          transactions.push({
            date, description, amount, type,
            isTransfer, isInvestment, suggestedCategory, confidence: 0.8
          });
        }
      }
    }
  }
  
  return transactions;
}

// IndusInd Bank specific parser  
function parseIndusIndStatement(text: string): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  
  // IndusInd uses DD/MM/YYYY format
  const datePattern = /^(\d{2}\/\d{2}\/\d{4})\s+(.+)/;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(datePattern);
    
    if (match) {
      const date = match[1];
      const remaining = match[2];
      
      const amounts = remaining.match(/[\d,]+\.\d{2}/g) || [];
      
      if (amounts.length >= 1) {
        const firstAmountIdx = remaining.indexOf(amounts[0] || "");
        const description = remaining.substring(0, firstAmountIdx).trim();
        
        let amount = 0;
        let isCredit = false;
        
        if (amounts.length >= 3) {
          const debit = parseFloat(amounts[0]?.replace(/,/g, '') || '0');
          const credit = parseFloat(amounts[1]?.replace(/,/g, '') || '0');
          amount = credit > 0 ? credit : debit;
          isCredit = credit > 0;
        } else {
          amount = parseFloat(amounts[0]?.replace(/,/g, '') || '0');
          isCredit = remaining.toLowerCase().includes(' cr');
        }
        
        if (amount > 0 && description) {
          const { type, isTransfer, isInvestment, suggestedCategory } = identifyTransactionType(
            description, amount, isCredit
          );
          
          transactions.push({
            date, description, amount, type,
            isTransfer, isInvestment, suggestedCategory, confidence: 0.8
          });
        }
      }
    }
  }
  
  return transactions;
}

// PNB Bank specific parser
function parsePNBStatement(text: string): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  
  // PNB uses DD-MM-YYYY or DD/MM/YYYY
  const datePattern = /^(\d{2}[-\/]\d{2}[-\/]\d{4})\s+(.+)/;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(datePattern);
    
    if (match) {
      const date = match[1].replace(/-/g, '/');
      const remaining = match[2];
      
      const amounts = remaining.match(/[\d,]+\.\d{2}/g) || [];
      
      if (amounts.length >= 1) {
        const firstAmountIdx = remaining.indexOf(amounts[0] || "");
        const description = remaining.substring(0, firstAmountIdx).trim();
        
        let amount = 0;
        let isCredit = remaining.toLowerCase().includes(' cr') || remaining.toLowerCase().includes('credit');
        
        if (amounts.length >= 3) {
          const debit = parseFloat(amounts[0]?.replace(/,/g, '') || '0');
          const credit = parseFloat(amounts[1]?.replace(/,/g, '') || '0');
          amount = credit > 0 ? credit : debit;
          isCredit = credit > 0;
        } else {
          amount = parseFloat(amounts[0]?.replace(/,/g, '') || '0');
        }
        
        if (amount > 0 && description) {
          const { type, isTransfer, isInvestment, suggestedCategory } = identifyTransactionType(
            description, amount, isCredit
          );
          
          transactions.push({
            date, description, amount, type,
            isTransfer, isInvestment, suggestedCategory, confidence: 0.75
          });
        }
      }
    }
  }
  
  return transactions;
}

// Bank of Baroda specific parser
function parseBOBStatement(text: string): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  
  // BOB uses DD-MMM-YYYY format typically
  const datePattern = /^(\d{2}-[A-Za-z]{3}-\d{4}|\d{2}\/\d{2}\/\d{4})\s+(.+)/;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(datePattern);
    
    if (match) {
      const date = match[1];
      const remaining = match[2];
      
      const amounts = remaining.match(/[\d,]+\.\d{2}/g) || [];
      
      if (amounts.length >= 1) {
        const firstAmountIdx = remaining.indexOf(amounts[0] || "");
        const description = remaining.substring(0, firstAmountIdx).trim();
        
        let amount = 0;
        let isCredit = false;
        
        if (amounts.length >= 3) {
          const debit = parseFloat(amounts[0]?.replace(/,/g, '') || '0');
          const credit = parseFloat(amounts[1]?.replace(/,/g, '') || '0');
          amount = credit > 0 ? credit : debit;
          isCredit = credit > 0;
        } else {
          amount = parseFloat(amounts[0]?.replace(/,/g, '') || '0');
          isCredit = remaining.toLowerCase().includes(' cr');
        }
        
        if (amount > 0 && description) {
          const { type, isTransfer, isInvestment, suggestedCategory } = identifyTransactionType(
            description, amount, isCredit
          );
          
          transactions.push({
            date, description, amount, type,
            isTransfer, isInvestment, suggestedCategory, confidence: 0.75
          });
        }
      }
    }
  }
  
  return transactions;
}

// Canara Bank specific parser
function parseCanaraStatement(text: string): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  
  const datePattern = /^(\d{2}[-\/]\d{2}[-\/]\d{4})\s+(.+)/;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(datePattern);
    
    if (match) {
      const date = match[1].replace(/-/g, '/');
      const remaining = match[2];
      
      const amounts = remaining.match(/[\d,]+\.\d{2}/g) || [];
      
      if (amounts.length >= 1) {
        const firstAmountIdx = remaining.indexOf(amounts[0] || "");
        const description = remaining.substring(0, firstAmountIdx).trim();
        
        let amount = 0;
        let isCredit = false;
        
        if (amounts.length >= 3) {
          const debit = parseFloat(amounts[0]?.replace(/,/g, '') || '0');
          const credit = parseFloat(amounts[1]?.replace(/,/g, '') || '0');
          amount = credit > 0 ? credit : debit;
          isCredit = credit > 0;
        } else {
          amount = parseFloat(amounts[0]?.replace(/,/g, '') || '0');
          isCredit = remaining.toLowerCase().includes(' cr');
        }
        
        if (amount > 0 && description) {
          const { type, isTransfer, isInvestment, suggestedCategory } = identifyTransactionType(
            description, amount, isCredit
          );
          
          transactions.push({
            date, description, amount, type,
            isTransfer, isInvestment, suggestedCategory, confidence: 0.75
          });
        }
      }
    }
  }
  
  return transactions;
}

// Generic parser for unknown banks (fallback) - Enhanced version
function parseGenericStatement(text: string): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  
  // Join lines that might be continuations
  const processedLines: string[] = [];
  const dateRegex = /^\d{1,2}[-\/\.]\d{1,2}[-\/\.]\d{2,4}|^\d{1,2}\s+[A-Za-z]{3}\s+\d{2,4}|^\d{1,2}[-][A-Za-z]{3}[-]\d{2,4}/;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (dateRegex.test(line)) {
      processedLines.push(line);
    } else if (processedLines.length > 0) {
      // Check if it looks like a continuation (has some text but not a date)
      const lastLine = processedLines[processedLines.length - 1];
      // Skip obvious headers/footers
      if (!line.match(/^(page|statement|opening|closing|total|balance b\/f|date|particulars|narration|description|debit|credit|withdrawal|deposit)/i) && line.length > 2) {
        // Check if the last line might need more data (no amounts found yet)
        const hasAmounts = /[\d,]+\.\d{2}/.test(lastLine);
        if (!hasAmounts || line.match(/[\d,]+\.\d{2}/)) {
          processedLines[processedLines.length - 1] = lastLine + ' ' + line;
        }
      }
    }
  }
  
  // Multiple date patterns to try
  const datePatterns = [
    /^(\d{2}\/\d{2}\/\d{2,4})/,           // DD/MM/YYYY or DD/MM/YY
    /^(\d{2}-\d{2}-\d{4})/,                // DD-MM-YYYY
    /^(\d{1,2}\s+[A-Za-z]{3}\s+\d{4})/,   // DD MMM YYYY or D MMM YYYY
    /^(\d{2}-[A-Za-z]{3}-\d{4})/,          // DD-MMM-YYYY
    /^(\d{4}-\d{2}-\d{2})/,                // YYYY-MM-DD
    /^(\d{2}\.[A-Za-z]{3}\.\d{4})/,        // DD.MMM.YYYY
    /^(\d{2}\.\d{2}\.\d{4})/,              // DD.MM.YYYY
  ];

  for (const line of processedLines) {
    let date: string | null = null;
    let matchEnd = 0;
    
    // Try each date pattern
    for (const pattern of datePatterns) {
      const match = line.match(pattern);
      if (match) {
        date = match[1];
        matchEnd = match[0].length;
        break;
      }
    }
    
    if (!date) continue;
    
    const remaining = line.substring(matchEnd);
    const amounts = remaining.match(/[\d,]+\.\d{2}/g) || [];
    
    if (amounts.length === 0) continue;
    
    // Determine transaction type from context
    const lineLower = line.toLowerCase();
    const isCR = lineLower.includes(' cr') || lineLower.includes('credit') || 
                 lineLower.includes('deposit') || lineLower.includes('received') ||
                 lineLower.includes('salary') || lineLower.includes('refund') ||
                 lineLower.includes('cashback') || lineLower.includes('interest');
    const isDR = lineLower.includes(' dr') || lineLower.includes('debit') || 
                 lineLower.includes('withdraw') || lineLower.includes('payment') || 
                 lineLower.includes('transfer to') || lineLower.includes('purchase') ||
                 lineLower.includes('pos') || lineLower.includes('atm');
    
    let amount = 0;
    let isCredit = false;
    let balance: number | undefined;
    
    if (amounts.length >= 3) {
      // Assume format: description | debit | credit | balance
      const debit = parseFloat(amounts[amounts.length - 3]?.replace(/,/g, '') || '0');
      const credit = parseFloat(amounts[amounts.length - 2]?.replace(/,/g, '') || '0');
      balance = parseFloat(amounts[amounts.length - 1]?.replace(/,/g, '') || '0');
      
      if (debit > 0 && credit === 0) {
        amount = debit;
        isCredit = false;
      } else if (credit > 0 && debit === 0) {
        amount = credit;
        isCredit = true;
      } else if (debit > 0) {
        amount = debit;
        isCredit = false;
      } else if (credit > 0) {
        amount = credit;
        isCredit = true;
      }
    } else if (amounts.length === 2) {
      // Could be amount + balance
      const val1 = parseFloat(amounts[0]?.replace(/,/g, '') || '0');
      const val2 = parseFloat(amounts[1]?.replace(/,/g, '') || '0');
      
      // If val2 is significantly larger, it's likely the balance
      if (val2 > val1 * 1.5) {
        amount = val1;
        balance = val2;
        isCredit = isCR && !isDR;
      } else {
        // Could be debit | credit
        if (isCR) {
          amount = val2 > 0 ? val2 : val1;
          isCredit = true;
        } else {
          amount = val1;
          isCredit = false;
        }
      }
    } else {
      amount = parseFloat(amounts[0]?.replace(/,/g, '') || '0');
      isCredit = isCR && !isDR;
    }
    
    // Extract description
    const firstAmountIndex = line.indexOf(amounts[0] || "");
    let description = line.substring(matchEnd, firstAmountIndex).trim();
    description = description.replace(/\s*(CR|DR|Cr|Dr)\.?\s*/g, '').trim();
    description = description.replace(/\s+/g, ' ').trim();
    
    // Skip if no meaningful amount
    if (amount > 0 && amount < 100000000 && description.length > 0) {
      const { type, isTransfer, isInvestment, suggestedCategory } = identifyTransactionType(
        description,
        amount,
        isCredit
      );
      
      transactions.push({
        date,
        description: description || 'Bank Transaction',
        amount,
        type,
        balance,
        isTransfer,
        isInvestment,
        suggestedCategory,
        confidence: suggestedCategory ? 0.6 : 0.4,
      });
    }
  }

  return transactions;
}

// Main PDF parser - detects bank and uses appropriate parser
function parsePDF(text: string): { transactions: ParsedTransaction[]; metadata: StatementMetadata } {
  const bank = detectBank(text);
  console.info(`Detected bank: ${bank}`);
  console.info(`PDF text preview (first 500 chars): ${text.substring(0, 500)}`);
  
  // Extract metadata first
  const metadata = extractStatementMetadata(text, bank);
  
  let transactions: ParsedTransaction[] = [];
  
  switch (bank) {
    case 'HDFC':
      transactions = parseHDFCStatement(text);
      break;
    case 'ICICI':
      transactions = parseICICIStatement(text);
      break;
    case 'SBI':
      transactions = parseSBIStatement(text);
      break;
    case 'Axis':
      transactions = parseAxisStatement(text);
      break;
    case 'Kotak':
      transactions = parseKotakStatement(text);
      break;
    case 'Yes Bank':
      transactions = parseYesBankStatement(text);
      break;
    case 'IDFC First':
      transactions = parseIDFCStatement(text);
      break;
    case 'IndusInd':
      transactions = parseIndusIndStatement(text);
      break;
    case 'PNB':
      transactions = parsePNBStatement(text);
      break;
    case 'Bank of Baroda':
      transactions = parseBOBStatement(text);
      break;
    case 'Canara':
      transactions = parseCanaraStatement(text);
      break;
    case 'IDBI':
      transactions = parseIDBIStatement(text);
      break;
    default:
      transactions = parseGenericStatement(text);
  }
  
  console.info(`Parser found ${transactions.length} transactions`);
  
  // If bank-specific parser returns few results, try generic as fallback
  if (transactions.length < 3) {
    const genericTransactions = parseGenericStatement(text);
    if (genericTransactions.length > transactions.length) {
      transactions = genericTransactions;
    }
  }
  
  // Extract additional details for each transaction
  transactions = transactions.map(txn => {
    const details = extractTransactionDetails(txn.description, txn.rawText);
    return {
      ...txn,
      ...details,
    };
  });
  
  // Sort by date
  transactions.sort((a, b) => {
    const dateA = parseDate(a.date);
    const dateB = parseDate(b.date);
    return dateA.getTime() - dateB.getTime();
  });
  
  // Try to extract opening/closing balance from transactions if not in metadata
  if (!metadata.openingBalance && transactions.length > 0 && transactions[0].balance) {
    const firstTxn = transactions[0];
    if (firstTxn.type === TransactionType.EXPENSE || firstTxn.type === TransactionType.TRANSFER_SELF) {
      metadata.openingBalance = (firstTxn.balance || 0) + firstTxn.amount;
    } else {
      metadata.openingBalance = (firstTxn.balance || 0) - firstTxn.amount;
    }
  }
  
  if (!metadata.closingBalance && transactions.length > 0) {
    const lastTxn = transactions[transactions.length - 1];
    if (lastTxn.balance) {
      metadata.closingBalance = lastTxn.balance;
    }
  }
  
  // Try to extract statement period from transactions if not in metadata
  if (!metadata.statementPeriod && transactions.length > 0) {
    metadata.statementPeriod = {
      from: transactions[0].date,
      to: transactions[transactions.length - 1].date,
    };
  }
  
  return { transactions, metadata };
}

// Parse various date formats to Date object
function parseDate(dateStr: string): Date {
  // Try different date formats
  const formats = [
    { regex: /^(\d{2})\/(\d{2})\/(\d{4})$/, order: [2, 1, 0] }, // DD/MM/YYYY
    { regex: /^(\d{2})\/(\d{2})\/(\d{2})$/, order: [2, 1, 0], century: true }, // DD/MM/YY
    { regex: /^(\d{2})-(\d{2})-(\d{4})$/, order: [2, 1, 0] }, // DD-MM-YYYY
    { regex: /^(\d{4})-(\d{2})-(\d{2})$/, order: [0, 1, 2] }, // YYYY-MM-DD
    { regex: /^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})$/, isText: true }, // DD MMM YYYY
    { regex: /^(\d{2})-([A-Za-z]{3})-(\d{4})$/, isText: true }, // DD-MMM-YYYY
  ];
  
  const months: Record<string, number> = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
  };
  
  for (const format of formats) {
    const match = dateStr.match(format.regex);
    if (match) {
      if (format.isText) {
        const day = parseInt(match[1]);
        const month = months[match[2].toLowerCase()];
        const year = parseInt(match[3]);
        return new Date(year, month, day);
      } else {
        let year = parseInt(match[format.order![0] + 1]);
        const month = parseInt(match[format.order![1] + 1]) - 1;
        const day = parseInt(match[format.order![2] + 1]);
        if (format.century && year < 100) {
          year += year > 50 ? 1900 : 2000;
        }
        return new Date(year, month, day);
      }
    }
  }
  
  return new Date(dateStr);
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const bankAccountId = formData.get('bankAccountId') as string;
    
    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file uploaded' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Verify bank account belongs to user
    if (bankAccountId) {
      const bankAccount = await BankAccount.findOne({
        _id: bankAccountId,
        userId: session.user.id,
      });
      
      if (!bankAccount) {
        return NextResponse.json(
          { success: false, error: 'Bank account not found' },
          { status: 404 }
        );
      }
    }

    // Get user's categories for matching
    const categories = await Category.find({ userId: session.user.id }).lean();
    const categoryMap = new Map(categories.map(c => [c.name.toLowerCase(), c._id.toString()]));

    let transactions: ParsedTransaction[] = [];
    let metadata: StatementMetadata = { bankDetected: 'Generic' };
    
    const fileName = file.name.toLowerCase();
    
    if (fileName.endsWith('.pdf')) {
      // Parse PDF file
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      try {
        const pdfText = await parsePDFBuffer(buffer);
        const result = parsePDF(pdfText);
        transactions = result.transactions;
        metadata = result.metadata;
      } catch (pdfError) {
        console.error('PDF parsing error:', pdfError);
        return NextResponse.json(
          { success: false, error: 'Failed to parse PDF. Please ensure it is a valid bank statement PDF.' },
          { status: 400 }
        );
      }
    } else if (fileName.endsWith('.csv') || fileName.endsWith('.txt')) {
      const content = await file.text();
      transactions = parseCSV(content);
      metadata = { bankDetected: 'CSV Import' };
    } else {
      return NextResponse.json(
        { success: false, error: 'Unsupported file format. Please upload a PDF or CSV file.' },
        { status: 400 }
      );
    }

    // Match suggested categories with user's actual categories
    // Also add unique IDs to each transaction and map types for UI
    const transactionsWithIds = transactions.map((t, index) => {
      // Map internal type to UI type
      let uiType: 'income' | 'expense' | 'transfer' | 'investment' = 'expense';
      if (t.type === TransactionType.INCOME) {
        uiType = 'income';
      } else if (t.type === TransactionType.EXPENSE) {
        uiType = 'expense';
      } else if (t.type === TransactionType.TRANSFER_SELF) {
        uiType = 'transfer';
      } else if (t.type === TransactionType.INVESTMENT_CONTRIBUTION) {
        uiType = 'investment';
      }
      
      const txn = {
        id: `txn-${index}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        date: t.date,
        description: t.description,
        amount: t.amount,
        type: uiType,
        balance: t.balance,
        reference: t.reference,
        narration: t.narration,
        chequeNo: t.chequeNo,
        valueDate: t.valueDate,
        transactionId: t.transactionId,
        merchantName: t.merchantName,
        paymentMode: t.paymentMode,
        category: t.suggestedCategory,
        categoryId: t.suggestedCategoryId,
        confidence: Math.round(t.confidence * 100),
        isDuplicate: false,
        rawText: t.rawText,
      };
      
      if (txn.category) {
        const categoryId = categoryMap.get(txn.category.toLowerCase());
        if (categoryId) {
          txn.categoryId = categoryId;
        }
      }
      
      return txn;
    });

    // Calculate summary
    const incomeTransactions = transactionsWithIds.filter(t => t.type === 'income');
    const expenseTransactions = transactionsWithIds.filter(t => t.type === 'expense');
    const transferTransactions = transactionsWithIds.filter(t => t.type === 'transfer');
    const investmentTransactions = transactionsWithIds.filter(t => t.type === 'investment');

    return NextResponse.json({
      transactions: transactionsWithIds,
      bankDetected: metadata.bankDetected,
      accountNumber: metadata.accountNumber,
      accountHolder: metadata.accountHolder,
      openingBalance: metadata.openingBalance,
      closingBalance: metadata.closingBalance,
      statementPeriod: metadata.statementPeriod,
      summary: {
        total: transactionsWithIds.length,
        income: incomeTransactions.length,
        expense: expenseTransactions.length,
        transfer: transferTransactions.length,
        investment: investmentTransactions.length,
        incomeAmount: incomeTransactions.reduce((sum, t) => sum + t.amount, 0),
        expenseAmount: expenseTransactions.reduce((sum, t) => sum + t.amount, 0),
        transferAmount: transferTransactions.reduce((sum, t) => sum + t.amount, 0),
        investmentAmount: investmentTransactions.reduce((sum, t) => sum + t.amount, 0),
      },
    });
  } catch (error) {
    console.error('Error parsing bank statement:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to parse bank statement' },
      { status: 500 }
    );
  }
}
