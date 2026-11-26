import { expect, type Page } from '@playwright/test';
import { Chain, StepQueue } from './chain';

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
      expect(problems, `Skipped heading levels. Outline:\n${formatOutline(outline)}`).toEqual([]);
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
      expect(offenders, 'Elements with tabindex > 0').toEqual([]);
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
