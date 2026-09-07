/* CUPTIP — the cup rotation resolves to the right cup at a given instant.
 *
 * RE-POINTED Sept 7 2026 at Season 28 ("Twilight Trails", Sep 8 - Dec 1 2026),
 * the day before Season 27's schedule expired. The cup cases were written and
 * PROVED BY GOHAN against the live app; he has no write access, so they changed
 * hands rather than the rule changing.
 *
 * ⚠ THE PROBE THAT WAS ASKED FOR HAD NO TEETH, AND HE SAID SO. The DST check
 * was specified at 2026-11-05T12:00:00Z. He planted the very defect it names —
 * every November boundary reverted from 21:00Z to a naive 20:00Z — and that
 * probe still PASSED, because a uniform one-hour shift never moves a midday
 * timestamp across a weekly boundary. He added 2026-11-03T20:30:00Z, inside the
 * hour the offset actually changes; it goes red on the mutant and green on the
 * real code. A probe that cannot fail on the defect it names is a comment.
 *
 * ⚠ THE GAP AND THE OVERLAP ARE ASSERTED, NOT FIXED. Niantic's published
 * schedule leaves 24 hours with no cup between the two LAIC windows and lists
 * Nov 24-25 twice. Both are encoded as published, so these cases record what the
 * app DOES there: no cup is live in the gap, and the later entry wins the overlap.
 *
 * ⚠ AND THE TAP-TOOLTIP SECTION BELOW WAS NEARLY LOST. The handed-over file
 * dropped it while its own report said it was untouched; the lander refused the
 * join and it was carried across by hand. A test file that shrinks is a coverage
 * cut, and it looks exactly like a tidy-up.
 */
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  let pass=0, fail=0;
  const t=(n,c,x)=>{c?pass++:fail++;console.log((c?'OK':'FAIL'),n,x?'— '+x:'');};
  const server = await require(require('path').join(__dirname,'serve.js'))(require('path').join(__dirname,'..'), 8771);

  // --- Cup auto-selection at three ordinary points in Season 28
  //     ("Twilight Trails", Sep 8 - Dec 1 2026) ---
  for(const [when, expect] of [['2026-09-10T12:00:00Z','Mega Edition week'],['2026-09-25T12:00:00Z','Retro Cup'],['2026-10-23T12:00:00Z','Fantasy Cup: Great League Edition']]){
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.addInitScript(`{const t=${Date.parse(when)};Date.now=()=>t;}`);
    await page.goto('http://localhost:8771/index.html');
    await page.waitForFunction(()=>typeof CUPS!=='undefined');
    const live = await page.evaluate(()=>CUPS.find(c=>c.live)?.name || 'NONE');
    t('clock '+when.slice(5,10)+' -> live: '+expect, live.includes(expect), live);
    await ctx.close();
  }

  // The Nov boundary is hand arithmetic (20:00Z through Oct, 21:00Z from
  // Nov 3 on - US DST ends Nov 1, no source states the switch, two readers
  // agreed on it independently; see the CUPS header). This is the probe
  // that actually discriminates a correct 21:00Z from a wrong 20:00Z: at
  // 20:30Z on the day the season's own boundary flips, the two encodings
  // disagree about which cup is live. (Confirmed by planting the 20:00Z
  // defect and watching this go red - see the report.)
  {
    const when = '2026-11-03T20:30:00Z';
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.addInitScript(`{const t=${Date.parse(when)};Date.now=()=>t;}`);
    await page.goto('http://localhost:8771/index.html');
    await page.waitForFunction(()=>typeof CUPS!=='undefined');
    const live = await page.evaluate(()=>CUPS.find(c=>c.live)?.name || 'NONE');
    t('DST boundary '+when+' -> still Mega Halloween Cup (21:00Z, not 20:00Z)', live.includes('Mega Halloween Cup'), live);
    await ctx.close();
  }

  // Requested floor check: a normal post-DST instant still resolves to a
  // real, named cup. NOTE: at this hour this alone would NOT catch the
  // 20:00Z-vs-21:00Z mistake above - a uniform 1-hour offset does not move
  // noon across any boundary. Kept as a sanity check, paired with the sharp
  // boundary probe above which does catch it.
  {
    const when = '2026-11-05T12:00:00Z';
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.addInitScript(`{const t=${Date.parse(when)};Date.now=()=>t;}`);
    await page.goto('http://localhost:8771/index.html');
    await page.waitForFunction(()=>typeof CUPS!=='undefined');
    const live = await page.evaluate(()=>CUPS.find(c=>c.live)?.name || 'NONE');
    t('post-DST '+when+' -> live: Mega Edition week', live.includes('Mega Edition week'), live);
    await ctx.close();
  }

  // Niantic's own published schedule leaves a 24-hour GAP between the two
  // LAIC windows (week one ends 2026-11-17T21:00Z, week two starts
  // 2026-11-18T21:00Z). Encoded as published, not "fixed". Assert honestly:
  // no cup is live in the gap, and the banner never claims one is.
  {
    const when = '2026-11-17T22:00:00Z';
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.addInitScript(`{const t=${Date.parse(when)};Date.now=()=>t;}`);
    await page.goto('http://localhost:8771/index.html');
    await page.waitForFunction(()=>typeof CUPS!=='undefined');
    await page.waitForTimeout(200);
    const r = await page.evaluate(()=>({live: CUPS.find(c=>c.live)?.name || null,
      banner: document.querySelector('.cup-banner-text')?.textContent||''}));
    t('the published GAP ('+when+') -> no cup is live', r.live===null, String(r.live));
    t('the banner does not call the gap "Now in GBL"', !/Now in GBL/.test(r.banner), r.banner.slice(0,60));
    await ctx.close();
  }

  // Niantic ALSO publishes a 24-hour OVERLAP the same week - LAIC week two
  // AND Mega Catch Cup both list Nov 24-25. The live-cup picker takes the
  // LAST array match, so Mega Catch Cup (later in CUPS) wins. Recorded as a
  // known, tested behaviour instead of a surprise found on Nov 24.
  {
    const when = '2026-11-24T22:00:00Z';
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.addInitScript(`{const t=${Date.parse(when)};Date.now=()=>t;}`);
    await page.goto('http://localhost:8771/index.html');
    await page.waitForFunction(()=>typeof CUPS!=='undefined');
    const live = await page.evaluate(()=>CUPS.find(c=>c.live)?.name || 'NONE');
    t('the published OVERLAP ('+when+') -> app picks: Mega Catch Cup (later array entry wins)',
      live.includes('Mega Catch Cup'), live);
    await ctx.close();
  }

  // v65: the horizon moved to CUP_SCHEDULE_END = 2026-12-01T21:00:00Z
  // (Season 28, "Twilight Trails"). The false-case probe now sits inside
  // that season instead of the old Aug 3 date, which the season has long
  // since passed.
  for(const [when, expectStale] of [['2026-10-01T12:00:00Z', false], ['2026-12-02T00:00:00Z', true]]){
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.addInitScript(`{const t=${Date.parse(when)};Date.now=()=>t;}`);
    await page.goto('http://localhost:8771/index.html');
    await page.waitForFunction(()=>typeof CUPS!=='undefined');
    await page.waitForTimeout(300);
    const r = await page.evaluate(()=>({stale: !!window.__bnCupScheduleStale,
      banner: document.querySelector('.cup-banner-text')?.textContent||''}));
    t(`clock ${when.slice(0,10)} -> schedule stale=${expectStale}`, r.stale===expectStale, r.banner.slice(0,60));
    if(expectStale) t('stale banner warns the user', /out of date/.test(r.banner), r.banner.slice(0,60));
    await ctx.close();
  }

  // --- Tap tooltips on touch ---
  const ctx = await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const page = await ctx.newPage();
  await page.goto('http://localhost:8771/index.html');
  await page.waitForFunction(()=>typeof POKEMON!=='undefined'&&POKEMON.length>1000,null,{timeout:15000});
  await page.evaluate(()=>renderResult(POKEMON.find(p=>p.speciesId==='azumarill')));
  await page.waitForTimeout(300);
  const tabsBefore = await page.evaluate(()=>window.__bnTabs.length);
  await page.evaluate(()=>{ document.querySelector('.nightmare-card [title]').click(); });
  await page.waitForTimeout(250);
  t('tapping a stat shows a bubble', await page.evaluate(()=>!!document.querySelector('.tap-tip')));
  t('bubble carries the explanation text', await page.evaluate(()=>(document.querySelector('.tap-tip')?.textContent||'').length > 15));
  t('stat tap did NOT open the mon tab underneath', await page.evaluate(()=>window.__bnTabs.length) === tabsBefore);
  await page.evaluate(()=>document.body.click());
  await page.waitForTimeout(150);
  t('tap elsewhere dismisses', await page.evaluate(()=>!document.querySelector('.tap-tip')));
  // desktop context: no hijack
  const dctx = await browser.newContext({viewport:{width:1280,height:800}});
  const dpage = await dctx.newPage();
  await dpage.goto('http://localhost:8771/index.html');
  await dpage.waitForFunction(()=>typeof POKEMON!=='undefined'&&POKEMON.length>1000);
  t('desktop (hover-capable) untouched — no tap-tip system', await dpage.evaluate(()=>{ document.body.click(); return !document.querySelector('.tap-tip'); }));

  console.log(); console.log(pass+'/'+(pass+fail)+' PASSED');
  server.close(); await browser.close(); process.exit(fail?1:0);
})();
