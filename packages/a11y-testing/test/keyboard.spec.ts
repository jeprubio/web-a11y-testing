import { expect, test } from '@playwright/test';
import { a11y } from '../src/index.js';

const STYLE = `<style>:focus-visible { outline: 2px solid blue; } .no-ring:focus-visible { outline: none; }</style>`;

const THREE_BUTTONS = `${STYLE}
  <button data-testid="one">One</button>
  <a href="#x" data-testid="two">Two</a>
  <input aria-label="Three" data-testid="three" />`;

test.describe('keyboardFocus', () => {
  test('passes when the order matches, forwards and backwards', async ({ page }) => {
    await page.setContent(THREE_BUTTONS);
    await a11y(page).keyboardFocus((k) => k.expectFocusOrder(['one', 'two', 'three']));
  });

  test('chains next, previous and shouldFocus like the Kotlin DSL', async ({ page }) => {
    await page.setContent(THREE_BUTTONS);
    await a11y(page).keyboardFocus((k) =>
      k.assertNoFocus()
        .next().shouldFocusVisibly('one')
        .next().shouldFocus('two')
        .previous().focusedHasName('One'),
    );
  });

  test('reports the order mismatch as an expected/actual table', async ({ page }) => {
    await page.setContent(THREE_BUTTONS);
    const run = a11y(page).keyboardFocus((k) => k.expectFocusOrder(['two', 'one', 'three']));
    await expect(run).rejects.toThrow(/Focus order mismatch, forward \(Tab\):[\s\S]*✗\s+1\s+two\s+one/);
  });

  test('includes the accessibility tree in failure messages', async ({ page }) => {
    await page.setContent(THREE_BUTTONS);
    const run = a11y(page).keyboardFocus((k) => k.next().shouldFocus('three'));
    await expect(run).rejects.toThrow(/Accessibility tree at the time of failure[\s\S]*button "One"/);
  });

  test('stops the chain at the first failure', async ({ page }) => {
    await page.setContent(THREE_BUTTONS);
    const run = a11y(page).keyboardFocus((k) => k.next().shouldFocus('two').next().shouldFocus('two'));
    await expect(run).rejects.toThrow(/Expected focus on "two", but focus is on "one"/);
  });

  test('detects a missing focus indicator', async ({ page }) => {
    await page.setContent(`${STYLE}<button data-testid="ok">OK</button><button class="no-ring" data-testid="bad">Bad</button>`);
    const run = a11y(page).keyboardFocus((k) => k.expectFocusOrder(['ok', 'bad'], { reverse: false }));
    await expect(run).rejects.toThrow(/No visible focus indicator \(WCAG 2\.4\.7\) on: bad/);
  });

  test('tabTo lists the visited elements when the target is never reached', async ({ page }) => {
    await page.setContent(THREE_BUTTONS);
    const run = a11y(page).keyboardFocus((k) => k.tabTo('missing', 3));
    await expect(run).rejects.toThrow(/"missing" was never reached with Tab\. Visited:\s+one\s+two\s+three/);
  });

  test('assertNoKeyboardTrap passes on a normal page', async ({ page }) => {
    await page.setContent(THREE_BUTTONS);
    await a11y(page).keyboardFocus((k) => k.assertNoKeyboardTrap());
  });

  test('assertFocusTrappedIn passes for a trapping container and fails otherwise', async ({ page }) => {
    await page.setContent(`${STYLE}
      <div data-testid="box">
        <button data-testid="a">A</button><button data-testid="b">B</button>
      </div>
      <button data-testid="outside">Outside</button>
      <script>
        const box = document.querySelector('[data-testid="box"]');
        box.addEventListener('keydown', (e) => {
          if (e.key !== 'Tab') return;
          e.preventDefault();
          const [a, b] = box.querySelectorAll('button');
          (document.activeElement === a ? b : a).focus();
        });
      </script>`);
    await page.getByTestId('a').focus();
    await a11y(page).keyboardFocus((k) => k.assertFocusTrappedIn('box', 3));

    await page.evaluate(() => document.querySelector('script')?.remove());
    await page.setContent(`${STYLE}<div data-testid="box"><button>A</button></div><button>Outside</button>`);
    await page.getByRole('button', { name: 'A' }).focus();
    const run = a11y(page).keyboardFocus((k) => k.assertFocusTrappedIn('box', 2));
    await expect(run).rejects.toThrow(/focus escaped "box"/);
  });
});
