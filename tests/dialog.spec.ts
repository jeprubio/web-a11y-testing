import { expect, test } from '@playwright/test';
import { a11y } from './a11y';
import { DIALOG_TAB_ORDER, openPage } from './support';

test.describe('Event details dialog', () => {
  test.beforeEach(async ({ page }) => {
    await openPage(page);
  });

  test('opens from the keyboard and moves focus inside', async ({ page }) => {
    await a11y(page).keyboardFocus((k) =>
      k.tabTo('open-details').press('Enter').shouldFocusVisibly('dialog-close'),
    );
    await expect(page.getByRole('dialog', { name: 'Event details' })).toBeVisible();
  });

  test('is announced as a modal dialog with a name and description', async ({ page }) => {
    await page.getByTestId('open-details').click();
    await a11y(page).elementChecks(async (e) => {
      await e
        .element('details-dialog')
        .hasRole('dialog')
        .hasAccessibleName('Event details')
        .hasAccessibleDescriptionContaining('21 March 2027');
      await e.element('dialog-close').hasRole('button').hasAccessibleName('Close event details');
      await e.element('dialog-title').isHeading(2);
    });
  });

  test('Tab and Shift+Tab cycle inside the dialog', async ({ page }) => {
    await page.getByTestId('open-details').click();
    await a11y(page).keyboardFocus((k) =>
      k
        .assertFocusOn('dialog-close')
        // Forward: close → register link → OK → back to close.
        .next().shouldFocus(DIALOG_TAB_ORDER[1])
        .next().shouldFocus(DIALOG_TAB_ORDER[2])
        .next().shouldFocus(DIALOG_TAB_ORDER[0])
        // Backward from the first element wraps to the last.
        .previous().shouldFocus(DIALOG_TAB_ORDER[2])
        .assertFocusTrappedIn('details-dialog'),
    );
  });

  test('Escape closes the dialog and returns focus to the button that opened it', async ({ page }) => {
    await a11y(page).keyboardFocus((k) =>
      k
        .tabTo('open-details')
        .press('Enter').shouldFocus('dialog-close')
        .press('Escape').shouldFocusVisibly('open-details'),
    );
    await expect(page.getByTestId('details-dialog')).not.toBeVisible();
  });

  test('the close button also returns focus to the opener', async ({ page }) => {
    await a11y(page).keyboardFocus((k) =>
      k
        .tabTo('open-details')
        .press('Enter').shouldFocus('dialog-close')
        .press('Enter').shouldFocus('open-details'),
    );
  });

  test('content behind the open dialog is inert', async ({ page }) => {
    await page.getByTestId('open-details').click();
    // A modal dialog makes the rest of the page inert: it cannot receive focus, even from script,
    // and screen readers cannot browse to it.
    const background = ['nav-about', 'hero-register', 'name', 'submit'];
    for (const testId of background) {
      const focused = await page.getByTestId(testId).evaluate((el: HTMLElement) => {
        el.focus();
        return document.activeElement === el;
      });
      expect(focused, `"${testId}" should not be focusable while the dialog is open`).toBe(false);
    }
  });
});
