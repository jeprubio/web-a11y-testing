# Hackathon presentation (5 minutes)

`index.html` is a self-contained slide deck: no install, no server, works offline. Double-click it, or open it in any browser.

## Controls

| Key | Action |
|---|---|
| → / Space / Page Down | Next slide |
| ← / Page Up | Previous slide |
| Home / End | First / last slide |
| N | Show or hide speaker notes |
| F | Full screen |

You can also click the arrow buttons. The URL keeps the slide number (`#5`), so a reload keeps your place.

## Timing (about 5 minutes)

| Slide | Time | What |
|---|---|---|
| 1. Stop tabbing by hand | 20 s | Intro |
| 2. The problem | 30 s | Manual testing today |
| 3. Same DSL, new platform | 30 s | Kotlin vs TypeScript |
| 4. One line per manual check | 20 s | Don't read the table |
| 5. Live demo | 2 min | See below |
| 6. The tab order, drawn | 20 s | Focus maps |
| 7. Our own page failed it | 40 s | The three bugs found |
| 8. Where it can go | 20 s | npm, audit any URL |
| 9. Thank you | — | Leave it up for questions |

Each slide's script is in its speaker notes (press **N**).

## Before you go on stage

1. In a terminal at the repo root, start the site and leave it running:
   ```bash
   npm run dev
   ```
2. In a second terminal tab, run the tests once so everything is warm:
   ```bash
   npm run test:chromium
   ```
3. Open <http://localhost:5173> in a browser tab and make sure "Pause animations" is **not** pressed (the duck should move).
4. Open a second browser tab with <http://localhost:5173/?broken=1>.
5. Make the terminal font big (Cmd + several times) so the room can read the output.
6. Open the deck, press **F** for full screen.

## Demo (slide 5, about 2 minutes)

1. **DuckOps tab:** click the address bar, press Tab a few times: skip link, nav, pause button, "Book a duck". Tab to "Meet the duck", press Enter: focus is inside the dialog, Tab stays inside, Escape puts focus back on the button.
2. **Terminal:** `npm run test:chromium`. 39 tests green in about 15 seconds.
3. **Broken tab:** click the address bar, press Tab once: focus jumps straight to "Book my duck", with no outline.
4. **Terminal:** `npm run test:broken`. Scroll up to the expected/actual focus order table and an axe failure (`label` or `button-name`).
5. **Back to the deck** for the focus map slide.

**If something goes wrong:** skip the live part and go straight to slide 6. The focus maps tell the same story.
