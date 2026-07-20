# Bait & Nuke — Test Rig

17 suites, ~160 assertions. Browser tests run in Chromium via Playwright;
engine tests run the shipped `app.js` directly in Node.

## Run
```
npm install
npx playwright install chromium
npm test
```

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
| `cuptiptest.js` | Date-aware cup rotation; tap-tooltips on touch only |
| `spritetest.js` | Sprites load + fail gracefully (never a broken icon) |
| `v48test.js` | Reroll fix, compact mode, reorder handle un-hijacked |
| `dextest.js` | Secret Dex summon word, lock etiquette, artwork overlay |
| `konamitest.js` | ↑↑↓↓←→←→BA sequence, ignored inside inputs |
| `v51test.js` | Tabs show YOUR kit; whole-card tap switches |
| `v52test.js` | Animated sprites, mega chips, tour copy |
| `leaguetest.js` | Boards differ per league; cap-crushed mons excluded from Great League |
| `metatest.js` | Board entries are meta-relevant per PvPoke rankings |

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
hidden inside it. The app has exactly two inputs that carry text from a person:

1. **Team names** typed in the vault → must pass through `escName()`
2. **Share codes** pasted on import → fields are used only as lookup keys
   (a bad value simply matches nothing); IVs are coerced to clamped numbers

Everything else rendered (species names, move names, stats) comes from
`gamemaster.json`, which we control. The app reads nothing from the URL.

`xssguard.js` re-checks all of this on every run. It was verified by
deliberately rendering a team name unescaped — the guard failed as intended,
then passed once restored. If it ever fails, wrap the offending value in
`escName()`.

## Meta rankings refresh
`gamemaster.json` carries `metaScores` — PvPoke overall rankings per CP cap,
fetched 2026-07-20. These drift as the meta shifts. To refresh:

```
curl -s https://raw.githubusercontent.com/pvpoke/pvpoke/master/src/data/rankings/all/overall/rankings-1500.json
curl -s https://raw.githubusercontent.com/pvpoke/pvpoke/master/src/data/rankings/all/overall/rankings-2500.json
curl -s https://raw.githubusercontent.com/pvpoke/pvpoke/master/src/data/rankings/all/overall/rankings-10000.json
```
Map `speciesId -> score` for each, write to `gamemaster.metaScores` under keys
`1500` / `2500` / `10000`, and re-run `metatest.js`. Merge additively —
never touch `pokemon`, `moves`, or `typeChart`.

## Release gate
All suites green → engine regression → deploy → md5 the raw GitHub files
against the local build. No hash match, no release.
