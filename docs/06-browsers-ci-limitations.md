# Browser notes, CI and limitations

## Browser differences

Keyboard behaviour is not identical across browsers, and the DSL handles the differences so the same tests pass everywhere.

### WebKit (Safari)

By default, Safari on macOS **only tabs between form fields**. Links and buttons are skipped unless the user turns on *Settings → Advanced → Press Tab to highlight each item*. Option+Tab always visits every element.

The DSL therefore presses `Alt+Tab` in WebKit (see `tabKey()` in `tests/a11y/focus.ts`), which tests the full order that Safari users with the setting enabled, and VoiceOver users, rely on.

This matters for manual testing too: a tester using Safari with default settings will report a different order. That isn't a bug in the page.

### Firefox

On macOS, Firefox can also skip links on Tab. `playwright.config.ts` sets the `accessibility.tabfocus = 7` preference so Firefox tabs to every control.

### Radio groups

All browsers treat a radio group as **one** tab stop: the checked radio, or the first one if none is checked. Arrow keys move between options. That is why `EXPECTED_TAB_ORDER` lists only `ticket-standard`.

## Continuous integration

`.github/workflows/a11y.yml`:

1. installs dependencies and the three browsers;
2. runs the TypeScript check;
3. runs the full suite;
4. uploads `playwright-report/` and `focus-maps/` as artifacts, even when tests fail.

In CI, Playwright retries a failed test once and refuses `test.only`.

## Limitations

Automated testing finds a large share of accessibility issues, not all of them. In particular, it cannot judge:

- whether an accessible name or alt text is **meaningful** (only that it exists or matches what you wrote);
- whether the **reading experience** with a real screen reader makes sense (verbosity, announcement order, live region timing);
- **cognitive** accessibility: plain language, consistent navigation, predictable behaviour;
- zoom and reflow at 400 %, text spacing, or orientation. These could be added with Playwright viewport tests;
- issues in states the tests never reach.

Use this suite to stop regressions and to free manual testing time for screen reader sessions and testing with real users.

## Ideas for after the hackathon

- Publish `tests/a11y/` as an npm package shared across Telefónica web projects.
- Add a `reflow` check: render at 320 CSS px wide and assert there is no horizontal scroll (WCAG 1.4.10).
- Add a `targetSize` check: every control is at least 24×24 px (WCAG 2.5.8).
- Generate `EXPECTED_TAB_ORDER` from a Figma annotation layer so design owns the order.
- Compare focus maps between branches and post the diff on the pull request.
