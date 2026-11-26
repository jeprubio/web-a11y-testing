# Overview: from Android to the web

## The problem

Testers check accessibility by hand. For keyboard focus they press Tab, write down which element got focus, compare it with the design and repeat on every release. It is slow, it is easy to miss a step, and the same bugs come back.

On Android this was solved with the `a11ytesting` library: a small Kotlin DSL on top of the Compose test APIs that turns the manual checklist into instrumented tests. Equinox brings the same idea to the web.

## Concept mapping

| Android (`a11ytesting`) | Web (Equinox) | Notes |
|---|---|---|
| `ComposeTestRule` | Playwright `Page` | Drives a real browser |
| `composeTestRule.accessibility { }` | `a11y(page)` | Entry point |
| `keyboardFocus { }` / `KeyboardA11y` | `keyboardFocus((k) => ...)` / `KeyboardA11y` | Same method names |
| `next()` / `previous()` | `next()` / `previous()` | Tab and Shift+Tab |
| `next() shouldFocus "tag"` | `.next().shouldFocus('id')` | Infix becomes a method chain |
| `focusedMatches(matcher)` | `focusedHasName(name)` | Checks the focused element's accessible name |
| `assertNoFocus()` | `assertNoFocus()` | |
| `prepareFocus()` / UiAutomator | not needed | Browsers start with focus on `<body>`; the first Tab enters the page |
| `elementChecks { }` | `elementChecks(async (e) => ...)` | |
| `element(testTag)` | `element(testId)` | `Modifier.testTag` becomes `data-testid` |
| `elementWithText(text)` | `elementWithText(text)` | |
| `hasContentDescription` | `hasAccessibleName` | The web computes the name from label, aria-label, alt, text… |
| `hasContentDescriptionContaining` | `hasAccessibleNameContaining` | |
| `hasContentDescriptionMatching` | `hasAccessibleNameMatching` | |
| `hasNonBlankContentDescription` | `hasNonBlankAccessibleName` | |
| `hasNoContentDescription` | `hasNoAccessibleName` | |
| `isHeading` / `isNotHeading` | `isHeading(level?)` / `isNotHeading` | The web also has heading levels |
| `hasText` / `hasTextContaining` | `hasText` / `hasTextContaining` | |
| `printToLog("A11Y")` on failure | ARIA snapshot attached and printed on failure | |
| (none) | `pageChecks`, `axe()`, `focusMap()`, `expectFocusOrder()` | New on the web |

## What is new compared with the Android library

- **`expectFocusOrder([...])`**: testers write the order they expect as a list. The DSL walks it forwards and backwards, checks the focus indicator at every stop, and prints an expected/actual table on failure.
- **Visible focus check**: every focused element must show an outline or box shadow (WCAG 2.4.7).
- **Focus traps**: `assertFocusTrappedIn` for modals and `assertNoKeyboardTrap` for the page (WCAG 2.1.2).
- **axe-core scan**: dozens of WCAG rules (contrast, labels, ARIA misuse) in one call.
- **Page structure**: language, title, landmarks, heading outline, positive tabindex.
- **Focus map**: a screenshot with every tab stop numbered. It's useful in design reviews and bug reports.
- **Broken mode**: the page can switch on seven real-world bugs so the suite can be demoed failing.

## Why Playwright

- Real keyboard events in Chromium, Firefox and WebKit, the engine behind Safari.
- Built-in assertions that read the browser's computed accessibility tree (`toHaveAccessibleName`, `toHaveRole`, `toMatchAriaSnapshot`), so the checks see roughly what a screen reader sees.
- Traces, screenshots and an HTML report for free.
- `@axe-core/playwright` is the de facto standard for automated WCAG scanning.
