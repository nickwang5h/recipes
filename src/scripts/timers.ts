// Step timers. Times written in a recipe's steps become buttons; running timers sit in a dock
// at the bottom of every page, so something can braise while another recipe is open.
// Timers are kept as end times in localStorage and survive reloads and navigation.
import { pageLang } from '../i18n';
import { findDurations, formatClock } from '../lib/timer';

const T = {
  zh: { dock: '计时器', up: '到点', ok: '知道了', cancel: '取消', step: (n: number) => `第 ${n} 步`, done: (label: string) => `${label}到了`, start: (clock: string) => `计时 ${clock}`, low: (clock: string) => `计时 ${clock}（范围的下限，到点先看一眼）` },
  en: { dock: 'Timers', up: 'Time’s up', ok: 'Got it', cancel: 'Cancel', step: (n: number) => `step ${n}`, done: (label: string) => `${label} is up`, start: (clock: string) => `Start a ${clock} timer`, low: (clock: string) => `Start a ${clock} timer (the low end of the range; check then)` },
};
const say = T[pageLang()];

interface Timer {
  id: string;
  /** Recipe title and step, for the dock and the notification. */
  title: string;
  href: string;
  step: number;
  label: string;
  /** Epoch ms. */
  end: number;
  /** Set once the alarm has gone off, so a reload doesn't ring again. */
  rung?: boolean;
}

const KEY = 'recipes:timers';
const read = (): Timer[] => {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
};
const write = (list: Timer[]) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {}
};

let timers = read();
let dock: HTMLElement | null = null;
let ticking: ReturnType<typeof setInterval> | undefined;
let audio: AudioContext | undefined;
let wake: WakeLockSentinel | null = null;

// ---------- Alarm ----------

/** Must first run inside a tap, which is why starting a timer calls it. */
function primeAudio() {
  try {
    audio ??= new AudioContext();
    void audio.resume();
  } catch {}
}

function beep() {
  if (!audio) return;
  for (let i = 0; i < 3; i++) {
    const at = audio.currentTime + i * 0.45;
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(0.4, at + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.3);
    osc.connect(gain).connect(audio.destination);
    osc.start(at);
    osc.stop(at + 0.32);
  }
}

async function ring(timer: Timer) {
  beep();
  navigator.vibrate?.([300, 150, 300, 150, 300]);
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  const title = say.done(timer.label);
  const options = { body: `${timer.title} · ${say.step(timer.step)}`, tag: timer.id, icon: '/icons/icon-192.png' };
  try {
    const registration = await navigator.serviceWorker?.getRegistration();
    if (registration) await registration.showNotification(title, options);
    else new Notification(title, options);
  } catch {}
}

// The page has to stay awake for a timer to ring, so hold the screen on while one runs.
async function holdScreen(on: boolean) {
  try {
    if (on && !wake && document.visibilityState === 'visible') {
      wake = await navigator.wakeLock?.request('screen');
      wake?.addEventListener('release', () => (wake = null));
    } else if (!on && wake) {
      await wake.release();
      wake = null;
    }
  } catch {}
}

// ---------- Dock ----------

function render() {
  const now = Date.now();
  if (!timers.length) {
    dock?.remove();
    dock = null;
    clearInterval(ticking);
    ticking = undefined;
    void holdScreen(false);
    markButtons();
    return;
  }
  if (!dock) {
    dock = document.createElement('div');
    dock.className = 'timer-dock';
    dock.setAttribute('role', 'region');
    dock.setAttribute('aria-label', say.dock);
    document.body.append(dock);
  }
  dock.replaceChildren(
    ...timers.map((timer) => {
      const left = (timer.end - now) / 1000;
      const row = document.createElement('div');
      row.className = `timer-row${left <= 0 ? ' is-done' : ''}`;
      const clock = document.createElement('span');
      clock.className = 'timer-clock';
      clock.textContent = left <= 0 ? say.up : formatClock(left);
      const link = document.createElement('a');
      link.href = timer.href;
      link.textContent = `${timer.title} · ${say.step(timer.step)}`;
      const close = document.createElement('button');
      close.type = 'button';
      close.textContent = left <= 0 ? say.ok : say.cancel;
      close.addEventListener('click', () => stop(timer.id));
      row.append(clock, link, close);
      return row;
    }),
  );
  ticking ??= setInterval(tick, 500);
  void holdScreen(timers.some((t) => t.end > now));
  markButtons();
}

function tick() {
  const now = Date.now();
  let changed = false;
  for (const t of timers) {
    if (t.end <= now && !t.rung) {
      t.rung = true;
      changed = true;
      void ring(t);
    }
  }
  if (changed) write(timers);
  render();
}

function stop(id: string) {
  timers = timers.filter((t) => t.id !== id);
  write(timers);
  render();
}

// ---------- Buttons in the steps ----------

const timerId = (step: number, index: number) => `${location.pathname}#${step}.${index}`;

function markButtons() {
  for (const b of document.querySelectorAll<HTMLElement>('.timer-btn')) {
    b.setAttribute('aria-pressed', String(timers.some((t) => t.id === b.dataset.timer)));
  }
}

function enhanceSteps() {
  const title = document.querySelector('h1')?.textContent ?? '';
  document.querySelectorAll<HTMLLIElement>('.recipe-content ol > li').forEach((li, i) => {
    const step = i + 1;
    let n = 0;
    const walker = document.createTreeWalker(li, NodeFilter.SHOW_TEXT, {
      acceptNode: (node) => (node.parentElement?.closest('a, button, .timer-btn') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
    });
    const nodes: Text[] = [];
    while (walker.nextNode()) nodes.push(walker.currentNode as Text);
    for (const node of nodes) {
      const found = findDurations(node.data);
      // Back to front, so earlier offsets stay valid as the node is split.
      for (const d of found.reverse()) {
        const range = document.createRange();
        range.setStart(node, d.index);
        range.setEnd(node, d.index + d.length);
        // A span rather than a <button>: a real button is an atomic inline box, which lets the
        // line break before the punctuation that follows it.
        const button = document.createElement('span');
        button.setAttribute('role', 'button');
        button.tabIndex = 0;
        button.className = 'timer-btn';
        button.dataset.timer = timerId(step, n++);
        button.title = d.maxSeconds ? say.low(formatClock(d.seconds)) : say.start(formatClock(d.seconds));
        button.addEventListener('keydown', (event) => {
          if (event.key !== 'Enter' && event.key !== ' ') return;
          event.preventDefault();
          button.click();
        });
        button.addEventListener('click', (event) => {
          event.stopPropagation();
          const id = button.dataset.timer!;
          if (timers.some((t) => t.id === id)) return stop(id);
          primeAudio();
          if (typeof Notification !== 'undefined' && Notification.permission === 'default') void Notification.requestPermission();
          timers.push({ id, title, href: location.pathname, step, label: d.text, end: Date.now() + d.seconds * 1000 });
          write(timers);
          render();
        });
        range.surroundContents(button);
      }
    }
  });
}

enhanceSteps();
render();
window.addEventListener('storage', (event) => {
  if (event.key !== KEY) return;
  timers = read();
  render();
});
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && timers.length) tick();
});
