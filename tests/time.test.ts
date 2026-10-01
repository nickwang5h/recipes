import { describe, expect, it } from 'vitest';
import { withinTime } from '../src/lib/categories';

describe('time filter', () => {
  it('puts each dish in exactly one range', () => {
    const ranges = ['15', '30', '60', '120', 'long'];
    for (const minutes of [5, 15, 16, 30, 31, 60, 61, 120, 121, 600]) {
      expect(ranges.filter((r) => withinTime(r, minutes))).toHaveLength(1);
    }
  });

  it('includes both boundary minutes of a range', () => {
    expect(withinTime('30', 16)).toBe(true);
    expect(withinTime('30', 30)).toBe(true);
    expect(withinTime('30', 15)).toBe(false);
  });

  it('treats an empty or unknown limit as no filter', () => {
    expect(withinTime('', 500)).toBe(true);
    expect(withinTime('nope', 500)).toBe(true);
  });
});
