# Equinox: automated accessibility testing for the web

Equinox is a hackathon project with two parts:

1. **An accessible one-page site**, "Equinox Night", a fictional stargazing event with navigation, a registration form, a modal dialog and an FAQ.
2. **A Playwright test DSL** that automates the accessibility checks testers usually do by hand: keyboard focus order, visible focus, focus traps, accessible names, headings, landmarks and a WCAG 2.2 AA scan.

The DSL is a web port of the Android [`a11ytesting`](../../Telefonica/a11ytesting) library (Kotlin, Jetpack Compose), so tests read the same way on both platforms:

```kotlin
// Android (Compose)
composeTestRule.accessibility {
    keyboardFocus {
        next() shouldFocus "skip-link"
        next() shouldFocus "nav-about"
    }
}
```

```ts
// Web (Playwright)
await a11y(page).keyboardFocus((k) =>
  k.next().shouldFocus('skip-link')
   .next().shouldFocus('nav-about'));
```

## Quick start

Requires Node.js 20 or later.

```bash
npm install
```

```bash
npx playwright install
```

```bash
npm run dev
```

The site runs at <http://localhost:5173>. Open <http://localhost:5173/?broken=1> to see it with deliberate accessibility bugs.

## Running the tests

| Command | What it does |
|---|---|
| `npm test` | Full suite in Chromium, Firefox and WebKit (Playwright starts the dev server) |
| `npm run test:chromium` | Chromium only, the quickest feedback loop |
| `npm run test:ui` | Playwright UI mode: step through each test and watch the browser |
| `npm run test:broken` | Runs the suite against `?broken=1`. **It is expected to fail**, and shows what each test catches |
| `npm run focus-map` | Writes `focus-maps/chromium.png`, a screenshot with every tab stop numbered |
| `npm run report` | Opens the HTML report with the attached accessibility trees, axe results and focus maps |
| `npm run typecheck` | TypeScript check for the site and the tests |

## What is tested

| Area | Checks | Spec |
|---|---|---|
| Keyboard | Tab order forwards and backwards, visible focus at every stop, skip link, no keyboard trap, radio group arrow keys, checkbox Space, FAQ Enter | `tests/keyboard.spec.ts` |
| Dialog | Opens from the keyboard, focus moves inside, Tab is trapped, Escape closes, focus returns to the opener, background is inert, name and description | `tests/dialog.spec.ts` |
| Form | Labels, hints, required state, error summary focus, `aria-invalid`, errors read as descriptions, success announced in a live region | `tests/form.spec.ts` |
| Structure | Language, title, landmarks, one h1, no skipped heading levels, heading outline, alt text, decorative icons hidden, ARIA snapshots | `tests/structure.spec.ts` |
| WCAG scan | axe-core with the WCAG 2.0, 2.1 and 2.2 A/AA rules, in four page states | `tests/axe.spec.ts` |
| Focus map | Visual map of the tab order, checked against the expected order | `tests/focus-map.spec.ts` |

## Project layout

```
index.html                 the page (semantic HTML, data-testid on every element under test)
src/
  main.ts                  entry point
  dialog.ts                modal dialog: focus trap and focus restoration
  form.ts                  validation with an error summary and a live region
  broken.ts                ?broken=1: injects seven common accessibility bugs
  style.css                styles (WCAG AA contrast, one focus style for all controls)
tests/
  a11y/                    the DSL
    index.ts               a11y(page): keyboardFocus, elementChecks, pageChecks, axe, focusMap
    keyboard.ts            KeyboardA11y and FocusStep (port of the Kotlin classes)
    elements.ts            AccessibilityAssertions and ElementAccessibility
    page-checks.ts         whole-page structure checks
    axe.ts                 axe-core wrapper with readable failures
    focus.ts               focus inspection, tab walking, focus map drawing
    chain.ts               makes the DSL chainable and awaitable
    tree-dump.ts           accessibility tree dump on failure
  support.ts               openPage() and the expected tab order
  *.spec.ts                the test suites
docs/                      process and reference documentation
.github/workflows/a11y.yml CI pipeline
```

## Documentation

- [Overview: from Android to the web](docs/01-overview.md)
- [The process, step by step](docs/02-process.md)
- [DSL reference](docs/03-dsl-reference.md)
- [Writing tests: a guide for testers](docs/04-writing-tests.md)
- [Broken mode and the demo script](docs/05-broken-mode.md)
- [Browser notes, CI and limitations](docs/06-browsers-ci-limitations.md)

## Important

Automated tests catch a large share of accessibility problems, not all of them. They do not replace a test with a real screen reader (VoiceOver, NVDA, TalkBack) or with people with disabilities. Use them to stop regressions, so manual testing time goes to the things only a person can judge.
