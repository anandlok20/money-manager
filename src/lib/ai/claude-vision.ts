import Anthropic from '@anthropic-ai/sdk';

export interface AIReceiptData {
  merchantName?: string;
  date?: string;
  totalAmount?: number;
  tax?: number;
  items?: Array<{ name: string; price?: number }>;
  paymentMethod?: string;
}

/**
 * Parse a receipt image using Claude's vision capability.
 * Returns null if ANTHROPIC_API_KEY is not set.
 */
export async function parseReceiptWithAI(
  base64Image: string,
  mimeType: string
): Promise<AIReceiptData | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const client = new Anthropic({ apiKey });

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
              data: base64Image,
            },
          },
          {
            type: 'text',
            text: 'Extract from this receipt: merchantName (string), date (YYYY-MM-DD format), totalAmount (number), tax (number), items (array of {name, price}), paymentMethod (string). Return ONLY a valid JSON object with these fields. Use null for missing fields.',
          },
        ],
      },
    ],
  });

  const textBlock = message.content.find((b) => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') return null;

  // Strip markdown code fences if present
  const cleaned = textBlock.text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/, '')
    .trim();

  return JSON.parse(cleaned) as AIReceiptData;
}
