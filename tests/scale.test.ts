import { describe, expect, it } from 'vitest';
import { formatQty, roundQty, scaleQty } from '../src/lib/scale';

describe('scaleQty', () => {
  it('scales linearly from base servings', () => {
    expect(scaleQty(200, 2, 4)).toBe(400);
    expect(scaleQty(200, 2, 1)).toBe(100);
    expect(scaleQty(80, 2, 24)).toBe(960);
  });
});

describe('roundQty', () => {
  it('rounds g/ml to integers at or above 10', () => {
    expect(roundQty(133.33, 'g')).toBe(133);
    expect(roundQty(10.4, 'ml')).toBe(10);
  });

  it('keeps one decimal for g/ml below 10', () => {
    expect(roundQty(3.333, 'g')).toBe(3.3);
    expect(roundQty(0.04, 'g')).toBe(0.1);
  });

  it('rounds counts to the nearest half with a 0.5 minimum', () => {
    expect(roundQty(1.3, '个')).toBe(1.5);
    expect(roundQty(2.2, '瓣')).toBe(2);
    expect(roundQty(0.1, '根')).toBe(0.5);
    expect(roundQty(0.6, undefined)).toBe(0.5);
  });

  it('rounds spoons and cups to the nearest quarter with a 0.25 minimum', () => {
    expect(roundQty(3.333, '汤匙')).toBe(3.25);
    expect(roundQty(1.4, '茶匙')).toBe(1.5);
    expect(roundQty(0.05, '杯')).toBe(0.25);
  });

  it('keeps up to two decimals for other units', () => {
    expect(roundQty(0.3333, 'kg')).toBe(0.33);
    expect(roundQty(2.005, 'L')).toBe(2.01);
  });
});

describe('formatQty', () => {
  it('drops trailing zeros and grouping', () => {
    expect(formatQty(1.5, '汤匙')).toBe('1.5');
    expect(formatQty(2, '汤匙')).toBe('2');
    expect(formatQty(1200, 'g')).toBe('1200');
  });
});
