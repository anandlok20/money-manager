import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { connectToDatabase } from '@/lib/mongodb/client';
import { Transaction, Category } from '@/lib/mongodb/models';
import { parse } from 'date-fns';
import { createTransaction } from '@/services/transactionService';

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

interface ImportResult {
  success: boolean;
  imported: number;
  skipped: number;
  errors: string[];
  transactions: Array<{
    date: string;
    description: string;
    amount: number;
    type: string;
    status: 'imported' | 'skipped' | 'error';
    reason?: string;
  }>;
}

// Common date formats in Indian bank statements
const DATE_FORMATS = [
  'dd/MM/yyyy',
  'dd-MM-yyyy',
  'dd MMM yyyy',
  'dd-MMM-yyyy',
  'dd/MM/yy',
  'dd-MM-yy',
  'yyyy-MM-dd',
  'MM/dd/yyyy',
];

function parseDate(value: string): Date | null {
  if (!value) return null;
  
  const cleaned = value.trim();
  
  for (const format of DATE_FORMATS) {
    try {
      const parsed = parse(cleaned, format, new Date());
      if (!isNaN(parsed.getTime()) && parsed.getFullYear() > 1990 && parsed.getFullYear() < 2100) {
        return parsed;
      }
    } catch {
      continue;
    }
  }

  // Try native Date parsing as fallback
  const native = new Date(cleaned);
  if (!isNaN(native.getTime())) {
    return native;
  }

  return null;
}

function parseAmount(value: string): number {
  if (!value) return 0;
  // Remove currency symbols, commas, and whitespace
  const cleaned = value.replace(/[₹$,\s]/g, '').trim();
  // Handle negative amounts in parentheses
  if (cleaned.startsWith('(') && cleaned.endsWith(')')) {
    return -parseFloat(cleaned.slice(1, -1)) || 0;
  }
  return parseFloat(cleaned) || 0;
}

// Detect which bank the statement is from
function detectBankFromPDF(text: string): string {
  const textLower = text.toLowerCase();
  
  const bankPatterns: { bank: string; patterns: string[] }[] = [
    { bank: 'hdfc', patterns: ['hdfc bank', 'hdfcbank', 'hdfc ltd'] },
    { bank: 'icici', patterns: ['icici bank', 'icicibank'] },
    { bank: 'sbi', patterns: ['state bank of india', 'sbi', 'onlinesbi'] },
    { bank: 'axis', patterns: ['axis bank', 'axisbank'] },
    { bank: 'kotak', patterns: ['kotak mahindra', 'kotak bank'] },
    { bank: 'yesbank', patterns: ['yes bank', 'yesbank'] },
    { bank: 'pnb', patterns: ['punjab national bank', 'pnb'] },
    { bank: 'bob', patterns: ['bank of baroda', 'bob', 'baroda'] },
    { bank: 'canara', patterns: ['canara bank'] },
    { bank: 'union', patterns: ['union bank of india', 'union bank'] },
    { bank: 'idfc', patterns: ['idfc first', 'idfc bank'] },
    { bank: 'indusind', patterns: ['indusind bank', 'indusind'] },
    { bank: 'federal', patterns: ['federal bank'] },
    { bank: 'rbl', patterns: ['rbl bank'] },
    { bank: 'bandhan', patterns: ['bandhan bank'] },
    { bank: 'au', patterns: ['au small finance', 'au bank'] },
    { bank: 'idbi', patterns: ['idbi bank'] },
    { bank: 'citi', patterns: ['citibank', 'citi bank'] },
    { bank: 'hsbc', patterns: ['hsbc bank', 'hsbc'] },
    { bank: 'sc', patterns: ['standard chartered'] },
    { bank: 'dbs', patterns: ['dbs bank'] },
  ];
  
  for (const { bank, patterns } of bankPatterns) {
    if (patterns.some(p => textLower.includes(p))) {
      return bank;
    }
  }
  
  return 'generic';
}

// Parse transactions from PDF text based on bank format
function parsePDFTransactions(text: string, bankFormat: string): Array<{
  date: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
}> {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  
  // Auto-detect bank if format is generic or auto
  const detectedBank = (bankFormat === 'generic' || bankFormat === 'auto') 
    ? detectBankFromPDF(text) 
    : bankFormat;
  
  console.log(`Using bank parser: ${detectedBank}`);
  
  let transactions: Array<{
    date: string;
    description: string;
    amount: number;
    type: 'income' | 'expense';
  }> = [];
  
  // Different parsing strategies based on bank format
  switch (detectedBank) {
    case 'hdfc':
      transactions = parseHDFCStatement(lines);
      break;
    case 'icici':
      transactions = parseICICIStatement(lines);
      break;
    case 'sbi':
      transactions = parseSBIStatement(lines);
      break;
    case 'axis':
      transactions = parseAxisStatement(lines);
      break;
    case 'kotak':
      transactions = parseKotakStatement(lines);
      break;
    case 'yesbank':
      transactions = parseYesBankStatement(lines);
      break;
    case 'pnb':
      transactions = parsePNBStatement(lines);
      break;
    case 'bob':
      transactions = parseBOBStatement(lines);
      break;
    case 'canara':
      transactions = parseCanaraStatement(lines);
      break;
    case 'idfc':
      transactions = parseIDFCStatement(lines);
      break;
    case 'indusind':
      transactions = parseIndusIndStatement(lines);
      break;
    default:
      transactions = parseGenericStatement(lines);
  }
  
  // If bank-specific parser returns few results, try generic as fallback
  if (transactions.length < 3) {
    const genericTransactions = parseGenericStatement(lines);
    if (genericTransactions.length > transactions.length) {
      transactions = genericTransactions;
    }
  }
  
  return transactions;
}

// HDFC Bank PDF Parser
function parseHDFCStatement(lines: string[]): Array<{
  date: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
}> {
  const transactions: Array<{
    date: string;
    description: string;
    amount: number;
    type: 'income' | 'expense';
  }> = [];

  // HDFC format: Date | Narration | Chq./Ref.No. | Value Dt | Withdrawal Amt. | Deposit Amt. | Closing Balance
  // Look for date patterns at start of lines
  const datePattern = /^(\d{2}\/\d{2}\/\d{2,4})/;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(datePattern);
    
    if (match) {
      const date = match[1];
      // Extract amounts - look for number patterns
      const amounts = line.match(/[\d,]+\.\d{2}/g) || [];
      
      if (amounts.length >= 2) {
        // Usually: withdrawal, deposit, balance
        const withdrawal = parseAmount(amounts[amounts.length - 3] || '0');
        const deposit = parseAmount(amounts[amounts.length - 2] || '0');
        
        // Extract description (text between date and first amount)
        const firstAmountIndex = line.indexOf(amounts[0] || "");
        const description = line.substring(match[0].length, firstAmountIndex).trim();
        
        if (withdrawal > 0) {
          transactions.push({
            date,
            description: description || 'HDFC Transaction',
            amount: withdrawal,
            type: 'expense',
          });
        } else if (deposit > 0) {
          transactions.push({
            date,
            description: description || 'HDFC Transaction',
            amount: deposit,
            type: 'income',
          });
        }
      }
    }
  }

  return transactions;
}

// ICICI Bank PDF Parser
function parseICICIStatement(lines: string[]): Array<{
  date: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
}> {
  const transactions: Array<{
    date: string;
    description: string;
    amount: number;
    type: 'income' | 'expense';
  }> = [];

  const datePattern = /^(\d{2}-\d{2}-\d{4}|\d{2}\/\d{2}\/\d{4})/;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(datePattern);
    
    if (match) {
      const date = match[1];
      const amounts = line.match(/[\d,]+\.\d{2}/g) || [];
      
      if (amounts.length >= 1) {
        // Find CR or DR indicator
        const isCR = line.toUpperCase().includes(' CR') || line.toUpperCase().includes('CR.');
        const isDR = line.toUpperCase().includes(' DR') || line.toUpperCase().includes('DR.');
        
        const amount = parseAmount(amounts[0] || "0");
        
        // Extract description
        const firstAmountIndex = line.indexOf(amounts[0] || "");
        let description = line.substring(match[0].length, firstAmountIndex).trim();
        description = description.replace(/\s*(CR|DR)\.?\s*/gi, '').trim();
        
        if (amount > 0) {
          transactions.push({
            date,
            description: description || 'ICICI Transaction',
            amount,
            type: isCR ? 'income' : (isDR ? 'expense' : 'expense'),
          });
        }
      }
    }
  }

  return transactions;
}

// SBI Bank PDF Parser
function parseSBIStatement(lines: string[]): Array<{
  date: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
}> {
  const transactions: Array<{
    date: string;
    description: string;
    amount: number;
    type: 'income' | 'expense';
  }> = [];

  // SBI format varies, try multiple patterns
  const datePattern = /^(\d{2}\s+[A-Za-z]{3}\s+\d{4}|\d{2}\/\d{2}\/\d{4})/;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(datePattern);
    
    if (match) {
      const date = match[1];
      const amounts = line.match(/[\d,]+\.\d{2}/g) || [];
      
      if (amounts.length >= 2) {
        const debit = parseAmount(amounts[amounts.length - 3] || '0');
        const credit = parseAmount(amounts[amounts.length - 2] || '0');
        
        const firstAmountIndex = line.indexOf(amounts[0] || "");
        const description = line.substring(match[0].length, firstAmountIndex).trim();
        
        if (debit > 0) {
          transactions.push({
            date,
            description: description || 'SBI Transaction',
            amount: debit,
            type: 'expense',
          });
        } else if (credit > 0) {
          transactions.push({
            date,
            description: description || 'SBI Transaction',
            amount: credit,
            type: 'income',
          });
        }
      }
    }
  }

  return transactions;
}

// Axis Bank PDF Parser
function parseAxisStatement(lines: string[]): Array<{
  date: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
}> {
  const transactions: Array<{
    date: string;
    description: string;
    amount: number;
    type: 'income' | 'expense';
  }> = [];

  const datePattern = /^(\d{2}-\d{2}-\d{4}|\d{2}\/\d{2}\/\d{4})/;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(datePattern);
    
    if (match) {
      const date = match[1];
      const amounts = line.match(/[\d,]+\.\d{2}/g) || [];
      
      if (amounts.length >= 2) {
        const debit = parseAmount(amounts[amounts.length - 3] || '0');
        const credit = parseAmount(amounts[amounts.length - 2] || '0');
        
        const firstAmountIndex = line.indexOf(amounts[0] || "");
        const description = line.substring(match[0].length, firstAmountIndex).trim();
        
        if (debit > 0) {
          transactions.push({
            date,
            description: description || 'Axis Bank Transaction',
            amount: debit,
            type: 'expense',
          });
        } else if (credit > 0) {
          transactions.push({
            date,
            description: description || 'Axis Bank Transaction',
            amount: credit,
            type: 'income',
          });
        }
      }
    }
  }

  return transactions;
}

// Kotak Bank PDF Parser
function parseKotakStatement(lines: string[]): Array<{
  date: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
}> {
  const transactions: Array<{
    date: string;
    description: string;
    amount: number;
    type: 'income' | 'expense';
  }> = [];

  const datePattern = /^(\d{2}-\d{2}-\d{4}|\d{2}\/\d{2}\/\d{4}|\d{2}-[A-Za-z]{3}-\d{4})/;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(datePattern);
    
    if (match) {
      const date = match[1];
      const amounts = line.match(/[\d,]+\.\d{2}/g) || [];
      
      if (amounts.length >= 1) {
        // Kotak often shows DR/CR suffix
        const isDR = line.includes('(DR)') || line.includes(' DR ');
        const isCR = line.includes('(CR)') || line.includes(' CR ');
        
        const amount = parseAmount(amounts[0] || "0");
        const firstAmountIndex = line.indexOf(amounts[0] || "");
        let description = line.substring(match[0].length, firstAmountIndex).trim();
        description = description.replace(/\s*\(?(DR|CR)\)?\s*/gi, '').trim();
        
        if (amount > 0) {
          transactions.push({
            date,
            description: description || 'Kotak Transaction',
            amount,
            type: isDR ? 'expense' : (isCR ? 'income' : 'expense'),
          });
        }
      }
    }
  }

  return transactions;
}

// Yes Bank PDF Parser
function parseYesBankStatement(lines: string[]): Array<{
  date: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
}> {
  const transactions: Array<{
    date: string;
    description: string;
    amount: number;
    type: 'income' | 'expense';
  }> = [];

  const datePattern = /^(\d{2}\/\d{2}\/\d{4}|\d{2}-\d{2}-\d{4})/;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(datePattern);
    
    if (match) {
      const date = match[1];
      const amounts = line.match(/[\d,]+\.\d{2}/g) || [];
      
      if (amounts.length >= 1) {
        const lineLower = line.toLowerCase();
        const isCR = lineLower.includes(' cr') || lineLower.includes('credit') || lineLower.includes('deposit');
        
        let amount = 0;
        let type: 'income' | 'expense' = 'expense';
        
        if (amounts.length >= 3) {
          const debit = parseAmount(amounts[0] || '0');
          const credit = parseAmount(amounts[1] || '0');
          amount = credit > 0 ? credit : debit;
          type = credit > 0 ? 'income' : 'expense';
        } else {
          amount = parseAmount(amounts[0] || '0');
          type = isCR ? 'income' : 'expense';
        }
        
        const firstAmountIndex = line.indexOf(amounts[0] || "");
        const description = line.substring(match[0].length, firstAmountIndex).trim();
        
        if (amount > 0) {
          transactions.push({
            date,
            description: description || 'Yes Bank Transaction',
            amount,
            type,
          });
        }
      }
    }
  }

  return transactions;
}

// PNB Bank PDF Parser
function parsePNBStatement(lines: string[]): Array<{
  date: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
}> {
  const transactions: Array<{
    date: string;
    description: string;
    amount: number;
    type: 'income' | 'expense';
  }> = [];

  const datePattern = /^(\d{2}[-\/]\d{2}[-\/]\d{4})/;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(datePattern);
    
    if (match) {
      const date = match[1].replace(/-/g, '/');
      const amounts = line.match(/[\d,]+\.\d{2}/g) || [];
      
      if (amounts.length >= 1) {
        const lineLower = line.toLowerCase();
        const isCR = lineLower.includes(' cr') || lineLower.includes('credit');
        
        let amount = 0;
        let type: 'income' | 'expense' = 'expense';
        
        if (amounts.length >= 3) {
          const debit = parseAmount(amounts[amounts.length - 3] || '0');
          const credit = parseAmount(amounts[amounts.length - 2] || '0');
          amount = credit > 0 ? credit : debit;
          type = credit > 0 ? 'income' : 'expense';
        } else {
          amount = parseAmount(amounts[0] || '0');
          type = isCR ? 'income' : 'expense';
        }
        
        const firstAmountIndex = line.indexOf(amounts[0] || "");
        const description = line.substring(match[0].length, firstAmountIndex).trim();
        
        if (amount > 0) {
          transactions.push({
            date,
            description: description || 'PNB Transaction',
            amount,
            type,
          });
        }
      }
    }
  }

  return transactions;
}

// Bank of Baroda PDF Parser
function parseBOBStatement(lines: string[]): Array<{
  date: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
}> {
  const transactions: Array<{
    date: string;
    description: string;
    amount: number;
    type: 'income' | 'expense';
  }> = [];

  const datePattern = /^(\d{2}-[A-Za-z]{3}-\d{4}|\d{2}\/\d{2}\/\d{4})/;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(datePattern);
    
    if (match) {
      const date = match[1];
      const amounts = line.match(/[\d,]+\.\d{2}/g) || [];
      
      if (amounts.length >= 1) {
        const lineLower = line.toLowerCase();
        const isCR = lineLower.includes(' cr') || lineLower.includes('credit');
        
        let amount = 0;
        let type: 'income' | 'expense' = 'expense';
        
        if (amounts.length >= 3) {
          const debit = parseAmount(amounts[0] || '0');
          const credit = parseAmount(amounts[1] || '0');
          amount = credit > 0 ? credit : debit;
          type = credit > 0 ? 'income' : 'expense';
        } else {
          amount = parseAmount(amounts[0] || '0');
          type = isCR ? 'income' : 'expense';
        }
        
        const firstAmountIndex = line.indexOf(amounts[0] || "");
        const description = line.substring(match[0].length, firstAmountIndex).trim();
        
        if (amount > 0) {
          transactions.push({
            date,
            description: description || 'Bank of Baroda Transaction',
            amount,
            type,
          });
        }
      }
    }
  }

  return transactions;
}

// Canara Bank PDF Parser
function parseCanaraStatement(lines: string[]): Array<{
  date: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
}> {
  const transactions: Array<{
    date: string;
    description: string;
    amount: number;
    type: 'income' | 'expense';
  }> = [];

  const datePattern = /^(\d{2}[-\/]\d{2}[-\/]\d{4})/;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(datePattern);
    
    if (match) {
      const date = match[1].replace(/-/g, '/');
      const amounts = line.match(/[\d,]+\.\d{2}/g) || [];
      
      if (amounts.length >= 1) {
        const lineLower = line.toLowerCase();
        const isCR = lineLower.includes(' cr') || lineLower.includes('credit');
        
        let amount = 0;
        let type: 'income' | 'expense' = 'expense';
        
        if (amounts.length >= 3) {
          const debit = parseAmount(amounts[0] || '0');
          const credit = parseAmount(amounts[1] || '0');
          amount = credit > 0 ? credit : debit;
          type = credit > 0 ? 'income' : 'expense';
        } else {
          amount = parseAmount(amounts[0] || '0');
          type = isCR ? 'income' : 'expense';
        }
        
        const firstAmountIndex = line.indexOf(amounts[0] || "");
        const description = line.substring(match[0].length, firstAmountIndex).trim();
        
        if (amount > 0) {
          transactions.push({
            date,
            description: description || 'Canara Bank Transaction',
            amount,
            type,
          });
        }
      }
    }
  }

  return transactions;
}

// IDFC First Bank PDF Parser
function parseIDFCStatement(lines: string[]): Array<{
  date: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
}> {
  const transactions: Array<{
    date: string;
    description: string;
    amount: number;
    type: 'income' | 'expense';
  }> = [];

  const datePattern = /^(\d{2}-[A-Za-z]{3}-\d{4}|\d{2}\/\d{2}\/\d{4})/;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(datePattern);
    
    if (match) {
      const date = match[1];
      const amounts = line.match(/[\d,]+\.\d{2}/g) || [];
      
      if (amounts.length >= 1) {
        const lineLower = line.toLowerCase();
        const isCR = lineLower.includes(' cr') || lineLower.includes('credit');
        
        let amount = 0;
        let type: 'income' | 'expense' = 'expense';
        
        if (amounts.length >= 3) {
          const debit = parseAmount(amounts[0] || '0');
          const credit = parseAmount(amounts[1] || '0');
          amount = credit > 0 ? credit : debit;
          type = credit > 0 ? 'income' : 'expense';
        } else {
          amount = parseAmount(amounts[0] || '0');
          type = isCR ? 'income' : 'expense';
        }
        
        const firstAmountIndex = line.indexOf(amounts[0] || "");
        const description = line.substring(match[0].length, firstAmountIndex).trim();
        
        if (amount > 0) {
          transactions.push({
            date,
            description: description || 'IDFC First Transaction',
            amount,
            type,
          });
        }
      }
    }
  }

  return transactions;
}

// IndusInd Bank PDF Parser
function parseIndusIndStatement(lines: string[]): Array<{
  date: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
}> {
  const transactions: Array<{
    date: string;
    description: string;
    amount: number;
    type: 'income' | 'expense';
  }> = [];

  const datePattern = /^(\d{2}\/\d{2}\/\d{4}|\d{2}-\d{2}-\d{4})/;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(datePattern);
    
    if (match) {
      const date = match[1];
      const amounts = line.match(/[\d,]+\.\d{2}/g) || [];
      
      if (amounts.length >= 1) {
        const lineLower = line.toLowerCase();
        const isCR = lineLower.includes(' cr') || lineLower.includes('credit');
        
        let amount = 0;
        let type: 'income' | 'expense' = 'expense';
        
        if (amounts.length >= 3) {
          const debit = parseAmount(amounts[0] || '0');
          const credit = parseAmount(amounts[1] || '0');
          amount = credit > 0 ? credit : debit;
          type = credit > 0 ? 'income' : 'expense';
        } else {
          amount = parseAmount(amounts[0] || '0');
          type = isCR ? 'income' : 'expense';
        }
        
        const firstAmountIndex = line.indexOf(amounts[0] || "");
        const description = line.substring(match[0].length, firstAmountIndex).trim();
        
        if (amount > 0) {
          transactions.push({
            date,
            description: description || 'IndusInd Transaction',
            amount,
            type,
          });
        }
      }
    }
  }

  return transactions;
}

// Generic PDF Parser - tries multiple patterns
function parseGenericStatement(lines: string[]): Array<{
  date: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
}> {
  const transactions: Array<{
    date: string;
    description: string;
    amount: number;
    type: 'income' | 'expense';
  }> = [];

  // Multiple date patterns to try
  const datePatterns = [
    /^(\d{2}\/\d{2}\/\d{2,4})/,      // DD/MM/YYYY or DD/MM/YY
    /^(\d{2}-\d{2}-\d{4})/,           // DD-MM-YYYY
    /^(\d{2}\s+[A-Za-z]{3}\s+\d{4})/, // DD MMM YYYY
    /^(\d{2}-[A-Za-z]{3}-\d{4})/,     // DD-MMM-YYYY
    /^(\d{4}-\d{2}-\d{2})/,           // YYYY-MM-DD
  ];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
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
    
    if (date) {
      const amounts = line.match(/[\d,]+\.\d{2}/g) || [];
      
      if (amounts.length >= 1) {
        // Determine transaction type from context
        const lineLower = line.toLowerCase();
        const isCR = lineLower.includes(' cr') || lineLower.includes('credit') || lineLower.includes('deposit') || lineLower.includes('received');
        const isDR = lineLower.includes(' dr') || lineLower.includes('debit') || lineLower.includes('withdraw') || lineLower.includes('payment') || lineLower.includes('transfer to');
        
        // If we have 2+ amounts, typically last two are debit and credit (or vice versa)
        // The last amount is usually the balance
        let amount = 0;
        let type: 'income' | 'expense' = 'expense';
        
        if (amounts.length >= 3) {
          // Assume format: description | debit | credit | balance
          const debit = parseAmount(amounts[amounts.length - 3]);
          const credit = parseAmount(amounts[amounts.length - 2]);
          
          if (debit > 0 && credit === 0) {
            amount = debit;
            type = 'expense';
          } else if (credit > 0 && debit === 0) {
            amount = credit;
            type = 'income';
          } else if (debit > 0) {
            amount = debit;
            type = 'expense';
          } else if (credit > 0) {
            amount = credit;
            type = 'income';
          }
        } else if (amounts.length >= 1) {
          amount = parseAmount(amounts[0] || "0");
          type = isCR ? 'income' : (isDR ? 'expense' : 'expense');
        }
        
        // Extract description
        const firstAmountIndex = line.indexOf(amounts[0] || "");
        let description = line.substring(matchEnd, firstAmountIndex).trim();
        description = description.replace(/\s*(CR|DR|Cr|Dr)\.?\s*/g, '').trim();
        
        // Skip if no meaningful amount
        if (amount > 0 && amount < 100000000) { // Sanity check for reasonable amounts
          transactions.push({
            date,
            description: description || 'Bank Transaction',
            amount,
            type,
          });
        }
      }
    }
  }

  return transactions;
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const bankFormat = formData.get('bankFormat') as string || 'generic';
    const accountId = formData.get('accountId') as string;
    const accountType = formData.get('accountType') as string || 'bank';
    const skipDuplicates = formData.get('skipDuplicates') === 'true';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file size (max 10MB)
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10MB.' },
        { status: 400 }
      );
    }

    // Check file type
    const isPDF = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    
    if (!isPDF) {
      return NextResponse.json({ error: 'Please upload a PDF file' }, { status: 400 });
    }

    // Parse PDF
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    let pdfText: string;
    try {
      pdfText = await parsePDFBuffer(buffer);
    } catch (pdfError) {
      console.error('PDF parsing error:', pdfError);
      return NextResponse.json({ error: 'Failed to parse PDF. Please ensure it is a valid bank statement PDF.' }, { status: 400 });
    }

    if (!pdfText || pdfText.trim().length === 0) {
      return NextResponse.json({ error: 'Could not extract text from PDF. It may be scanned or image-based.' }, { status: 400 });
    }

    // Parse transactions from PDF text
    const parsedTransactions = parsePDFTransactions(pdfText, bankFormat);

    if (parsedTransactions.length === 0) {
      return NextResponse.json({ 
        error: 'No transactions found in the PDF. Please check if this is a valid bank statement.',
        hint: 'Try selecting a specific bank format if you haven\'t already.',
      }, { status: 400 });
    }

    await connectToDatabase();

    // Get user's categories for auto-categorization
    const categories = await Category.find({ userId: session.user.id }).lean();
    const categoryKeywords: Record<string, string> = {};
    categories.forEach((cat) => {
      const keywords = cat.name.toLowerCase().split(/\s+/);
      keywords.forEach((kw: string) => {
        if (kw.length > 3) {
          categoryKeywords[kw] = cat._id.toString();
        }
      });
    });

    const result: ImportResult = {
      success: true,
      imported: 0,
      skipped: 0,
      errors: [],
      transactions: [],
    };

    for (const txn of parsedTransactions) {
      // Parse date
      const parsedDate = parseDate(txn.date);
      if (!parsedDate) {
        result.skipped++;
        result.transactions.push({
          date: txn.date,
          description: txn.description,
          amount: txn.amount,
          type: txn.type,
          status: 'skipped',
          reason: 'Invalid date format',
        });
        continue;
      }

      // Check for duplicates
      if (skipDuplicates) {
        const startOfDay = new Date(parsedDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(parsedDate);
        endOfDay.setHours(23, 59, 59, 999);

        const existingTxn = await Transaction.findOne({
          userId: session.user.id,
          amount: txn.amount,
          type: txn.type,
          dateTime: {
            $gte: startOfDay,
            $lte: endOfDay,
          },
        });

        if (existingTxn) {
          result.skipped++;
          result.transactions.push({
            date: txn.date,
            description: txn.description,
            amount: txn.amount,
            type: txn.type,
            status: 'skipped',
            reason: 'Potential duplicate',
          });
          continue;
        }
      }

      // Auto-categorize based on description
      let categoryId = null;
      const descLower = txn.description.toLowerCase();
      for (const [keyword, catId] of Object.entries(categoryKeywords)) {
        if (descLower.includes(keyword)) {
          categoryId = catId;
          break;
        }
      }

      // Create transaction using service layer (handles balance updates atomically)
      try {
        await createTransaction({
          userId: session.user.id,
          type: txn.type as Parameters<typeof createTransaction>[0]['type'],
          amount: txn.amount,
          dateTime: parsedDate,
          note: txn.description,
          categoryId: categoryId || undefined,
          sourceType: accountType as Parameters<typeof createTransaction>[0]['sourceType'],
          ...(accountType === 'bank' && accountId ? { sourceBankId: accountId } : {}),
          ...(accountType === 'card' && accountId ? { sourceCardId: accountId } : {}),
        });

        result.imported++;
        result.transactions.push({
          date: txn.date,
          description: txn.description,
          amount: txn.amount,
          type: txn.type,
          status: 'imported',
        });
      } catch {
        result.errors.push(`Failed to import: ${txn.description}`);
        result.transactions.push({
          date: txn.date,
          description: txn.description,
          amount: txn.amount,
          type: txn.type,
          status: 'error',
          reason: 'Database error',
        });
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error importing transactions:', error);
    return NextResponse.json(
      { error: 'Failed to import transactions' },
      { status: 500 }
    );
  }
}

// GET - Return supported bank formats
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  return NextResponse.json({
    formats: [
      { id: 'generic', name: 'Auto Detect', description: 'Automatically detect bank statement format' },
      { id: 'hdfc', name: 'HDFC Bank', description: 'HDFC Bank PDF statement' },
      { id: 'icici', name: 'ICICI Bank', description: 'ICICI Bank PDF statement' },
      { id: 'sbi', name: 'SBI', description: 'State Bank of India PDF statement' },
      { id: 'axis', name: 'Axis Bank', description: 'Axis Bank PDF statement' },
      { id: 'kotak', name: 'Kotak Mahindra', description: 'Kotak Mahindra Bank PDF statement' },
    ],
  });
}
