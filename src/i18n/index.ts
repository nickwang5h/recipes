// Languages of the site. Chinese is the source and lives at the root; English mirrors it under
// /en/. Safe to import from client scripts: no content collections here.

export const LANGS = ['zh', 'en'] as const;
export type Lang = (typeof LANGS)[number];

/** Each language's own copy of a set of strings. */
export type Both<T> = Record<Lang, T>;

export const HTML_LANG: Both<string> = { zh: 'zh-CN', en: 'en' };
export const OG_LOCALE: Both<string> = { zh: 'zh_CN', en: 'en_CA' };

/** The language a page is in, from its path. */
export function langOf(url: URL | string): Lang {
  const path = typeof url === 'string' ? url : url.pathname;
  return path === '/en' || path.startsWith('/en/') ? 'en' : 'zh';
}

/** In the browser: the language of the page being shown. */
export function pageLang(): Lang {
  return document.documentElement.lang.startsWith('en') ? 'en' : 'zh';
}

/** `getStaticPaths` params for pages that exist in every language; Chinese has no prefix. */
export const langParam = (lang: Lang) => (lang === 'zh' ? undefined : lang);
export const langPaths = () => LANGS.map((lang) => ({ params: { lang: langParam(lang) }, props: { lang } }));

/** Internal link in a language. */
export function url(path = '', lang: Lang = 'zh'): string {
  const clean = path.replace(/^\/+|\/+$/g, '');
  const prefix = lang === 'zh' ? '' : `/${lang}`;
  return clean ? `${prefix}/${clean}/` : `${prefix}/`;
}

/** The same page in the other language's tree. */
export function switchPath(path: string, to: Lang): string {
  const bare = path.replace(/^\/en(?=\/|$)/, '') || '/';
  return to === 'zh' ? bare : `/${to}${bare === '/' ? '/' : bare}`;
}

/** Joins a list the way each language does: 、 in Chinese, commas in English. */
export const joinList = (items: string[], lang: Lang) => items.join(lang === 'zh' ? '、' : ', ');

/** Sorting by title. */
export const compare = (lang: Lang) => (a: string, b: string) => a.localeCompare(b, lang);

export function formatDate(date: Date, lang: Lang): string {
  return new Intl.DateTimeFormat(HTML_LANG[lang], { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' }).format(date);
}

export function formatMinutes(total: number, lang: Lang): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (lang === 'en') {
    if (total < 60) return `${total} min`;
    return m ? `${h} hr ${m} min` : `${h} hr`;
  }
  if (total < 60) return `${total} 分钟`;
  return m ? `${h} 小时 ${m} 分钟` : `${h} 小时`;
}

export function formatTime({ prep, cook }: { prep: number; cook: number }, lang: Lang): string {
  const parts = [];
  if (prep) parts.push(`${lang === 'en' ? 'Prep' : '准备'} ${formatMinutes(prep, lang)}`);
  if (cook) parts.push(`${lang === 'en' ? 'Cook' : '烹饪'} ${formatMinutes(cook, lang)}`);
  return parts.join(' · ');
}

/** Short form for cards: the whole time from start to table. */
export function formatTotal({ prep, cook }: { prep: number; cook: number }, lang: Lang): string {
  return lang === 'en' ? `${formatMinutes(prep + cook, lang)} total` : `共 ${formatMinutes(prep + cook, lang)}`;
}

/** "12 道菜" / "12 recipes". */
export const dishCount = (n: number, lang: Lang) => (lang === 'en' ? `${n} ${n === 1 ? 'recipe' : 'recipes'}` : `${n} 道菜`);

/** The `lang` of a name in its own script, so it isn't set in a fake italic: 可乐鸡翅, 親子丼, 김치, ผัดไทย. */
export function scriptLang(text: string | undefined): string | undefined {
  if (!text) return undefined;
  if (/[぀-ヿ]/.test(text)) return 'ja';
  if (/[가-힯]/.test(text)) return 'ko';
  if (/[฀-๿]/.test(text)) return 'th';
  if (/[一-鿿]/.test(text)) return 'zh-CN';
  return undefined;
}
