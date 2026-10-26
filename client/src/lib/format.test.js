import { describe, expect, it } from 'vitest';
import { fmtDuration, fmtWindow, freshness, pickupCode } from './format';

const MIN = 60 * 1000;
const HOUR = 60 * MIN;

describe('freshness', () => {
  const now = new Date('2026-03-10T12:00:00Z').getTime();

  it('flags food that has gone past its best-before time', () => {
    expect(freshness(now - MIN, now)).toMatchObject({ urgency: 'gone', label: 'Past best-before' });
  });

  it('grades urgency by time left', () => {
    expect(freshness(now + 30 * MIN, now).urgency).toBe('urgent');
    expect(freshness(now + 2 * HOUR, now).urgency).toBe('soon');
    expect(freshness(now + 5 * HOUR, now).urgency).toBe('fine');
  });
});

describe('fmtDuration', () => {
  it('switches units as the span grows', () => {
    expect(fmtDuration(45 * MIN)).toBe('45 min');
    expect(fmtDuration(90 * MIN)).toBe('1 h 30 min');
    expect(fmtDuration(3 * HOUR)).toBe('3 h');
    expect(fmtDuration(72 * HOUR)).toBe('3 days');
  });
});

describe('fmtWindow', () => {
  it('shows one day label when the window stays within a day', () => {
    const now = new Date(2026, 2, 10, 9, 0);
    const out = fmtWindow(new Date(2026, 2, 10, 18, 0), new Date(2026, 2, 10, 20, 0), now);
    expect(out.startsWith('Today, ')).toBe(true);
    expect(out).not.toContain('Tomorrow');
  });

  it('names both days when it crosses midnight', () => {
    const now = new Date(2026, 2, 10, 9, 0);
    const out = fmtWindow(new Date(2026, 2, 10, 22, 0), new Date(2026, 2, 11, 1, 0), now);
    expect(out).toContain('Tomorrow');
  });
});

describe('pickupCode', () => {
  it('is the last six characters of the id, upper-cased', () => {
    expect(pickupCode('65f1a2b3c4d5e6f7a8b9c0d1')).toBe('B9C0D1');
    expect(pickupCode()).toBe('');
  });
});
