const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  let pass=0, fail=0;
  const t=(n,c,x)=>{c?pass++:fail++;console.log((c?'✅':'❌ FAIL'),n,x?'— '+x:'');};
  const server = await require(require('path').join(__dirname,'serve.js'))(require('path').join(__dirname,'..'), 8771);

  // --- Cup auto-selection at three points in time ---
  for(const [when, expect] of [['2026-07-19T12:00:00Z','Retro Cup'],['2026-07-22T12:00:00Z','All Standard Leagues'],['2026-07-30T12:00:00Z','Master Premier']]){
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.addInitScript(`{const t=${Date.parse(when)};Date.now=()=>t;}`);
    await page.goto('http://localhost:8771/index.html');
    await page.waitForFunction(()=>typeof CUPS!=='undefined');
    const live = await page.evaluate(()=>CUPS.find(c=>c.live)?.name || 'NONE');
    t('clock '+when.slice(5,10)+' → live: '+expect, live.includes(expect), live);
    await ctx.close();
  }

  // --- Tap tooltips on touch ---
  const ctx = await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const page = await ctx.newPage();
  await page.goto('http://localhost:8771/index.html');
  await page.waitForFunction(()=>typeof POKEMON!=='undefined'&&POKEMON.length>1000,null,{timeout:15000});
  await page.evaluate(()=>renderResult(POKEMON.find(p=>p.speciesId==='azumarill')));
  await page.waitForTimeout(300);
  const tabsBefore = await page.evaluate(()=>window.__bnTabs.length);
  await page.evaluate(()=>{ document.querySelector('.nightmare-card [title]').click(); });
  await page.waitForTimeout(250);
  t('tapping a stat shows a bubble', await page.evaluate(()=>!!document.querySelector('.tap-tip')));
  t('bubble carries the explanation text', await page.evaluate(()=>(document.querySelector('.tap-tip')?.textContent||'').length > 15));
  t('stat tap did NOT open the mon tab underneath', await page.evaluate(()=>window.__bnTabs.length) === tabsBefore);
  await page.evaluate(()=>document.body.click());
  await page.waitForTimeout(150);
  t('tap elsewhere dismisses', await page.evaluate(()=>!document.querySelector('.tap-tip')));
  // desktop context: no hijack
  const dctx = await browser.newContext({viewport:{width:1280,height:800}});
  const dpage = await dctx.newPage();
  await dpage.goto('http://localhost:8771/index.html');
  await dpage.waitForFunction(()=>typeof POKEMON!=='undefined'&&POKEMON.length>1000);
  t('desktop (hover-capable) untouched — no tap-tip system', await dpage.evaluate(()=>{ document.body.click(); return !document.querySelector('.tap-tip'); }));

  console.log(); console.log(pass+'/'+(pass+fail)+' PASSED');
  server.close(); await browser.close(); process.exit(fail?1:0);
})();
