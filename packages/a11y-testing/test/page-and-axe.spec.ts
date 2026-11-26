import { expect, test } from '@playwright/test';
import { a11y, walkTabOrder } from '../src/index.js';

const GOOD_PAGE = `<!doctype html>
  <html lang="en"><head><title>Good page</title></head><body>
    <header><nav aria-label="Main"><a href="#a">A</a></nav></header>
    <main><h1>Title</h1><h2>Section</h2><img src="data:," alt="" /></main>
    <footer>Footer</footer>
  </body></html>`;

test.describe('pageChecks', () => {
  test('passes on a well-structured page', async ({ page }) => {
    await page.setContent(GOOD_PAGE);
    await a11y(page).pageChecks((p) =>
      p
        .hasLanguage('en')
        .hasTitle('Good page')
        .hasSingleH1()
        .hasNoSkippedHeadingLevels()
        .hasHeadingOutline(['h1 Title', 'h2 Section'])
        .hasLandmarks(['banner', 'navigation', 'main', 'contentinfo'])
        .hasNoPositiveTabindex()
        .imagesHaveAlt(),
    );
  });

  test('flags skipped heading levels', async ({ page }) => {
    await page.setContent('<h1>One</h1><h3>Three</h3>');
    const run = a11y(page).pageChecks((p) => p.hasNoSkippedHeadingLevels());
    await expect(run).rejects.toThrow(/h1 → h3 "Three"/);
  });

  test('flags positive tabindex', async ({ page }) => {
    await page.setContent('<button tabindex="2" data-testid="jumper">Jump</button>');
    const run = a11y(page).pageChecks((p) => p.hasNoPositiveTabindex());
    await expect(run).rejects.toThrow(/jumper \(tabindex=2\)/);
  });
});

test.describe('axe', () => {
  test('passes on an accessible page', async ({ page }) => {
    await page.setContent(GOOD_PAGE);
    await a11y(page).axe();
  });

  test('lists violations with rule id and impact', async ({ page }) => {
    await page.setContent(`<!doctype html><html lang="en"><head><title>x</title></head>
      <body><main><input type="text" /><button></button></main></body></html>`);
    const error = await a11y(page).axe({ label: 'bad form' }).then(
      () => null,
      (e: Error) => e,
    );
    expect(error?.message).toMatch(/axe found \d+ WCAG violation\(s\) on bad form/);
    expect(error?.message).toMatch(/\[critical\] button-name: Buttons must have discernible text/);
    expect(error?.message).toMatch(/\[critical\] label: Form elements must have labels/);
  });
});

test.describe('walkTabOrder', () => {
  test('returns every stop in order', async ({ page }) => {
    await page.setContent('<a href="#1" data-testid="l1">1</a><button data-testid="b2">2</button><input data-testid="i3" aria-label="3" />');
    const { stops, wrapped } = await walkTabOrder(page);
    expect(stops.map((s) => s.testId)).toEqual(['l1', 'b2', 'i3']);
    expect(wrapped).toBe(true);
  });
});
