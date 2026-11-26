import { expect, test, type Page } from '@playwright/test';
import { a11y } from '../src/index.js';

/** Serves `html` from a real URL, so checks that reload the page keep the fixture. */
async function serve(page: Page, html: string): Promise<void> {
  await page.route('https://fixture.test/', (route) => route.fulfill({ contentType: 'text/html', body: html }));
  await page.goto('https://fixture.test/');
}

const SPINNER_STYLE = `
  @keyframes spin { to { transform: rotate(1turn); } }
  .spin { display: inline-block; animation: spin 2s linear infinite; }`;

test.describe('reflowsAt (WCAG 1.4.10)', () => {
  test('passes when content wraps', async ({ page }) => {
    await page.setContent('<main><p>This paragraph is long enough to wrap onto several lines at 320 pixels wide.</p></main>');
    await a11y(page).pageChecks((p) => p.reflowsAt(320));
  });

  test('fails on fixed-width content and restores the viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 700 });
    await page.setContent('<main><div data-testid="wide" style="width:600px">A fixed 600px box</div></main>');
    const run = a11y(page).pageChecks((p) => p.reflowsAt(320));
    await expect(run).rejects.toThrow(/page scrolls horizontally[\s\S]*wide "A fixed 600px box" spans/);
    expect(page.viewportSize()).toEqual({ width: 1024, height: 700 });
  });

  test('still catches overflow hidden by overflow-x: hidden on the body', async ({ page }) => {
    await page.setContent('<body style="overflow-x:hidden;margin:0"><p data-testid="cut" style="width:700px">Cut off text</p></body>');
    const run = a11y(page).pageChecks((p) => p.reflowsAt(320));
    await expect(run).rejects.toThrow(/cut "Cut off text" spans 0px to 700px/);
  });

  test('ignores content that is not rendered, such as a closed <details>', async ({ page }) => {
    await page.setContent('<main><details><summary>Question</summary><p style="width:700px">Hidden answer</p></details></main>');
    await a11y(page).pageChecks((p) => p.reflowsAt(320));
  });

  test('ignores decorative aria-hidden content', async ({ page }) => {
    await page.setContent('<body style="overflow-x:hidden;margin:0"><div aria-hidden="true" style="width:900px">decoration</div><p>Real content</p></body>');
    await a11y(page).pageChecks((p) => p.reflowsAt(320));
  });
});

test.describe('survivesTextSpacing (WCAG 1.4.12)', () => {
  test('passes when containers grow with the text', async ({ page }) => {
    await page.setContent('<main><div style="padding:8px"><p>Line one</p><p>Line two</p></div></main>');
    await a11y(page).pageChecks((p) => p.survivesTextSpacing());
  });

  test('fails when a fixed-height box cuts the text off, and removes the override', async ({ page }) => {
    await page.setContent(`<main>
      <div data-testid="box" style="height:3em;line-height:1.2;overflow:hidden;width:400px">
        <p style="margin:0">Line one</p><p style="margin:0">Line two</p>
      </div></main>`);
    const run = a11y(page).pageChecks((p) => p.survivesTextSpacing());
    await expect(run).rejects.toThrow(/box: "Line one Line two" is cut off/);
    const letterSpacing = await page.locator('p').first().evaluate((el) => getComputedStyle(el).letterSpacing);
    expect(letterSpacing).toBe('normal');
  });
});

test.describe('focus not obscured (WCAG 2.4.11)', () => {
  const PAGE = `
    <header style="position:fixed;top:0;left:0;right:0;height:120px;background:white;z-index:1">Sticky header</header>
    <button data-testid="under" style="position:absolute;top:40px;left:20px">Under the header</button>
    <button data-testid="clear" style="position:absolute;top:300px;left:20px">In the clear</button>`;

  test('passes for a visible focused element', async ({ page }) => {
    await page.setContent(PAGE);
    await page.getByTestId('clear').focus();
    await a11y(page).keyboardFocus((k) => k.assertFocusNotObscured());
  });

  test('fails when a sticky header covers the focused element', async ({ page }) => {
    await page.setContent(PAGE);
    await page.getByTestId('under').evaluate((el: HTMLElement) => el.focus({ preventScroll: true }));
    const run = a11y(page).keyboardFocus((k) => k.assertFocusNotObscured());
    await expect(run).rejects.toThrow(/"under" is focused but entirely hidden/);
  });

  test('expectFocusOrder reports hidden stops', async ({ page }) => {
    await page.setContent(PAGE);
    const run = a11y(page).keyboardFocus((k) => k.expectFocusOrder(['under', 'clear'], { reverse: false, checkFocusVisible: false }));
    await expect(run).rejects.toThrow(/entirely hidden by other content, forward \(Tab\)[^:]*: under/);
  });
});

test.describe('animations (WCAG 2.3.3, 2.2.2)', () => {
  test.use({ contextOptions: { reducedMotion: 'no-preference' } });

  test('respectsReducedMotion passes when CSS turns animations off', async ({ page }) => {
    await serve(page, `<style>${SPINNER_STYLE} @media (prefers-reduced-motion: reduce) { .spin { animation: none; } }</style>
      <span class="spin" data-testid="spinner">*</span>`);
    await a11y(page).pageChecks((p) => p.respectsReducedMotion());
  });

  test('respectsReducedMotion fails when animations ignore the setting', async ({ page }) => {
    await serve(page, `<style>${SPINNER_STYLE}</style><span class="spin" data-testid="spinner">*</span>`);
    const run = a11y(page).pageChecks((p) => p.respectsReducedMotion());
    await expect(run).rejects.toThrow(/spin on spinner \(endless\)/);
  });

  test('hasNoEndlessAnimations fails on an infinite animation', async ({ page }) => {
    await page.setContent(`<style>${SPINNER_STYLE}</style><span class="spin" data-testid="spinner">*</span>`);
    const run = a11y(page).pageChecks((p) => p.hasNoEndlessAnimations());
    await expect(run).rejects.toThrow(/longer than 5 s with no way to pause them[\s\S]*spin on spinner \(endless\)/);
  });

  test('hasNoEndlessAnimations passes for short or paused animations', async ({ page }) => {
    await page.setContent(`<style>${SPINNER_STYLE}
        .short { display: inline-block; animation: spin 1s linear 2; }
        .paused { animation-play-state: paused; }</style>
      <span class="short">*</span><span class="spin paused">*</span>`);
    await a11y(page).pageChecks((p) => p.hasNoEndlessAnimations());
  });
});
