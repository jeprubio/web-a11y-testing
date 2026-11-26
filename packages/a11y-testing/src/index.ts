import { test, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { scan, type ScanOptions } from './axe.js';
import { AccessibilityAssertions } from './elements.js';
import { drawFocusMap, resetFocus, walkTabOrder, type FocusInfo } from './focus.js';
import { KeyboardA11y } from './keyboard.js';
import { PageChecks } from './page-checks.js';

/**
 * Entry point of the DSL. Web port of `ComposeTestRule.accessibility { ... }`.
 *
 *   await a11y(page).keyboardFocus((k) => k.next().shouldFocus('skip-link'));
 *   await a11y(page).elementChecks(async (e) => { await e.element('title').isHeading(1); });
 *   await a11y(page).pageChecks((p) => p.hasSingleH1().hasNoPositiveTabindex());
 *   await a11y(page).axe();
 */
export class AccessibilityTestDsl {
  constructor(private readonly page: Page) {}

  /** Keyboard navigation and focus order checks. Kotlin: `keyboardFocus { ... }`. */
  async keyboardFocus(block: (k: KeyboardA11y) => PromiseLike<void> | void): Promise<void> {
    const keyboard = new KeyboardA11y(this.page);
    await block(keyboard);
    await keyboard; // runs anything the block queued but did not await
  }

  /** Accessible name, role, heading and state checks. Kotlin: `elementChecks { ... }`. */
  async elementChecks(block: (e: AccessibilityAssertions) => PromiseLike<void> | void): Promise<void> {
    const assertions = new AccessibilityAssertions(this.page);
    await block(assertions);
    await assertions.runPending(); // runs any chain the block created but did not await
  }

  /** Whole-page structure: language, title, headings, landmarks, tabindex. */
  async pageChecks(block: (p: PageChecks) => PromiseLike<void> | void): Promise<void> {
    const checks = new PageChecks(this.page);
    await block(checks);
    await checks;
  }

  /** Automated WCAG 2.2 AA scan with axe-core. */
  async axe(options?: ScanOptions): Promise<void> {
    await scan(this.page, options);
  }

  /**
   * Tabs through the whole page, draws numbered badges on every stop and saves a
   * full-page screenshot. Returns the stops so tests can assert on them too.
   */
  async focusMap(path: string): Promise<FocusInfo[]> {
    return test.step('draw focus order map', async () => {
      const { stops } = await walkTabOrder(this.page);
      await resetFocus(this.page);
      await this.page.evaluate(() => window.scrollTo(0, 0));
      await drawFocusMap(this.page, stops);
      await mkdir(dirname(path), { recursive: true });
      const image = await this.page.screenshot({ path, fullPage: true });
      await test.info().attach('focus-map', { body: image, contentType: 'image/png' });
      await test.info().attach('focus-order', {
        body: stops.map((s, i) => `${i + 1}. ${s.id}${s.label ? `  (${s.label})` : ''}`).join('\n'),
        contentType: 'text/plain',
      });
      return stops;
    });
  }
}

export function a11y(page: Page): AccessibilityTestDsl {
  return new AccessibilityTestDsl(page);
}

// Public API. Anything not exported here is internal and may change between versions.
export type { FocusInfo } from './focus.js';
export { focusedElement, walkTabOrder, pressTab, tabKey, NO_FOCUS } from './focus.js';
export { KeyboardA11y, FocusStep, type FocusOrderOptions } from './keyboard.js';
export { AccessibilityAssertions, ElementAccessibility } from './elements.js';
export { PageChecks } from './page-checks.js';
export { scan, WCAG_AA_TAGS, type ScanOptions } from './axe.js';
