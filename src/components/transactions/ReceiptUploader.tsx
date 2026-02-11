'use client';

import { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Upload, X, FileText, Image, Loader2, Download, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ReceiptUploaderProps {
  transactionId: string;
  receiptUrl?: string;
  receiptFileName?: string;
  onUpdate?: () => void;
}

export function ReceiptUploader({
  transactionId,
  receiptUrl,
  receiptFileName,
  onUpdate,
}: ReceiptUploaderProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      return new Promise<{ success: boolean }>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async () => {
          try {
            const response = await fetch(`/api/transactions/${transactionId}/receipt`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                file: reader.result,
                fileName: file.name,
                fileType: file.type,
              }),
            });
            if (!response.ok) {
              const error = await response.json();
              throw new Error(error.error || 'Upload failed');
            }
            resolve({ success: true });
          } catch (error) {
            reject(error);
          }
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
      });
    },
    onSuccess: () => {
      toast.success('Receipt uploaded successfully');
      queryClient.invalidateQueries({ queryKey: ['transaction', transactionId] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      onUpdate?.();
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to upload receipt');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/transactions/${transactionId}/receipt`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete receipt');
      return response.json();
    },
    onSuccess: () => {
      toast.success('Receipt removed');
      queryClient.invalidateQueries({ queryKey: ['transaction', transactionId] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      onUpdate?.();
    },
    onError: () => {
      toast.error('Failed to remove receipt');
    },
  });

  const handleFileSelect = (file: File) => {
    const maxSize = 5 * 1024 * 1024; // 5MB
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];

    if (!allowedTypes.includes(file.type)) {
      toast.error('Invalid file type. Allowed: JPEG, PNG, GIF, WebP, PDF');
      return;
    }

    if (file.size > maxSize) {
      toast.error('File too large. Maximum size: 5MB');
      return;
    }

    uploadMutation.mutate(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const isPdf = receiptFileName?.toLowerCase().endsWith('.pdf');

  // If there's already a receipt attached
  if (receiptUrl && receiptFileName) {
    return (
      <div className="border rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isPdf ? (
              <FileText className="h-8 w-8 text-red-500" />
            ) : (
              // eslint-disable-next-line jsx-a11y/alt-text
              <Image className="h-8 w-8 text-blue-500" aria-hidden="true" />
            )}
            <div>
              <p className="font-medium text-sm truncate max-w-[200px]">
                {receiptFileName}
              </p>
              <p className="text-xs text-muted-foreground">Receipt attached</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <Eye className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[90vh]">
                <DialogHeader>
                  <DialogTitle>{receiptFileName}</DialogTitle>
                  <DialogDescription>Receipt Preview</DialogDescription>
                </DialogHeader>
                <div className="overflow-auto max-h-[70vh]">
                  {isPdf ? (
                    <iframe
                      src={receiptUrl}
                      className="w-full h-[600px]"
                      title="Receipt PDF"
                    />
                  ) : (
                    // Using standard img for base64 data URLs (Next Image doesn't support base64)
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={receiptUrl}
                      alt="Receipt"
                      className="w-full h-auto rounded-lg"
                    />
                  )}
                </div>
              </DialogContent>
            </Dialog>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const link = document.createElement('a');
                link.href = receiptUrl;
                link.download = receiptFileName;
                link.click();
              }}
            >
              <Download className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <X className="h-4 w-4 text-destructive" />
              )}
            </Button>
          </div>
        </div>
        {!isPdf && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={receiptUrl}
            alt="Receipt preview"
            className="w-full max-h-32 object-contain rounded-lg bg-muted cursor-pointer"
            onClick={() => setPreviewOpen(true)}
          />
        )}
      </div>
    );
  }

  // No receipt - show upload area
  return (
    <div
      className={cn(
        'border-2 border-dashed rounded-lg p-6 text-center transition-colors',
        isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25',
        uploadMutation.isPending && 'opacity-50 pointer-events-none'
      )}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.pdf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileSelect(file);
        }}
      />
      
      {uploadMutation.isPending ? (
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Uploading...</p>
        </div>
      ) : (
        <>
          <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground mb-2">
            Drag and drop a receipt here, or
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
          >
            Choose File
          </Button>
          <p className="text-xs text-muted-foreground mt-2">
            Supports: JPEG, PNG, GIF, WebP, PDF (max 5MB)
          </p>
        </>
      )}
    </div>
  );
}
