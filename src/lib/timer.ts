// Finds cooking times in step text ("小火焖 8 分钟", "炖 1.5–2 小时") so they can become
// tap-to-start timers.

export interface Duration {
  /** Position of the match in the text. */
  index: number;
  length: number;
  /** For a range, the lower bound: that is when to start checking. */
  seconds: number;
  /** Upper bound of a range, if any. */
  maxSeconds?: number;
  text: string;
}

const UNIT = { 秒: 1, 分钟: 60, 小时: 3600 } as const;
const PATTERN = /(\d+(?:\.\d+)?)(?:\s*[–—~-]\s*(\d+(?:\.\d+)?))?\s*(秒|分钟|小时)(?:\s*(\d+)\s*分钟)?/g;
/** Shorter than this isn't worth reaching for the phone. */
const MIN_SECONDS = 30;

export function findDurations(text: string): Duration[] {
  const out: Duration[] = [];
  for (const m of text.matchAll(PATTERN)) {
    const [whole, low, high, unit, extraMinutes] = m;
    // "每 30 秒翻动一次" is a rhythm, not something to count down once.
    if (/每\s*$/.test(text.slice(0, m.index))) continue;
    const per = UNIT[unit as keyof typeof UNIT];
    const extra = extraMinutes ? Number(extraMinutes) * 60 : 0;
    const seconds = Math.round(Number(low) * per) + extra;
    if (seconds < MIN_SECONDS) continue;
    out.push({
      index: m.index,
      length: whole.length,
      seconds,
      maxSeconds: high ? Math.round(Number(high) * per) + extra : undefined,
      text: whole,
    });
  }
  return out;
}

/** 5:07, or 1:05:07 past an hour. */
export function formatClock(seconds: number): string {
  const s = Math.max(0, Math.ceil(seconds));
  const p = (n: number) => String(n).padStart(2, '0');
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h ? `${h}:${p(m)}:${p(s % 60)}` : `${m}:${p(s % 60)}`;
}
