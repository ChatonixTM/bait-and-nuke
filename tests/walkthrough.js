// v40 new-user walkthrough — iPhone-sized touch viewport against the real build.
const { chromium } = require('playwright');


(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push('CONSOLE: ' + m.text()); });

  let pass = 0, fail = 0;
  const t = (name, cond, extra) => { cond ? pass++ : fail++; console.log((cond ? '✅' : '❌ FAIL'), name, extra ? '— ' + extra : ''); };

  const server = await require(require('path').join(__dirname,'serve.js'))(require('path').join(__dirname,'..'), 8765);
  await page.goto('http://localhost:8765/index.html');
  // Data must load over http (the file:// wall shouldn't exist here)
  await page.waitForFunction(() => typeof POKEMON !== 'undefined' && POKEMON.length > 1000, null, { timeout: 15000 });
  t('Fresh load: gamemaster loaded', true, await page.evaluate(() => POKEMON.length + ' mons'));

  // ---------- ACT 1: the help panel, like a curious new user ----------
  // Scroll down a bit first so we can prove position restore later.
  await page.evaluate(() => window.scrollTo(0, 300));
  await page.waitForTimeout(200);
  const preScroll = await page.evaluate(() => window.scrollY);

  await page.tap('#helpFab');
  await page.waitForTimeout(300);

  const state1 = await page.evaluate(() => {
    const panel = document.getElementById('helpPanel');
    const cs = getComputedStyle(panel);
    return {
      panelShown: panel.classList.contains('show'),
      bodyLocked: document.body.classList.contains('tabs-open'),
      bodyPos: getComputedStyle(document.body).position,
      backdropShown: document.getElementById('helpBackdrop')?.classList.contains('show'),
      overflowY: cs.overflowY,
      overscroll: cs.overscrollBehavior,
      scrollable: panel.scrollHeight > panel.clientHeight,
      panelH: panel.clientHeight, contentH: panel.scrollHeight
    };
  });
  t('Help opens', state1.panelShown);
  t('Body is LOCKED behind panel', state1.bodyLocked && state1.bodyPos === 'fixed', 'position:' + state1.bodyPos);
  t('Backdrop is up', !!state1.backdropShown);
  t('Panel owns its own scrolling (overflow-y auto)', state1.overflowY === 'auto');
  t('Overscroll contained', state1.overscroll.includes('contain'), state1.overscroll);

  // The background must not move while the panel is open.
  await page.mouse.wheel(0, 600);
  await page.waitForTimeout(250);
  const bgMoved = await page.evaluate(() => window.scrollY);
  t('Background does NOT move on scroll attempt', bgMoved === 0 /* body is position:fixed; scrollY pins to 0 */, 'scrollY=' + bgMoved);

  // ---------- ACT 2: read like a real user — open sections, then reach the footnote ----------
  await page.evaluate(() => document.querySelectorAll('#helpPanel details').forEach(d => d.open = true));
  await page.waitForTimeout(150);
  const expanded = await page.evaluate(() => {
    const p = document.getElementById('helpPanel');
    return { scrollable: p.scrollHeight > p.clientHeight, sh: p.scrollHeight, ch: p.clientHeight };
  });
  t('Panel scrolls ITSELF once sections are open', expanded.scrollable, expanded.sh + 'px content in ' + expanded.ch + 'px panel');
  const bottom = await page.evaluate(() => {
    const panel = document.getElementById('helpPanel');
    panel.scrollTop = panel.scrollHeight;
    return Math.abs(panel.scrollTop + panel.clientHeight - panel.scrollHeight) < 4;
  });
  t('Hard swipe reaches the very bottom', bottom);
  // The ritual: scroll the tease into view inside the panel, tap it, read the reveal.
  await page.evaluate(() => document.getElementById('hpEggTease').scrollIntoView({block:'center'}));
  await page.waitForTimeout(150);
  await page.tap('#hpEggTease');
  await page.waitForTimeout(300);
  const egg = await page.evaluate(() => {
    const panel = document.getElementById('helpPanel');
    const reveal = document.getElementById('hpEggReveal');
    const shown = reveal.classList.contains('show') && getComputedStyle(reveal).display !== 'none';
    reveal.scrollIntoView({block:'center'});
    const r = reveal.getBoundingClientRect(), p = panel.getBoundingClientRect();
    const firm = r.height > 20 && r.top >= p.top - 4 && r.bottom <= p.bottom + 8;
    return { shown, firm, h: Math.round(r.height) };
  });
  t('Egg tease receives the tap → reveal opens', egg.shown);
  t('Secret footnote firm + fully readable inside the panel', egg.firm, egg.h + 'px tall, fully in frame');

  // ---------- ACT 3: dropdowns inside the panel receive the tap ----------
  const dd = await page.evaluate(() => {
    const panel = document.getElementById('helpPanel');
    const det = panel.querySelector('details');
    if (!det) return { found: false };
    det.scrollIntoView({ block: 'center' });
    return { found: true, openBefore: det.open };
  });
  if (dd.found) {
    await page.waitForTimeout(150);
    const summary = page.locator('#helpPanel details summary').first();
    await summary.tap();
    await page.waitForTimeout(150);
    const openAfter = await page.evaluate(() => document.querySelector('#helpPanel details').open);
    t('Dropdown inside panel receives the tap', openAfter !== dd.openBefore, 'open: ' + dd.openBefore + ' → ' + openAfter);
  } else {
    t('Dropdown present in help', false, 'no <details> found');
  }

  // ---------- ACT 4: close → world restored exactly ----------
  await page.tap('body', { position: { x: 20, y: 700 } });   // tap the dimmed background
  await page.waitForTimeout(300);
  const state2 = await page.evaluate(() => ({
    panelShown: document.getElementById('helpPanel').classList.contains('show'),
    bodyLocked: document.body.classList.contains('tabs-open'),
    scrollY: window.scrollY
  }));
  t('Tap outside closes the panel', !state2.panelShown);
  t('Body unlocked on close', !state2.bodyLocked);
  t('Scroll position restored exactly', state2.scrollY === preScroll, preScroll + ' → ' + state2.scrollY);

  // ---------- ACT 5: the tutorial, patient AND impatient ----------
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.tap('#helpFab');
  await page.waitForTimeout(200);
  await page.tap('#helpTourBtn');
  await page.waitForTimeout(1200);
  const tour1 = await page.evaluate(() => ({
    started: !!document.querySelector('.tour-caption.show, .tour-caption'),
    helpClosed: !document.getElementById('helpPanel').classList.contains('show')
  }));
  t('Tour starts from help panel', tour1.started);
  t('Help panel closed itself for the tour', tour1.helpClosed);

  // Impatient abuse: DOUBLE-tap Next immediately — with the settle-race fix,
  // exactly ONE step should advance per (double)tap burst... last tap wins,
  // so a rapid double-tap may advance up to 2 but must never repaint stale.
  const c0 = await page.evaluate(() => document.querySelector('.tour-step-count').textContent.trim());
  await page.locator('#tourNext').tap({force:true});
  await page.locator('#tourNext').tap({force:true});
  await page.waitForTimeout(2500);
  const c1 = await page.evaluate(() => document.querySelector('.tour-step-count').textContent.trim());
  t('Double-tap never repaints a stale step', c1 !== c0, c0 + ' → ' + c1);

  // Patient run to the end
  let closed = false, eaten = 0;
  for (let i = 0; i < 16; i++) {
    const st = await page.evaluate(() => {
      const cap = document.querySelector('.tour-caption');
      const visible = cap && cap.classList.contains('show');
      return { visible,
        counter: visible ? (document.querySelector('.tour-step-count')?.textContent.trim() || '?') : 'CLOSED',
        label: visible ? (document.getElementById('tourNext')?.textContent.trim() || '?') : 'CLOSED' };
    });
    if (!st.visible) { closed = true; break; }
    await page.waitForTimeout(700);              // let the caption finish its glide
    await page.locator('#tourNext').tap({force:true});
    if (st.label === 'Done') {
      await page.waitForTimeout(800);
      closed = await page.evaluate(() => !document.querySelector('.tour-caption').classList.contains('show'));
      break;
    }
    try { await page.waitForFunction(p => {
        const cap = document.querySelector('.tour-caption');
        if (!cap || !cap.classList.contains('show')) return true;
        return document.querySelector('.tour-step-count').textContent.trim() !== p;
      }, st.counter, { timeout: 4000 }); }
    catch(e){ eaten++; }
  }
  t('Tour completes: Done actually closes it', closed);
  t('No eaten taps on the patient run', eaten === 0, eaten + ' eaten');

  t('Zero JS errors across the whole walkthrough', errors.length === 0, errors.slice(0, 3).join(' | ') || 'clean');

  console.log('\n' + pass + '/' + (pass + fail) + ' PASSED');
  await browser.close(); server.close();
  process.exit(fail ? 1 : 0);
})();
