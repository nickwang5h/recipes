import { describe, expect, it } from 'vitest';
import { findDurations, formatClock } from '../src/lib/timer';

const seconds = (text: string) => findDurations(text).map((d) => d.seconds);

describe('finding times in a step', () => {
  it('reads minutes, hours and seconds', () => {
    expect(seconds('加盖小火焖 8 分钟，再开盖收汁 30 秒。')).toEqual([480, 30]);
    expect(seconds('小火炖 1.5 小时')).toEqual([5400]);
    expect(seconds('冷藏 1 小时 30 分钟')).toEqual([5400]);
  });

  it('uses the lower bound of a range and remembers the upper', () => {
    const [d] = findDurations('蒸 8–10 分钟');
    expect([d.seconds, d.maxSeconds, d.text]).toEqual([480, 600, '8–10 分钟']);
  });

  it('skips rhythms and times too short to bother with', () => {
    expect(seconds('每 30 秒翻动一次，炒 10 秒出香')).toEqual([]);
  });

  it('reports where the match is so it can be wrapped', () => {
    const text = '煮 3 分钟后捞出';
    const [d] = findDurations(text);
    expect(text.slice(d.index, d.index + d.length)).toBe('3 分钟');
  });
});

describe('clock', () => {
  it('formats minutes and hours', () => {
    expect(formatClock(307)).toBe('5:07');
    expect(formatClock(3907)).toBe('1:05:07');
    expect(formatClock(-3)).toBe('0:00');
  });
});
