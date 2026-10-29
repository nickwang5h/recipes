// Finds cooking times in step text ("小火焖 8 分钟", "simmer for 1.5–2 hours") so they can become
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

const UNIT: Record<string, number> = { 秒: 1, 分钟: 60, 小时: 3600, second: 1, minute: 60, hour: 3600 };
const PATTERNS = [
  /(\d+(?:\.\d+)?)(?:\s*[–—~-]\s*(\d+(?:\.\d+)?))?\s*(秒|分钟|小时)(?:\s*(\d+)\s*分钟)?/g,
  // "8 minutes", "12–15 minutes", "1.5–2 hours", "1 hour 20 minutes", "a 10-minute rest"
  /(\d+(?:\.\d+)?)(?:\s*(?:[–—~-]|to)\s*(\d+(?:\.\d+)?))?[\s-]*(second|minute|hour)s?\b(?:\s*(?:and\s*)?(\d+)\s*minutes?\b)?/gi,
];
/** Shorter than this isn't worth reaching for the phone. */
const MIN_SECONDS = 30;

export function findDurations(text: string): Duration[] {
  const out: Duration[] = [];
  for (const pattern of PATTERNS) {
    for (const m of text.matchAll(pattern)) {
      const [whole, low, high, unit, extraMinutes] = m;
      // "每 30 秒翻动一次", "every 30 seconds" is a rhythm, not something to count down once.
      if (/(每|every)\s*$/i.test(text.slice(0, m.index))) continue;
      const per = UNIT[unit.toLowerCase()];
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
  }
  return out.sort((a, b) => a.index - b.index);
}

/** 5:07, or 1:05:07 past an hour. */
export function formatClock(seconds: number): string {
  const s = Math.max(0, Math.ceil(seconds));
  const p = (n: number) => String(n).padStart(2, '0');
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h ? `${h}:${p(m)}:${p(s % 60)}` : `${m}:${p(s % 60)}`;
}
