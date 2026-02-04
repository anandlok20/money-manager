/**
 * Money Manager - Utilities Tests
 * Tests for currency and date utility functions
 */

import { describe, it, expect } from 'vitest';
import { formatCurrency } from '@/lib/utils/currency';
import { formatRelativeDate, formatDate, formatDateTime, formatTimeAgo, getMonthName, toISODateString } from '@/lib/utils/dates';

describe('Currency Utilities', () => {
  describe('formatCurrency', () => {
    it('should format INR currency correctly', () => {
      const result = formatCurrency(100000, 'INR');
      expect(result).toContain('₹');
      expect(result).toContain('1');
    });

    it('should format USD currency correctly', () => {
      const result = formatCurrency(1000, 'USD');
      expect(result).toContain('$');
      expect(result).toContain('1');
    });

    it('should handle zero amount', () => {
      const result = formatCurrency(0, 'INR');
      expect(result).toContain('₹');
      expect(result).toContain('0');
    });

    it('should handle negative amounts', () => {
      const result = formatCurrency(-500, 'INR');
      expect(result).toContain('-');
    });

    it('should handle decimal amounts', () => {
      const result = formatCurrency(1234.56, 'USD');
      expect(result).toContain('$');
    });

    it('should handle large amounts', () => {
      const result = formatCurrency(10000000, 'INR');
      expect(result).toContain('₹');
    });

    it('should default to INR when no currency specified', () => {
      const result = formatCurrency(1000);
      expect(result).toContain('₹');
    });

    it('should format EUR currency correctly', () => {
      const result = formatCurrency(1000, 'EUR');
      expect(result).toBeTruthy();
    });

    it('should format GBP currency correctly', () => {
      const result = formatCurrency(1000, 'GBP');
      expect(result).toContain('£');
    });

    it('should format JPY currency correctly', () => {
      const result = formatCurrency(10000, 'JPY');
      // JPY may use fullwidth yen (￥) or halfwidth (¥) depending on locale
      expect(result).toMatch(/[¥￥]/);
    });
  });
});

describe('Date Utilities', () => {
  describe('formatRelativeDate', () => {
    it('should format today as "Today"', () => {
      const today = new Date();
      const result = formatRelativeDate(today);
      expect(result).toContain('Today');
    });

    it('should format yesterday correctly', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const result = formatRelativeDate(yesterday);
      expect(result).toContain('Yesterday');
    });

    it('should format date string input', () => {
      const dateStr = new Date().toISOString();
      const result = formatRelativeDate(dateStr);
      expect(result).toBeTruthy();
    });

    it('should handle ISO date strings', () => {
      const isoDate = '2024-01-15T10:30:00.000Z';
      const result = formatRelativeDate(isoDate);
      expect(result).toBeTruthy();
    });
  });

  describe('formatDate', () => {
    it('should format date with default format', () => {
      const date = new Date('2024-06-15');
      const result = formatDate(date);
      expect(result).toBeTruthy();
    });

    it('should format date with custom format', () => {
      const date = new Date('2024-06-15');
      const result = formatDate(date, 'yyyy-MM-dd');
      expect(result).toBe('2024-06-15');
    });

    it('should handle string date input', () => {
      const result = formatDate('2024-06-15', 'yyyy-MM-dd');
      expect(result).toBe('2024-06-15');
    });
  });

  describe('formatDateTime', () => {
    it('should format date and time', () => {
      const date = new Date('2024-06-15T14:30:00');
      const result = formatDateTime(date);
      expect(result).toBeTruthy();
    });
  });

  describe('formatTimeAgo', () => {
    it('should format recent time', () => {
      const now = new Date();
      const result = formatTimeAgo(now);
      expect(result).toContain('ago');
    });

    it('should format hours ago', () => {
      const twoHoursAgo = new Date();
      twoHoursAgo.setHours(twoHoursAgo.getHours() - 2);
      const result = formatTimeAgo(twoHoursAgo);
      expect(result).toContain('ago');
    });
  });

  describe('getMonthName', () => {
    it('should return month and year', () => {
      const date = new Date('2024-06-15');
      const result = getMonthName(date);
      expect(result).toContain('June');
      expect(result).toContain('2024');
    });
  });

  describe('toISODateString', () => {
    it('should convert date to ISO string format', () => {
      const date = new Date('2024-06-15');
      const result = toISODateString(date);
      expect(result).toBe('2024-06-15');
    });
  });
});
