'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { AlertTriangle, Check, X, ChevronDown, ChevronUp } from 'lucide-react';
import Link from 'next/link';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils/currency';
import { cn } from '@/lib/utils';

interface DuplicateCandidate {
  _id: string;
  amount: number;
  dateTime: string;
  type: string;
  note?: string;
  category?: {
    _id: string;
    name: string;
    icon?: string;
  };
  member?: {
    _id: string;
    name: string;
  };
  score: number;
  reasons: string[];
  confidence: 'high' | 'medium' | 'low';
}

interface DuplicateCheckResponse {
  duplicates: DuplicateCandidate[];
  hasPotentialDuplicates: boolean;
  highConfidenceCount: number;
}

interface DuplicateWarningProps {
  amount: number;
  dateTime: Date;
  categoryId?: string;
  note?: string;
  excludeId?: string;
  onConfirmNotDuplicate?: () => void;
  onCancel?: () => void;
}

async function checkDuplicates(params: {
  amount: number;
  dateTime: Date;
  categoryId?: string;
  note?: string;
  excludeId?: string;
}): Promise<DuplicateCheckResponse> {
  const response = await fetch('/api/transactions/duplicates', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount: params.amount,
      dateTime: params.dateTime.toISOString(),
      categoryId: params.categoryId,
      note: params.note,
      excludeId: params.excludeId,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to check for duplicates');
  }

  return response.json();
}

export function DuplicateWarning({
  amount,
  dateTime,
  categoryId,
  note,
  excludeId,
  onConfirmNotDuplicate,
  onCancel,
}: DuplicateWarningProps) {
  const [expanded, setExpanded] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['duplicate-check', amount, dateTime, categoryId, note, excludeId],
    queryFn: () => checkDuplicates({ amount, dateTime, categoryId, note, excludeId }),
    enabled: amount > 0 && !dismissed,
    staleTime: 30000, // Cache for 30 seconds
  });

  if (isLoading || isError || dismissed || !data?.hasPotentialDuplicates) {
    return null;
  }

  const highConfidence = data.duplicates.filter((d) => d.confidence === 'high');
  const otherDuplicates = data.duplicates.filter((d) => d.confidence !== 'high');

  return (
    <Alert variant="destructive" className="border-amber-500 bg-amber-50 dark:bg-amber-950/20">
      <AlertTriangle className="h-4 w-4 !text-amber-600" />
      <AlertTitle className="text-amber-800 dark:text-amber-200">
        Potential Duplicate Transaction{data.duplicates.length > 1 ? 's' : ''} Detected
      </AlertTitle>
      <AlertDescription className="mt-2 space-y-3">
        <p className="text-amber-700 dark:text-amber-300 text-sm">
          We found {data.duplicates.length} similar transaction{data.duplicates.length > 1 ? 's' : ''}.
          {data.highConfidenceCount > 0 && (
            <span className="font-medium">
              {' '}
              {data.highConfidenceCount} appear{data.highConfidenceCount === 1 ? 's' : ''} to be a likely duplicate.
            </span>
          )}
        </p>

        {/* High confidence duplicates always shown */}
        {highConfidence.length > 0 && (
          <div className="space-y-2">
            {highConfidence.map((dup) => (
              <DuplicateCard key={dup._id} duplicate={dup} />
            ))}
          </div>
        )}

        {/* Show/hide other duplicates */}
        {otherDuplicates.length > 0 && (
          <div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
              className="text-amber-700 dark:text-amber-300 hover:text-amber-800 dark:hover:text-amber-200 p-0 h-auto"
            >
              {expanded ? (
                <>
                  <ChevronUp className="h-4 w-4 mr-1" />
                  Hide {otherDuplicates.length} other potential match{otherDuplicates.length > 1 ? 'es' : ''}
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4 mr-1" />
                  Show {otherDuplicates.length} other potential match{otherDuplicates.length > 1 ? 'es' : ''}
                </>
              )}
            </Button>
            {expanded && (
              <div className="space-y-2 mt-2">
                {otherDuplicates.map((dup) => (
                  <DuplicateCard key={dup._id} duplicate={dup} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setDismissed(true);
              onConfirmNotDuplicate?.();
            }}
            className="border-amber-500 text-amber-700 hover:bg-amber-100 dark:border-amber-600 dark:text-amber-300 dark:hover:bg-amber-900/30"
          >
            <Check className="h-4 w-4 mr-1" />
            Not a duplicate, continue
          </Button>
          {onCancel && (
            <Button
              size="sm"
              variant="destructive"
              onClick={onCancel}
              className="bg-amber-600 hover:bg-amber-700"
            >
              <X className="h-4 w-4 mr-1" />
              Cancel
            </Button>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
}

function DuplicateCard({ duplicate }: { duplicate: DuplicateCandidate }) {
  const confidenceColors = {
    high: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    medium: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
    low: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  };

  return (
    <Link href={`/transactions/${duplicate._id}`} target="_blank">
      <div className="bg-white dark:bg-gray-900 rounded-lg p-3 border border-amber-200 dark:border-amber-800 hover:border-amber-400 dark:hover:border-amber-600 transition-colors cursor-pointer">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900 dark:text-gray-100">
                {formatCurrency(duplicate.amount)}
              </span>
              <Badge className={cn('text-xs', confidenceColors[duplicate.confidence])}>
                {duplicate.confidence} match
              </Badge>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {format(new Date(duplicate.dateTime), 'PPP')}
              {duplicate.category && (
                <span>
                  {' '}
                  • {duplicate.category.icon} {duplicate.category.name}
                </span>
              )}
            </p>
            {duplicate.note && (
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-1 truncate">
                {duplicate.note}
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-1 mt-2">
          {duplicate.reasons.map((reason, idx) => (
            <Badge key={idx} variant="secondary" className="text-xs">
              {reason}
            </Badge>
          ))}
        </div>
      </div>
    </Link>
  );
}

// Hook for use in forms
export function useDuplicateCheck(
  amount: number,
  dateTime: Date,
  categoryId?: string,
  note?: string,
  excludeId?: string
) {
  return useQuery({
    queryKey: ['duplicate-check', amount, dateTime, categoryId, note, excludeId],
    queryFn: () => checkDuplicates({ amount, dateTime, categoryId, note, excludeId }),
    enabled: amount > 0,
    staleTime: 30000,
  });
}
