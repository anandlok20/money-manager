import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { connectToDatabase } from '@/lib/mongodb/client';
import Category from '@/lib/mongodb/models/Category';
import { parseReceiptWithAI } from '@/lib/ai/claude-vision';

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

// Note: OCR integration placeholder
// In production, integrate with Google Cloud Vision, AWS Textract, or Azure Computer Vision
// For now, text extraction is handled client-side or via manual input

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

    // If image provided and ANTHROPIC_API_KEY is set, use Claude Vision for OCR
    let aiData = null;
    if (image) {
      try {
        // Extract MIME type from data URL (e.g. "data:image/jpeg;base64,..." → "image/jpeg")
        const mimeMatch = image.match(/^data:(image\/[a-z]+);base64,/);
        const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
        const base64 = mimeMatch ? image.slice(mimeMatch[0].length) : image;
        aiData = await parseReceiptWithAI(base64, mimeType);
      } catch (err) {
        console.warn('Claude Vision OCR failed, falling back to regex parser:', err);
      }
    }

    // Parse the receipt text (regex fallback)
    const receiptData = parseReceiptText(extractedText);
    
    // Match suggested category with user's actual categories
    if (receiptData.suggestedCategory) {
      const categoryId = categoryMap.get(receiptData.suggestedCategory.toLowerCase());
      if (categoryId) {
        receiptData.suggestedCategoryId = categoryId;
      }
    }

    // Merge: AI data takes priority where available, regex fills the gaps
    const result: ExtractedReceiptData = {
      merchantName: aiData?.merchantName || receiptData.merchantName,
      date: aiData?.date || receiptData.date,
      totalAmount: aiData?.totalAmount ?? receiptData.totalAmount,
      subtotal: receiptData.subtotal,
      tax: aiData?.tax ?? receiptData.tax,
      items: (aiData?.items?.length ? aiData.items : receiptData.items),
      suggestedCategory: receiptData.suggestedCategory,
      suggestedCategoryId: receiptData.suggestedCategoryId,
      confidence: aiData ? 0.95 : (receiptData.confidence || 0.5),
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
