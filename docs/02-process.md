# The process, step by step

This is how the project was built. You can follow the same steps to add this approach to any existing web app.

## 1. Build the page accessible first

Accessibility is cheapest when it's part of the markup from the start. The page uses:

- **Semantic HTML before ARIA.** `<header>`, `<nav aria-label="Main">`, `<main>`, `<footer>`, `<section aria-labelledby>`, real `<button>`, `<a href>`, `<fieldset>`/`<legend>`, `<details>`/`<summary>`, `<dialog>`. These elements bring the right role and keyboard behaviour for free.
- **A skip link** as the first tab stop, visible only when focused, pointing at `<main tabindex="-1">`.
- **One focus style** for everything: `:focus-visible { outline: 3px solid … }`.
- **Visible labels** for every field, with hints and errors linked through `aria-describedby`.
- **An accessible error pattern**: an error summary with `role="alert"` that receives focus, links that move focus to each field, and `aria-invalid` on invalid fields.
- **A live region** (`role="status"`) to announce success.
- **A modal dialog** built on `<dialog>` + `showModal()`, plus a focus trap and focus restoration in `apps/sample/src/dialog.ts`.
- **Decorative SVGs** marked `aria-hidden="true" focusable="false"`; informative images have a real `alt`.
- **Contrast** of at least 4.5:1 for text, and `prefers-reduced-motion` respected.
- **A `data-testid`** on every element a test touches: the web equivalent of `Modifier.testTag`.

### Making it look good without breaking accessibility

The sample is deliberately playful (see the [README](../README.md#the-sample-site)), and the decoration follows a few rules so it never gets in the way:

- **Decoration is hidden.** The duck, bubbles, code snippets, speech bubble, badge preview and footer parade are `aria-hidden="true"` and never focusable, so the tab order and accessibility tree stay the same.
- **Motion is optional.** All animations sit behind `prefers-reduced-motion`. With reduced motion on, nothing moves or changes on its own, and scroll-reveal never hides content. Playwright runs with `reducedMotion: 'reduce'`, which also keeps the tests stable.
- **Stats are readable.** Count-up numbers are animated in an `aria-hidden` copy; screen readers get the final value in visually hidden text.
- **Shadows don't fake focus.** Buttons get their hard shadow from `filter: drop-shadow`, not `box-shadow`, so the "visible focus" check only counts the real focus outline.
- **Contrast-sensitive text sits on solid colours.** The feature cards have a solid background, so axe can measure their contrast and catch the broken-mode regression.

## 2. Write down the manual checklist

Before writing code, list what testers check by hand today. For this page:

1. Pressing Tab visits elements in visual reading order, and Shift+Tab reverses it.
2. You can always see where focus is.
3. The skip link works.
4. Focus never gets stuck.
5. The dialog keeps focus inside, closes with Escape and returns focus to the opener.
6. Every control has a sensible name; form errors are read with their field.
7. Headings and landmarks give a sensible structure.
8. No WCAG violations that a tool can detect (contrast, missing labels and so on).

Each item became a test, and each test needed a few DSL primitives.

## 3. Port the DSL

The Kotlin library was ported class by class (see [the overview](01-overview.md#concept-mapping)). Two differences come from the platform:

- **Async.** Playwright calls return promises. To keep the Kotlin chain style, every DSL method *records* a step and returns the builder; `await` runs the recorded steps in order (`packages/a11y-testing/src/chain.ts`). Each step appears as a named step in the Playwright report.
- **Accessible name instead of content description.** The browser computes it from many sources, and Playwright exposes the computed value. The tests therefore check what assistive technology receives, not which attribute happens to be set.

On failure, each step attaches the accessibility tree as YAML and prints it in the error. That's the web version of `printToLog("A11Y")`.

## 4. Declare the expected order once

`apps/sample/tests/support.ts` holds the tab order exactly as a tester would write it on paper:

```ts
export const EXPECTED_TAB_ORDER = ['skip-link', 'nav-features', 'nav-how', /* … */ 'footer-top'];
```

`expectFocusOrder(EXPECTED_TAB_ORDER)` then covers forward order, backward order and visible focus in a single line.

## 5. Add the automated scan

`a11y(page).axe()` runs axe-core with WCAG 2.0/2.1/2.2 A and AA tags. It runs in several **states**, not just on page load: dialog open, form errors showing and FAQ expanded. Many bugs only exist in a state the initial load never shows.

## 6. Prove the tests catch bugs

A test that never fails proves nothing. `apps/sample/src/broken.ts` injects seven common bugs when the page is opened with `?broken=1`. `npm run test:broken` must fail, and each failure must point at the right bug. See [broken mode](05-broken-mode.md).

## 7. Make it visual

`npm run focus-map` tabs through the page and draws numbered badges and a path over each stop. The image goes in the report and in `apps/sample/focus-maps/`. It's the fastest way to review focus order with designers.

## 8. Run it everywhere

- The suite runs in Chromium, Firefox and WebKit (see [browser notes](06-browsers-ci-limitations.md)).
- `.github/workflows/a11y.yml` runs it on every pull request and uploads the report and focus maps.

## Adopting it in another project

1. Install the library: `npm install --save-dev @jeprubio/playwright-a11y @playwright/test` (once published; until then, copy `packages/a11y-testing` into your repo as a workspace).
2. Add `data-testid` to the interactive elements you care about.
3. Write `EXPECTED_TAB_ORDER` for each page with your testers.
4. Start with three tests per page: `expectFocusOrder`, `assertNoKeyboardTrap` and `axe()`. Add element checks for the components with known bugs.
5. Run the tests in CI and block merges on failures.
