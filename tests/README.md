# Bait & Nuke — Test Rig

18 suites, ~180 assertions. Browser tests run in Chromium via Playwright;
engine tests run the shipped `app.js` directly in Node.

## Run
```
npm install
npx playwright install chromium
npm test
```
These also run automatically on every push — see `.github/workflows/tests.yml`.

## What each suite guards
| Suite | Guards |
|---|---|
| `walkthrough.js` | Full new-user run: data load, help panel, tour navigation, zero JS errors |
| `tourtest.js` | Demo squad lifecycle, step acts, spotlight alignment, screen-swallow guard |
| `zoomproof.js` | **That no CSS `zoom` ships.** See warning below |
| `xssguard.js` | **That typed text can't become page instructions.** See below |
| `locktest.js` | Scroll-lock refcount, orphan-lock watchdog, squad survives refresh |
| `pulltest.js` | Pull-to-cast gesture arms/disarms correctly under overlays |
| `jumptest.js` | Search bar fades with **0.00px** layout shift (phone + desktop) |
| `switchtest.js` | Squad switcher restores saved loadouts, not auto-picks |
| `cuptiptest.js` | Date-aware cup rotation, staleness warning, tap-tooltips |
| `spritetest.js` | Sprites load + fail gracefully (never a broken icon) |
| `v48test.js` | Reroll fix, compact mode, reorder handle un-hijacked |
| `dextest.js` | Secret Dex summon word, lock etiquette, artwork overlay |
| `konamitest.js` | ↑↑↓↓←→←→BA sequence, ignored inside inputs |
| `v51test.js` | Tabs show YOUR kit; whole-card tap switches |
| `v52test.js` | Animated sprites, mega chips, tour copy |
| `leaguetest.js` | Boards differ per league; cap-crushed mons excluded from Great League |
| `metatest.js` | Board entries are meta-relevant per PvPoke rankings |
| `flagtest.js` | Elite TM / legacy moves flagged correctly in every dropdown |

## ⚠ Do not reintroduce `zoom` in CSS
`body { zoom: 1.05 }` once shipped for a mobile size bump. Chromium scales
`getBoundingClientRect()` under CSS zoom; iOS WebKit does not. That divergence
caused five consecutive failed fixes to the tour spotlight (v53–v57) before the
line was deleted in v58.

`zoomproof.js` asserts no zoom ships **and** contains a CONTROL that injects
zoom back in and verifies the old bug reproduces. If that control ever reports
"no longer reproduces", investigate — do not delete the assertion.

## ⚠ Escape all user-typed text before rendering
`innerHTML` pastes text into the page as HTML — the browser obeys instructions
hidden inside it. The app has exactly two inputs carrying text from a person:

1. **Team names** typed in the vault → must pass through `escName()`
2. **Share codes** pasted on import → fields are lookup keys only (a bad value
   matches nothing); IVs are coerced to clamped numbers

Everything else rendered comes from `gamemaster.json`, which we control. The
app reads nothing from the URL. `xssguard.js` re-checks this every run; it was
verified by deliberately rendering a team name unescaped, confirming the guard
failed, then restoring.

## Refreshing PvPoke data
`gamemaster.json` carries two PvPoke-derived blocks that go stale:
- `metaScores` — how strong each mon is per league (meta shifts)
- `moveFlags` — which moves need an Elite TM or are legacy

Refresh both with one command:
```
npm run refresh-meta
node tests/metatest.js && node tests/flagtest.js
```
The script merges additively and **aborts if `pokemon`, `moves`, or
`typeChart` counts change**, so it cannot damage core data.

## ⚠ Cup schedule expires 2026-08-04
`CUPS` in `app.js` is encoded with real UTC start/end dates through
**2026-08-04**. Past that, `CUP_SCHEDULE_END` trips and the banner shows
"Schedule out of date — check the live calendar" instead of pretending a dead
cup is live. To extend: add the next season's entries with `startISO`/`endISO`
and move `CUP_SCHEDULE_END` to the new final date.

## Release gate
All suites green → deploy → md5 the raw GitHub files against the local build.
No hash match, no release.
