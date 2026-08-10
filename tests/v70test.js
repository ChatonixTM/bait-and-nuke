/* v70test — flexible sleeper phrasing + precedence guards. Tests the SHIPPED
   dist (Rule 2). Chromium only (Rule 15). */
const { chromium } = require('playwright');
const pathmod=require('path');
const DIST = process.env.BN_DIST || pathmod.resolve(__dirname, '..');
const http=require('http'),fs=require('fs'),pth=require('path');
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json'};
http.createServer((q,r)=>{ const f=pth.join(DIST, q.url==='/'?'/index.html':q.url.split('?')[0]);
  fs.readFile(f,(e,d)=>{ if(e){r.writeHead(404);r.end();return;}
    r.writeHead(200,{'Content-Type':MIME[pth.extname(f)]||'application/octet-stream'});r.end(d);});}).listen(8110);
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({viewport:{width:390,height:844}});
  const errs=[]; p.on('pageerror', e=>errs.push(e.message));
  await p.goto('http://127.0.0.1:8110/index.html');
  await p.waitForFunction(()=>typeof POKEMON!=="undefined"&&POKEMON.length>1000,{timeout:15000});
  let pass=0, fail=0;
  const t=(l,c,x='')=>{ if(c){pass++;console.log('  ✅ '+l);} else {fail++;console.log('  ❌ '+l+(x?' — '+x:''));} };
  const P = q => p.evaluate(q=>{const r=window.__bnCoach.parse(q);return {i:r.intent, m:r.mon&&r.mon.speciesName};}, q);

  console.log('\n--- every sleeper dialect resolves ---');
  for(const q of ['sleepers for tinkaton','sleepers 4 tinkaton','sleeper tinkaton',
                  'tinkaton sleepers','tinkaton sleeper','tinkaton sleep',
                  'find me sleepers tinkaton','sleepers on tinkaton','sleeper picks 4 tinkaton']){
    const r = await P(q);
    t(`"${q}"`, r.i==='sleepers'&&r.m==='Tinkaton', JSON.stringify(r));
  }
  const sq = await P('sleepers for my squad');
  t('"sleepers for my squad" still honest', sq.i==='sleepers-squad', JSON.stringify(sq));

  console.log('\n--- precedence guards: nothing got eaten ---');
  const g1 = await P('who beats azumarill');
  t('counters intact', g1.i==='counters'&&g1.m==='Azumarill', JSON.stringify(g1));
  const g2 = await P('azumarill moveset');
  t('moveset intact', g2.i==='moveset'&&g2.m==='Azumarill', JSON.stringify(g2));
  const g3 = await P('does qwilfish beat azumarill');
  t('matchup intact', g3.i==='matchup', JSON.stringify(g3));
  const g4 = await P('do you like azumarill');
  t('opinion intact', g4.i==='opinion-mon', JSON.stringify(g4));
  const g5 = await P('is my squad good');
  t('squad intact', g5.i==='squad', JSON.stringify(g5));

  console.log('\n--- end-to-end: a dialect actually answers ---');
  await p.evaluate(()=>{ LEAGUE_SELECT.value='Ultra League'; LEAGUE_SELECT.dispatchEvent(new Event('change',{bubbles:true})); });
  await p.waitForTimeout(300);
  await p.click('#coachDock'); await p.waitForTimeout(300);
  await p.fill('#coachInput','tinkaton sleepers');
  await p.click('.coach-send'); await p.waitForTimeout(2500);
  const reply = await p.evaluate(()=>document.querySelector('#coachLog .from-coach:last-child')?.textContent||'');
  t('"tinkaton sleepers" produces real picks', /Sleepers for/.test(reply)&&/eats/.test(reply), reply.slice(0,90));
  t('zero JS errors', errs.length===0, errs.slice(0,2).join('|'));
  console.log(`\n${pass} passed, ${fail} failed`);
  await b.close(); process.exit(fail?1:0);
})();
