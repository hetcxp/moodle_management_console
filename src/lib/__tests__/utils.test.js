import { describe, it, expect } from 'vitest';
import { cn, formatDate, formatDateOnly } from '../utils';

describe('Utils', () => {
  describe('cn', () => {
    it('combines classes properly', () => {
      expect(cn('bg-red-500', 'text-white')).toBe('bg-red-500 text-white');
    });

    it('merges tailwind classes properly', () => {
      // Assuming tailwind-merge handles conflicting classes by keeping the last one
      expect(cn('px-2 py-1', 'p-4')).toBe('p-4');
    });
  });

  describe('formatDate', () => {
    it('formats timestamp to date string', () => {
      // Use a fixed timestamp for testing
      const timestamp = 1716307200; // May 21, 2024
      const result = formatDate(timestamp);
      expect(typeof result).toBe('string');
      // Format might depend on locale, just check if it's not empty and returns a valid string format
      expect(result.length).toBeGreaterThan(0);
    });

    it('returns "Nunca" if timestamp is 0 or invalid', () => {
      expect(formatDate(0)).toBe('Nunca');
      expect(formatDate(null)).toBe('Nunca');
    });
  });

  describe('formatDateOnly', () => {
    it('formats timestamp to date only string', () => {
      const timestamp = 1716307200; // May 21, 2024
      const result = formatDateOnly(timestamp);
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
    
    it('returns "Nunca" if timestamp is 0 or invalid', () => {
      expect(formatDateOnly(0)).toBe('Nunca');
      expect(formatDateOnly(null)).toBe('Nunca');
    });
  });
});
