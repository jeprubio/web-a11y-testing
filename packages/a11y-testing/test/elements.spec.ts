import { expect, test } from '@playwright/test';
import { a11y } from '../src/index.js';

const FIXTURE = `
  <h1 data-testid="title">Welcome</h1>
  <p data-testid="para">Plain text</p>
  <div role="heading" aria-level="3" data-testid="aria-heading">ARIA heading</div>
  <label for="email">Email address</label>
  <input id="email" required aria-describedby="hint" aria-invalid="true" data-testid="email" />
  <p id="hint">We never share it</p>
  <button aria-label="Close dialog" data-testid="close"><svg aria-hidden="true" data-testid="icon"></svg></button>
  <button data-testid="nameless"><svg></svg></button>
  <input type="checkbox" checked aria-label="Agree" data-testid="agree" />`;

test.describe('elementChecks', () => {
  test.beforeEach(async ({ page }) => {
    await page.setContent(FIXTURE);
  });

  test('accessible names (Compose content descriptions)', async ({ page }) => {
    await a11y(page).elementChecks(async (e) => {
      await e.element('close').hasAccessibleName('Close dialog');
      await e.element('close').hasAccessibleNameContaining('close');
      await e.element('close').hasAccessibleNameMatching(/^Close \w+$/);
      await e.element('email').hasNonBlankAccessibleName();
      await e.element('nameless').hasNoAccessibleName();
    });
  });

  test('roles, headings and levels', async ({ page }) => {
    await a11y(page).elementChecks(async (e) => {
      await e.element('title').isHeading(1).hasText('Welcome');
      await e.element('aria-heading').isHeading(3);
      await e.element('para').isNotHeading().hasTextContaining('plain');
      await e.element('close').hasRole('button');
      await e.elementWithRole('textbox', 'Email address').isRequired();
    });
  });

  test('descriptions and states', async ({ page }) => {
    await a11y(page).elementChecks(async (e) => {
      await e.element('email').hasAccessibleDescription('We never share it').isInvalid().isRequired();
      await e.element('agree').isChecked();
      await e.element('icon').isHiddenFromAccessibility();
      await e.elementWithText('Plain text').isNotHeading();
    });
  });

  test('failures name the element and the expectation', async ({ page }) => {
    const run = a11y(page).elementChecks(async (e) => {
      await e.element('nameless').hasAccessibleName('Close');
    });
    await expect(run).rejects.toThrow(/\[data-testid="nameless"\]: accessible name is Close/);
  });

  test('checks that were not awaited still run, so they cannot pass silently', async ({ page }) => {
    const run = a11y(page).elementChecks((e) => {
      e.element('title').isHeading(1); // forgot to await
      e.element('nameless').hasAccessibleName('Close'); // forgot to await, and wrong
    });
    await expect(run).rejects.toThrow(/\[data-testid="nameless"\]: accessible name is Close/);
  });

  test('ARIA snapshots', async ({ page }) => {
    await a11y(page).elementChecks(async (e) => {
      await e.element('close').matchesAriaSnapshot(`- button "Close dialog"`);
    });
  });
});
