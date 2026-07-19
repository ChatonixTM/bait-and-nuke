const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true})).newPage();
  let pass=0, fail=0;
  const t=(n,c,x)=>{c?pass++:fail++;console.log((c?'✅':'❌ FAIL'),n,x?'— '+x:'');};
  const server = await require(require('path').join(__dirname,'serve.js'))(require('path').join(__dirname,'..'), 8770);
  page.on('pageerror', e=>console.log('PAGE ERR:', e.message));
  await page.goto('http://localhost:8770/index.html');
  await page.waitForFunction(()=>typeof POKEMON!=='undefined'&&POKEMON.length>1000,null,{timeout:15000});

  // Build squad: Azumarill with a NON-default kit (Ice Beam bait), Medicham, Lanturn
  await page.evaluate(()=>{
    const mk=(id,baitName)=>{const m=POKEMON.find(p=>p.speciesId===id);
      const fl=m.fastMoves.map(i=>MOVES[i]).filter(Boolean), cl=m.chargedMoves.map(i=>MOVES[i]).filter(Boolean);
      const d=pickDefaultLoadout(m,fl,cl);
      const bait=baitName?cl.find(c=>c.name===baitName)||d.bait:d.bait;
      return buildLoadoutEntry(m,d.fast,bait,d.nuke,null);};
    squad=[mk('azumarill','Ice Beam'),mk('medicham'),mk('lanturn')]; renderSquad();
    renderResult(POKEMON.find(p=>p.speciesId==='medicham'));
  });
  await page.waitForTimeout(300);
  t('chips render for all 3', await page.evaluate(()=>document.querySelectorAll('.qa-mon-chip').length===3));
  t('current chip = Medicham', await page.evaluate(()=>document.querySelector('.qa-mon-chip.current')?.textContent==='Medicham'));

  await page.evaluate(()=>document.querySelector('.qa-mon-chip[data-sid="azumarill"]').click());
  await page.waitForTimeout(400);
  t('detail switched to Azumarill', await page.evaluate(()=>document.querySelector('.mon-name,#resultName,h2')?.textContent.includes('Azumarill') || SEARCH.value==='Azumarill'));
  t('SAVED loadout restored (Ice Beam bait, not default)', await page.evaluate(()=>{
    const b=document.getElementById('baitSelect'); return b && b.options[b.selectedIndex].text.startsWith('Ice Beam');}));
  t('nightmares board is Azumarill\'s (Lanturn grinder present)', await page.evaluate(()=>[...document.querySelectorAll('.nightmare-card')].some(c=>/Lanturn/.test(c.textContent))));
  t('current chip moved to Azumarill', await page.evaluate(()=>document.querySelector('.qa-mon-chip.current')?.dataset.sid==='azumarill'));
  t('currentMonBest follows (analyze uses the right mon)', await page.evaluate(()=>currentMonBest.speciesId==='azumarill'));

  await page.evaluate(()=>document.querySelector('.qa-mon-chip[data-sid="lanturn"]').click());
  await page.waitForTimeout(400);
  t('second switch → Lanturn', await page.evaluate(()=>currentMonBest.speciesId==='lanturn' && document.querySelector('.qa-mon-chip.current')?.dataset.sid==='lanturn'));

  console.log(); console.log(pass+'/'+(pass+fail)+' PASSED');
  server.close(); await browser.close(); process.exit(fail?1:0);
})();
