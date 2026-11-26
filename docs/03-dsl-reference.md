# DSL reference

Import the entry point:

```ts
import { a11y } from '@jeprubio/playwright-a11y';
```

`a11y(page)` returns an object with five entry points. Chained steps run when the chain is awaited, or when the `keyboardFocus` / `pageChecks` block returns. Each step appears in the Playwright report under its own name. On failure, the accessibility tree is attached to the report and printed in the error.

## `keyboardFocus(block)`

```ts
await a11y(page).keyboardFocus((k) =>
  k.assertNoFocus()
   .next().shouldFocus('skip-link')
   .next().shouldFocusVisibly('nav-features')
   .previous().shouldFocus('skip-link'));
```

### `KeyboardA11y`

| Method | Description |
|---|---|
| `assertNoFocus()` | No element has focus (focus is on `<body>`). |
| `resetFocus()` | Blurs the active element so the next Tab starts from the top. |
| `next()` | Presses Tab and returns a `FocusStep`. |
| `previous()` | Presses Shift+Tab and returns a `FocusStep`. |
| `press(key)` | Presses any key (`'Enter'`, `'Space'`, `'Escape'`, `'ArrowDown'`…) and returns a `FocusStep`. |
| `tabTo(testId, maxStops = 50)` | Presses Tab until `testId` has focus; fails and lists what was visited if it never gets there. |
| `assertFocusOn(testId)` | The element with `data-testid=testId` has focus. |
| `assertFocusVisible()` | The focused element shows an outline or box shadow. |
| `expectFocusOrder(ids, options?)` | Walks the whole order. Options: `reverse` (default `true`), `checkFocusVisible` (default `true`), `checkNotObscured` (default `true`), `fromStart` (default `true`). On failure it prints an expected/actual table. |
| `assertFocusNotObscured()` | The focused element is not entirely hidden, for example under a sticky header or off screen (WCAG 2.4.11). |
| `assertNoKeyboardTrap(maxStops = 100)` | Tabbing from the top eventually leaves the page or wraps to the first element. |
| `assertFocusTrappedIn(testId, presses = 8)` | Focus stays inside the container for N Tabs and N Shift+Tabs. Use for modals. |

### `FocusStep` (after `next`, `previous` or `press`)

| Method | Description |
|---|---|
| `shouldFocus(testId)` | Kotlin: `next() shouldFocus "tag"`. |
| `shouldFocusVisibly(testId)` | Same as `shouldFocus`, and the focus indicator must be visible. |
| `focusedHasName(name)` | The focused element's accessible name equals `name` (string) or matches it (RegExp). |
| `shouldLoseFocus()` | Nothing is focused after this key. Use it to document known focus loss. |
| `and()` | Continue the chain without asserting anything. |

Example of a failure message from `expectFocusOrder`:

```
Focus order mismatch, forward (Tab):
     #  expected         actual
  ✗  1  skip-link        submit
  ✗  2  nav-features     skip-link
  ...
```

## `elementChecks(block)`

Each element chain runs when it is awaited. Any chain the block creates but doesn't await runs when the block ends, so a forgotten `await` can't make a check pass silently.

```ts
await a11y(page).elementChecks(async (e) => {
  await e.element('email').hasRole('textbox').hasAccessibleNameContaining('Email').isRequired();
  await e.elementWithRole('button', 'Close duck specifications').hasRole('button');
});
```

### Finding elements

| Method | Finds by |
|---|---|
| `element(testId)` | `data-testid` (Kotlin `element(testTag)`) |
| `elementWithText(text)` | Visible text, string or RegExp |
| `elementWithRole(role, name?)` | Role and accessible name, like a screen reader user |
| `locator(locator, label?)` | Any Playwright locator |

### Assertions on `ElementAccessibility`

| Method | Kotlin equivalent / meaning |
|---|---|
| `hasAccessibleName(text \| RegExp)` | `hasContentDescription` |
| `hasAccessibleNameContaining(text)` | `hasContentDescriptionContaining` (case-insensitive) |
| `hasAccessibleNameMatching(regex)` | `hasContentDescriptionMatching` |
| `hasNonBlankAccessibleName()` | `hasNonBlankContentDescription` |
| `hasNoAccessibleName()` | `hasNoContentDescription` |
| `hasAccessibleDescription(text \| RegExp)` | Description from `aria-describedby` (hints, errors) |
| `hasAccessibleDescriptionContaining(text)` | Case-insensitive partial description |
| `hasRole(role)` | Computed ARIA role |
| `isHeading(level?)` / `isNotHeading()` | `isHeading` / `isNotHeading`, plus an optional level |
| `hasText(text)` / `hasTextContaining(text)` | `hasText` / `hasTextContaining` |
| `isRequired()` | `required` or `aria-required="true"` |
| `isInvalid()` / `isValid()` | `aria-invalid="true"` set or not |
| `isChecked()` / `isNotChecked()` | Checkbox and radio state |
| `isHiddenFromAccessibility()` | The element or an ancestor has `aria-hidden="true"` |
| `matchesAriaSnapshot(yaml)` | The subtree matches a [Playwright ARIA snapshot](https://playwright.dev/docs/aria-snapshots) |

## `pageChecks(block)`

```ts
await a11y(page).pageChecks((p) =>
  p.hasLanguage('en').hasSingleH1().hasNoSkippedHeadingLevels().hasNoPositiveTabindex());
```

| Method | Checks |
|---|---|
| `hasLanguage(lang?)` | `<html lang>` is set (WCAG 3.1.1) |
| `hasTitle(text \| RegExp)` | Page title (WCAG 2.4.2) |
| `hasSingleH1()` | Exactly one level-1 heading |
| `hasNoSkippedHeadingLevels()` | No jumps such as h2 → h4 |
| `hasHeadingOutline(['h1 …', 'h2 …'])` | The exact outline a screen reader user navigates |
| `hasNoPositiveTabindex()` | No `tabindex` greater than 0 |
| `hasLandmarks(['banner', 'main', …])` | Landmarks present, and exactly one `main` |
| `imagesHaveAlt()` | Every `<img>` has an `alt` (empty is fine for decorative images) |

### Web-only checks

These have no real equivalent on Android: they cover browser zoom, user style sheets and CSS animations.

| Method | Checks |
|---|---|
| `reflowsAt(width = 320)` | At 320 CSS px wide (a 1280 px window at 400 % zoom) there is no horizontal scrolling and no content pushed or cut off past the edges (WCAG 1.4.10). `aria-hidden` decoration and unrendered content are ignored, and the viewport is restored afterwards. |
| `survivesTextSpacing()` | With the WCAG text-spacing override applied (line height 1.5, paragraph spacing 2em, letter spacing 0.12em, word spacing 0.16em), no text is cut off by `overflow: hidden` and nothing overflows the page (WCAG 1.4.12). The override is removed afterwards. |
| `respectsReducedMotion()` | Reloads the page with `prefers-reduced-motion: reduce` and checks that no animation runs (WCAG 2.3.3). |
| `hasNoEndlessAnimations(maxSeconds = 5)` | No CSS or Web Animations API animation runs longer than `maxSeconds` (WCAG 2.2.2 Pause, Stop, Hide). Run it with motion allowed, usually after using the page's own pause control. Content updated by JavaScript timers, such as a rotating message, is not detected. |

Example:

```ts
test.use({ contextOptions: { reducedMotion: 'no-preference' } });

test('animations can be paused', async ({ page }) => {
  await page.goto('/');
  await a11y(page).pageChecks((p) => p.reflowsAt(320).survivesTextSpacing().respectsReducedMotion());
  await page.getByRole('button', { name: 'Pause animations' }).click();
  await a11y(page).pageChecks((p) => p.hasNoEndlessAnimations());
});
```

## `axe(options?)`

```ts
await a11y(page).axe({ label: 'dialog open', include: ['dialog[open]'] });
```

| Option | Description |
|---|---|
| `include` / `exclude` | CSS selectors to limit the scan |
| `disableRules` | axe rule ids to skip; leave a comment explaining why |
| `tags` | Override the default `wcag2a, wcag2aa, wcag21a, wcag21aa, wcag22aa` |
| `label` | Name used in the report and the error |

The full axe JSON is attached to the report. The error lists each violation with its impact, help link and up to five failing nodes.

## `focusMap(path)`

```ts
const stops = await a11y(page).focusMap('focus-maps/home.png');
expect(stops.map((s) => s.testId)).toEqual(EXPECTED_TAB_ORDER);
```

Tabs through the whole page, draws numbered badges and a connecting path, and saves a full-page screenshot. It also attaches the image and a text list of the order to the report. It returns the stops (`FocusInfo[]`) so you can assert on them.

## Lower-level helpers

Also exported from the package (see `packages/a11y-testing/src/index.ts` for the full public API, including the builder classes and `scan`):

- `focusedElement(page)`: a `FocusInfo` for the active element (`testId`, `label`, `focusVisible`, `inDialog`, `rect`), or `null`.
- `walkTabOrder(page, maxStops?)`: `{ stops, wrapped }` after tabbing through the page.
