import { describe, expect, it } from 'vitest';
import { CO2_PER_KG, KG_PER_SERVING, kgFor, summarize } from '../src/utils/impact.js';

describe('impact maths', () => {
  it('uses the listed weight when the unit is kg', () => {
    expect(kgFor({ quantity: 12, unit: 'kg', estServings: 40 })).toBe(12);
  });

  it('falls back to servings times the per-serving weight for other units', () => {
    expect(kgFor({ quantity: 60, unit: 'items', estServings: 50 })).toBeCloseTo(50 * KG_PER_SERVING);
  });

  it('rounds totals and derives CO2 from the rounded kilograms', () => {
    const out = summarize({ servings: 10.4, kg: 3.449, pickups: 2 });
    expect(out).toEqual({ pickups: 2, meals: 10, kg: 3.4, co2: Math.round(3.4 * CO2_PER_KG * 10) / 10 });
  });

  it('returns zeros for an empty aggregate', () => {
    expect(summarize({})).toEqual({ meals: 0, kg: 0, co2: 0 });
  });
});
