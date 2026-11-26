# @jeprubio/playwright-a11y

A Playwright DSL that automates the accessibility checks testers usually do by hand: keyboard focus order, visible focus, focus traps, accessible names, page structure and axe-core WCAG 2.2 AA scans.

It is the web port of the Android `a11ytesting` DSL for Jetpack Compose, so tests read the same on both platforms.

## Install

The package is set up to be published to npm. Once it is:

```bash
npm install --save-dev @jeprubio/playwright-a11y @playwright/test
```

`@playwright/test` is a peer dependency: your project provides it, and the library uses your copy.

## Use

```ts
import { test } from '@playwright/test';
import { a11y } from '@jeprubio/playwright-a11y';

test('keyboard users can reach everything in order', async ({ page }) => {
  await page.goto('/');

  await a11y(page).keyboardFocus((k) =>
    k.expectFocusOrder(['skip-link', 'nav-home', 'search', 'submit']));

  await a11y(page).keyboardFocus((k) =>
    k.tabTo('open-dialog')
      .press('Enter').shouldFocus('dialog-close')
      .press('Escape').shouldFocusVisibly('open-dialog'));

  await a11y(page).elementChecks(async (e) => {
    await e.element('dialog-close').hasRole('button').hasAccessibleName('Close');
    await e.element('page-title').isHeading(1);
  });

  await a11y(page).pageChecks((p) => p.hasSingleH1().hasNoPositiveTabindex());
  await a11y(page).axe();
});
```

Elements are found by `data-testid`, the web equivalent of Compose's `Modifier.testTag`.

## What it gives you

| Entry point | Checks |
|---|---|
| `keyboardFocus` | Tab / Shift+Tab order, `expectFocusOrder([...])` with an expected/actual table on failure, visible focus (WCAG 2.4.7), focus hidden by sticky headers (2.4.11), keyboard traps (2.1.2), modal focus traps |
| `elementChecks` | Accessible name and description, role, heading and level, text, required, invalid, checked, hidden from assistive technology, ARIA snapshots |
| `pageChecks` | Language, title, single h1, skipped heading levels, heading outline, landmarks, positive tabindex, image alt, plus web-only checks: reflow at 400 % zoom, text spacing, reduced motion and endless animations |
| `axe` | axe-core with WCAG 2.0/2.1/2.2 A and AA tags, readable failures, full JSON attached to the report |
| `focusMap` | Full-page screenshot with every tab stop numbered and joined |

On failure, the accessibility tree at that moment is printed and attached to the Playwright report.

### Browser notes

- **WebKit:** Safari skips links and buttons on Tab by default, so the DSL uses Option+Tab in WebKit to test the full order.
- **Firefox on macOS:** set `launchOptions: { firefoxUserPrefs: { 'accessibility.tabfocus': 7 } }` in your Playwright project so Firefox tabs to links.

## Documentation

The full DSL reference, a guide for testers and a working sample app live in the [Equinox repository](../../README.md): see `docs/03-dsl-reference.md` and `apps/sample`.

## License

MIT
