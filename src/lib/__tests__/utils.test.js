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
    it('formats timestamp to date string in dd/mm/yy, hh:mm format', () => {
      // Use a fixed timestamp for testing
      const timestamp = 1716307200; // May 21, 2024
      const result = formatDate(timestamp);
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
      expect(result).toMatch(/\d{2}\/\d{2}\/24, \d{2}:\d{2}/);
    });

    it('formats Date instance correctly without spurious multiplication', () => {
      const date = new Date('2026-09-14T14:38:00Z');
      const result = formatDate(date);
      expect(result).toMatch(/14\/09\/26, \d{2}:38/);
      expect(result).not.toContain('58');
    });

    it('formats millisecond timestamps correctly', () => {
      const ms = 1716307200000;
      const result = formatDate(ms);
      expect(result).toMatch(/\d{2}\/\d{2}\/24, \d{2}:\d{2}/);
    });

    it('returns "Nunca" if timestamp is 0 or invalid', () => {
      expect(formatDate(0)).toBe('Nunca');
      expect(formatDate(null)).toBe('Nunca');
      expect(formatDate('invalid-date')).toBe('Nunca');
    });
  });

  describe('formatDateOnly', () => {
    it('formats timestamp to date only string in dd/mm/yy format', () => {
      const timestamp = 1716307200; // May 21, 2024
      const result = formatDateOnly(timestamp);
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
      expect(result).toMatch(/\d{2}\/\d{2}\/24/);
    });

    it('formats Date instance correctly in dd/mm/yy format', () => {
      const date = new Date('2026-09-14T14:38:00Z');
      const result = formatDateOnly(date);
      expect(result).toBe('14/09/26');
    });

    it('returns "Nunca" if timestamp is 0 or invalid', () => {
      expect(formatDateOnly(0)).toBe('Nunca');
      expect(formatDateOnly(null)).toBe('Nunca');
      expect(formatDateOnly('invalid-date')).toBe('Nunca');
    });
  });
});
