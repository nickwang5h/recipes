// Small DOM helpers shared by the client-rendered pages (fridge, 我的, 菜单).

export const el = <K extends keyof HTMLElementTagNameMap>(tag: K, props: Partial<HTMLElementTagNameMap[K]> = {}, ...kids: (Node | string)[]) => {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...kids);
  return node;
};

/** Same empty-plate stand-in as RecipeCard.astro. */
export const PLATE =
  '<svg viewBox="0 0 120 72" fill="none" stroke="currentColor" stroke-width="2"><ellipse cx="60" cy="38" rx="54" ry="28"/><ellipse cx="60" cy="38" rx="36" ry="17"/></svg>';

export interface CardRecipe {
  href: string;
  title: string;
  summary: string;
  time: string;
  img?: string;
}

/** The client twin of RecipeCard.astro. `extra` goes between the title and the summary. */
export function recipeCard(r: CardRecipe, cuisine: { title: string; accent: string }, extra: Node[] = []): HTMLAnchorElement {
  const body: HTMLDivElement = el('div', { className: 'card-body' }, el('h3', { textContent: r.title }));
  body.append(
    ...extra,
    el('p', { className: 'card-summary', textContent: r.summary }),
    el('div', { className: 'meta' }, el('span', { className: `cuisine-tag accent-${cuisine.accent}`, textContent: cuisine.title }), el('span', { textContent: r.time })),
  );
  const a: HTMLAnchorElement = el('a', { className: `card has-cover accent-${cuisine.accent}`, href: r.href });
  if (r.img) {
    const img = document.createElement('img');
    Object.assign(img, { className: 'card-img', src: r.img, alt: '', loading: 'lazy', width: 480, height: 320 });
    a.append(img);
  } else {
    const ph: HTMLDivElement = el('div', { className: 'card-img card-ph', innerHTML: PLATE });
    ph.setAttribute('aria-hidden', 'true');
    a.append(ph);
  }
  a.append(body);
  return a;
}

/** A short-lived status message next to a button. */
export function flash(target: HTMLElement, text: string, ms = 2500) {
  target.textContent = text;
  setTimeout(() => {
    if (target.textContent === text) target.textContent = '';
  }, ms);
}
