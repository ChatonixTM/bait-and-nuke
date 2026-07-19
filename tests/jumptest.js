const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  let pass=0, fail=0;
  const t=(n,c,x)=>{c?pass++:fail++;console.log((c?'✅':'❌ FAIL'),n,x?'— '+x:'');};
  const server = await require(require('path').join(__dirname,'serve.js'))(require('path').join(__dirname,'..'), 8769);
  for(const [label, vp] of [['phone',{width:390,height:844}],['desktop',{width:1280,height:800}]]){
    const page = await (await browser.newContext({viewport:vp, hasTouch:label==='phone', isMobile:label==='phone'})).newPage();
    await page.goto('http://localhost:8769/index.html');
    await page.waitForFunction(()=>typeof POKEMON!=='undefined'&&POKEMON.length>1000,null,{timeout:15000});
    await page.evaluate(()=>window.scrollTo(0,400));
    await page.waitForTimeout(150);
    const r = await page.evaluate(async ()=>{
      const shell = document.querySelector('.search-shell');
      const probe = document.querySelector('.squad-panel') || document.querySelector('.main-content');
      const before = probe.getBoundingClientRect().top;
      shell.classList.add('yanked');
      await new Promise(r=>setTimeout(r,600)); // let fade finish
      const after = probe.getBoundingClientRect().top;
      const op = parseFloat(getComputedStyle(shell.querySelector('.search-box')).opacity);
      const pe = getComputedStyle(shell.querySelector('.search-box')).pointerEvents;
      shell.classList.remove('yanked');
      await new Promise(r=>setTimeout(r,600));
      const restored = parseFloat(getComputedStyle(shell.querySelector('.search-box')).opacity);
      return {shift: Math.abs(after-before), op, pe, restored};
    });
    t(label+': ZERO layout shift on yank', r.shift < 0.5, r.shift.toFixed(2)+'px');
    t(label+': fade target correct', label==='phone' ? r.op < 0.05 : (r.op > 0.15 && r.op < 0.3), 'opacity '+r.op);
    t(label+': untouchable while faded', r.pe === 'none');
    t(label+': fades back fully', r.restored > 0.95, 'opacity '+r.restored);
    await page.close();
  }
  console.log(); console.log(pass+'/'+(pass+fail)+' PASSED');
  server.close(); await browser.close(); process.exit(fail?1:0);
})();
