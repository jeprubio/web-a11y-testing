# Broken mode and the demo script

Open the page with `?broken=1` (<http://localhost:5173/?broken=1>) and `apps/sample/src/broken.ts` injects seven common accessibility bugs. Each one is something manual testers report regularly, and each is caught by at least one automated test.

## The seven bugs

| # | Bug | WCAG | Caught by |
|---|---|---|---|
| 1 | Focus outline removed (`outline: none`) | 2.4.7 Focus Visible | `shouldFocusVisibly`, `expectFocusOrder` visible-focus check |
| 1b | Card text with low contrast | 1.4.3 Contrast | `axe()` → `color-contrast` |
| 2 | `tabindex="1"` on the submit button | 2.4.3 Focus Order | `expectFocusOrder` table, `hasNoPositiveTabindex`, focus map |
| 3 | Email `<label>` removed | 1.3.1, 4.1.2 Name, Role, Value | `hasAccessibleNameContaining`, `axe()` → `label` |
| 4 | Icon-only close button loses its `aria-label` | 4.1.2 | `hasAccessibleName`, `axe()` → `button-name` |
| 5 | FAQ `<h2>` replaced by a styled `<div>` | 1.3.1 Info and Relationships | `isHeading`, `hasHeadingOutline` |
| 6 | Name error no longer linked with `aria-describedby` | 3.3.1 Error Identification | `hasAccessibleDescription` |
| 7 | Dialog without a focus trap or focus restoration | 2.4.3, 2.1.2 | `assertFocusTrappedIn`, the Escape test, `shouldFocus('open-details')` |

## Running it

```bash
npm run test:broken
```

This runs the Chromium suite against the broken page. About 20 of the 32 tests fail, each for one of the reasons above. Tests that don't touch a broken area keep passing, which shows the failures are targeted, not noise.

Generate a focus map of the broken page next to the correct one:

```bash
BROKEN=1 npm run focus-map
```

Compare `apps/sample/focus-maps/chromium.png` and `apps/sample/focus-maps/chromium-broken.png`. In the broken map, stop number 1 is the submit button halfway down the page.

## Five-minute demo script

1. **The problem (30 s).** "Testers check keyboard order and screen reader labels by hand on every release. On Android we automated that; this is the same thing for the web."
2. **The page (1 min).** Show the site. Press Tab: skip link, navigation, form, dialog. Open the dialog, press Escape, and show that focus returns to the button.
3. **The tests (1 min).** Show `apps/sample/tests/keyboard.spec.ts` next to the Kotlin DSL. Run `npm run test:chromium`: all green in about 15 seconds.
4. **Break it (1.5 min).** Open `?broken=1` and Tab once: focus jumps to the submit button with no outline. Run `npm run test:broken` and walk through three failures:
   - the expected/actual focus order table;
   - the axe output: `label` and `button-name` with help links;
   - the dialog: "focus escaped `details-dialog`".
5. **The focus map (30 s).** Show the two PNGs side by side.
6. **Close (30 s).** "Runs in CI on every PR, in Chrome, Firefox and Safari's engine. Testers write the expected order; the machine does the tabbing."
