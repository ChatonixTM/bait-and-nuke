// v42 gesture test — the exact bug the founder reported on-device.
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport:{width:390,height:844}, isMobile:true, hasTouch:true });
  const page = await ctx.newPage();
  let pass=0, fail=0;
  const t=(n,c,x)=>{c?pass++:fail++;console.log((c?'✅':'❌ FAIL'),n,x?'— '+x:'');};
  const server = await require(require('path').join(__dirname,'serve.js'))(require('path').join(__dirname,'..'), 8766);
  await page.goto('http://localhost:8766/index.html');
  await page.waitForFunction(()=>typeof POKEMON!=='undefined'&&POKEMON.length>1000,null,{timeout:15000});

  // Synthetic touch drag from top of screen (arms pull-to-cast at scrollY 0)
  const drag = () => page.evaluate(async ()=>{
    const mk=(type,y)=>{const touch=new Touch({identifier:1,target:document.body,clientX:195,clientY:y});
      document.dispatchEvent(new TouchEvent(type,{touches:type==='touchend'?[]:[touch],changedTouches:[touch],bubbles:true,cancelable:true}));};
    mk('touchstart',80);
    for(let y=100;y<=320;y+=20){ mk('touchmove',y); await new Promise(r=>setTimeout(r,16)); }
    const el=document.querySelector('.page-wrap')||document.body.firstElementChild;
    const moved=[...document.querySelectorAll('*')].some(n=>/translateY\((?!0px)/.test(n.style.transform||''));
    mk('touchend',320);
    return moved;
  });

  await page.evaluate(()=>window.scrollTo(0,0));
  t('Baseline: pull-to-cast WORKS with help closed', await drag(), 'page translated');
  await page.waitForTimeout(500);

  await page.tap('#helpFab'); await page.waitForTimeout(300);
  t('Help open + body locked', await page.evaluate(()=>document.body.classList.contains('tabs-open')));
  t('Pull-to-cast DISARMED while help open', !(await drag()), 'nothing translated');

  const z = await page.evaluate(()=>({bd:+getComputedStyle(document.querySelector('.help-backdrop')).zIndex,
    tab:+getComputedStyle(document.querySelector('.tab-bar')||document.body).zIndex||0}));
  t('Backdrop above tab bar', z.bd>z.tab, JSON.stringify(z));
  await page.tap('.tab-bar >> nth=0').catch(()=>{});
  t('Tab bar tap does NOT open profile through the modal', !(await page.evaluate(()=>document.getElementById('profileOverlay')?.classList.contains('show'))));

  await page.evaluate(()=>document.getElementById('helpPanel').classList.remove('show'));
  await page.waitForTimeout(400);
  t('Body unlocked after close', await page.evaluate(()=>!document.body.classList.contains('tabs-open')));
  t('Pull-to-cast REARMS after help closes', await drag(), 'fishing line lives');

  console.log(); console.log(pass+'/'+(pass+fail)+' PASSED');
  server.close(); await browser.close();
  process.exit(fail?1:0);
})();
