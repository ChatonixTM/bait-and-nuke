/* targettest — EVERY CONTROL IS A THUMB'S WIDTH
   ═════════════════════════════════════════════════
   Founder, Oct 2 2026: "a slight refreshed look, maybe more button-y". U0 measured the live site first: at 428x926,
   20 of 24 controls were under 44px (help 30x30, the tip x 24x26, the coach chips 26px tall, the five squad buttons
   at 43). U1 raised every one. This bench holds the floor at five viewports in every state that shows controls,
   and holds the page to no sideways scroll.

   ⚠ EACH STATE PROVES IT OPENED (Semiu, Oct 2: BLIND — "the state witness is the click, not the opened thing").
   The first version clicked an opener and measured whatever was there; with the profile sheet unable to open it
   stayed green, measuring the page's 24 controls under the sheet's name, and "the cup banner opened" never opened at
   all — its expand button does not exist until the banner tucks itself away 5.5 s after load. Now every state names a
   WITNESS that exists only when that state is open, and a missing witness is a red of its own. The cup is driven both
   ways on purpose (collapsed, then expanded), so the two banner shapes are measured on any machine, fast or slow.
   ⚠ AND THE BUSIEST SCREENS ARE STATES TOO: a Pokemon selected (move pickers, IV boxes) and a squad of three (drag
   handles, remove buttons) carried eight controls under 44px that the first version never reached.
   ⚠ CONTROL FIRST: a 30x30 button is planted; the measurement must flag it.
   What it measures: button, select, input, [role=button], a[href], and the clickable cards (.profile-row,
   .nightmare-card, .tier-card). A clickable shape outside that list is outside this bench — named, not hidden. */
const { chromium } = require('playwright');
const path = require('path');
const VIEWS = [[375, 812], [390, 844], [428, 926], [320, 812], [926, 428]];
const { STATES, witnessed } = require('./bn-states.js');   // the nine witnessed screens, shared with emojitest

(async () => {
  const browser = await chromium.launch();
  let pass = 0, fail = 0;
  const t = (n, c, d) => { c ? pass++ : fail++; console.log((c ? '✅' : '❌ FAIL'), n + (c || !d ? '' : '\n     ' + d)); };
  const server = await require(path.join(__dirname, 'serve.js'))(path.join(__dirname, '..'), 8141);
  const measure = (page) => page.evaluate(() => {
    const vis = (e) => { const s = getComputedStyle(e); const b = e.getBoundingClientRect(); return s.display !== 'none' && s.visibility !== 'hidden' && +s.opacity > 0 && b.width > 0 && b.height > 0; };
    const name = (e) => e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (typeof e.className === 'string' && e.className ? '.' + e.className.trim().split(/\s+/).join('.') : '');
    const els = [...document.querySelectorAll('button, select, input:not([type=hidden]), [role=button], a[href], .profile-row, .nightmare-card, .tier-card')].filter(vis);
    return { overflowX: document.documentElement.scrollWidth - innerWidth, n: els.length,
      small: els.map((e) => { const b = e.getBoundingClientRect(); return { n: name(e), w: Math.round(b.width), h: Math.round(b.height) }; }).filter((c) => c.w < 44 || c.h < 44) };
  });
  const open = async (w, h, st) => {
    const page = await (await browser.newContext({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true })).newPage();
    const errs = []; page.on('pageerror', (e) => errs.push(e.message));
    await page.goto('http://localhost:8141/index.html');
    await page.waitForFunction(() => typeof POKEMON !== 'undefined' && POKEMON.length > 1000, null, { timeout: 15000 });
    await page.waitForTimeout(600);
    if (st && st.go) { await page.evaluate(st.go); await page.waitForTimeout(600); }
    return { page, errs };
  };

  // CONTROL — the instrument can see a small button
  {
    const { page } = await open(428, 926, null);
    await page.evaluate(() => { const b = document.createElement('button'); b.id = 'plantedSmall'; b.textContent = 'x'; b.style.cssText = 'position:fixed;left:10px;top:200px;width:30px;height:30px;min-height:0;z-index:99'; document.body.appendChild(b); });
    const m = await measure(page);
    t('CONTROL — a planted 30x30 button is flagged (so a green below means the controls are big, not that the bench is blind)', m.small.some((c) => c.n === 'button#plantedSmall'), JSON.stringify(m.small));
    await page.context().close();
  }
  for (const st of STATES) {
    for (const [w, h] of VIEWS) {
      const { page, errs } = await open(w, h, st);
      const opened = await witnessed(page, st.witness, st.count);
      const m = await measure(page);
      t(`${st.label} at ${w}x${h}: OPENED (its witness ${st.witness}${st.count ? ' x' + st.count : ''} is on the page), ${m.n} controls, every one at least 44x44`,
        opened && m.small.length === 0,
        (opened ? '' : 'NOT OPENED - ' + st.witness + ' is not visible; ') + (m.small.map((c) => `${c.n} ${c.w}x${c.h}`).join(', ')));
      if (w === 428) t(`${st.label} at ${w}x${h}: no sideways scroll, no page errors`, m.overflowX <= 0 && errs.length === 0, `overflowX ${m.overflowX}; ${errs[0] || ''}`);
      await page.context().close();
    }
  }
  // the help panel reads the roster's own numbers (U1: it once claimed 1,595 / 333 while the app loaded 1742 / 349)
  {
    const { page } = await open(428, 926, STATES.find((s) => s.label === 'the help panel'));
    const r = await page.evaluate(() => ({ shown: [...document.querySelectorAll('[data-count]')].map((e) => e.dataset.count + '=' + e.textContent), mons: POKEMON.length.toLocaleString(), moves: Object.keys(MOVES).length.toLocaleString() }));
    t('the help panel shows the loaded roster\'s own counts, never a typed one', r.shown.join() === `pokemon=${r.mons},moves=${r.moves}`, JSON.stringify(r));
    await page.context().close();
  }
  console.log(); console.log(pass + '/' + (pass + fail) + ' PASSED');
  server.close(); await browser.close(); process.exit(fail ? 1 : 0);
})();
