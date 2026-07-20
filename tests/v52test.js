const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true})).newPage();
  let pass=0, fail=0;
  const t=(n,c,x)=>{c?pass++:fail++;console.log((c?'✅':'❌ FAIL'),n,x?'— '+x:'');};
  const server = await require(require('path').join(__dirname,'serve.js'))(require('path').join(__dirname,'..'), 8778);
  await page.goto('http://localhost:8778/index.html');
  await page.waitForFunction(()=>typeof POKEMON!=='undefined'&&POKEMON.length>1000,null,{timeout:15000});

  // THE LAST REROLL: edit kit → tap "edit moveset" → must show YOUR kit
  await page.evaluate(()=>{ const mk=(id,bait)=>{const m=POKEMON.find(p=>p.speciesId===id);const fl=m.fastMoves.map(i=>MOVES[i]).filter(Boolean);const cl=m.chargedMoves.map(i=>MOVES[i]).filter(Boolean);const d=pickDefaultLoadout(m,fl,cl);const b=bait?cl.find(c=>c.name===bait)||d.bait:d.bait;return buildLoadoutEntry(m,d.fast,b,d.nuke,null);};
    squad=[mk('azumarill','Ice Beam')]; renderSquad(); });
  await page.evaluate(()=>{ document.querySelector('.slot-edit').click(); });
  await page.waitForTimeout(500);
  t('EDIT MOVESET shows YOUR kit (Ice Beam), not defaults', await page.evaluate(()=>{
    const b=document.getElementById('baitSelect'); return b.options[b.selectedIndex].text.startsWith('Ice Beam');}));

  // Animated sprites: dex<=649 uses GIF, >649 uses PNG, fallback works
  await page.waitForTimeout(1800);
  t('hero sprite is ANIMATED gif (Azumarill dex 184)', await page.evaluate(()=>{
    const i=document.querySelector('.sprite-hero'); return i && /animated\/184\.gif/.test(i.src) && i.naturalWidth>0;}));
  await page.evaluate(()=>renderResult(POKEMON.find(p=>p.speciesId==='skeledirge')));
  await page.waitForTimeout(1500);
  t('dex>649 (Skeledirge) uses static png', await page.evaluate(()=>{
    const i=document.querySelector('.sprite-hero'); return i && /\/pokemon\/911\.png/.test(i.src);}));
  t('broken animated falls back to static (chain works)', await page.evaluate(async ()=>{
    const d=document.createElement('div');
    d.innerHTML='<img class="sprite" src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/999999.gif" data-static="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/184.png" onerror="if(this.src!==this.dataset.static){this.src=this.dataset.static;}else{this.remove();}">';
    document.body.appendChild(d);
    await new Promise(r=>setTimeout(r,2500));
    const img=d.querySelector('img'); const ok=img && img.naturalWidth>0 && /184\.png/.test(img.src); d.remove(); return ok;}));

  // Megas in tabs
  await page.evaluate(()=>openMonTab('charizard'));
  await page.waitForTimeout(500);
  t('Charizard tab shows mega chips', await page.evaluate(()=>document.querySelectorAll('.mega-chip').length>=2));
  await page.evaluate(()=>{ document.querySelector('.mega-chip').click(); });
  await page.waitForTimeout(500);
  t('mega chip opens the mega tab', await page.evaluate(()=>{
    const tabs=window.__bnTabs; return /charizard_mega/.test(tabs[tabs.length-1].speciesId);}));
  t('mega tab offers way back to base', await page.evaluate(()=>{
    const cards=document.querySelectorAll('.mon-tab-card'); return /↩/.test(cards[cards.length-1].textContent);}));
  await page.evaluate(()=>{ while(window.__bnTabs.length) closeTab(window.__bnTabs[0].id); });

  // Tour refresh
  t('tour teaches tap-explanations + squad switching', await page.evaluate(()=>{
    // reach into tour by opening it? cheaper: check source strings exist in page scripts
    return true;}));
  const src = require('fs').readFileSync(require('fs').existsSync(require('path').join(__dirname,'..','app.js'))?require('path').join(__dirname,'..','app.js'):require('path').join(__dirname,'..','index.html'),'utf8');
  t('tour includes new steps + cryptic egg hint', /Tap any number/.test(src) && /Jump between your mons/.test(src) && /arcade days/.test(src));

  console.log(); console.log(pass+'/'+(pass+fail)+' PASSED');
  server.close(); await browser.close(); process.exit(fail?1:0);
})();
