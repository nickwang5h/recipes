import { describe, expect, it } from 'vitest';
import { withinTime } from '../src/lib/categories';

describe('time filter', () => {
  it('counts a quick dish in every longer "within" bucket', () => {
    expect(['15', '30', '60', '120'].every((l) => withinTime(l, 10))).toBe(true);
    expect(withinTime('long', 10)).toBe(false);
  });

  it('includes the boundary minute', () => {
    expect(withinTime('30', 30)).toBe(true);
    expect(withinTime('30', 31)).toBe(false);
  });

  it('puts anything past two hours in the long bucket only', () => {
    expect(withinTime('120', 121)).toBe(false);
    expect(withinTime('long', 121)).toBe(true);
  });

  it('treats an empty or unknown limit as no filter', () => {
    expect(withinTime('', 500)).toBe(true);
    expect(withinTime('nope', 500)).toBe(true);
  });
});
