import { describe, expect, it } from 'vitest';
import { dayKey, dayLabel, upcoming } from '../src/lib/days';

describe('menu days', () => {
  const today = new Date(2026, 9, 1, 21, 30); // Thu 1 Oct 2026, evening

  it('keys days by local date', () => {
    expect(dayKey(today)).toBe('2026-10-01');
  });

  it('lists a week ahead across a month end', () => {
    const days = upcoming(new Date(2026, 8, 28)).map(dayKey);
    expect(days[0]).toBe('2026-09-28');
    expect(days[6]).toBe('2026-10-04');
  });

  it('names today and tomorrow, weekdays after that', () => {
    const [d0, d1, d2] = upcoming(today);
    expect(dayLabel(d0, today)).toBe('今天 10/1');
    expect(dayLabel(d1, today)).toBe('明天 10/2');
    expect(dayLabel(d2, today)).toBe('周六 10/3');
  });
});
