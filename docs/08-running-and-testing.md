# Running the site and the tests

Everything runs from the **repository root**. You need Node.js 20 or later.

## First-time setup

```bash
npm install
```

```bash
npx playwright install
```

The second command downloads Chromium, Firefox and WebKit for Playwright. You only need it once per machine, and again after a Playwright upgrade.

## Run the site

```bash
npm run dev
```

Open <http://localhost:5173>. Stop the server with **Ctrl+C** in the terminal where it runs.

To use another port, pass it after `--`:

```bash
npm run dev -- --port 5174
```

## Try it by hand

| Try | What you should see |
|---|---|
| Click the address bar, then press **Tab** repeatedly | Skip link first, then the nav, the hero buttons, the form, the FAQ and "Back to top". There's always a blue outline on the focused element. |
| On the skip link, press **Enter**, then **Tab** | Focus jumps past the navigation to "Book a duck". |
| Tab to "Meet the duck" and press **Enter** | The dialog opens with focus inside; Tab and Shift+Tab stay inside; **Escape** closes it and focus goes back to the button. |
| In the "Duck plan" group, use the **arrow keys** | The selection moves between plans; Tab leaves the group. |
| Submit the form empty | An error summary appears and receives focus; each link moves focus to the field with the problem. |
| Type your name and pick "Principal Duck" | The badge updates and the duck gets a hard hat. |
| Open <http://localhost:5173/?broken=1> and press Tab once | Focus jumps to "Book my duck" with no outline: the [broken mode](05-broken-mode.md) bugs. |
| Turn on *System Settings → Accessibility → Display → Reduce motion* and reload | Nothing moves; all content is still there. |

In **Safari**, press **Option+Tab** instead of Tab. By default Safari's Tab skips links and buttons (see [browser notes](06-browsers-ci-limitations.md#webkit-safari)).

To hear the page, turn on VoiceOver with **Cmd+F5** on macOS, or use NVDA on Windows.

## Run the tests

If `npm run dev` is already running, the sample tests reuse that server. Otherwise Playwright starts one and stops it when the tests finish.

| Command | What it runs | Time |
|---|---|---|
| `npm test` | Library tests, then sample app tests, in Chromium, Firefox and WebKit | ~1 min |
| `npm run test:chromium` | Sample app tests in Chromium only: the fastest feedback loop | ~15 s |
| `npm run test:sample` | Sample app tests in all three browsers | ~40 s |
| `npm run test:lib` | Library tests only (inline HTML, no server needed) | ~20 s |
| `npm run test:ui` | Playwright UI mode: pick tests, watch each step, time-travel through the trace | interactive |
| `npm run test:broken` | Sample tests against `?broken=1` in Chromium. **About 20 tests fail on purpose.** | ~25 s |
| `npm run focus-map` | Writes `apps/sample/focus-maps/chromium.png`, the page with every tab stop numbered | ~5 s |
| `npm run report` | Opens the HTML report of the last sample run | interactive |
| `npm run typecheck` | Builds the library and type-checks every workspace | ~5 s |

The test commands build the library first, so library changes are always picked up.

## Pass options to Playwright

Anything after `--` goes straight to Playwright:

| Example | Effect |
|---|---|
| `npm run test:chromium -- --headed` | Show the browser while the tests run |
| `npm run test:chromium -- tests/dialog.spec.ts` | Run one file |
| `npm run test:chromium -- -g "skip link"` | Run tests whose name matches |
| `npm run test:chromium -- --debug -g "Escape"` | Step through one test in the Playwright Inspector |
| `npm run test:sample -- --project=webkit` | One browser across the full sample suite |
| `npm run test:chromium -- --repeat-each=5` | Repeat each test to check for flakiness |
| `npm run test:chromium -- --list` | List the tests without running them |
| `npm run test:lib -- --project=firefox` | Library tests in Firefox only |

With `npm test`, the options apply to the sample app's tests only.

## Environment variables

Put these before the command:

| Variable | Effect | Example |
|---|---|---|
| `PORT` | Port for the sample tests' dev server (default 5173) | `PORT=5174 npm run test:chromium` |
| `BROKEN=1` | Point the sample tests at `?broken=1` | `BROKEN=1 npm run focus-map` |
| `CI=1` | CI behaviour: one retry, `test.only` is forbidden, never reuse a running server | `CI=1 npm test` |

## Where the results go

| Path | Contents |
|---|---|
| `apps/sample/playwright-report/` | HTML report (`npm run report`): screenshots, traces, accessibility tree dumps, axe JSON |
| `apps/sample/test-results/` | Raw artifacts of failed tests: screenshot, trace and error context |
| `apps/sample/focus-maps/` | Focus order maps, one per browser, plus `-broken` versions |
| `packages/a11y-testing/dist/` | The built library |

All of these are git-ignored.

## Troubleshooting

**`Port 5173 is already in use`.** Another dev server is still running. Find the terminal where it runs and press Ctrl+C. If you can't find it, look up the process and stop it:

```bash
lsof -nP -iTCP:5173 -sTCP:LISTEN
```

Then run `kill <PID>` with the PID it shows. Alternatively, leave it running and use another port: `npm run dev -- --port 5174` for the site and `PORT=5174` for the tests.

**The tests open an old or empty page.** A dev server started before the move to `apps/sample` keeps serving the old folder, and the tests reuse it. Restart it with `npm run dev` from the root.

**`Executable doesn't exist` / browser not found.** Run `npx playwright install`.

**`Cannot find module '@jeprubio/playwright-a11y'`.** Run `npm install` from the root (it links the workspace), then `npm run build:lib`.

**A test passes locally and fails in CI.** Download the `a11y-report` artifact from the GitHub Actions run and open `playwright-report/index.html`: it has the trace and the accessibility tree at the moment of failure.
