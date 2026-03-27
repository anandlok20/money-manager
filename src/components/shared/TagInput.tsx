'use client';

import { useState, useRef, KeyboardEvent } from 'react';
import { X, Tag } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  suggestions?: string[];
  maxTags?: number;
  className?: string;
}

export function TagInput({
  value = [],
  onChange,
  placeholder = 'Add tag...',
  suggestions = [],
  maxTags = 10,
  className,
}: TagInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addTag = (tag: string) => {
    const trimmedTag = tag.trim().toLowerCase();
    if (trimmedTag && !value.includes(trimmedTag) && value.length < maxTags) {
      onChange([...value, trimmedTag]);
      setInputValue('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    onChange(value.filter((tag) => tag !== tagToRemove));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      removeTag(value[value.length - 1]);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  // Filter suggestions based on input
  const filteredSuggestions = suggestions.filter(
    (s) => s.toLowerCase().includes(inputValue.toLowerCase()) && !value.includes(s.toLowerCase())
  );

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex flex-wrap gap-2 p-2 border rounded-md bg-background min-h-[42px]">
        {value.map((tag) => (
          <Badge
            key={tag}
            variant="secondary"
            className="flex items-center gap-1 px-2 py-1"
          >
            <Tag className="h-3 w-3" />
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="ml-1 hover:text-destructive transition-colors inline-flex items-center justify-center min-w-[1.25rem] min-h-[1.25rem]"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        {value.length < maxTags && (
          <div className="relative flex-1 min-w-[120px]">
            <Input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                setShowSuggestions(true);
              }}
              onKeyDown={handleKeyDown}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              placeholder={value.length === 0 ? placeholder : 'Add more...'}
              className="border-0 shadow-none focus-visible:ring-0 h-7 px-0"
            />
            {showSuggestions && filteredSuggestions.length > 0 && inputValue && (
              <div className="absolute z-10 w-full mt-1 bg-popover border rounded-md shadow-md max-h-32 overflow-y-auto">
                {filteredSuggestions.slice(0, 5).map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    className="w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors"
                    onClick={() => addTag(suggestion)}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      {value.length >= maxTags && (
        <p className="text-xs text-muted-foreground">
          Maximum {maxTags} tags allowed
        </p>
      )}
    </div>
  );
}

// Commonly used tags for expense tracking
export const COMMON_TAGS = [
  'recurring',
  'essential',
  'luxury',
  'business',
  'personal',
  'tax-deductible',
  'reimbursable',
  'urgent',
  'planned',
  'impulse',
  'subscription',
  'one-time',
  'shared',
  'family',
  'work',
];

interface TagDisplayProps {
  tags: string[];
  className?: string;
}

export function TagDisplay({ tags, className }: TagDisplayProps) {
  if (!tags || tags.length === 0) return null;

  return (
    <div className={cn('flex flex-wrap gap-1', className)}>
      {tags.map((tag) => (
        <Badge key={tag} variant="outline" className="text-xs px-2 py-0.5">
          <Tag className="h-2.5 w-2.5 mr-1" />
          {tag}
        </Badge>
      ))}
    </div>
  );
}
