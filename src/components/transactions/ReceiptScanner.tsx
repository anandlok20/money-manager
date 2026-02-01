'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils/currency';
import { TransactionType } from '@/types';
import {
  Camera,
  Upload,
  Image as ImageIcon,
  Receipt,
  Loader2,
  Check,
  X,
  Edit2,
  RefreshCw,
  ShoppingBag,
} from 'lucide-react';

interface ExtractedReceiptData {
  merchantName: string | null;
  date: string | null;
  totalAmount: number | null;
  subtotal: number | null;
  tax: number | null;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  paymentMethod: string | null;
  suggestedCategory: string | null;
  confidence: number;
  rawText: string;
}

interface BankAccount {
  _id: string;
  bankName: string;
  accountNumber: string;
}

interface Card {
  _id: string;
  cardName: string;
  lastFourDigits: string;
}

interface Category {
  _id: string;
  name: string;
  type: string;
}

interface Props {
  bankAccounts: BankAccount[];
  cards: Card[];
  categories: Category[];
}

export default function ReceiptScanner({ bankAccounts, cards, categories }: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [mode, setMode] = useState<'upload' | 'camera' | 'manual'>('upload');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);

  const [extractedData, setExtractedData] = useState<ExtractedReceiptData | null>(null);
  const [manualText, setManualText] = useState('');

  // Editable form fields
  const [merchantName, setMerchantName] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [paymentType, setPaymentType] = useState<'BANK' | 'CARD'>('CARD');
  const [paymentAccountId, setPaymentAccountId] = useState('');

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraActive(true);
      }
    } catch {
      toast.error('Could not access camera');
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0);
      const dataUrl = canvas.toDataURL('image/jpeg');
      setImagePreview(dataUrl);
      stopCamera();
    }
  };

  const scanReceipt = async () => {
    if (!imagePreview && !manualText) {
      toast.error('Please provide an image or text');
      return;
    }

    setIsScanning(true);
    try {
      const body: Record<string, string> = {};
      
      if (manualText) {
        body.manualText = manualText;
      } else if (imagePreview) {
        body.image = imagePreview;
      }

      const response = await fetch('/api/transactions/scan-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to scan receipt');
      }

      const data = result.data as ExtractedReceiptData;
      setExtractedData(data);

      // Populate form fields
      setMerchantName(data.merchantName || '');
      setAmount(data.totalAmount?.toString() || '');
      if (data.date) {
        setDate(new Date(data.date).toISOString().split('T')[0]);
      }
      setNote(data.items.map((i) => `${i.name} x${i.quantity}`).join(', '));

      // Set category
      if (data.suggestedCategory) {
        const matchedCategory = categories.find(
          (c) => c.name.toLowerCase() === data.suggestedCategory?.toLowerCase()
        );
        if (matchedCategory) {
          setCategoryId(matchedCategory._id);
        }
      }

      toast.success('Receipt scanned successfully');
    } catch (error) {
      console.error('Scan error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to scan receipt');
    } finally {
      setIsScanning(false);
    }
  };

  const handleCreateTransaction = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    if (!paymentAccountId) {
      toast.error('Please select a payment account');
      return;
    }

    setIsSubmitting(true);
    try {
      const transaction: Record<string, unknown> = {
        type: TransactionType.EXPENSE,
        amount: parseFloat(amount),
        dateTime: new Date(date).toISOString(),
        note: note || merchantName || 'Receipt expense',
        categoryId: categoryId || undefined,
        sourceType: paymentType,
        tags: ['receipt'],
      };

      if (paymentType === 'BANK') {
        transaction.sourceBankId = paymentAccountId;
      } else {
        transaction.sourceCardId = paymentAccountId;
      }

      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transaction),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to create transaction');
      }

      toast.success('Transaction created successfully');
      router.push('/transactions');
      router.refresh();
    } catch (error) {
      console.error('Create error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create transaction');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setImagePreview(null);
    setExtractedData(null);
    setManualText('');
    setMerchantName('');
    setAmount('');
    setDate(new Date().toISOString().split('T')[0]);
    setNote('');
    setCategoryId('');
    setPaymentAccountId('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Mode Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Scan Receipt
          </CardTitle>
          <CardDescription>
            Upload a receipt image, take a photo, or paste receipt text to automatically extract transaction details
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-6">
            <Button
              variant={mode === 'upload' ? 'default' : 'outline'}
              onClick={() => {
                setMode('upload');
                stopCamera();
              }}
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload Image
            </Button>
            <Button
              variant={mode === 'camera' ? 'default' : 'outline'}
              onClick={() => {
                setMode('camera');
                startCamera();
              }}
            >
              <Camera className="h-4 w-4 mr-2" />
              Take Photo
            </Button>
            <Button
              variant={mode === 'manual' ? 'default' : 'outline'}
              onClick={() => {
                setMode('manual');
                stopCamera();
              }}
            >
              <Edit2 className="h-4 w-4 mr-2" />
              Paste Text
            </Button>
          </div>

          {/* Upload Mode */}
          {mode === 'upload' && (
            <div className="space-y-4">
              <div
                className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-muted-foreground/50 transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                {imagePreview ? (
                  <div className="relative inline-block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imagePreview}
                      alt="Receipt preview"
                      className="max-h-[300px] rounded-lg"
                    />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        setImagePreview(null);
                        if (fileInputRef.current) {
                          fileInputRef.current.value = '';
                        }
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground" />
                    <p className="text-muted-foreground">
                      Click or drag to upload receipt image
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Supports JPG, PNG, HEIC
                    </p>
                  </div>
                )}
              </div>
              <Input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          )}

          {/* Camera Mode */}
          {mode === 'camera' && (
            <div className="space-y-4">
              {isCameraActive ? (
                <div className="relative">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full max-h-[400px] rounded-lg bg-black"
                  />
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                    <Button onClick={capturePhoto}>
                      <Camera className="h-4 w-4 mr-2" />
                      Capture
                    </Button>
                    <Button variant="outline" onClick={stopCamera}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : imagePreview ? (
                <div className="relative inline-block mx-auto">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imagePreview}
                    alt="Captured receipt"
                    className="max-h-[300px] rounded-lg"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => {
                      setImagePreview(null);
                      startCamera();
                    }}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Retake
                  </Button>
                </div>
              ) : (
                <div className="text-center p-8 border-2 border-dashed rounded-lg">
                  <Camera className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">Camera not started</p>
                  <Button className="mt-4" onClick={startCamera}>
                    Start Camera
                  </Button>
                </div>
              )}
              <canvas ref={canvasRef} className="hidden" />
            </div>
          )}

          {/* Manual Text Mode */}
          {mode === 'manual' && (
            <div className="space-y-2">
              <Label>Paste Receipt Text</Label>
              <Textarea
                placeholder="Paste the receipt text here...&#10;&#10;Example:&#10;Starbucks Coffee&#10;Date: 2024-01-15&#10;Latte Grande - ₹350&#10;Muffin - ₹180&#10;Total: ₹530"
                value={manualText}
                onChange={(e) => setManualText(e.target.value)}
                className="min-h-[200px] font-mono text-sm"
              />
            </div>
          )}

          {/* Scan Button */}
          {(imagePreview || manualText) && !extractedData && (
            <div className="flex justify-center mt-4">
              <Button onClick={scanReceipt} disabled={isScanning} size="lg">
                {isScanning ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Scanning...
                  </>
                ) : (
                  <>
                    <Receipt className="h-4 w-4 mr-2" />
                    Scan Receipt
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Extracted Data & Form */}
      {extractedData && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingBag className="h-5 w-5" />
                  Extracted Details
                </CardTitle>
                <CardDescription>
                  Review and edit the extracted information before creating the transaction
                </CardDescription>
              </div>
              <Badge variant={extractedData.confidence >= 0.7 ? 'default' : 'secondary'}>
                {Math.round(extractedData.confidence * 100)}% confidence
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="merchant">Merchant Name</Label>
                <Input
                  id="merchant"
                  value={merchantName}
                  onChange={(e) => setMerchantName(e.target.value)}
                  placeholder="Enter merchant name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories
                      .filter((c) => c.type === 'EXPENSE')
                      .map((category) => (
                        <SelectItem key={category._id} value={category._id}>
                          {category.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="paymentType">Payment Method</Label>
                <Select
                  value={paymentType}
                  onValueChange={(v) => {
                    setPaymentType(v as 'BANK' | 'CARD');
                    setPaymentAccountId('');
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CARD">Card</SelectItem>
                    <SelectItem value="BANK">Bank Account</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="account">
                  {paymentType === 'CARD' ? 'Card' : 'Bank Account'}
                </Label>
                <Select value={paymentAccountId} onValueChange={setPaymentAccountId}>
                  <SelectTrigger>
                    <SelectValue placeholder={`Select ${paymentType === 'CARD' ? 'card' : 'account'}`} />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentType === 'CARD'
                      ? cards.map((card) => (
                          <SelectItem key={card._id} value={card._id}>
                            {card.cardName} (*{card.lastFourDigits})
                          </SelectItem>
                        ))
                      : bankAccounts.map((account) => (
                          <SelectItem key={account._id} value={account._id}>
                            {account.bankName} (*{account.accountNumber.slice(-4)})
                          </SelectItem>
                        ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="note">Note / Items</Label>
              <Textarea
                id="note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Transaction notes..."
                rows={3}
              />
            </div>

            {/* Items breakdown if available */}
            {extractedData.items.length > 0 && (
              <div className="space-y-2">
                <Label>Detected Items</Label>
                <div className="bg-muted p-4 rounded-lg space-y-2">
                  {extractedData.items.map((item, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span>
                        {item.name} {item.quantity > 1 && `×${item.quantity}`}
                      </span>
                      <span className="font-mono">{formatCurrency(item.price)}</span>
                    </div>
                  ))}
                  <div className="border-t pt-2 mt-2 flex justify-between font-medium">
                    <span>Total</span>
                    <span className="font-mono">
                      {formatCurrency(extractedData.totalAmount || 0)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-4">
              <Button variant="outline" onClick={resetForm}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Scan Another
              </Button>
              <Button onClick={handleCreateTransaction} disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Create Transaction
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
