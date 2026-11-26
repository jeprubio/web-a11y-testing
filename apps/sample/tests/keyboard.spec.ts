import { expect, test } from '@playwright/test';
import { a11y } from '@jeprubio/playwright-a11y';
import { EXPECTED_TAB_ORDER, openPage } from './support';

test.describe('Keyboard navigation', () => {
  test.beforeEach(async ({ page }) => {
    await openPage(page);
  });

  test('nothing is focused when the page loads', async ({ page }) => {
    await a11y(page).keyboardFocus((k) => k.assertNoFocus());
  });

  test('tab order follows the visual reading order, forwards and backwards', async ({ page }) => {
    await a11y(page).keyboardFocus((k) => k.expectFocusOrder(EXPECTED_TAB_ORDER));
  });

  test('step by step, in the style of the Android DSL', async ({ page }) => {
    await a11y(page).keyboardFocus((k) =>
      k
        .assertNoFocus()
        .next().shouldFocusVisibly('skip-link')
        .next().shouldFocus('nav-about')
        .next().shouldFocus('nav-programme')
        .previous().shouldFocus('nav-about')
        .next().shouldFocus('nav-programme')
        .next().focusedHasName('Register'),
    );
  });

  test('the skip link is hidden until focused and jumps to the main content', async ({ page }) => {
    const skipLink = page.getByTestId('skip-link');
    await expect(skipLink).not.toBeInViewport();

    await a11y(page).keyboardFocus((k) =>
      k
        .next().shouldFocusVisibly('skip-link')
        .press('Enter').shouldFocus('main')
        // The next Tab continues from the main content, skipping the navigation.
        .next().shouldFocus('hero-register'),
    );
  });

  test('every interactive element shows a visible focus indicator', async ({ page }) => {
    // expectFocusOrder checks the indicator at every stop; this test documents it explicitly.
    await a11y(page).keyboardFocus((k) =>
      k.expectFocusOrder(EXPECTED_TAB_ORDER, { reverse: false, checkFocusVisible: true }),
    );
  });

  test('there is no keyboard trap on the page', async ({ page }) => {
    await a11y(page).keyboardFocus((k) => k.assertNoKeyboardTrap());
  });

  test('the ticket radio group is one tab stop and arrow keys change the selection', async ({ page }) => {
    await a11y(page).keyboardFocus((k) =>
      k
        .tabTo('ticket-standard')
        .press('ArrowDown').shouldFocus('ticket-companion')
        .press('ArrowDown').shouldFocus('ticket-tactile')
        // Tab leaves the group instead of visiting every radio button.
        .next().shouldFocus('newsletter')
        // Shift+Tab returns to the selected radio, not the first one.
        .previous().shouldFocus('ticket-tactile'),
    );
    await expect(page.getByTestId('ticket-tactile')).toBeChecked();
  });

  test('checkboxes toggle with Space', async ({ page }) => {
    await a11y(page).keyboardFocus((k) => k.tabTo('newsletter').press('Space').and());
    await expect(page.getByTestId('newsletter')).toBeChecked();
  });

  test('FAQ answers expand and collapse with Enter', async ({ page }) => {
    const details = page.getByTestId('faq-1-details');
    await a11y(page).keyboardFocus((k) => k.tabTo('faq-1').press('Enter').shouldFocus('faq-1'));
    await expect(details).toHaveAttribute('open', '');
    await a11y(page).keyboardFocus((k) => k.press('Enter').shouldFocus('faq-1'));
    await expect(details).not.toHaveAttribute('open', '');
  });
});
