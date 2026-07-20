const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true})).newPage();
  let pass=0, fail=0;
  const t=(n,c,x)=>{c?pass++:fail++;console.log((c?'✅':'❌ FAIL'),n,x?'— '+x:'');};
  const server = await require(require('path').join(__dirname,'serve.js'))(require('path').join(__dirname,'..'), 8774);
  await page.goto('http://localhost:8774/index.html');
  await page.waitForFunction(()=>typeof POKEMON!=='undefined'&&POKEMON.length>1000,null,{timeout:15000});

  // THE FOUNDER'S REROLL SCENARIO: add mons, EDIT one's kit via dropdowns, switch away, switch back
  await page.evaluate(()=>{ const mk=id=>{const m=POKEMON.find(p=>p.speciesId===id);const fl=m.fastMoves.map(i=>MOVES[i]).filter(Boolean);const cl=m.chargedMoves.map(i=>MOVES[i]).filter(Boolean);const d=pickDefaultLoadout(m,fl,cl);return buildLoadoutEntry(m,d.fast,d.bait,d.nuke,null);};
    squad=[mk('azumarill'),mk('medicham')]; renderSquad(); switchToSquadMon('azumarill'); });
  await page.waitForTimeout(400);
  // user edits: change bait to Ice Beam via the actual dropdown
  await page.evaluate(()=>{ const b=document.getElementById('baitSelect');
    const opt=[...b.options].find(o=>o.text.startsWith('Ice Beam')); b.value=opt.value; b.dispatchEvent(new Event('change')); });
  await page.waitForTimeout(300);
  await page.evaluate(()=>switchToSquadMon('medicham'));
  await page.waitForTimeout(400);
  await page.evaluate(()=>switchToSquadMon('azumarill'));
  await page.waitForTimeout(400);
  t('REROLL DEAD: edited bait survives switch round-trip', await page.evaluate(()=>{
    const b=document.getElementById('baitSelect'); return b.options[b.selectedIndex].text.startsWith('Ice Beam');}));
  t('squad entry itself carries the edit', await page.evaluate(()=>squad[0].bait && squad[0].bait.name==='Ice Beam'));

  // compact mode via switch; full via search
  t('squad arrival = compact (IV classroom hidden)', await page.evaluate(()=>{
    const z=document.getElementById('ivZone'); return getComputedStyle(z).display==='none';}));
  t('one tap brings IV tools back', await page.evaluate(()=>{ document.getElementById('ivZoneToggle').click();
    return getComputedStyle(document.getElementById('ivZone')).display!=='none';}));
  await page.evaluate(()=>renderResult(POKEMON.find(p=>p.speciesId==='lanturn')));
  await page.waitForTimeout(200);
  t('search arrival = full view (classroom visible)', await page.evaluate(()=>getComputedStyle(document.getElementById('ivZone')).display!=='none'));

  // slot tap switches
  await page.evaluate(()=>{ document.querySelector('.squad-slot.filled .slot-name').click(); });
  await page.waitForTimeout(400);
  t('tapping squad slot switches detail to that mon', await page.evaluate(()=>currentMonBest.speciesId==='azumarill'));

  // role=button handle: tap moves item up, no tooltip hijack
  await page.evaluate(()=>{ const h=document.querySelectorAll('.squad-slot.filled .drag-handle')[1]; h.click(); });
  await page.waitForTimeout(300);
  t('reorder handle tap MOVES the mon (no tooltip hijack)', await page.evaluate(()=>squad[0].speciesId==='medicham'));
  t('no tap-tip appeared on handle', await page.evaluate(()=>!document.querySelector('.tap-tip')));

  console.log(); console.log(pass+'/'+(pass+fail)+' PASSED');
  server.close(); await browser.close(); process.exit(fail?1:0);
})();
