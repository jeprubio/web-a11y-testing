import type { Page } from '@playwright/test';

/** Set BROKEN=1 (or run `npm run test:broken`) to point every test at the intentionally broken page. */
export const BROKEN = process.env.BROKEN === '1';

/** Opens the page, in broken mode when requested, and waits until the scripts have run. */
export async function openPage(page: Page): Promise<void> {
  await page.goto(BROKEN ? '/?broken=1' : '/');
  await page.getByTestId('page-title').waitFor();
  await page.waitForLoadState('networkidle');
}

/**
 * The tab order a sighted keyboard user should experience, written the way a manual
 * tester would write it down. Radio groups are a single stop (arrow keys move inside).
 */
export const EXPECTED_TAB_ORDER = [
  'skip-link',
  'nav-features',
  'nav-how',
  'nav-book',
  'nav-faq',
  'hero-register',
  'open-details',
  'name',
  'email',
  'plan-junior',
  'newsletter',
  'terms',
  'submit',
  'faq-1',
  'faq-2',
  'faq-3',
  'footer-top',
];

/** Tab order inside the "Duck specifications" dialog. */
export const DIALOG_TAB_ORDER = ['dialog-close', 'dialog-register', 'dialog-ok'];
