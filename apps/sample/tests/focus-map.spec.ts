import { expect, test } from '@playwright/test';
import { a11y } from '@jeprubio/playwright-a11y';
import { BROKEN, EXPECTED_TAB_ORDER, openPage } from './support';

/**
 * Generates `focus-maps/<browser>.png`: a full-page screenshot with every tab stop
 * numbered and joined by a path. Hand it to testers and designers to review the order.
 */
test('focus order map', async ({ page, browserName }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await openPage(page);

  const stops = await a11y(page).focusMap(`focus-maps/${browserName}${BROKEN ? '-broken' : ''}.png`);

  expect(stops.map((s) => s.testId ?? s.id)).toEqual(EXPECTED_TAB_ORDER);
});
