/* coachtest — tests the SHIPPED dist files (Rule 2), not a copy.
   Chromium only: engine-specific behavior on iOS remains unproven here (Rule 15). */
const { chromium } = require('playwright');
const path = 'http://127.0.0.1:8077/index.html';
// serve dist over HTTP — the app fetches gamemaster.json, file:// can't
const http=require('http'),fs=require('fs'),pth=require('path');
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json'};
http.createServer((q,r)=>{
  const f=pth.join('/home/claude/dist', q.url==='/'?'/index.html':q.url.split('?')[0]);
  fs.readFile(f,(e,d)=>{ if(e){r.writeHead(404);r.end();return;}
    r.writeHead(200,{'Content-Type':MIME[pth.extname(f)]||'application/octet-stream'});r.end(d);});
}).listen(8077);

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport:{width:390,height:844} });
  const errs = [];
  p.on('pageerror', e=>errs.push(e.message));
  p.on('console', m=>{ if(m.type()==='error' && !/Failed to load resource/.test(m.text())) errs.push(m.text()); });
  // resource 403s = sprite CDNs blocked by this container's egress proxy; reachable in prod
  await p.goto(path);
  await p.waitForFunction(()=>typeof POKEMON !== "undefined" && POKEMON.length>1000, {timeout:15000});
  await p.waitForTimeout(400);

  let pass=0, fail=0;
  const t=(l,c,x='')=>{ if(c){pass++;console.log('  ✅ '+l);} else {fail++;console.log('  ❌ '+l+(x?' — '+x:''));} };

  console.log('\n--- boot ---');
  t('app boots with Coach, zero JS errors', errs.length===0, errs.slice(0,3).join(' | '));
  t('dock button exists', await p.locator('#coachDock').count()===1);
  const pos = await p.evaluate(()=>getComputedStyle(document.getElementById('coachDock')).position);
  t('dock is fixed', pos==='fixed');
  // computed style resolves left/top to used px even when authored auto —
  // so assert against the AUTHORED css and the absence of inline JS coords.
  const cssText = require('fs').readFileSync('/home/claude/dist/styles.css','utf8');
  const dockRule = cssText.match(/#coachDock\{[^}]*\}/s)[0];
  t('dock authored with bottom/right only', /right:/.test(dockRule) && /bottom:/.test(dockRule) && !/[^-]left:/.test(dockRule) && !/[^-]top:/.test(dockRule));
  const inline = await p.evaluate(()=>document.getElementById('coachDock').getAttribute('style'));
  t('no JS-written inline coordinates', !inline);

  console.log('\n--- layout safety ---');
  const before = await p.evaluate(()=>{const r=document.body.getBoundingClientRect();return {w:r.width,h:r.height,sh:document.documentElement.scrollHeight};});
  await p.click('#coachDock');
  await p.waitForTimeout(350);
  const after = await p.evaluate(()=>{const r=document.body.getBoundingClientRect();return {w:r.width,h:r.height,sh:document.documentElement.scrollHeight};});
  t('panel opens', await p.evaluate(()=>document.getElementById('coachPanel').classList.contains('open')));
  t('0.00px layout shift on open', before.w===after.w && before.sh===after.sh, JSON.stringify({before,after}));
  const scrollable = await p.evaluate(()=>getComputedStyle(document.body).overflow!=='hidden');
  t('background NOT scroll-locked (refcount untouched)', scrollable);

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
  t('“azumarril” resolves to Azumarill', typo && typo.speciesName==='Azumarill', typo&&typo.speciesName);

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

  console.log('\n--- no zoom shipped (zoomproof principle) ---');
  const css = require('fs').readFileSync('/home/claude/dist/styles.css','utf8');
  const stripped = css.replace(/\/\*[\s\S]*?\*\//g,'');
  t('styles.css ships no CSS zoom property', !/[^-a-zA-Z]zoom\s*:/.test(stripped));

  console.log(`\n${pass} passed, ${fail} failed`);
  console.log('NOTE (Rule 15): Chromium only. iOS behavior unproven until the founder taps it.');
  await b.close();
  process.exit(fail?1:0);
})();
