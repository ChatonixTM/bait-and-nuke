/* coachtest — Sprocket core suite (v66-v67 features), kit v8.1.
   Faithful to the suite that certified v67, with TWO deliberate updates:
   [1] portability: dist dir from BN_DIST env (default: parent dir, i.e. repo root
       when this file lives in tests/).
   [2] assertion #8 FLIPPED for v71: coach open now LOCKS body scroll (founder's
       order, refcounted lockBodyScroll). The v66-era suite asserted the opposite.
   History lesson preserved: harness bugs outnumbered code bugs 8:3 — read
   failures with suspicion toward the test first. */
const { chromium } = require('playwright');
const path = require('path');
const DIST = process.env.BN_DIST || path.resolve(__dirname, '..');
const http=require('http'),fs=require('fs');
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json'};
http.createServer((q,r)=>{ const f=path.join(DIST, q.url==='/'?'/index.html':q.url.split('?')[0]);
  fs.readFile(f,(e,d)=>{ if(e){r.writeHead(404);r.end();return;}
    r.writeHead(200,{'Content-Type':MIME[path.extname(f)]||'application/octet-stream'});r.end(d);});}).listen(8077);
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport:{width:390,height:844} });
  const errs = [];
  p.on('pageerror', e=>errs.push(e.message));
  // resource 403/404s (blocked sprite CDNs in sandboxes) are not app errors
  p.on('console', m=>{ if(m.type()==='error' && !/Failed to load resource/.test(m.text())) errs.push(m.text()); });
  await p.goto('http://127.0.0.1:8077/index.html');
  await p.waitForFunction(()=>typeof POKEMON!=="undefined" && POKEMON.length>1000, {timeout:15000});
  await p.waitForTimeout(400);

  let pass=0, fail=0;
  const t=(l,c,x='')=>{ if(c){pass++;console.log('  ✅ '+l);} else {fail++;console.log('  ❌ '+l+(x?' — '+x:''));} };

  console.log('\n--- boot ---');
  t('app boots with Coach, zero JS errors', errs.length===0, errs.slice(0,3).join(' | '));
  t('dock button exists', await p.locator('#coachDock').count()===1);
  const pos = await p.evaluate(()=>getComputedStyle(document.getElementById('coachDock')).position);
  t('dock is fixed', pos==='fixed');
  // computed style resolves authored `auto` to px — assert against AUTHORED css
  const cssText = require('fs').readFileSync(path.join(DIST,'styles.css'),'utf8');
  const dockRule = cssText.match(/#coachDock\{[^}]*\}/s)[0];
  t('dock authored with bottom/right only', /right:/.test(dockRule) && /bottom:/.test(dockRule) && !/[^-]left:/.test(dockRule) && !/[^-]top:/.test(dockRule));
  const inline = await p.evaluate(()=>document.getElementById('coachDock').getAttribute('style'));
  t('no JS-written inline coordinates', !inline);

  console.log('\n--- layout safety ---');
  const before = await p.evaluate(()=>{const r=document.body.getBoundingClientRect();return {w:r.width,sh:document.documentElement.scrollHeight};});
  await p.click('#coachDock');
  await p.waitForTimeout(350);
  t('panel opens', await p.evaluate(()=>document.getElementById('coachPanel').classList.contains('open')));
  const after = await p.evaluate(()=>{const r=document.body.getBoundingClientRect();return {w:r.width,sh:document.documentElement.scrollHeight};});
  t('0.00px width shift on open', before.w===after.w, JSON.stringify({before,after}));
  // v71 UPDATE: founder ordered background locked while Sprocket is open.
  t('v71: coach open LOCKS body (tabs-open present)', await p.evaluate(()=>document.body.classList.contains('tabs-open')));

  console.log('\n--- counters intent, cross-checked vs the engine itself ---');
  const truth = await p.evaluate(()=>{
    const mon = POKEMON.find(m=>m.speciesName.toLowerCase()==='azumarill');
    const board = findNightmares(mon, 9);
    return board.slice(0,3).map(k=>k.c.speciesName);
  });
  await p.fill('#coachInput','who beats azumarill?');
  await p.click('.coach-send');
  await p.waitForTimeout(300);
  const reply1 = await p.evaluate(()=>document.querySelector('#coachLog .from-coach:last-child').textContent);
  t('reply names the engine\'s own #1 threat', reply1.includes(truth[0]), `engine says "${truth[0]}"; reply: ${reply1.slice(0,90)}`);
  const st1 = await p.evaluate(()=>document.querySelector('#coachPanel .coach').dataset.state);
  t('answer state fired', st1==='answer', 'got '+st1);

  console.log('\n--- typo tolerance (levenshtein reuse) ---');
  const typo = await p.evaluate(()=>window.__bnCoach.resolveMon('azumarril'));
  t('"azumarril" resolves to Azumarill', typo && typo.speciesName==='Azumarill', typo&&typo.speciesName);

  console.log('\n--- squad intent, empty squad → honest shrug ---');
  await p.fill('#coachInput','is my squad good?');
  await p.click('.coach-send');
  await p.waitForTimeout(300);
  const reply2 = await p.evaluate(()=>document.querySelector('#coachLog .from-coach:last-child').textContent);
  t('empty squad gets honest refusal, not fake score', /empty|seat/i.test(reply2), reply2.slice(0,80));

  console.log('\n--- unknown question → shrug, no bluffing ---');
  await p.fill('#coachInput','what is the meaning of life');
  await p.click('.coach-send');
  await p.waitForTimeout(200);
  const reply3 = await p.evaluate(()=>document.querySelector('#coachLog .from-coach:last-child').textContent);
  t('declines outside its intents', /outside|don't guess/i.test(reply3), reply3.slice(0,80));
  const st3 = await p.evaluate(()=>document.querySelector('#coachPanel .coach').dataset.state);
  t('shrug state fired', st3==='shrug', 'got '+st3);

  console.log('\n--- v67: name ---');
  const title = await p.evaluate(()=>document.querySelector('.coach-title').textContent);
  t('he is Sprocket', title==='Sprocket', 'got '+title);

  console.log('\n--- v67: matchup, cross-checked vs the boards ---');
  const mTruth = await p.evaluate(()=>{
    const az = POKEMON.find(m=>m.speciesName==='Azumarill');
    return findNightmares(az, 9)[0].c.speciesName;
  });
  await p.fill('#coachInput', `does ${mTruth} beat azumarill?`);
  await p.click('.coach-send'); await p.waitForTimeout(250);
  const mr = await p.evaluate(()=>document.querySelector('#coachLog .from-coach:last-child').textContent);
  t('tier-1 threat declared the winner', mr.includes(mTruth) && /wins/i.test(mr), mr.slice(0,90));

  console.log('\n--- v67: moveset matches pickDefaultLoadout exactly ---');
  const kitTruth = await p.evaluate(()=>{
    const mon = POKEMON.find(m=>m.speciesName==='Azumarill');
    const fl=(mon.fastMoves||[]).map(id=>MOVES[id]).filter(Boolean);
    const cl=(mon.chargedMoves||[]).map(id=>MOVES[id]).filter(Boolean);
    const d = pickDefaultLoadout(mon, fl, cl);
    const nm=mv=>mv&&(mv.name||mv.moveId);
    return [nm(d.fast), d.bait&&nm(d.bait), d.nuke&&nm(d.nuke)].filter(Boolean);
  });
  await p.fill('#coachInput','moves for azumarill');
  await p.click('.coach-send'); await p.waitForTimeout(250);
  const kr = await p.evaluate(()=>document.querySelector('#coachLog .from-coach:last-child').textContent);
  t('reply names the engine\'s exact kit', kitTruth.every(n=>kr.includes(n)), 'engine: '+kitTruth.join('/')+' | reply: '+kr.slice(0,110));

  console.log('\n--- v67: opinion is score-backed, empty squad stays honest ---');
  await p.fill('#coachInput','do you like my squad?');
  await p.click('.coach-send'); await p.waitForTimeout(250);
  const or1 = await p.evaluate(()=>document.querySelector('#coachLog .from-coach:last-child').textContent);
  t('opinion on empty squad = honest refusal', /empty bench|Seat some/i.test(or1), or1.slice(0,80));
  await p.fill('#coachInput','do you like azumarill?');
  await p.click('.coach-send'); await p.waitForTimeout(250);
  const or2 = await p.evaluate(()=>document.querySelector('#coachLog .from-coach:last-child').textContent);
  t('mon opinion is board-backed', /counter|scary|respect/i.test(or2), or2.slice(0,90));

  console.log('\n--- no zoom shipped (zoomproof principle) ---');
  const stripped = cssText.replace(/\/\*[\s\S]*?\*\//g,'');
  t('styles.css ships no CSS zoom property', !/[^-a-zA-Z]zoom\s*:/.test(stripped));

  console.log(`\n${pass} passed, ${fail} failed`);
  console.log('NOTE: Chromium only. iOS behavior unproven until the founder taps it.');
  await b.close();
  process.exit(fail?1:0);
})();
