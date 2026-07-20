const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true})).newPage();
  let pass=0, fail=0;
  const t=(n,c,x)=>{c?pass++:fail++;console.log((c?'✅':'❌ FAIL'),n,x?'— '+x:'');};
  const server = await require(require('path').join(__dirname,'serve.js'))(require('path').join(__dirname,'..'), 8777);
  await page.goto('http://localhost:8777/index.html');
  await page.waitForFunction(()=>typeof POKEMON!=='undefined'&&POKEMON.length>1000,null,{timeout:15000});

  // Squad with an EDITED kit (Azumarill w/ Ice Beam bait)
  await page.evaluate(()=>{ const mk=(id,bait)=>{const m=POKEMON.find(p=>p.speciesId===id);const fl=m.fastMoves.map(i=>MOVES[i]).filter(Boolean);const cl=m.chargedMoves.map(i=>MOVES[i]).filter(Boolean);const d=pickDefaultLoadout(m,fl,cl);const b=bait?cl.find(c=>c.name===bait)||d.bait:d.bait;return buildLoadoutEntry(m,d.fast,b,d.nuke,null);};
    squad=[mk('azumarill','Ice Beam'),mk('medicham')]; renderSquad(); });

  // THE TAB REROLL: open squad mon's tab → must show YOUR kit
  await page.evaluate(()=>openMonTab('azumarill'));
  await page.waitForTimeout(400);
  t('TAB shows YOUR kit (Ice Beam), not auto-pick', await page.evaluate(()=>{
    const card=document.querySelector('.mon-tab-card'); return /Ice Beam/.test(card.textContent);}));
  // non-squad mon tab still shows recommended default
  await page.evaluate(()=>openMonTab('lanturn'));
  await page.waitForTimeout(400);
  t('non-squad tab still shows recommended kit', await page.evaluate(()=>{
    const cards=document.querySelectorAll('.mon-tab-card'); return /Surf|Hydro/.test(cards[cards.length-1].textContent);}));
  await page.evaluate(()=>{ while(window.__bnTabs.length) closeTab(window.__bnTabs[0].id); });
  await page.waitForTimeout(200);

  // WHOLE-CARD tap switches (touch context)
  await page.evaluate(()=>{ const card=document.querySelectorAll('.squad-slot.filled')[1];
    card.querySelector('.slot-name').parentElement.click(); });
  await page.waitForTimeout(400);
  t('card-body tap switches to that mon (iOS-style tap)', await page.evaluate(()=>currentMonBest.speciesId==='medicham'));
  t('switch retained edited squadmate data', await page.evaluate(()=>squad[0].bait.name==='Ice Beam'));

  // controls still do their jobs, not switch
  await page.evaluate(()=>{ document.querySelector('.squad-slot.filled .slot-remove')?.click(); });
  await page.waitForTimeout(300);
  t('remove still removes (no hijack)', await page.evaluate(()=>squad.length===1));

  console.log(); console.log(pass+'/'+(pass+fail)+' PASSED');
  server.close(); await browser.close(); process.exit(fail?1:0);
})();
