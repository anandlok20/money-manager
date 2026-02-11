'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useUIStore } from '@/stores/uiStore';

interface DevaInsightsProps {
  // These props are kept for future detailed insights
  totalIncome?: number;
  totalExpenses?: number;
  savingsRate: number;
}

// Dharma financial wisdom based on spending patterns
const wisdomMessages = [
  { threshold: 90, emoji: '🔱', title: 'शिव (Shiva)', message: 'Like Lord Shiva — you have conquered material attachment. Exceptional discipline!', color: 'text-indigo-500' },
  { threshold: 75, emoji: '🙏', title: 'विष्णु (Vishnu)', message: 'Like Lord Vishnu the Preserver — your wealth is well protected and growing.', color: 'text-blue-500' },
  { threshold: 60, emoji: '🌸', title: 'लक्ष्मी (Lakshmi)', message: 'Goddess Lakshmi smiles upon you — balanced prosperity flows your way.', color: 'text-pink-500' },
  { threshold: 40, emoji: '📿', title: 'गणेश (Ganesha)', message: 'Lord Ganesha removes obstacles — good savings, but room for growth.', color: 'text-amber-500' },
  { threshold: 20, emoji: '🪷', title: 'सरस्वती (Saraswati)', message: 'Seek Saraswati\'s wisdom — learn to balance your spending and saving.', color: 'text-cyan-500' },
  { threshold: 0, emoji: '🔥', title: 'अग्नि (Agni)', message: 'Like sacred fire, your money burns fast. Time for financial tapas (discipline).', color: 'text-red-500' },
];

export function DevaInsights({ savingsRate }: DevaInsightsProps) {
  const appMode = useUIStore((state) => state.appMode);

  const insight = useMemo(() => {
    const rate = Math.max(0, Math.min(100, savingsRate));
    return wisdomMessages.find((w) => rate >= w.threshold) || wisdomMessages[wisdomMessages.length - 1];
  }, [savingsRate]);

  // Only show in deva mode
  if (appMode !== 'deva') return null;

  // Dharma Score: 0-108 scale (sacred number)
  const dharmaScore = Math.round(Math.min(108, savingsRate * 1.08));

  return (
    <Card className="relative overflow-hidden border-amber-500/20">
      <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-orange-500/5 to-red-500/5" />
      <CardHeader className="relative pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <span className="text-xl">🔱</span>
          धर्म स्कोर (Dharma Score)
        </CardTitle>
      </CardHeader>
      <CardContent className="relative space-y-4">
        {/* Score Display */}
        <div className="flex items-center gap-4">
          <div className="relative w-20 h-20">
            <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50" cy="50" r="40"
                fill="none"
                stroke="currentColor"
                strokeWidth="6"
                className="text-muted/30"
              />
              <circle
                cx="50" cy="50" r="40"
                fill="none"
                stroke="url(#devaGradient)"
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={`${(dharmaScore / 108) * 251.3} 251.3`}
              />
              <defs>
                <linearGradient id="devaGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#FFD700" />
                  <stop offset="100%" stopColor="#FF6600" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-lg font-bold">{dharmaScore}</span>
            </div>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{insight.emoji}</span>
              <p className={`font-bold ${insight.color}`}>{insight.title}</p>
            </div>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              {insight.message}
            </p>
          </div>
        </div>

        {/* Mantra */}
        <div className="text-center p-3 rounded-xl bg-amber-500/5 border border-amber-500/10">
          <p className="text-xs text-amber-600 dark:text-amber-400 font-medium italic">
            &ldquo;अर्थस्य मूलं धर्मः&rdquo; — Wealth rooted in Dharma endures forever
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
