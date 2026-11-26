import { expect, type Locator, type Page } from '@playwright/test';
import { Chain, StepQueue } from './chain.js';

type AriaRole = Parameters<Page['getByRole']>[0];

/**
 * Element checks DSL. Port of `AccessibilityAssertions` / `ElementAccessibility`.
 *
 * Compose "content description" maps to the web's *accessible name*, which the browser
 * computes from aria-labelledby, aria-label, <label>, alt, text content or title.
 * Playwright reads the real computed value, so these checks see what a screen reader sees.
 *
 *   await a11y(page).elementChecks(async (e) => {
 *     await e.element('page-title').isHeading(1).hasText('Equinox Night');
 *     await e.element('dialog-close').hasAccessibleName('Close event details');
 *   });
 */
export class AccessibilityAssertions {
  constructor(private readonly page: Page) {}

  /** Element by `data-testid`. Kotlin: `element(identifier)`, which used the test tag. */
  element(testId: string): ElementAccessibility {
    return new ElementAccessibility(this.page, this.page.getByTestId(testId), `[data-testid="${testId}"]`);
  }

  /** Element by visible text. Kotlin: `elementWithText(text)`. */
  elementWithText(text: string | RegExp): ElementAccessibility {
    return new ElementAccessibility(this.page, this.page.getByText(text).first(), `text=${String(text)}`);
  }

  /** Element by role and accessible name, the way assistive technology finds it. */
  elementWithRole(role: AriaRole, name?: string | RegExp): ElementAccessibility {
    const label = name ? `role=${role}[name=${String(name)}]` : `role=${role}`;
    return new ElementAccessibility(this.page, this.page.getByRole(role, name ? { name } : {}), label);
  }

  /** Element from any Playwright locator. */
  locator(locator: Locator, label = locator.toString()): ElementAccessibility {
    return new ElementAccessibility(this.page, locator, label);
  }
}

export class ElementAccessibility extends Chain {
  constructor(
    page: Page,
    private readonly node: Locator,
    private readonly label: string,
  ) {
    super(new StepQueue(page));
  }

  private check(description: string, run: (node: Locator) => Promise<void>): this {
    this.queue.add(`${this.label}: ${description}`, () => run(this.node));
    return this;
  }

  // --- Accessible name (Compose: content description) ---------------------------------

  /** Kotlin: `hasContentDescription(expected)`. */
  hasAccessibleName(expected: string | RegExp): this {
    return this.check(`accessible name is ${String(expected)}`, (n) => expect(n).toHaveAccessibleName(expected));
  }

  /** Kotlin: `hasContentDescriptionContaining(partial)`. Case-insensitive. */
  hasAccessibleNameContaining(partial: string): this {
    return this.check(`accessible name contains "${partial}"`, (n) =>
      expect(n).toHaveAccessibleName(new RegExp(escapeRegExp(partial), 'i')),
    );
  }

  /** Kotlin: `hasContentDescriptionMatching(regex)`. */
  hasAccessibleNameMatching(regex: RegExp): this {
    return this.check(`accessible name matches ${regex}`, (n) => expect(n).toHaveAccessibleName(regex));
  }

  /** Kotlin: `hasNonBlankContentDescription()`. */
  hasNonBlankAccessibleName(): this {
    return this.check('accessible name is not blank', (n) => expect(n).toHaveAccessibleName(/\S/));
  }

  /** Kotlin: `hasNoContentDescription()`. Use for decorative elements. */
  hasNoAccessibleName(): this {
    return this.check('has no accessible name', (n) => expect(n).toHaveAccessibleName(''));
  }

  /** Extra context read after the name: aria-describedby, hints, error messages. */
  hasAccessibleDescription(expected: string | RegExp): this {
    return this.check(`accessible description is ${String(expected)}`, (n) =>
      expect(n).toHaveAccessibleDescription(expected),
    );
  }

  /** Case-insensitive partial match on the accessible description. */
  hasAccessibleDescriptionContaining(partial: string): this {
    return this.check(`accessible description contains "${partial}"`, (n) =>
      expect(n).toHaveAccessibleDescription(new RegExp(escapeRegExp(partial), 'i')),
    );
  }

  // --- Role and structure -------------------------------------------------------------

  hasRole(role: AriaRole): this {
    return this.check(`role is "${role}"`, (n) => expect(n).toHaveRole(role));
  }

  /** Kotlin: `isHeading()`, plus an optional level check (h1 = 1). */
  isHeading(level?: number): this {
    return this.check(level ? `is a level ${level} heading` : 'is a heading', async (n) => {
      await expect(n).toHaveRole('heading');
      if (level !== undefined) {
        const actual = await n.evaluate((el) => {
          const aria = el.getAttribute('aria-level');
          if (aria) return Number(aria);
          const match = /^H([1-6])$/.exec(el.tagName);
          return match ? Number(match[1]) : 2;
        });
        expect(actual, `heading level`).toBe(level);
      }
    });
  }

  /** Kotlin: `isNotHeading()`. */
  isNotHeading(): this {
    return this.check('is not a heading', (n) => expect(n).not.toHaveRole('heading'));
  }

  // --- Text ---------------------------------------------------------------------------

  /** Kotlin: `hasText(expected)`. */
  hasText(expected: string): this {
    return this.check(`text is "${expected}"`, (n) => expect(n).toHaveText(expected));
  }

  /** Kotlin: `hasTextContaining(partial)`. Case-insensitive. */
  hasTextContaining(partial: string): this {
    return this.check(`text contains "${partial}"`, (n) =>
      expect(n).toContainText(new RegExp(escapeRegExp(partial), 'i')),
    );
  }

  // --- States -------------------------------------------------------------------------

  isRequired(): this {
    return this.check('is required', async (n) => {
      const required = await n.evaluate(
        (el) => (el as HTMLInputElement).required === true || el.getAttribute('aria-required') === 'true',
      );
      expect(required, 'required or aria-required="true"').toBe(true);
    });
  }

  isInvalid(): this {
    return this.check('is marked invalid (aria-invalid="true")', (n) =>
      expect(n).toHaveAttribute('aria-invalid', 'true'),
    );
  }

  isValid(): this {
    return this.check('is not marked invalid', (n) => expect(n).not.toHaveAttribute('aria-invalid', 'true'));
  }

  isChecked(): this {
    return this.check('is checked', (n) => expect(n).toBeChecked());
  }

  isNotChecked(): this {
    return this.check('is not checked', (n) => expect(n).not.toBeChecked());
  }

  /** The element (and everything inside it) is hidden from assistive technology. */
  isHiddenFromAccessibility(): this {
    return this.check('is hidden from assistive technology', async (n) => {
      const hidden = await n.evaluate((el) => el.closest('[aria-hidden="true"]') !== null);
      expect(hidden, 'element or an ancestor has aria-hidden="true"').toBe(true);
    });
  }

  /** The element's accessibility subtree must match a Playwright ARIA snapshot. */
  matchesAriaSnapshot(snapshot: string): this {
    return this.check('accessibility tree matches snapshot', (n) => expect(n).toMatchAriaSnapshot(snapshot));
  }
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
