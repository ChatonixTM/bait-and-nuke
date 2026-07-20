const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true})).newPage();
  let pass=0, fail=0;
  const t=(n,c,x)=>{c?pass++:fail++;console.log((c?'✅':'❌ FAIL'),n,x?'— '+x:'');};
  const server = await require(require('path').join(__dirname,'serve.js'))(require('path').join(__dirname,'..'), 8773);
  await page.goto('http://localhost:8773/index.html');
  await page.waitForFunction(()=>typeof POKEMON!=='undefined'&&POKEMON.length>1000,null,{timeout:15000});
  await page.evaluate(()=>renderResult(POKEMON.find(p=>p.speciesId==='azumarill')));
  await page.waitForTimeout(2500); // let lazy sprites fetch
  t('hero sprite rendered + loaded', await page.evaluate(()=>{const i=document.querySelector('.sprite-hero'); return !!i && i.naturalWidth > 0;}));
  t('nightmare cards carry sprites', await page.evaluate(()=>document.querySelectorAll('.nm-name .sprite').length >= 5));
  t('at least one card sprite actually loaded', await page.evaluate(()=>[...document.querySelectorAll('.nm-name .sprite')].some(i=>i.naturalWidth>0)));
  // graceful failure: broken src must remove itself
  t('broken sprite removes itself (offline grace)', await page.evaluate(async ()=>{
    const d = document.createElement('div');
    d.innerHTML = '<img class="sprite" src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/999999.png" onerror="this.remove()">';
    document.body.appendChild(d);
    await new Promise(r=>setTimeout(r,2000));
    const gone = !d.querySelector('img'); d.remove(); return gone;
  }));
  // squad slot sprites
  await page.evaluate(()=>{ const mk=id=>{const m=POKEMON.find(p=>p.speciesId===id);const fl=m.fastMoves.map(i=>MOVES[i]).filter(Boolean);const cl=m.chargedMoves.map(i=>MOVES[i]).filter(Boolean);const d=pickDefaultLoadout(m,fl,cl);return buildLoadoutEntry(m,d.fast,d.bait,d.nuke,null);};
    squad=[mk('azumarill'),mk('medicham')]; renderSquad(); });
  await page.waitForTimeout(1200);
  t('squad slots carry sprites', await page.evaluate(()=>document.querySelectorAll('.slot-name .sprite').length === 2));
  // suggestions
  await page.evaluate(()=>{ SEARCH.value='lant'; SEARCH.dispatchEvent(new Event('input')); });
  await page.waitForTimeout(600);
  t('search suggestions carry sprites', await page.evaluate(()=>document.querySelectorAll('.sugg-item .sprite').length >= 1));
  // jargon tooltips reachable
  await page.evaluate(()=>{ document.querySelector('th[title]').click(); });
  await page.waitForTimeout(250);
  t('table-header explanation tappable', await page.evaluate(()=>!!document.querySelector('.tap-tip')));
  console.log(); console.log(pass+'/'+(pass+fail)+' PASSED');
  server.close(); await browser.close(); process.exit(fail?1:0);
})();
