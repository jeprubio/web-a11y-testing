import { expect, type Page } from '@playwright/test';
import { Chain, StepQueue } from './chain.js';
import { focusedElement, NO_FOCUS, pressTab, resetFocus, walkTabOrder, type FocusInfo } from './focus.js';

export interface FocusOrderOptions {
  /** Also walk the sequence backwards with Shift+Tab. Default: true. */
  reverse?: boolean;
  /** Fail if any stop has no visible focus indicator. Default: true. */
  checkFocusVisible?: boolean;
  /** Fail if any stop is entirely hidden, for example under a sticky header (WCAG 2.4.11). Default: true. */
  checkNotObscured?: boolean;
  /** Start from a clean state (nothing focused) before tabbing. Default: true. */
  fromStart?: boolean;
}

const describe = (info: FocusInfo | null) => (info ? info.id : NO_FOCUS);

/**
 * Keyboard focus DSL. Port of `KeyboardA11y` from the Android a11ytesting library.
 *
 *   await a11y(page).keyboardFocus((k) =>
 *     k.assertNoFocus()
 *       .next().shouldFocus('skip-link')
 *       .next().shouldFocus('nav-about')
 *       .previous().shouldFocus('skip-link'));
 */
export class KeyboardA11y extends Chain {
  constructor(
    private readonly page: Page,
    queue: StepQueue = new StepQueue(page),
  ) {
    super(queue);
  }

  /** Asserts that no element has keyboard focus yet. */
  assertNoFocus(): this {
    this.queue.add('no element is focused', async () => {
      const info = await focusedElement(this.page);
      expect(info, `Expected no focused element, but focus is on "${describe(info)}"`).toBeNull();
    });
    return this;
  }

  /** Clears focus so the next Tab starts from the top of the page. */
  resetFocus(): this {
    this.queue.add('reset focus to the start of the page', () => resetFocus(this.page));
    return this;
  }

  /** Presses Tab. Equivalent of `next()` in the Kotlin DSL. */
  next(): FocusStep {
    this.queue.add('press Tab', () => pressTab(this.page));
    return new FocusStep(this.page, this.queue, this);
  }

  /** Presses Shift+Tab. Equivalent of `previous()` in the Kotlin DSL. */
  previous(): FocusStep {
    this.queue.add('press Shift+Tab', () => pressTab(this.page, true));
    return new FocusStep(this.page, this.queue, this);
  }

  /** Presses any key, for example `Enter`, `Space`, `Escape` or `ArrowDown`. */
  press(key: string): FocusStep {
    this.queue.add(`press ${key}`, () => this.page.keyboard.press(key));
    return new FocusStep(this.page, this.queue, this);
  }

  /** Presses Tab until the element with `testId` has focus. Fails after `maxStops`. */
  tabTo(testId: string, maxStops = 50): this {
    this.queue.add(`Tab until "${testId}" is focused`, async () => {
      const visited: string[] = [];
      for (let i = 0; i < maxStops; i++) {
        await pressTab(this.page);
        const info = await focusedElement(this.page);
        visited.push(describe(info));
        if (info?.testId === testId) return;
      }
      throw new Error(`"${testId}" was never reached with Tab. Visited:\n  ${visited.join('\n  ')}`);
    });
    return this;
  }

  /** Asserts that the element with `testId` has focus. */
  assertFocusOn(testId: string): this {
    this.queue.add(`"${testId}" is focused`, () => assertFocused(this.page, testId));
    return this;
  }

  /** Asserts that the focused element shows a focus indicator (outline or box-shadow). */
  assertFocusVisible(): this {
    this.queue.add('focused element has a visible focus indicator', () => assertFocusVisible(this.page));
    return this;
  }

  /** Asserts that the focused element is not entirely hidden, for example under a sticky header (WCAG 2.4.11). */
  assertFocusNotObscured(): this {
    this.queue.add('focused element is not hidden by other content', async () => {
      const info = await focusedElement(this.page);
      expect(info, 'Expected a focused element').not.toBeNull();
      expect(
        info!.obscured,
        `"${info!.id}" is focused but entirely hidden by other content or off screen (WCAG 2.4.11 Focus Not Obscured)`,
      ).toBe(false);
    });
    return this;
  }

  /**
   * The one-liner for testers: declare the expected tab order and the DSL walks it,
   * forwards and backwards, checking the focus indicator at every stop. On failure it
   * prints the expected and actual order side by side.
   */
  expectFocusOrder(expected: string[], options: FocusOrderOptions = {}): this {
    const { reverse = true, checkFocusVisible = true, checkNotObscured = true, fromStart = true } = options;
    this.queue.add(`focus order is ${expected.join(' → ')}`, async () => {
      if (fromStart) await resetFocus(this.page);

      const forward = await this.collect(false, expected.length);
      assertSequence('forward (Tab)', expected, forward);
      if (checkFocusVisible) assertAllVisible(forward);
      if (checkNotObscured) assertNoneObscured('forward (Tab)', forward);

      if (reverse && expected.length > 1) {
        const backwardExpected = expected.slice(0, -1).reverse();
        const backward = await this.collect(true, backwardExpected.length);
        assertSequence('backward (Shift+Tab)', backwardExpected, backward);
        if (checkNotObscured) assertNoneObscured('backward (Shift+Tab)', backward);
      }
    });
    return this;
  }

  /**
   * Asserts there is no keyboard trap: tabbing from the start eventually leaves the page
   * or comes back to the first element (WCAG 2.1.2 No Keyboard Trap).
   */
  assertNoKeyboardTrap(maxStops = 100): this {
    this.queue.add('no keyboard trap on the page', async () => {
      const { stops, wrapped } = await walkTabOrder(this.page, maxStops);
      expect(stops.length, 'The page should have at least one focusable element').toBeGreaterThan(0);
      expect(
        wrapped,
        `Focus never left the page or returned to the start after ${maxStops} Tab presses. ` +
          `Last stops: ${stops.slice(-5).map((s) => s.id).join(', ')}`,
      ).toBe(true);
    });
    return this;
  }

  /**
   * Asserts that focus stays inside `containerTestId` (a modal dialog, for example) while
   * pressing Tab and Shift+Tab around the whole cycle twice.
   */
  assertFocusTrappedIn(containerTestId: string, presses = 8): this {
    this.queue.add(`focus stays inside "${containerTestId}"`, async () => {
      const container = this.page.getByTestId(containerTestId);
      for (const backwards of [false, true]) {
        const key = backwards ? 'Shift+Tab' : 'Tab';
        for (let i = 0; i < presses; i++) {
          await pressTab(this.page, backwards);
          const inside = await container.evaluate((el) => el.contains(document.activeElement));
          const info = await focusedElement(this.page);
          expect(
            inside,
            `After ${i + 1}× ${key}, focus escaped "${containerTestId}" and is on "${describe(info)}"`,
          ).toBe(true);
        }
      }
    });
    return this;
  }

  private async collect(backwards: boolean, count: number): Promise<(FocusInfo | null)[]> {
    const result: (FocusInfo | null)[] = [];
    for (let i = 0; i < count; i++) {
      await pressTab(this.page, backwards);
      result.push(await focusedElement(this.page));
    }
    return result;
  }
}

/** The result of a key press; lets the chain read like `next().shouldFocus("x")`. */
export class FocusStep extends Chain {
  constructor(
    private readonly page: Page,
    queue: StepQueue,
    private readonly parent: KeyboardA11y,
  ) {
    super(queue);
  }

  /** The element with `testId` must now have focus. Kotlin: `next() shouldFocus "tag"`. */
  shouldFocus(testId: string): KeyboardA11y {
    this.queue.add(`→ "${testId}" is focused`, () => assertFocused(this.page, testId));
    return this.parent;
  }

  /** Same as `shouldFocus`, and the focus indicator must be visible. */
  shouldFocusVisibly(testId: string): KeyboardA11y {
    this.queue.add(`→ "${testId}" is focused with a visible indicator`, async () => {
      await assertFocused(this.page, testId);
      await assertFocusVisible(this.page);
    });
    return this.parent;
  }

  /** The focused element must have this accessible name. Kotlin: `focusedMatches(...)`. */
  focusedHasName(name: string | RegExp): KeyboardA11y {
    this.queue.add(`→ focused element is named ${String(name)}`, async () => {
      await expect(this.page.locator(':focus')).toHaveAccessibleName(name);
    });
    return this.parent;
  }

  /** Nothing on the page should have focus (for example, focus was lost after closing a dialog). */
  shouldLoseFocus(): KeyboardA11y {
    this.queue.add('→ no element is focused', async () => {
      expect(await focusedElement(this.page)).toBeNull();
    });
    return this.parent;
  }

  /** Continue the chain without asserting anything about this step. */
  and(): KeyboardA11y {
    return this.parent;
  }
}

async function assertFocused(page: Page, testId: string): Promise<void> {
  const info = await focusedElement(page);
  expect(info?.testId, `Expected focus on "${testId}", but focus is on "${describe(info)}"`).toBe(testId);
}

async function assertFocusVisible(page: Page): Promise<void> {
  const info = await focusedElement(page);
  expect(info, 'Expected a focused element').not.toBeNull();
  expect(info!.focusVisible, `"${info!.id}" is focused but has no visible focus indicator (WCAG 2.4.7)`).toBe(true);
}

function assertSequence(direction: string, expected: string[], actual: (FocusInfo | null)[]): void {
  const actualIds = actual.map(describe);
  const mismatch = expected.some((id, i) => actual[i]?.testId !== id);
  if (!mismatch) return;

  const width = Math.max(8, ...expected.map((e) => e.length));
  const rows = expected.map((id, i) => {
    const ok = actual[i]?.testId === id;
    return `  ${ok ? ' ' : '✗'} ${String(i + 1).padStart(2)}  ${id.padEnd(width)}  ${actualIds[i]}`;
  });
  throw new Error(
    `Focus order mismatch, ${direction}:\n` +
      `     #  ${'expected'.padEnd(width)}  actual\n` +
      rows.join('\n'),
  );
}

function assertNoneObscured(direction: string, stops: (FocusInfo | null)[]): void {
  const hidden = stops.filter((s): s is FocusInfo => s !== null && s.obscured).map((s) => s.id);
  if (hidden.length > 0) {
    throw new Error(
      `Focused element entirely hidden by other content, ${direction} (WCAG 2.4.11 Focus Not Obscured): ${hidden.join(', ')}`,
    );
  }
}

function assertAllVisible(stops: (FocusInfo | null)[]): void {
  const invisible = stops.filter((s): s is FocusInfo => s !== null && !s.focusVisible).map((s) => s.id);
  if (invisible.length > 0) {
    throw new Error(`No visible focus indicator (WCAG 2.4.7) on: ${invisible.join(', ')}`);
  }
}
