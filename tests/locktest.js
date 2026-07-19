// v43 — the founder's frozen-page scenario + squad refresh survival.
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport:{width:1280,height:800} });
  const page = await ctx.newPage();
  let pass=0, fail=0;
  const t=(n,c,x)=>{c?pass++:fail++;console.log((c?'✅':'❌ FAIL'),n,x?'— '+x:'');};
  const server = await require(require('path').join(__dirname,'serve.js'))(require('path').join(__dirname,'..'), 8767);
  await page.goto('http://localhost:8767/index.html');
  await page.waitForFunction(()=>typeof POKEMON!=='undefined'&&POKEMON.length>1000,null,{timeout:15000});
  const locked = () => page.evaluate(()=>document.body.classList.contains('tabs-open'));
  const count  = () => page.evaluate(()=>({tabs:window.__bnTabs.length, min:window.__bnMinimizedTabs.length}));

  // THE FOUNDER'S SCENARIO: open several nightmares, minimize one, close the rest
  await page.evaluate(()=>{ openMonTab('lanturn'); openMonTab('toxapex'); openMonTab('qwilfish'); });
  t('3 stacked tabs → locked', await locked());
  await page.evaluate(()=>{ minimizeTab(window.__bnTabs[2].id); });
  t('minimize one (2 open, 1 minimized) → still locked', await locked(), JSON.stringify(await count()));
  await page.evaluate(()=>{ closeTab(window.__bnTabs[1].id); closeTab(window.__bnTabs[0].id); });
  t('close the rest (0 open, 1 minimized) → UNLOCKED', !(await locked()), JSON.stringify(await count()));
  t('page scrolls again', await page.evaluate(()=>{ window.scrollTo(0,250); return window.scrollY===250; }));

  // pill names the minimized mon
  const pill = await page.evaluate(()=>document.getElementById('minimizedTabsPill')?.textContent);
  t('minimized pill names the mon', /Qwilfish/.test(pill||''), pill);

  // restore/close cycle stays balanced
  await page.evaluate(()=>restoreMinimized());
  t('restore → locked again', await locked());
  await page.evaluate(()=>closeTab(window.__bnTabs[0].id));
  t('close last → unlocked, count balanced', !(await locked()));

  // watchdog: force a stuck lock, then simulate returning to the tab
  await page.evaluate(()=>{ lockBodyScroll(true); }); // orphan lock, nothing open
  t('orphan lock engaged (setup)', await locked());
  await page.evaluate(()=>{ document.dispatchEvent(new Event('visibilitychange')); window.dispatchEvent(new Event('focus')); });
  t('WATCHDOG heals stuck lock on tab-return', !(await locked()));

  // squad survives refresh
  await page.evaluate(()=>{ const mk=id=>{const m=POKEMON.find(p=>p.speciesId===id);const fl=m.fastMoves.map(i=>MOVES[i]).filter(Boolean);const cl=m.chargedMoves.map(i=>MOVES[i]).filter(Boolean);const d=pickDefaultLoadout(m,fl,cl);return buildLoadoutEntry(m,d.fast,d.bait,d.nuke,null);};
    squad=[mk('azumarill'),mk('medicham')]; renderSquad(); });
  await page.waitForTimeout(300);
  await page.reload();
  await page.waitForFunction(()=>typeof POKEMON!=='undefined'&&POKEMON.length>1000,null,{timeout:15000});
  await page.waitForTimeout(500);
  const restored = await page.evaluate(()=>squad.map(m=>m.speciesId).join(','));
  t('SQUAD SURVIVES REFRESH', restored==='azumarill,medicham', restored);

  console.log(); console.log(pass+'/'+(pass+fail)+' PASSED');
  server.close(); await browser.close(); process.exit(fail?1:0);
})();
