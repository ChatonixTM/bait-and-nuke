/* fixtest — v68 field-bug regression suite, kit v8.1 (portability: BN_DIST env).
   Guards the founder's four field reports: dead search bar (gesture-gated yank),
   full-squad swap flow, 3rd-seat auto-glide, flush footer + dock above tab bar. */
const { chromium } = require('playwright');
const path = require('path');
const DIST = process.env.BN_DIST || path.resolve(__dirname, '..');
const http=require('http'),fs=require('fs');
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json'};
http.createServer((q,r)=>{ const f=path.join(DIST, q.url==='/'?'/index.html':q.url.split('?')[0]);
  fs.readFile(f,(e,d)=>{ if(e){r.writeHead(404);r.end();return;}
    r.writeHead(200,{'Content-Type':MIME[path.extname(f)]||'application/octet-stream'});r.end(d);});}).listen(8087);
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport:{width:390,height:844}, hasTouch:true });
  let pass=0, fail=0;
  const t=(l,c,x='')=>{ if(c){pass++;console.log('  ✅ '+l);} else {fail++;console.log('  ❌ '+l+(x?' — '+x:''));} };
  await p.goto('http://127.0.0.1:8087/index.html');
  await p.waitForFunction(()=>typeof POKEMON!=="undefined"&&POKEMON.length>1000,{timeout:15000});

  console.log('\n--- FIX 1: the founder\'s exact dead-search repro ---');
  for(const name of ['dubwool','lickilicky','feraligatr']){
    await p.fill('#search', name); await p.waitForTimeout(250);
    await p.press('#search','Enter'); await p.waitForTimeout(400);
    await p.click('#addSquadBtn'); await p.waitForTimeout(900);
  }
  await p.fill('#search','azumarill'); await p.waitForTimeout(250);
  await p.press('#search','Enter'); await p.waitForTimeout(600);
  await p.evaluate(()=>{ const b=[...document.querySelectorAll('.slot-remove')].find(x=>x.dataset.id.includes('feraligatr')); b&&b.click(); });
  await p.waitForTimeout(400);
  const d1 = await p.evaluate(()=>{
    const r = SEARCH.getBoundingClientRect();
    const onTop = document.elementFromPoint(r.left+r.width/2, r.top+r.height/2);
    return {hittable: onTop===SEARCH, yanked: document.querySelector('.search-shell').classList.contains('yanked')};
  });
  t('search NOT yanked after app-driven scroll flow', !d1.yanked, JSON.stringify(d1));
  t('search input is hittable', d1.hittable, JSON.stringify(d1));

  console.log('\n--- FIX 1b: a real user flick still yanks; tap wakes it ---');
  await p.evaluate(()=>window.scrollTo(0,0)); await p.waitForTimeout(300);
  await p.mouse.wheel(0, 900); await p.waitForTimeout(120);
  const yankedNow = await p.evaluate(()=>document.querySelector('.search-shell').classList.contains('yanked'));
  t('genuine fast flick still yanks (feature preserved)', yankedNow);
  if(yankedNow){
    await p.evaluate(()=>{ document.querySelector('.search-shell').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true})); });
    await p.waitForTimeout(120);
    t('tapping the ghost wakes the search', await p.evaluate(()=>!document.querySelector('.search-shell').classList.contains('yanked')));
  }

  console.log('\n--- FIX 2: full-squad swap flow ---');
  await p.evaluate(()=>window.scrollTo(0,0)); await p.waitForTimeout(200);
  await p.click('#addSquadBtn'); await p.waitForTimeout(900);
  const sqA = await p.evaluate(()=>squad.map(s=>s.speciesName).join(','));
  t('squad refilled to 3', sqA.split(',').length===3, sqA);
  await p.fill('#search','medicham'); await p.waitForTimeout(250);
  await p.press('#search','Enter'); await p.waitForTimeout(500);
  const label = await p.evaluate(()=>document.getElementById('addSquadBtn').textContent);
  t('button offers swap, not dead-end', /Swap in Medicham/i.test(label), label);
  await p.click('#addSquadBtn'); await p.waitForTimeout(200);
  t('swap armed, chips glowing', await p.evaluate(()=>document.getElementById('addSquadBtn').classList.contains('swap-arm')));
  await p.evaluate(()=>{ const c=[...document.querySelectorAll('.qa-mon-chip')].find(x=>x.dataset.sid.includes('dubwool')); c&&c.click(); });
  await p.waitForTimeout(400);
  const sqB = await p.evaluate(()=>squad.map(s=>s.speciesName).join(','));
  t('Medicham replaced Dubwool', /Medicham/.test(sqB) && !/Dubwool/.test(sqB), sqB);

  console.log('\n--- FIX 3: 3rd seat glides the deck into view ---');
  await p.evaluate(()=>{ squad.pop(); renderSquad(); window.__bnPrevSquadLen=2; });
  await p.fill('#search','skarmory'); await p.waitForTimeout(250);
  await p.press('#search','Enter'); await p.waitForTimeout(400);
  await p.evaluate(()=>window.scrollTo(0, 1200)); await p.waitForTimeout(200);
  await p.click('#addSquadBtn'); await p.waitForTimeout(1300);
  t('command deck glided into view on 3rd seat', await p.evaluate(()=>{
    const r=document.querySelector('.search-shell').getBoundingClientRect();
    return r.top >= -4 && r.top < innerHeight*0.5;
  }));
  t('and search stayed alive after the glide', await p.evaluate(()=>{
    const r=SEARCH.getBoundingClientRect();
    return document.elementFromPoint(r.left+r.width/2,r.top+r.height/2)===SEARCH;
  }));

  console.log('\n--- FIX 4: fade flush with tab bar ---');
  await p.evaluate(()=>window.scrollTo(0, document.documentElement.scrollHeight));
  await p.waitForTimeout(500);
  const gap = await p.evaluate(()=>{
    const tb=document.querySelector('.tab-bar').getBoundingClientRect();
    const fr=document.querySelector('.site-footer').getBoundingClientRect();
    return Math.round(tb.top - fr.bottom);
  });
  t('footer glow runs flush to tab bar (gap ≤ 2px)', gap<=2, 'gap='+gap+'px');
  t('Sprocket sits above the tab bar, not on it', await p.evaluate(()=>{
    const d=document.getElementById('coachDock').getBoundingClientRect();
    const tb=document.querySelector('.tab-bar').getBoundingClientRect();
    return d.bottom <= tb.top + 1;
  }));

  console.log(`\n${pass} passed, ${fail} failed`);
  await b.close(); process.exit(fail?1:0);
})();
