// Dates for the weekly menu, as local YYYY-MM-DD keys so a dish planned for "Thursday"
// stays on Thursday whatever the time zone of the phone that synced it.
const WEEKDAYS = {
  zh: ['周日', '周一', '周二', '周三', '周四', '周五', '周六'],
  en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
};

export function dayKey(date: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}

export function addDays(date: Date, n: number): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() + n);
  return d;
}

/** Today plus the next `count - 1` days. */
export function upcoming(today: Date, count = 7): Date[] {
  return Array.from({ length: count }, (_, i) => addDays(today, i));
}

/** "今天 3/14" / "Today 3/14": the first word names the day. */
export function dayLabel(date: Date, today: Date, lang: 'zh' | 'en' = 'zh'): string {
  const offset = Math.round((addDays(date, 0).getTime() - addDays(today, 0).getTime()) / 86_400_000);
  const name = offset === 0 ? (lang === 'en' ? 'Today' : '今天') : offset === 1 ? (lang === 'en' ? 'Tomorrow' : '明天') : WEEKDAYS[lang][date.getDay()];
  return `${name} ${date.getMonth() + 1}/${date.getDate()}`;
}
