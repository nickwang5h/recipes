// Shared pieces of the phone layout (≤760px): the media queries, layers that the back button
// closes, bottom sheets and a short status line. Nothing here runs or shows on wider screens.
import { pageLang } from '../i18n';

export const PHONE = '(max-width: 760px)';
export const phone = matchMedia(PHONE);
/** Swipes and other touch-only gestures. */
export const touch = matchMedia(`${PHONE} and (pointer: coarse)`);

// ---------- Layers ----------
// Cooking mode, the draw and every sheet push a history entry, so the phone's back button closes
// the top one instead of leaving the page. Closing by button goes through history too.

interface Layer {
  el: HTMLElement;
  close: () => void;
}
const stack: Layer[] = [];
// A close already sent but not yet answered by popstate, so a double tap on × closes one layer.
let pending = 0;

// Everything outside the top layer is inert: no tabbing or reading into the page behind.
// (A sheet's own scrim, the timer bar and the status line are left alone.)
let inerted: HTMLElement[] = [];
function isolate() {
  for (const el of inerted) el.inert = false;
  inerted = [];
  const top = stack.at(-1)?.el;
  for (let node: HTMLElement | null = top ?? null; node && node !== document.body; node = node.parentElement) {
    for (const sib of node.parentElement?.children ?? []) {
      // The scrim closes the sheet; the timer bar and the status line stay usable over any layer.
      if (sib === node || !(sib instanceof HTMLElement) || sib.inert || sib.matches('script, .sheet-scrim, .timer-dock, .toast')) continue;
      sib.inert = true;
      inerted.push(sib);
    }
  }
}

// While a layer is open the page doesn't scroll, and closing it must not put the page back where it was
// when the layer opened (cooking mode returns you to the step you reached; 目录 to the section you picked).
const restore = () => { history.scrollRestoration = 'auto'; };
addEventListener('pagehide', restore);

export function pushLayer(el: HTMLElement, close: () => void) {
  history.scrollRestoration = 'manual';
  stack.push({ el, close });
  history.pushState({ layer: stack.length }, '');
  isolate();
}

/** Closes the top layer the way the back button would. A second call before it has closed is ignored. */
export function popLayer() {
  if (!stack.length || pending) return;
  pending++;
  history.back();
}

// The entry's depth says how many layers should be open; close any above it. Moving forward into
// a layer's entry, which has nothing left to show, steps back out of it.
addEventListener('popstate', () => {
  pending = 0;
  const want = (history.state as { layer?: number } | null)?.layer ?? 0;
  if (want > stack.length) return history.go(stack.length - want);
  while (stack.length > want) stack.pop()!.close();
  isolate();
  if (!stack.length) setTimeout(restore, 0);
});
// A reload inside a layer leaves its entry behind with nothing open.
if ((history.state as { layer?: number } | null)?.layer) history.replaceState(null, '');
// Turning a tablet past 760px leaves the phone layout; every layer goes with it.
phone.addEventListener('change', (m) => {
  if (!m.matches && stack.length) history.go(-stack.length);
});

// ---------- Sheets ----------

const T = {
  zh: { close: '关闭' },
  en: { close: 'Close' },
}[pageLang()];

const X = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>';

export interface Sheet {
  root: HTMLElement;
  body: HTMLElement;
}

interface SheetOptions {
  title: string;
  /** Full screen, for the draw. */
  full?: boolean;
  /** From the right-hand side, for a table of contents; a swipe back to the right closes it. */
  side?: boolean;
  /** A text button in place of the ×, e.g. 好 on the fridge. */
  done?: string;
  /** Runs once the sheet is gone, however it was closed. */
  onClose?: () => void;
  className?: string;
}

/** A sheet from the bottom of the screen; the scrim, the × and the back button close it. */
export function openSheet({ title, full, side, done, onClose, className }: SheetOptions): Sheet {
  const opener = document.activeElement as HTMLElement | null;
  const scrim = document.createElement('div');
  scrim.className = 'sheet-scrim';
  const root = document.createElement('div');
  root.className = `sheet${full ? ' sheet-full' : ''}${side ? ' sheet-side' : ''}${className ? ` ${className}` : ''}`;
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');
  root.setAttribute('aria-label', title);
  root.tabIndex = -1;
  const head = document.createElement('div');
  head.className = 'sheet-head';
  const h = document.createElement('h2');
  h.textContent = title;
  const close = document.createElement('button');
  close.type = 'button';
  if (done) {
    close.className = 'sheet-done';
    close.textContent = done;
  } else {
    close.className = 'sheet-x';
    close.setAttribute('aria-label', T.close);
    close.innerHTML = X;
  }
  head.append(h, close);
  const body = document.createElement('div');
  body.className = 'sheet-body';
  const grab = document.createElement('div');
  grab.className = 'sheet-grab';
  root.append(grab, head, body);
  document.body.append(scrim, root);
  document.documentElement.classList.add('has-sheet');
  requestAnimationFrame(() => {
    scrim.classList.add('is-on');
    root.classList.add('is-on');
  });
  close.addEventListener('click', popLayer);
  scrim.addEventListener('click', popLayer);
  if (side) {
    let x0: number | null = null;
    root.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
    root.addEventListener('touchend', (e) => {
      if (x0 !== null && e.changedTouches[0].clientX - x0 > 60) popLayer();
      x0 = null;
    });
  }
  root.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      popLayer();
    }
  });
  pushLayer(root, () => {
    scrim.remove();
    root.remove();
    if (!document.querySelector('.sheet')) document.documentElement.classList.remove('has-sheet');
    onClose?.();
    opener?.focus?.({ preventScroll: true });
  });
  root.focus({ preventScroll: true });
  return { root, body };
}

// ---------- Status line ----------

let toastTimer: ReturnType<typeof setTimeout> | undefined;

/** One short line above the bottom bar, e.g. "已放进今天的菜单". */
export function toast(text: string) {
  let el = document.querySelector<HTMLElement>('.toast');
  if (!el) {
    el = document.createElement('div');
    el.className = 'toast';
    el.setAttribute('role', 'status');
    document.body.append(el);
  }
  el.textContent = text;
  el.classList.add('is-on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el!.classList.remove('is-on'), 2200);
}
