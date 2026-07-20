// v58 proof: does spotlight alignment depend on body zoom at all anymore?
// If removing zoom fixed the root cause, then RE-ADDING zoom should be the
// only thing that can break alignment — and with zoom absent, alignment must
// be identical whether or not the engine scales rects.
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  let pass=0, fail=0;
  const t=(n,c,x)=>{c?pass++:fail++;console.log((c?'✅':'❌ FAIL'),n,x?'— '+x:'');};
  const server = await require(require('path').join(__dirname,'serve.js'))(require('path').join(__dirname,'..'), 8795);

  const measure = async (injectZoom) => {
    const page = await (await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true})).newPage();
    await page.goto('http://localhost:8795/index.html');
    await page.waitForFunction(()=>typeof POKEMON!=='undefined'&&POKEMON.length>1000,null,{timeout:15000});
    if(injectZoom) await page.evaluate(()=>{ document.body.style.zoom='1.05'; });
    await page.evaluate(()=>{ [...document.querySelectorAll('button')].find(x=>/30-second tour/i.test(x.textContent))?.click(); });
    await page.waitForTimeout(600);
    const results = [];
    for(let i=0;i<13;i++){
      const done = await page.evaluate(()=>!document.body.classList.contains('touring'));
      if(done) break;
      const m = await page.evaluate(()=>{
        const sp = document.querySelector('.tour-spotlight');
        const title = document.querySelector('.tour-caption-title')?.textContent||'';
        const r = sp.getBoundingClientRect();
        const vw = document.documentElement.clientWidth, vh = document.documentElement.clientHeight;
        return { title, top:Math.round(r.top), left:Math.round(r.left), w:Math.round(r.width), h:Math.round(r.height),
                 swallows: r.width > vw*0.97 && r.height > vh*0.7 };
      });
      results.push(m);
      await page.evaluate(()=>document.getElementById('tourNext')?.click());
      await page.waitForTimeout(1100);
    }
    await page.close();
    return results;
  };

  const clean = await measure(false);
  t('no step swallows the screen (zoom absent)', !clean.some(s=>s.swallows),
    clean.filter(s=>s.swallows).map(s=>s.title).join(',') || 'all sane');
  t('all 13 steps positioned', clean.length === 13, clean.length+' steps');

  // The old bug: body zoom present => coordinates diverge. Confirm the app
  // no longer ships any zoom, so this divergence can't occur in production.
  const shipsZoom = require('fs').readFileSync(require('path').join(__dirname,'..','styles.css'),'utf8')
    .split('\n').filter(l=>!l.trim().startsWith('/*') && !l.trim().startsWith('*'))
    .some(l=>/[^-]zoom\s*:/.test(l));
  t('app ships NO css zoom anywhere', !shipsZoom);

  // Sanity: with zoom force-injected, Chromium scales rects and boxes stay put
  // relative to targets (proving positioning reads live geometry, not assumptions)
  // CONTROL (must be TRUE): injecting zoom back in MUST break alignment.
  // This is the proof that zoom was the root cause of the v53-v57 failures.
  // If this ever reports "no longer reproduces", something else changed and
  // the diagnosis needs revisiting — do NOT "fix" this by removing it.
  const zoomed = await measure(true);
  t('CONTROL: injected zoom still reproduces the old bug', zoomed.some(s=>s.swallows),
    zoomed.filter(s=>s.swallows).map(s=>s.title).join(',') || 'no longer reproduces');

  console.log(); console.log(pass+'/'+(pass+fail)+' PASSED');
  server.close(); await browser.close(); process.exit(fail?1:0);
})();
