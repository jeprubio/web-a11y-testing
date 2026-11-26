import { expect, test } from '@playwright/test';
import { a11y } from '@jeprubio/playwright-a11y';
import { EXPECTED_TAB_ORDER, openPage } from './support';

/**
 * Checks that only make sense on the web: browser zoom and reflow, user style overrides,
 * sticky headers covering focus, and animation controls.
 */
test.describe('Zoom, text spacing and sticky header', () => {
  test.beforeEach(async ({ page }) => {
    await openPage(page);
  });

  test('content reflows at 320 CSS px, the width of 400% zoom (WCAG 1.4.10)', async ({ page }) => {
    await a11y(page).pageChecks((p) => p.reflowsAt(320));
  });

  test('the dialog also reflows at 320 CSS px', async ({ page }) => {
    await page.getByTestId('open-details').click();
    await a11y(page).pageChecks((p) => p.reflowsAt(320));
  });

  test('users can increase text spacing without losing content (WCAG 1.4.12)', async ({ page }) => {
    await a11y(page).pageChecks((p) => p.survivesTextSpacing());
  });

  test('the sticky header never hides the focused element, even when zoomed (WCAG 2.4.11)', async ({ page }) => {
    // At 400% zoom the header wraps onto several lines and covers more of the screen.
    await page.setViewportSize({ width: 320, height: 640 });
    await a11y(page).keyboardFocus((k) => k.expectFocusOrder(EXPECTED_TAB_ORDER));
  });
});

test.describe('Animations', () => {
  // These tests need motion allowed, unlike the rest of the suite.
  test.use({ contextOptions: { reducedMotion: 'no-preference' } });

  test.beforeEach(async ({ page }) => {
    await openPage(page);
  });

  test('nothing moves when the system asks for reduced motion (WCAG 2.3.3)', async ({ page }) => {
    await a11y(page).pageChecks((p) => p.respectsReducedMotion());
  });

  test('the duck, bubbles and parade keep moving until paused', async ({ page }) => {
    const run = a11y(page).pageChecks((p) => p.hasNoEndlessAnimations());
    await expect(run).rejects.toThrow(/longer than 5 s with no way to pause them/);
  });

  test('the pause button stops every endless animation (WCAG 2.2.2)', async ({ page }) => {
    await a11y(page).keyboardFocus((k) => k.tabTo('pause-animations').press('Enter').and());
    await a11y(page).elementChecks(async (e) => {
      await e.element('pause-animations').hasRole('button').hasAccessibleName('Pause animations');
    });
    await expect(page.getByTestId('pause-animations')).toHaveAttribute('aria-pressed', 'true');
    await a11y(page).pageChecks((p) => p.hasNoEndlessAnimations());
  });

  test('the pause choice is remembered after a reload', async ({ page }) => {
    await page.getByTestId('pause-animations').click();
    await page.reload();
    await expect(page.getByTestId('pause-animations')).toHaveAttribute('aria-pressed', 'true');
    await a11y(page).pageChecks((p) => p.hasNoEndlessAnimations());
  });
});
