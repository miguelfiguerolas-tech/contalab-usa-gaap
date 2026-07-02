import { describe, it, expect } from 'vitest';
import { formatDate } from './format';
import { round2 } from './money';

describe('formatDate', () => {
    it('shows the stored day regardless of timezone (no UTC-midnight shift)', () => {
        // With `new Date('2026-03-15')` any US timezone would render 3/14/2026.
        expect(formatDate('2026-03-15')).toBe('3/15/2026');
        expect(formatDate('2026-01-01')).toBe('1/1/2026');
        expect(formatDate('2026-12-31')).toBe('12/31/2026');
    });

    it('returns a dash for empty values', () => {
        expect(formatDate(null)).toBe('-');
        expect(formatDate('')).toBe('-');
    });
});

describe('round2', () => {
    it('removes float accumulation noise', () => {
        expect(round2(0.1 + 0.2)).toBe(0.3);
        expect(round2(1500.005 - 1500)).toBe(0.01);
        expect(round2(-0.1 - 0.2)).toBe(-0.3);
    });
});
