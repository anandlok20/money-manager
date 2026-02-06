import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { connectToDatabase } from '@/lib/mongodb/client';
import Category from '@/lib/mongodb/models/Category';
import { TransactionType, CategoryType } from '@/types';

interface ExtractedReceiptData {
  merchantName?: string;
  date?: string;
  totalAmount?: number;
  subtotal?: number;
  tax?: number;
  items?: Array<{
    name: string;
    quantity?: number;
    price?: number;
  }>;
  paymentMethod?: string;
  suggestedCategory?: string;
  suggestedCategoryId?: string;
  confidence: number;
  rawText?: string;
}

// Common merchant patterns and their categories
const MERCHANT_CATEGORIES: Record<string, string[]> = {
  'Food & Dining': [
    'restaurant', 'cafe', 'coffee', 'pizza', 'burger', 'hotel', 'dhaba',
    'swiggy', 'zomato', 'dominos', 'mcdonald', 'kfc', 'subway', 'starbucks',
    'chaayos', 'haldiram', 'barbeque', 'biryani'
  ],
  'Groceries': [
    'grocery', 'supermarket', 'mart', 'bigbasket', 'grofers', 'blinkit',
    'dmart', 'reliance fresh', 'more', 'spencer', 'nature basket'
  ],
  'Shopping': [
    'amazon', 'flipkart', 'myntra', 'ajio', 'mall', 'store', 'shop',
    'retail', 'fashion', 'lifestyle', 'pantaloons', 'westside'
  ],
  'Transportation': [
    'uber', 'ola', 'rapido', 'metro', 'petrol', 'diesel', 'fuel',
    'indian oil', 'hp', 'bharat petroleum', 'toll', 'parking'
  ],
  'Healthcare': [
    'pharmacy', 'medical', 'hospital', 'clinic', 'apollo', 'medplus',
    'netmeds', '1mg', 'pharmeasy', 'diagnostic', 'lab'
  ],
  'Entertainment': [
    'movie', 'cinema', 'pvr', 'inox', 'bookmyshow', 'game', 'arcade'
  ],
};

// Simple text extraction from base64 image
// In production, you'd use OCR services like Google Vision, AWS Textract, or Tesseract
async function extractTextFromImage(base64Image: string): Promise<string> {
  // This is a placeholder - in production, integrate with OCR service
  // For now, we'll return empty and rely on manual input
  // You can integrate with:
  // 1. Google Cloud Vision API
  // 2. AWS Textract
  // 3. Azure Computer Vision
  // 4. Tesseract.js (client-side)
  
  // Example with Google Vision (if API key is available):
  // const response = await fetch('https://vision.googleapis.com/v1/images:annotate?key=YOUR_API_KEY', {
  //   method: 'POST',
  //   body: JSON.stringify({
  //     requests: [{
  //       image: { content: base64Image.replace(/^data:image\/\w+;base64,/, '') },
  //       features: [{ type: 'TEXT_DETECTION' }]
  //     }]
  //   })
  // });
  
  return '';
}

function parseReceiptText(text: string): Partial<ExtractedReceiptData> {
  const result: Partial<ExtractedReceiptData> = {};
  const lines = text.split('\n').map(l => l.trim()).filter(l => l);
  
  // Try to extract total amount (look for patterns like "Total: ₹500", "Grand Total 500.00")
  const totalPatterns = [
    /(?:grand\s*)?total[:\s]*[₹rs.]*\s*([\d,]+\.?\d*)/i,
    /(?:amount|amt)[:\s]*[₹rs.]*\s*([\d,]+\.?\d*)/i,
    /[₹rs.]\s*([\d,]+\.?\d*)\s*(?:only)?$/i,
  ];
  
  for (const pattern of totalPatterns) {
    for (const line of lines) {
      const match = line.match(pattern);
      if (match) {
        result.totalAmount = parseFloat(match[1].replace(/,/g, ''));
        break;
      }
    }
    if (result.totalAmount) break;
  }
  
  // Try to extract date
  const datePatterns = [
    /(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/,
    /(\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{2,4})/i,
  ];
  
  for (const pattern of datePatterns) {
    for (const line of lines) {
      const match = line.match(pattern);
      if (match) {
        result.date = match[1];
        break;
      }
    }
    if (result.date) break;
  }
  
  // Try to extract merchant name (usually first non-empty line or after store name patterns)
  if (lines.length > 0) {
    // Skip common receipt headers
    const skipPatterns = ['tax invoice', 'receipt', 'bill', 'gstin'];
    for (const line of lines.slice(0, 5)) {
      const lowerLine = line.toLowerCase();
      if (!skipPatterns.some(p => lowerLine.includes(p)) && line.length > 2 && line.length < 50) {
        result.merchantName = line;
        break;
      }
    }
  }
  
  // Extract items (lines with price patterns)
  const items: Array<{ name: string; quantity?: number; price?: number }> = [];
  const itemPattern = /(.+?)\s+(\d+)?\s*[x×]?\s*[₹rs.]*\s*([\d,]+\.?\d*)\s*$/i;
  
  for (const line of lines) {
    const match = line.match(itemPattern);
    if (match && match[3]) {
      const price = parseFloat(match[3].replace(/,/g, ''));
      if (price > 0 && price < (result.totalAmount || Infinity)) {
        items.push({
          name: match[1].trim(),
          quantity: match[2] ? parseInt(match[2]) : 1,
          price,
        });
      }
    }
  }
  result.items = items;
  
  // Try to identify category from merchant name
  if (result.merchantName) {
    const merchantLower = result.merchantName.toLowerCase();
    for (const [category, keywords] of Object.entries(MERCHANT_CATEGORIES)) {
      if (keywords.some(k => merchantLower.includes(k))) {
        result.suggestedCategory = category;
        break;
      }
    }
  }
  
  // Also check in full text
  if (!result.suggestedCategory) {
    const fullTextLower = text.toLowerCase();
    for (const [category, keywords] of Object.entries(MERCHANT_CATEGORIES)) {
      if (keywords.some(k => fullTextLower.includes(k))) {
        result.suggestedCategory = category;
        break;
      }
    }
  }
  
  result.rawText = text;
  result.confidence = result.totalAmount ? 0.7 : 0.3;
  
  return result;
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

    const body = await request.json();
    const { image, manualText } = body;
    
    if (!image && !manualText) {
      return NextResponse.json(
        { success: false, error: 'No image or text provided' },
        { status: 400 }
      );
    }

    // Validate base64 image size (max 5MB decoded)
    if (image) {
      const base64Length = image.length;
      // Base64 encodes 3 bytes into 4 chars, so decoded size ≈ base64Length * 3/4
      const estimatedBytes = Math.ceil(base64Length * 3 / 4);
      const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
      if (estimatedBytes > MAX_IMAGE_SIZE) {
        return NextResponse.json(
          { success: false, error: 'Image too large. Maximum size is 5MB.' },
          { status: 400 }
        );
      }
    }

    // Validate manual text length
    if (manualText && manualText.length > 50000) {
      return NextResponse.json(
        { success: false, error: 'Text too long. Maximum 50,000 characters.' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Get user's categories for matching
    const categories = await Category.find({ userId: session.user.id }).lean();
    const categoryMap = new Map(categories.map(c => [c.name.toLowerCase(), c._id.toString()]));

    let extractedText = manualText || '';
    
    // If image provided, try to extract text (OCR)
    if (image && !manualText) {
      extractedText = await extractTextFromImage(image);
    }

    // Parse the receipt text
    const receiptData = parseReceiptText(extractedText);
    
    // Match suggested category with user's actual categories
    if (receiptData.suggestedCategory) {
      const categoryId = categoryMap.get(receiptData.suggestedCategory.toLowerCase());
      if (categoryId) {
        receiptData.suggestedCategoryId = categoryId;
      }
    }

    const result: ExtractedReceiptData = {
      merchantName: receiptData.merchantName,
      date: receiptData.date,
      totalAmount: receiptData.totalAmount,
      subtotal: receiptData.subtotal,
      tax: receiptData.tax,
      items: receiptData.items,
      suggestedCategory: receiptData.suggestedCategory,
      suggestedCategoryId: receiptData.suggestedCategoryId,
      confidence: receiptData.confidence || 0.5,
      rawText: receiptData.rawText,
    };

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error scanning receipt:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to scan receipt' },
      { status: 500 }
    );
  }
}
