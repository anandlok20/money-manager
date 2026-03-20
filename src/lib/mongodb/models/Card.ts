import mongoose, { Schema, Document, Model } from 'mongoose';
import crypto from 'crypto';

export type CardType = 'CREDIT' | 'DEBIT' | 'PREPAID' | 'FOREX' | 'VIRTUAL';
export type CardNetwork = 'VISA' | 'MASTERCARD' | 'RUPAY' | 'AMEX' | 'DINERS' | 'DISCOVER' | 'OTHER';

// Encrypted format: iv_hex:ciphertext_hex:authTag_hex
const ENCRYPTED_PREFIX_REGEX = /^[0-9a-f]{32}:[0-9a-f]+:[0-9a-f]{32}$/i;

function getEncryptionKey(): Buffer | null {
  const keyHex = process.env.DATA_ENCRYPTION_KEY;
  if (!keyHex || keyHex.length !== 64) return null;
  return Buffer.from(keyHex, 'hex');
}

function encryptField(plaintext: string): string {
  const key = getEncryptionKey();
  if (!key) return plaintext; // Fallback: store plaintext if key not configured (warn in logs)
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${encrypted.toString('hex')}:${authTag.toString('hex')}`;
}

function decryptField(ciphertext: string): string {
  if (!ENCRYPTED_PREFIX_REGEX.test(ciphertext)) return ciphertext; // Legacy plaintext
  const key = getEncryptionKey();
  if (!key) return '[encryption key not configured]';
  const [ivHex, encHex, tagHex] = ciphertext.split(':');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  return Buffer.concat([decipher.update(Buffer.from(encHex, 'hex')), decipher.final()]).toString('utf8');
}

export interface ICard extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  cardName: string;
  cardType: CardType;
  cardNetwork?: CardNetwork;
  cardNumber?: string; // Stored masked (e.g., **** **** **** 1234)
  last4Digits?: string;
  expiryMonth?: number;
  expiryYear?: number;
  cvv?: string; // Stored AES-256-GCM encrypted
  pin?: string; // Stored AES-256-GCM encrypted
  billingCycleDay?: number;
  creditLimit?: number;
  currentBalance: number;
  spendingLimit?: number;
  spendingLimitAlert: boolean;
  linkedBankId?: mongoose.Types.ObjectId;
  linkedMemberId?: mongoose.Types.ObjectId;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  decryptCVV(): string | undefined;
  decryptPIN(): string | undefined;
}

const CardSchema = new Schema<ICard>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    cardName: {
      type: String,
      required: [true, 'Card name is required'],
      trim: true,
    },
    cardType: {
      type: String,
      enum: ['CREDIT', 'DEBIT', 'PREPAID', 'FOREX', 'VIRTUAL'],
      default: 'CREDIT',
    },
    cardNetwork: {
      type: String,
      enum: ['VISA', 'MASTERCARD', 'RUPAY', 'AMEX', 'DINERS', 'DISCOVER', 'OTHER'],
    },
    cardNumber: {
      type: String,
      trim: true,
    },
    last4Digits: {
      type: String,
      trim: true,
      maxlength: 4,
    },
    expiryMonth: {
      type: Number,
      min: 1,
      max: 12,
    },
    expiryYear: {
      type: Number,
    },
    cvv: {
      type: String, // Encrypted storage - requires sensitive data password to view
      trim: true,
    },
    pin: {
      type: String, // Encrypted storage - requires sensitive data password to view
      trim: true,
    },
    billingCycleDay: {
      type: Number,
      min: 1,
      max: 31,
    },
    creditLimit: {
      type: Number,
    },
    currentBalance: {
      type: Number,
      default: 0,
    },
    spendingLimit: {
      type: Number,
      default: 0,
    },
    spendingLimitAlert: {
      type: Boolean,
      default: true,
    },
    linkedBankId: {
      type: Schema.Types.ObjectId,
      ref: 'BankAccount',
    },
    linkedMemberId: {
      type: Schema.Types.ObjectId,
      ref: 'Member',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
CardSchema.index({ userId: 1, isActive: 1 });
CardSchema.index({ userId: 1, cardType: 1 });

// Encrypt CVV and PIN before saving
CardSchema.pre('save', function () {
  if (this.isModified('cvv') && this.cvv && !ENCRYPTED_PREFIX_REGEX.test(this.cvv)) {
    if (!getEncryptionKey()) {
      console.warn('[Card] DATA_ENCRYPTION_KEY not set — CVV stored unencrypted');
    } else {
      this.cvv = encryptField(this.cvv);
    }
  }
  if (this.isModified('pin') && this.pin && !ENCRYPTED_PREFIX_REGEX.test(this.pin)) {
    if (!getEncryptionKey()) {
      console.warn('[Card] DATA_ENCRYPTION_KEY not set — PIN stored unencrypted');
    } else {
      this.pin = encryptField(this.pin);
    }
  }
});

// Instance methods to decrypt sensitive fields
CardSchema.methods.decryptCVV = function (): string | undefined {
  if (!this.cvv) return undefined;
  return decryptField(this.cvv);
};

CardSchema.methods.decryptPIN = function (): string | undefined {
  if (!this.pin) return undefined;
  return decryptField(this.pin);
};

const Card: Model<ICard> = mongoose.models.Card || mongoose.model<ICard>('Card', CardSchema);

export default Card;
