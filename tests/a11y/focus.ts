import type { Page } from '@playwright/test';

/** What we know about the element that currently has keyboard focus. */
export interface FocusInfo {
  /** `data-testid` when present, otherwise a readable fallback such as `button "Close"`. */
  id: string;
  testId: string | null;
  tag: string;
  label: string;
  focusVisible: boolean;
  inDialog: boolean;
  /** Position in document coordinates (viewport coordinates for sticky/fixed elements). */
  rect: { x: number; y: number; width: number; height: number };
}

/**
 * The key that moves to the next focusable element.
 *
 * Safari (WebKit) only tabs between form fields by default; links and buttons are skipped
 * unless the user enables "Press Tab to highlight each item". Option+Tab always visits every
 * element, so we use it in WebKit to test the full keyboard order like other browsers.
 */
export function tabKey(page: Page, backwards = false): string {
  const isWebKit = page.context().browser()?.browserType().name() === 'webkit';
  const key = isWebKit ? 'Alt+Tab' : 'Tab';
  return backwards ? `Shift+${key}` : key;
}

/** Presses the platform's "next element" key (Shift for previous). */
export async function pressTab(page: Page, backwards = false): Promise<void> {
  await page.keyboard.press(tabKey(page, backwards));
}

/** Label used in reports when focus is not on any element of the page. */
export const NO_FOCUS = '<no element: focus is on the page body or left the page>';

/** Reads the currently focused element. Returns null when focus is on <body> or outside the page. */
export async function focusedElement(page: Page): Promise<FocusInfo | null> {
  return page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    if (!el || el === document.body || el === document.documentElement) return null;

    const style = getComputedStyle(el);
    const hasOutline = style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) > 0;
    const hasShadow = style.boxShadow !== '' && style.boxShadow !== 'none';

    const label = (el.getAttribute('aria-label') ?? el.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 60);
    const tag = el.tagName.toLowerCase();
    const testId = el.dataset.testid ?? null;
    const fallback = el.id ? `${tag}#${el.id}` : `${tag}${label ? ` "${label}"` : ''}`;

    let pinned = false;
    for (let node: HTMLElement | null = el; node; node = node.parentElement) {
      const position = getComputedStyle(node).position;
      if (position === 'sticky' || position === 'fixed') {
        pinned = true;
        break;
      }
    }
    const r = el.getBoundingClientRect();
    const dx = pinned ? 0 : window.scrollX;
    const dy = pinned ? 0 : window.scrollY;

    return {
      id: testId ?? fallback,
      testId,
      tag,
      label,
      focusVisible: hasOutline || hasShadow,
      inDialog: el.closest('dialog') !== null,
      rect: { x: r.x + dx, y: r.y + dy, width: r.width, height: r.height },
    };
  });
}

/** Removes focus from whatever has it, putting the page back to its initial "nothing focused" state. */
export async function resetFocus(page: Page): Promise<void> {
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
}

/**
 * Tabs through the page from the start and records every stop until focus leaves the
 * page or comes back to the first stop. This is what a manual tester does with a notepad.
 */
export async function walkTabOrder(page: Page, maxStops = 100): Promise<{ stops: FocusInfo[]; wrapped: boolean }> {
  await resetFocus(page);
  const stops: FocusInfo[] = [];
  for (let i = 0; i < maxStops; i++) {
    await pressTab(page);
    const info = await focusedElement(page);
    if (!info) return { stops, wrapped: stops.length > 0 };
    if (stops.length > 0 && info.id === stops[0].id) return { stops, wrapped: true };
    stops.push(info);
  }
  return { stops, wrapped: false };
}

/**
 * Draws numbered badges and a connecting path over every tab stop, so the focus order
 * can be reviewed at a glance in a screenshot.
 */
export async function drawFocusMap(page: Page, stops: FocusInfo[]): Promise<void> {
  await page.evaluate((items) => {
    document.getElementById('a11y-focus-map')?.remove();
    const width = document.documentElement.scrollWidth;
    const height = document.documentElement.scrollHeight;
    const ns = 'http://www.w3.org/2000/svg';

    const svg = document.createElementNS(ns, 'svg');
    svg.id = 'a11y-focus-map';
    svg.setAttribute('width', String(width));
    svg.setAttribute('height', String(height));
    svg.setAttribute('aria-hidden', 'true');
    Object.assign(svg.style, {
      position: 'absolute',
      top: '0',
      left: '0',
      zIndex: '10000',
      pointerEvents: 'none',
    });

    const centres = items.map((s) => [s.rect.x + s.rect.width / 2, s.rect.y + s.rect.height / 2]);
    const path = document.createElementNS(ns, 'polyline');
    path.setAttribute('points', centres.map(([x, y]) => `${x},${y}`).join(' '));
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', '#ff4fa3');
    path.setAttribute('stroke-width', '2');
    path.setAttribute('stroke-dasharray', '6 4');
    svg.append(path);

    items.forEach((s, index) => {
      const box = document.createElementNS(ns, 'rect');
      box.setAttribute('x', String(s.rect.x - 3));
      box.setAttribute('y', String(s.rect.y - 3));
      box.setAttribute('width', String(s.rect.width + 6));
      box.setAttribute('height', String(s.rect.height + 6));
      box.setAttribute('fill', 'none');
      box.setAttribute('stroke', '#ff4fa3');
      box.setAttribute('stroke-width', '2');
      box.setAttribute('rx', '4');
      svg.append(box);

      const cx = s.rect.x - 4;
      const cy = s.rect.y - 4;
      const badge = document.createElementNS(ns, 'circle');
      badge.setAttribute('cx', String(cx));
      badge.setAttribute('cy', String(cy));
      badge.setAttribute('r', '12');
      badge.setAttribute('fill', '#ff4fa3');
      svg.append(badge);

      const label = document.createElementNS(ns, 'text');
      label.setAttribute('x', String(cx));
      label.setAttribute('y', String(cy + 4));
      label.setAttribute('text-anchor', 'middle');
      label.setAttribute('font-size', '12');
      label.setAttribute('font-weight', '700');
      label.setAttribute('font-family', 'system-ui, sans-serif');
      label.setAttribute('fill', '#ffffff');
      label.textContent = String(index + 1);
      svg.append(label);
    });

    document.body.append(svg);
  }, stops);
}
