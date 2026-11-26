# Equinox: automated accessibility testing for the web

Equinox is a hackathon project that automates the accessibility checks testers usually do by hand: keyboard focus order, visible focus, focus traps, accessible names, headings, landmarks and a WCAG 2.2 AA scan.

It is a small monorepo with the same shape as the Android `a11ytesting` project:

| | Android (`a11ytesting`) | Web (this repo) | Published? |
|---|---|---|---|
| Library | `:library` module | [`packages/a11y-testing`](packages/a11y-testing): npm package `@jeprubio/playwright-a11y` | Yes |
| Sample | `:app` module | [`apps/sample`](apps/sample): "DuckOps", an accessible (and silly) one-page product site | No |
| Tests using the library | Instrumented tests in `app/src/androidTest` | Playwright tests in `apps/sample/tests` | No |

The DSL reads the same on both platforms:

```kotlin
// Android (Compose)
composeTestRule.accessibility {
    keyboardFocus {
        next() shouldFocus "skip-link"
        next() shouldFocus "nav-features"
    }
}
```

```ts
// Web (Playwright)
import { a11y } from '@jeprubio/playwright-a11y';

await a11y(page).keyboardFocus((k) =>
  k.next().shouldFocus('skip-link')
   .next().shouldFocus('nav-features'));
```

## Quick start

Requires Node.js 20 or later. Run everything from the repository root.

```bash
npm install
```

```bash
npx playwright install
```

```bash
npm run dev
```

The sample site runs at <http://localhost:5173>. Open <http://localhost:5173/?broken=1> to see it with deliberate accessibility bugs. Stop it with Ctrl+C.

## Commands (from the root)

| Command | What it does |
|---|---|
| `npm test` | Builds the library, runs its own tests, then runs the sample app's tests, all in Chromium, Firefox and WebKit |
| `npm run test:lib` | Library tests only (inline HTML fixtures, no server) |
| `npm run test:sample` | Sample app tests only (Playwright starts the dev server) |
| `npm run test:chromium` | Sample app tests in Chromium only, the quickest feedback loop |
| `npm run test:ui` | Playwright UI mode for the sample app: step through each test and watch the browser |
| `npm run test:broken` | Sample tests against `?broken=1`. **It is expected to fail**, and shows what each test catches |
| `npm run focus-map` | Writes `apps/sample/focus-maps/chromium.png`, a screenshot with every tab stop numbered |
| `npm run report` | Opens the sample app's HTML report (accessibility trees, axe results, focus maps) |
| `npm run typecheck` | Builds the library and type-checks every workspace |
| `npm run build:lib` | Compiles the library to `packages/a11y-testing/dist` |
| `npm run pack:lib` | Shows exactly which files would be published to npm |

Pass options to Playwright after `--`:

```bash
npm run test:chromium -- --headed -g "dialog"
```

If port 5173 is busy, prefix a test command with `PORT=5174` and start the site with `npm run dev -- --port 5174`.

[Running the site and the tests](docs/08-running-and-testing.md) has the full list: a hands-on checklist for trying the site by keyboard, every command and option, environment variables, where results go, and troubleshooting.

## The sample site

DuckOps is a fake product, "rubber duck debugging, as a service", built to look like a real landing page so the tests run against something realistic:

- a floating, blinking rubber duck that talks back, with rising bubbles and code snippets;
- count-up stats, scroll-reveal sections, tilting feature cards and an animated architecture diagram;
- a booking form with a live staff badge that changes as you type (the Principal Duck gets a hard hat);
- a duck burst when you book, and a family of ducks paddling across the footer.

All of it is decorative: animated parts are hidden from assistive technology, and everything stops when the system asks for reduced motion. The tests run with reduced motion on, so animations never make them flaky.

## What the sample app tests

| Area | Checks | Spec |
|---|---|---|
| Keyboard | Tab order forwards and backwards, visible focus at every stop, skip link, no keyboard trap, radio group arrow keys, checkbox Space, FAQ Enter | `keyboard.spec.ts` |
| Dialog | Opens from the keyboard, focus moves inside, Tab is trapped, Escape closes, focus returns to the opener, background is inert, name and description | `dialog.spec.ts` |
| Form | Labels, hints, required state, error summary focus, `aria-invalid`, errors read as descriptions, success announced in a live region | `form.spec.ts` |
| Structure | Language, title, landmarks, one h1, no skipped heading levels, heading outline, alt text, decorative icons hidden, ARIA snapshots | `structure.spec.ts` |
| WCAG scan | axe-core with the WCAG 2.0, 2.1 and 2.2 A/AA rules, in four page states | `axe.spec.ts` |
| Focus map | Visual map of the tab order, checked against the expected order | `focus-map.spec.ts` |

## Project layout

```
package.json                  workspace root: lists packages/* and apps/*, holds the shared scripts
tsconfig.base.json            compiler options shared by every workspace
packages/a11y-testing/        THE LIBRARY (published as @jeprubio/playwright-a11y)
  src/
    index.ts                  a11y(page) and the public API: anything exported here is public
    keyboard.ts               KeyboardA11y and FocusStep (port of the Kotlin classes)
    elements.ts               AccessibilityAssertions and ElementAccessibility
    page-checks.ts            whole-page structure checks
    axe.ts                    axe-core wrapper with readable failures
    focus.ts                  focus inspection, tab walking, focus map drawing
    chain.ts                  makes the DSL chainable and awaitable
    tree-dump.ts              accessibility tree dump on failure
  test/                       the library's own tests, on inline HTML fixtures
  tsconfig.build.json         compiles src/ to dist/ (JavaScript + type definitions)
  README.md                   the page shown on npm
apps/sample/                  THE SAMPLE APP (private, never published)
  index.html                  the page (semantic HTML, data-testid on every element under test)
  src/                        dialog, form validation, broken mode, styles
  tests/                      Playwright tests that import @jeprubio/playwright-a11y
docs/                         process and reference documentation
.github/workflows/a11y.yml    CI pipeline
```

## Documentation

- [Overview: from Android to the web](docs/01-overview.md)
- [The process, step by step](docs/02-process.md)
- [DSL reference](docs/03-dsl-reference.md)
- [Writing tests: a guide for testers](docs/04-writing-tests.md)
- [Broken mode and the demo script](docs/05-broken-mode.md)
- [Browser notes, CI and limitations](docs/06-browsers-ci-limitations.md)
- [Project structure: the monorepo explained for Android developers](docs/07-project-structure.md)
- [Running the site and the tests](docs/08-running-and-testing.md)

## Important

Automated tests catch a large share of accessibility problems, not all of them. They do not replace a test with a real screen reader (VoiceOver, NVDA, TalkBack) or with people with disabilities. Use them to stop regressions, so manual testing time goes to the things only a person can judge.
