# Writing tests: a guide for testers

You don't need to know Playwright well to turn a manual check into a test. Most tests are a handful of lines.

## 1. Make sure the element has a test id

In the HTML, the element needs a `data-testid`:

```html
<button type="button" data-testid="open-details">Event details</button>
```

If it doesn't have one, ask a developer to add it. It's the same request as adding a `testTag` in Compose.

## 2. Start from the template

```ts
import { test } from '@playwright/test';
import { a11y } from './a11y';
import { openPage } from './support';

test.describe('My feature', () => {
  test.beforeEach(async ({ page }) => {
    await openPage(page);
  });

  test('what a user should be able to do', async ({ page }) => {
    // checks go here
  });
});
```

Save it as `tests/<something>.spec.ts`.

## 3. Translate the manual check

| You check by hand… | Write |
|---|---|
| "I press Tab and the skip link is first" | `k.next().shouldFocus('skip-link')` |
| "The whole page tabs in this order" | `k.expectFocusOrder(['a', 'b', 'c'])` |
| "I can see where focus is" | `.shouldFocusVisibly('id')` or `k.assertFocusVisible()` |
| "Enter opens the dialog and focus goes inside" | `k.tabTo('open-details').press('Enter').shouldFocus('dialog-close')` |
| "Escape closes it and I'm back on the button" | `.press('Escape').shouldFocus('open-details')` |
| "Tab doesn't escape the dialog" | `k.assertFocusTrappedIn('details-dialog')` |
| "I never get stuck" | `k.assertNoKeyboardTrap()` |
| "VoiceOver reads 'Close event details'" | `e.element('dialog-close').hasAccessibleName('Close event details')` |
| "The error is read with the field" | `e.element('name').hasAccessibleDescriptionContaining('Enter your full name')` |
| "It's announced as a heading" | `e.element('faq-title').isHeading(2)` |
| "The icon is not read out" | `e.locator(page.locator('svg.icon')).isHiddenFromAccessibility()` |
| "Nothing looks wrong to axe" | `await a11y(page).axe()` |

Keyboard checks go inside `keyboardFocus`:

```ts
await a11y(page).keyboardFocus((k) =>
  k.tabTo('open-details')
   .press('Enter').shouldFocus('dialog-close')
   .press('Escape').shouldFocusVisibly('open-details'));
```

Element checks go inside `elementChecks`, one `await` per element:

```ts
await a11y(page).elementChecks(async (e) => {
  await e.element('dialog-close').hasRole('button').hasAccessibleName('Close event details');
  await e.element('dialog-title').isHeading(2);
});
```

## 4. Run only your test

```bash
npx playwright test tests/my-feature.spec.ts --project=chromium
```

Add `--ui` to watch it run step by step, or `--headed` to see the browser.

## 5. When a test fails

The error message says:

- **which step failed**, for example `→ "dialog-close" is focused`;
- **what happened instead**, for example `focus is on "<no element: focus is on the page body…>"`;
- **the accessibility tree** at that moment, the same information a screen reader has.

Run `npm run report` to see screenshots, the trace (a timeline you can scrub through) and the attached axe results.

## Tips

- **Test states, not just the page load.** Open the dialog, submit the form empty, expand the accordion, then check again.
- **Prefer accessible names over test ids when you check text.** `hasAccessibleName` checks what users hear; `hasText` only checks what they see.
- **Keep one expected order per page** in `tests/support.ts`, and update it with the design.
- **Radio groups are one tab stop.** Use the arrow keys inside them (`press('ArrowDown')`).
- **Don't silence axe without a reason.** If you need `disableRules`, add a comment and a ticket.
