import { expect, type Page } from '@playwright/test';
import { Chain, StepQueue } from './chain.js';

/**
 * Whole-page structural checks that are tedious by hand but trivial for a script.
 *
 *   await a11y(page).pageChecks((p) =>
 *     p.hasLanguage().hasSingleH1().hasNoSkippedHeadingLevels().hasNoPositiveTabindex());
 */
export class PageChecks extends Chain {
  constructor(private readonly page: Page) {
    super(new StepQueue(page));
  }

  /** <html lang> is set, so screen readers use the right pronunciation (WCAG 3.1.1). */
  hasLanguage(expected?: string): this {
    this.queue.add('page declares its language', async () => {
      const lang = await this.page.locator('html').getAttribute('lang');
      expect(lang, '<html lang> attribute').toBeTruthy();
      if (expected) expect(lang).toBe(expected);
    });
    return this;
  }

  /** The page has a descriptive <title> (WCAG 2.4.2). */
  hasTitle(expected: string | RegExp): this {
    this.queue.add(`page title is ${String(expected)}`, () => expect(this.page).toHaveTitle(expected));
    return this;
  }

  /** Exactly one level-1 heading. */
  hasSingleH1(): this {
    this.queue.add('page has exactly one h1', async () => {
      await expect(this.page.getByRole('heading', { level: 1 })).toHaveCount(1);
    });
    return this;
  }

  /** Headings never jump more than one level down (h2 → h4 is a skip). */
  hasNoSkippedHeadingLevels(): this {
    this.queue.add('heading levels are not skipped', async () => {
      const outline = await headingOutline(this.page);
      const problems: string[] = [];
      outline.forEach((h, i) => {
        const previous = i === 0 ? 0 : outline[i - 1].level;
        if (h.level > previous + 1) problems.push(`h${previous} → h${h.level} "${h.text}"`);
      });
      expect(
        problems,
        `Skipped heading levels: ${problems.join('; ')}\nOutline:\n${formatOutline(outline)}`,
      ).toEqual([]);
    });
    return this;
  }

  /** The heading outline matches exactly, as a screen reader user would navigate it. */
  hasHeadingOutline(expected: string[]): this {
    this.queue.add('heading outline matches', async () => {
      const outline = await headingOutline(this.page);
      expect(outline.map((h) => `h${h.level} ${h.text}`)).toEqual(expected);
    });
    return this;
  }

  /** tabindex > 0 overrides the natural order and almost always creates a confusing sequence. */
  hasNoPositiveTabindex(): this {
    this.queue.add('no element uses a positive tabindex', async () => {
      const offenders = await this.page.$$eval('[tabindex]', (els) =>
        els
          .filter((el) => Number(el.getAttribute('tabindex')) > 0)
          .map((el) => `${(el as HTMLElement).dataset.testid ?? el.tagName.toLowerCase()} (tabindex=${el.getAttribute('tabindex')})`),
      );
      expect(offenders, `Elements with tabindex > 0: ${offenders.join(', ')}`).toEqual([]);
    });
    return this;
  }

  /** The landmark regions screen reader users jump between are present. */
  hasLandmarks(roles: ('banner' | 'navigation' | 'main' | 'contentinfo' | 'complementary' | 'search' | 'form' | 'region')[]): this {
    this.queue.add(`landmarks present: ${roles.join(', ')}`, async () => {
      for (const role of roles) {
        await expect(this.page.getByRole(role).first(), `landmark "${role}"`).toBeAttached();
      }
      await expect(this.page.getByRole('main'), 'exactly one main landmark').toHaveCount(1);
    });
    return this;
  }

  /**
   * Content reflows at 320 CSS px wide, the width of a 1280 px window zoomed to 400 %
   * (WCAG 1.4.10 Reflow): no horizontal scrolling, and no content pushed or cut off past
   * the right edge. Decorative `aria-hidden` content is ignored. The viewport is restored after.
   */
  reflowsAt(width = 320, height = 800): this {
    this.queue.add(`content reflows at ${width} CSS px wide`, async () => {
      const original = this.page.viewportSize();
      await this.page.setViewportSize({ width, height });
      try {
        await nextFrame(this.page);
        const problems = await horizontalOverflow(this.page);
        expect(problems, `Content does not fit ${width} CSS px (WCAG 1.4.10 Reflow):\n  ${problems.join('\n  ')}`).toEqual([]);
      } finally {
        if (original) await this.page.setViewportSize(original);
      }
    });
    return this;
  }

  /**
   * Nothing is cut off when users override text spacing (WCAG 1.4.12): line height 1.5,
   * paragraph spacing 2em, letter spacing 0.12em and word spacing 0.16em, the values from
   * the WCAG test. The override is removed afterwards.
   */
  survivesTextSpacing(): this {
    this.queue.add('text spacing can be increased without losing content', async () => {
      const override = await this.page.addStyleTag({
        content: `
          *:not(svg *) { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important; }
          p { margin-bottom: 2em !important; }`,
      });
      try {
        await nextFrame(this.page);
        const clipped = await this.page.evaluate(() => {
          const out: string[] = [];
          for (const el of Array.from(document.body.querySelectorAll<HTMLElement>('*'))) {
            if (el.closest('[aria-hidden="true"], dialog:not([open])')) continue;
      // Not rendered: inside a closed <details>, display:none, visibility:hidden or content-visibility:hidden.
      if (typeof el.checkVisibility === 'function' && !el.checkVisibility({ visibilityProperty: true, contentVisibilityAuto: false })) continue;
            if (!el.textContent?.trim()) continue;
            if (el.clientWidth <= 1 || el.clientHeight <= 1) continue; // visually hidden text
            const style = getComputedStyle(el);
            const clipsX = style.overflowX === 'hidden' || style.overflowX === 'clip';
            const clipsY = style.overflowY === 'hidden' || style.overflowY === 'clip';
            const lostX = clipsX && el.scrollWidth > el.clientWidth + 1;
            const lostY = clipsY && el.scrollHeight > el.clientHeight + 1;
            if (lostX || lostY) {
              const name = el.dataset.testid ?? `${el.tagName.toLowerCase()}${el.className ? '.' + String(el.className).split(' ')[0] : ''}`;
              out.push(`${name}: "${(el.innerText || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40)}" is cut off`);
            }
          }
          return out;
        });
        const overflow = await horizontalOverflow(this.page);
        const problems = [...clipped, ...overflow];
        expect(problems, `Text is lost with increased text spacing (WCAG 1.4.12):\n  ${problems.join('\n  ')}`).toEqual([]);
      } finally {
        await override.evaluate((el) => (el as Element).remove());
      }
    });
    return this;
  }

  /**
   * With "reduce motion" turned on, nothing animates (WCAG 2.3.3). The page is reloaded
   * with the setting on, as a user who already has it enabled would load it, and stays in
   * that state afterwards: put this check last, or reload the page before further checks.
   */
  respectsReducedMotion(): this {
    this.queue.add('nothing animates when reduced motion is requested', async () => {
      await this.page.emulateMedia({ reducedMotion: 'reduce' });
      await this.page.reload();
      await this.page.waitForLoadState('load');
      await nextFrame(this.page);
      const running = await runningAnimations(this.page, 0);
      expect(running, `Animations still running with prefers-reduced-motion: reduce:\n  ${running.join('\n  ')}`).toEqual([]);
    });
    return this;
  }

  /**
   * No animation runs for more than `maxSeconds` (default 5): WCAG 2.2.2 Pause, Stop, Hide
   * requires a way to pause anything that moves longer than that. Run it with motion
   * allowed, usually after using the page's own pause control.
   */
  hasNoEndlessAnimations(maxSeconds = 5): this {
    this.queue.add(`no animation runs longer than ${maxSeconds} s without being paused`, async () => {
      await nextFrame(this.page);
      const running = await runningAnimations(this.page, maxSeconds * 1000);
      expect(
        running,
        `Animations running longer than ${maxSeconds} s with no way to pause them (WCAG 2.2.2):\n  ${running.join('\n  ')}`,
      ).toEqual([]);
    });
    return this;
  }

  /** Every <img> has an alt attribute (empty alt is fine for decorative images). */
  imagesHaveAlt(): this {
    this.queue.add('every image has an alt attribute', async () => {
      const missing = await this.page.$$eval('img:not([alt])', (imgs) =>
        imgs.map((img) => (img as HTMLElement).dataset.testid ?? (img as HTMLImageElement).src.slice(0, 40)),
      );
      expect(missing, 'Images without alt').toEqual([]);
    });
    return this;
  }
}

interface Heading {
  level: number;
  text: string;
}

async function headingOutline(page: Page): Promise<Heading[]> {
  return page.$$eval('h1, h2, h3, h4, h5, h6, [role="heading"]', (els) =>
    els
      .filter((el) => !el.closest('dialog:not([open]), [hidden], [aria-hidden="true"]'))
      .map((el) => ({
        level: Number(el.getAttribute('aria-level') ?? el.tagName.slice(1)) || 2,
        text: (el.textContent ?? '').replace(/\s+/g, ' ').trim(),
      })),
  );
}

function formatOutline(outline: Heading[]): string {
  return outline.map((h) => `${'  '.repeat(h.level - 1)}h${h.level} ${h.text}`).join('\n');
}

async function nextFrame(page: Page): Promise<void> {
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
}

/** Elements that stick out past the left or right edge of the viewport, plus page-level horizontal scrolling. */
async function horizontalOverflow(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const out: string[] = [];
    // overflow on <body> propagates to the viewport when <html> leaves it visible.
    const htmlOverflow = getComputedStyle(document.documentElement).overflowX;
    const viewportOverflow = htmlOverflow === 'visible' ? getComputedStyle(document.body).overflowX : htmlOverflow;
    const viewportScrolls = viewportOverflow !== 'hidden' && viewportOverflow !== 'clip';
    const scrollWidth = document.documentElement.scrollWidth;
    if (viewportScrolls && scrollWidth > vw + 1) out.push(`the page scrolls horizontally (${scrollWidth}px wide in a ${vw}px viewport)`);

    const offenders = new Set<Element>();
    for (const el of Array.from(document.body.querySelectorAll<HTMLElement>('*'))) {
      if (el.closest('[aria-hidden="true"], dialog:not([open])')) continue;
      // Not rendered: inside a closed <details>, display:none, visibility:hidden or content-visibility:hidden.
      if (typeof el.checkVisibility === 'function' && !el.checkVisibility({ visibilityProperty: true, contentVisibilityAuto: false })) continue;
      const r = el.getBoundingClientRect();
      if (r.width <= 1 || r.height <= 1) continue;
      if (r.right <= vw + 1 && r.left >= -1) continue;
      const hasContent = Array.from(el.childNodes).some((n) => n.nodeType === Node.TEXT_NODE && n.textContent?.trim())
        || ['IMG', 'SVG', 'INPUT', 'BUTTON', 'SELECT', 'TEXTAREA', 'VIDEO', 'CANVAS'].includes(el.tagName.toUpperCase());
      if (!hasContent) continue;
      offenders.add(el);
    }
    for (const el of offenders) {
      if (el.parentElement && offenders.has(el.parentElement)) continue; // report the outermost one
      const r = el.getBoundingClientRect();
      const name = (el as HTMLElement).dataset.testid ?? `${el.tagName.toLowerCase()}${el.className && typeof el.className === 'string' ? '.' + el.className.split(' ')[0] : ''}`;
      const text = ((el as HTMLElement).innerText || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40);
      out.push(`${name}${text ? ` "${text}"` : ''} spans ${Math.round(r.left)}px to ${Math.round(r.right)}px`);
      if (out.length >= 10) break;
    }
    return out;
  });
}

/** Running animations that last longer than `minMs` (Infinity for endless ones), described for reports. */
async function runningAnimations(page: Page, minMs: number): Promise<string[]> {
  return page.evaluate((min) => {
    return document
      .getAnimations()
      .filter((a) => a.playState === 'running')
      .filter((a) => Number(a.effect?.getComputedTiming().endTime) > min)
      .map((a) => {
        const effect = a.effect as KeyframeEffect | null;
        const target = effect?.target as HTMLElement | null;
        const pseudo = effect?.pseudoElement ?? '';
        const name = (a as CSSAnimation).animationName ?? (a as CSSTransition).transitionProperty ?? a.id ?? 'animation';
        const where = target
          ? target.dataset?.testid ?? `${target.tagName.toLowerCase()}${typeof target.className === 'string' && target.className ? '.' + target.className.split(' ')[0] : ''}`
          : 'unknown element';
        const end = effect?.getComputedTiming().endTime;
        const length = end === Infinity ? 'endless' : `${Math.round(Number(end) / 100) / 10}s`;
        return `${name} on ${where}${pseudo} (${length})`;
      });
  }, minMs);
}

