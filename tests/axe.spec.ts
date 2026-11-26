import { test } from '@playwright/test';
import { a11y } from './a11y';
import { openPage } from './support';

test.describe('Automated WCAG 2.2 AA scan (axe-core)', () => {
  test.beforeEach(async ({ page }) => {
    await openPage(page);
  });

  test('the page in its initial state', async ({ page }) => {
    await a11y(page).axe({ label: 'initial page' });
  });

  test('with the dialog open', async ({ page }) => {
    await page.getByTestId('open-details').click();
    await a11y(page).axe({ label: 'dialog open', include: ['dialog[open]'] });
  });

  test('with form errors showing', async ({ page }) => {
    await page.getByTestId('submit').click();
    await a11y(page).axe({ label: 'form errors', include: ['#register'] });
  });

  test('with every FAQ answer expanded', async ({ page }) => {
    for (const n of [1, 2, 3]) await page.getByTestId(`faq-${n}`).click();
    await a11y(page).axe({ label: 'FAQ expanded', include: ['#faq'] });
  });
});
