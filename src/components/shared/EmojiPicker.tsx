'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

// Common emoji categories for expense management
const EMOJI_CATEGORIES = {
  'Food & Drink': ['🍔', '🍕', '🍜', '🍱', '☕', '🍺', '🥗', '🍳', '🛒', '🥡'],
  'Transport': ['🚗', '🚌', '✈️', '🚇', '🚕', '⛽', '🚲', '🏍️', '🚁', '🛳️'],
  'Shopping': ['🛍️', '👕', '👗', '👟', '💄', '💎', '📱', '💻', '📷', '🎮'],
  'Home': ['🏠', '🛏️', '🛋️', '💡', '🔧', '🧹', '🧺', '🔑', '🪴', '🏡'],
  'Bills & Utilities': ['📱', '💡', '💧', '📺', '🌐', '📄', '🔌', '🏛️', '📬', '💳'],
  'Health': ['🏥', '💊', '🩺', '🦷', '👓', '💪', '🧘', '🏃', '🧠', '🏋️'],
  'Entertainment': ['🎬', '🎵', '🎮', '📚', '🎭', '🎨', '🎯', '🎪', '🎤', '📺'],
  'Education': ['📚', '🎓', '✏️', '📝', '💻', '🔬', '📊', '🗂️', '📖', '🏫'],
  'Travel': ['✈️', '🏨', '🗺️', '🏖️', '🏔️', '⛷️', '🎢', '📸', '🧳', '🗼'],
  'Finance': ['💰', '💵', '💳', '🏦', '📈', '📉', '💎', '🪙', '💼', '🧾'],
  'Income': ['💵', '💰', '🏦', '💳', '📈', '🎁', '💎', '🤝', '🏆', '🎯'],
  'Other': ['⭐', '❤️', '🔔', '📌', '🎯', '🔥', '✨', '🌟', '💫', '🎉'],
};

interface EmojiPickerProps {
  value?: string;
  onChange: (emoji: string) => void;
  className?: string;
}

export function EmojiPicker({ value, onChange, className }: EmojiPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');

  // Filter emojis based on search
  const filteredCategories = search
    ? Object.entries(EMOJI_CATEGORIES).reduce((acc, [category, emojis]) => {
        const filtered = emojis.filter(() => 
          category.toLowerCase().includes(search.toLowerCase())
        );
        if (filtered.length > 0 || category.toLowerCase().includes(search.toLowerCase())) {
          acc[category] = emojis;
        }
        return acc;
      }, {} as Record<string, string[]>)
    : EMOJI_CATEGORIES;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn('w-16 h-10 text-xl', className)}
          type="button"
        >
          {value || '😀'}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(320px,calc(100vw-2rem))] p-3" align="start">
        <Input
          placeholder="Search category..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mb-3"
        />
        <div className="max-h-[300px] overflow-y-auto space-y-3">
          {Object.entries(filteredCategories).map(([category, emojis]) => (
            <div key={category}>
              <p className="text-xs font-medium text-muted-foreground mb-2">
                {category}
              </p>
              <div className="flex flex-wrap gap-1">
                {emojis.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    className={cn(
                      'w-9 h-9 rounded hover:bg-muted flex items-center justify-center text-lg transition-colors',
                      value === emoji && 'bg-primary/20 ring-1 ring-primary'
                    )}
                    onClick={() => {
                      onChange(emoji);
                      setIsOpen(false);
                    }}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Quick access common emojis for inline selection
const QUICK_EMOJIS = ['💰', '🛒', '🚗', '🏠', '📱', '🍔', '🏥', '🎬', '📚', '✈️', '💳', '🎁'];

interface QuickEmojiSelectProps {
  value?: string;
  onChange: (emoji: string) => void;
}

export function QuickEmojiSelect({ value, onChange }: QuickEmojiSelectProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {QUICK_EMOJIS.map((emoji) => (
        <button
          key={emoji}
          type="button"
          onClick={() => onChange(emoji)}
          className={cn(
            'w-10 h-10 rounded-lg flex items-center justify-center text-xl border transition-colors',
            value === emoji
              ? 'border-primary bg-primary/10'
              : 'border-muted hover:bg-muted'
          )}
        >
          {emoji}
        </button>
      ))}
      <EmojiPicker
        value={value && !QUICK_EMOJIS.includes(value) ? value : undefined}
        onChange={onChange}
        className={cn(
          'w-10 h-10',
          value && !QUICK_EMOJIS.includes(value) && 'border-primary bg-primary/10'
        )}
      />
    </div>
  );
}
