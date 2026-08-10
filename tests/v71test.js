/* v71test — panel scroll locks + refcount integrity. Chromium (Rule 15). */
const { chromium } = require('playwright');
const pathmod=require('path');
const DIST = process.env.BN_DIST || pathmod.resolve(__dirname, '..');
const http=require('http'),fs=require('fs'),pth=require('path');
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json'};
http.createServer((q,r)=>{ const f=pth.join(DIST, q.url==='/'?'/index.html':q.url.split('?')[0]);
  fs.readFile(f,(e,d)=>{ if(e){r.writeHead(404);r.end();return;}
    r.writeHead(200,{'Content-Type':MIME[pth.extname(f)]||'application/octet-stream'});r.end(d);});}).listen(8120);
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({viewport:{width:390,height:844}, hasTouch:true});
  const errs=[]; p.on('pageerror', e=>errs.push(e.message));
  await p.goto('http://127.0.0.1:8120/index.html');
  await p.waitForFunction(()=>typeof POKEMON!=="undefined"&&POKEMON.length>1000,{timeout:15000});
  let pass=0, fail=0;
  const t=(l,c,x='')=>{ if(c){pass++;console.log('  ✅ '+l);} else {fail++;console.log('  ❌ '+l+(x?' — '+x:''));} };
  const locked = ()=>p.evaluate(()=>document.body.classList.contains('tabs-open'));
  const count  = ()=>p.evaluate(()=>__bnLockCount);
  const tryScroll = async ()=>{ // attempt to scroll; return whether page moved
    const y0 = await p.evaluate(()=>window.scrollY);
    await p.mouse.wheel(0, 400); await p.waitForTimeout(150);
    const y1 = await p.evaluate(()=>window.scrollY);
    return y1 !== y0;
  };

  console.log('\n--- Sprocket panel ---');
  await p.evaluate(()=>window.scrollTo(0,300)); await p.waitForTimeout(200);
  await p.click('#coachDock'); await p.waitForTimeout(300);
  t('open → body locked (fixed technique)', await locked());
  t('open → background does NOT scroll', !(await tryScroll()));
  await p.click('#coachClose'); await p.waitForTimeout(300);
  t('close → unlocked', !(await locked()));
  // ±12px: browser scroll-anchoring settles a few px as the body un-fixes.
  // The feature is "no scroll while open" (asserted above), not pixel-exact return.
  t('close → scroll position restored (±12px)', Math.abs(await p.evaluate(()=>window.scrollY) - 300) < 12,
     'y='+await p.evaluate(()=>window.scrollY));
  t('close → background scrolls again', await tryScroll());

  console.log('\n--- Profile panel ---');
  await p.evaluate(()=>window.scrollTo(0,200)); await p.waitForTimeout(150);
  await p.click('#tabProfile'); await p.waitForTimeout(350);
  t('open → locked', await locked());
  t('open → background frozen', !(await tryScroll()));
  await p.click('#profileClose'); await p.waitForTimeout(350);
  t('close → unlocked, count 0', !(await locked()) && (await count())===0, 'count='+await count());

  console.log('\n--- Teams panel ---');
  await p.click('#tabTeams'); await p.waitForTimeout(600);
  t('open → locked', await locked());
  await p.evaluate(()=>closeVip()); await p.waitForTimeout(200);
  t('close → unlocked, count 0', !(await locked()) && (await count())===0, 'count='+await count());

  console.log('\n--- refcount integrity: guards stop lock theft ---');
  await p.click('#coachDock'); await p.waitForTimeout(250);       // coach holds 1
  await p.evaluate(()=>closeProfile());                            // blind close: must NO-OP
  await p.evaluate(()=>closeVip());                                // blind close: must NO-OP
  t('blind closes cannot steal the coach\'s lock', await locked() && (await count())===1, 'count='+await count());
  await p.click('#tabProfile'); await p.waitForTimeout(300);       // nested: 2
  t('nested open stacks the count', (await count())===2, 'count='+await count());
  // close via the function, not a click: the profile sheet sits under the open
  // coach panel here, so a physical click is (correctly) intercepted
  await p.evaluate(()=>closeProfile()); await p.waitForTimeout(300); // back to 1
  t('closing profile keeps coach lock', await locked() && (await count())===1, 'count='+await count());
  await p.click('#coachClose'); await p.waitForTimeout(300);
  t('closing coach fully unlocks', !(await locked()) && (await count())===0, 'count='+await count());
  t('zero JS errors', errs.length===0, errs.slice(0,2).join('|'));
  console.log(`\n${pass} passed, ${fail} failed`);
  await b.close(); process.exit(fail?1:0);
})();
