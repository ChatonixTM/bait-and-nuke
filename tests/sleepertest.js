/* sleepertest — v69 Sleeper Finder suite, kit v8.1 (portability: BN_DIST env).
   The control philosophy matters here: an early control demanded the algorithm
   confirm a narrative (Vanilluxe-for-Tinkaton) and the ENGINE disproved the
   narrative. Controls test the math, never the story: every claimed kill must
   independently verify on that killer's own deep board. */
const { chromium } = require('playwright');
const path = require('path');
const DIST = process.env.BN_DIST || path.resolve(__dirname, '..');
const http=require('http'),fs=require('fs');
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json'};
http.createServer((q,r)=>{ const f=path.join(DIST, q.url==='/'?'/index.html':q.url.split('?')[0]);
  fs.readFile(f,(e,d)=>{ if(e){r.writeHead(404);r.end();return;}
    r.writeHead(200,{'Content-Type':MIME[path.extname(f)]||'application/octet-stream'});r.end(d);});}).listen(8100);
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({viewport:{width:390,height:844}});
  const errs=[]; p.on('pageerror', e=>errs.push(e.message));
  await p.goto('http://127.0.0.1:8100/index.html');
  await p.waitForFunction(()=>typeof POKEMON!=="undefined"&&POKEMON.length>1000,{timeout:15000});
  await p.evaluate(()=>{ LEAGUE_SELECT.value='Ultra League'; LEAGUE_SELECT.dispatchEvent(new Event('change',{bubbles:true})); });
  await p.waitForTimeout(300);
  let pass=0, fail=0;
  const t=(l,c,x='')=>{ if(c){pass++;console.log('  ✅ '+l);} else {fail++;console.log('  ❌ '+l+(x?' — '+x:''));} };

  console.log('\n--- engine ---');
  const r = await p.evaluate(()=>{
    const tk=POKEMON.find(m=>m.speciesName==='Tinkaton');
    const t0=performance.now();
    const picks=findSleepers(tk,{});
    return {ms:Math.round(performance.now()-t0),
            picks:picks.map(x=>({n:x.mon.speciesName, meta:x.metaScore, eats:x.eats.map(e=>e.name)}))};
  });
  console.log('    compute:', r.ms+'ms |', JSON.stringify(r.picks.map(p=>p.n)));
  t('returns sleepers for Tinkaton', r.picks.length>=1);
  t('every pick is off-meta (<80 or unranked)', r.picks.every(p=>p.meta===null||p.meta<80),
     JSON.stringify(r.picks.map(p=>p.n+':'+p.meta)));
  t('every pick eats 2+ of Tinkaton\'s killers', r.picks.every(p=>p.eats.length>=2));
  const verify = await p.evaluate((picks)=>{
    const bad=[];
    for(const pk of picks){
      for(const eat of pk.eats){
        const K=POKEMON.find(m=>m.speciesName===eat);
        const deep=findNightmares(K, 25);
        if(!deep.some(c=>c.c.speciesName===pk.n)) bad.push(pk.n+' claims '+eat);
      }
    }
    return bad;
  }, r.picks);
  t('CONTROL: every claimed kill verifies on that killer\'s own board', verify.length===0, verify.join('; '));
  t('at least one pick executes 3+ killers', r.picks.some(p=>p.eats.length>=3));
  t('zero JS errors', errs.length===0, errs.slice(0,2).join('|'));

  console.log('\n--- Sprocket wiring ---');
  await p.click('#coachDock'); await p.waitForTimeout(300);
  // record sprite states via MutationObserver — a fixed-delay read races the
  // synchronous compute (that was a harness bug once; the code was right)
  await p.evaluate(()=>{
    window.__states=[];
    const el=document.querySelector('#coachPanel .coach');
    new MutationObserver(()=>window.__states.push(el.dataset.state))
      .observe(el,{attributes:true,attributeFilter:['data-state']});
  });
  await p.fill('#coachInput','sleepers for tinkaton');
  await p.click('.coach-send');
  await p.waitForTimeout(2500);
  const thinking = await p.evaluate(()=>window.__states.includes('think')?'think':window.__states.join(','));
  const reply = await p.evaluate(()=>document.querySelector('#coachLog .from-coach:last-child')?.textContent||'');
  t('think state fired during compute', thinking==='think', 'got '+thinking);
  t('reply names a real sleeper', r.picks.some(p=>reply.includes(p.n)), reply.slice(0,100));
  t('reply carries the honesty caveat', /field-test|XL costs/i.test(reply));
  await p.fill('#coachInput','sleepers for my squad');
  await p.click('.coach-send'); await p.waitForTimeout(300);
  const reply2 = await p.evaluate(()=>document.querySelector('#coachLog .from-coach:last-child').textContent);
  t('squad phrasing gets honest v1 answer', /per anchor|core mon/i.test(reply2), reply2.slice(0,80));

  console.log(`\n${pass} passed, ${fail} failed`);
  await b.close(); process.exit(fail?1:0);
})();
