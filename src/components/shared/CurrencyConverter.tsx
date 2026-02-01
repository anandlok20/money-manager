'use client';

import { useState, useEffect } from 'react';
import { ArrowRight, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  supportedCurrencies,
  formatCurrency,
  convertCurrency,
  getExchangeRate,
} from '@/lib/utils/currency';

interface CurrencyConverterProps {
  defaultFromCurrency?: string;
  defaultToCurrency?: string;
  defaultAmount?: number;
  onConvert?: (result: {
    fromAmount: number;
    toAmount: number;
    fromCurrency: string;
    toCurrency: string;
    rate: number;
  }) => void;
  compact?: boolean;
}

export function CurrencyConverter({
  defaultFromCurrency = 'USD',
  defaultToCurrency = 'INR',
  defaultAmount = 100,
  onConvert,
  compact = false,
}: CurrencyConverterProps) {
  const [fromCurrency, setFromCurrency] = useState(defaultFromCurrency);
  const [toCurrency, setToCurrency] = useState(defaultToCurrency);
  const [amount, setAmount] = useState(defaultAmount.toString());
  const [convertedAmount, setConvertedAmount] = useState(0);
  const [rate, setRate] = useState(0);

  useEffect(() => {
    const numAmount = parseFloat(amount) || 0;
    const converted = convertCurrency(numAmount, fromCurrency, toCurrency);
    const exchangeRate = getExchangeRate(fromCurrency, toCurrency);
    
    setConvertedAmount(converted);
    setRate(exchangeRate);
    
    onConvert?.({
      fromAmount: numAmount,
      toAmount: converted,
      fromCurrency,
      toCurrency,
      rate: exchangeRate,
    });
  }, [amount, fromCurrency, toCurrency, onConvert]);

  const handleSwap = () => {
    const tempCurrency = fromCurrency;
    setFromCurrency(toCurrency);
    setToCurrency(tempCurrency);
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
        <Input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-24 h-8"
        />
        <Select value={fromCurrency} onValueChange={setFromCurrency}>
          <SelectTrigger className="w-20 h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {supportedCurrencies.map((c) => (
              <SelectItem key={c.code} value={c.code}>
                {c.flag} {c.code}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={handleSwap}
        >
          <ArrowRight className="h-4 w-4" />
        </Button>
        <Select value={toCurrency} onValueChange={setToCurrency}>
          <SelectTrigger className="w-20 h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {supportedCurrencies.map((c) => (
              <SelectItem key={c.code} value={c.code}>
                {c.flag} {c.code}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="font-medium text-sm">
          = {formatCurrency(convertedAmount, toCurrency)}
        </span>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Currency Converter</CardTitle>
        <CardDescription>
          Convert between different currencies
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-[1fr,auto,1fr] gap-4 items-end">
          {/* From */}
          <div className="space-y-2">
            <Label>From</Label>
            <Select value={fromCurrency} onValueChange={setFromCurrency}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {supportedCurrencies.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    <span className="flex items-center gap-2">
                      <span>{c.flag}</span>
                      <span>{c.code}</span>
                      <span className="text-muted-foreground">- {c.name}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="text-lg"
            />
          </div>

          {/* Swap Button */}
          <Button
            variant="outline"
            size="icon"
            onClick={handleSwap}
            className="mb-1"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>

          {/* To */}
          <div className="space-y-2">
            <Label>To</Label>
            <Select value={toCurrency} onValueChange={setToCurrency}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {supportedCurrencies.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    <span className="flex items-center gap-2">
                      <span>{c.flag}</span>
                      <span>{c.code}</span>
                      <span className="text-muted-foreground">- {c.name}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="h-10 px-3 py-2 bg-muted rounded-md flex items-center text-lg font-medium">
              {formatCurrency(convertedAmount, toCurrency)}
            </div>
          </div>
        </div>

        {/* Exchange Rate */}
        <div className="text-center text-sm text-muted-foreground">
          1 {fromCurrency} = {rate.toFixed(4)} {toCurrency}
        </div>

        {/* Note */}
        <p className="text-xs text-muted-foreground text-center">
          Exchange rates are approximate and for reference only
        </p>
      </CardContent>
    </Card>
  );
}

interface CurrencyInputProps {
  value: number;
  onChange: (value: number, currency: string) => void;
  currency: string;
  onCurrencyChange: (currency: string) => void;
  baseCurrency?: string;
  showConversion?: boolean;
  label?: string;
  error?: string;
}

export function CurrencyInput({
  value,
  onChange,
  currency,
  onCurrencyChange,
  baseCurrency = 'INR',
  showConversion = true,
  label = 'Amount',
  error,
}: CurrencyInputProps) {
  const convertedValue = currency !== baseCurrency
    ? convertCurrency(value, currency, baseCurrency)
    : value;

  return (
    <div className="space-y-2">
      {label && <Label>{label}</Label>}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            type="number"
            value={value || ''}
            onChange={(e) => onChange(parseFloat(e.target.value) || 0, currency)}
            placeholder="0.00"
            className="pr-16"
          />
          <Select value={currency} onValueChange={onCurrencyChange}>
            <SelectTrigger className="absolute right-1 top-1 h-8 w-14 border-0 bg-transparent">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {supportedCurrencies.map((c) => (
                <SelectItem key={c.code} value={c.code}>
                  {c.flag} {c.code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      {showConversion && currency !== baseCurrency && value > 0 && (
        <p className="text-xs text-muted-foreground">
          ≈ {formatCurrency(convertedValue, baseCurrency)} (in {baseCurrency})
        </p>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
