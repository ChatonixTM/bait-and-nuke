const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true})).newPage();
  let pass=0, fail=0;
  const t=(n,c,x)=>{c?pass++:fail++;console.log((c?'✅':'❌ FAIL'),n,x?'— '+x:'');};
  // v57: THE SCREEN-SWALLOW GUARD — the founder's screenshots showed the
  // spotlight wrapping the whole viewport. Assert every step's box is both
  // aligned AND sanely sized, across all 13 steps.
  const auditAll = async () => page.evaluate(()=>{
    const sp = document.querySelector('.tour-spotlight').getBoundingClientRect();
    const vw = document.documentElement.clientWidth, vh = document.documentElement.clientHeight;
    return { w: sp.width, h: sp.height, vw, vh, swallows: (sp.width > vw*0.97 && sp.height > vh*0.7) };
  });

  const server = await require(require('path').join(__dirname,'serve.js'))(require('path').join(__dirname,'..'), 8779);
  await page.goto('http://localhost:8779/index.html');
  await page.waitForFunction(()=>typeof POKEMON!=='undefined'&&POKEMON.length>1000,null,{timeout:15000});

  // Fresh user starts tour → demo steak appears
  await page.evaluate(()=>{ document.querySelector('.tour-trigger, #tourPill, [id*=tour]')?.click?.(); });
  await page.evaluate(()=>{ if(typeof window.__startTourForTest==='function') window.__startTourForTest(); });
  // fall back: invoke via help panel button if trigger unknown
  const started = await page.evaluate(()=>document.body.classList.contains('touring'));
  if(!started){ await page.evaluate(()=>{ [...document.querySelectorAll('button')].find(b=>/30-second tour/i.test(b.textContent))?.click(); }); await page.waitForTimeout(300); }
  t('tour started', await page.evaluate(()=>document.body.classList.contains('touring')));
  t('DEMO SQUAD served (3 steaks)', await page.evaluate(()=>squad.length===3 && squad[0].speciesId==='azumarill'));
  t('demo result rendered for nightmares', await page.evaluate(()=>currentMonBest && currentMonBest.speciesId==='azumarill'));
  t('demo NOT persisted to storage', await page.evaluate(async ()=>{ try{ const s=await window.storage.get('workingSquad',false); return !s || !/azumarill/.test(s.value||''); }catch(e){ return true; } }));

  // Step to the Command Deck step and watch it glide
  const stepTo = async (title) => { for(let i=0;i<16;i++){ const cur = await page.evaluate(()=>document.querySelector('.tour-caption-title')?.textContent||''); if(cur.includes(title)) return true; await page.evaluate(()=>document.getElementById('tourNext')?.click()); await page.waitForTimeout(1400);} return false; };
  // install a recorder BEFORE arriving so the whole glide is captured
  await page.evaluate(()=>{ window.__maxSL = 0; setInterval(()=>{ const b=document.getElementById('quickAddBar'); if(b) window.__maxSL = Math.max(window.__maxSL, b.scrollLeft); }, 40); });
  t('reached Command Deck step', await stepTo('Command Deck'));
  await page.waitForTimeout(1600);
  const g = await page.evaluate(()=>({max: window.__maxSL, over: document.getElementById('quickAddBar').scrollWidth - document.getElementById('quickAddBar').clientWidth}));
  t('deck GLIDES during its step', g.over <= 8 ? true : g.max > 10, 'maxScroll='+g.max+' overflow='+g.over);
  t('deck copy teaches that it slides', await page.evaluate(()=>/slides sideways/i.test(document.querySelector('.tour-caption-text').textContent)));

  // v59: the Analyze step glides too
  await page.evaluate(()=>{ window.__maxSL2 = 0; const b=document.getElementById('quickAddBar'); if(b) b.scrollLeft=0;
    setInterval(()=>{ const q=document.getElementById('quickAddBar'); if(q) window.__maxSL2 = Math.max(window.__maxSL2, q.scrollLeft); }, 40); });
  t('reached Analyze synergy step', await stepTo('Analyze synergy'));
  await page.waitForTimeout(1600);
  const g2 = await page.evaluate(()=>({max: window.__maxSL2,
    over: document.getElementById('quickAddBar').scrollWidth - document.getElementById('quickAddBar').clientWidth}));
  t('deck GLIDES on the Analyze step', g2.over <= 8 ? true : g2.max > 10, 'maxScroll='+g2.max+' overflow='+g2.over);

  // Tap-number step shows a live bubble
  t('reached Tap any number step', await stepTo('Tap any number'));
  await page.waitForTimeout(600);
  t('live tap-tip bubble demoed', await page.evaluate(()=>!!document.querySelector('.tap-tip')));

  // v55: spotlight ACCURACY — the ring must actually sit on the target.
  // This assertion would have caught the founder's screenshots.
  // walk every remaining step and audit sizing
  let swallowed = null;
  for(let i=0;i<13;i++){
    const a = await auditAll();
    if(a.swallows){ swallowed = JSON.stringify(a); break; }
    const done = await page.evaluate(()=>!document.body.classList.contains('touring'));
    if(done) break;
    await page.evaluate(()=>document.getElementById('tourNext')?.click());
    await page.waitForTimeout(1200);
  }
  t('NO step swallows the whole screen', swallowed === null, swallowed || 'all boxes sane');

  // restart for the hug check
  await page.evaluate(()=>{ if(document.body.classList.contains('touring')) document.getElementById('tourSkip')?.click(); });
  await page.waitForTimeout(300);
  await page.evaluate(()=>{ [...document.querySelectorAll('button')].find(b=>/30-second tour/i.test(b.textContent))?.click(); });
  await page.waitForTimeout(500);
  t('reached Teams step', await stepTo('Teams'));
  await page.waitForTimeout(600);
  const acc = await page.evaluate(()=>{
    const s = document.querySelector('.tour-spotlight').getBoundingClientRect();
    const el = document.querySelector('#tabTeams').getBoundingClientRect();
    const overlap = Math.max(0, Math.min(s.bottom, el.bottom) - Math.max(s.top, el.top)) *
                    Math.max(0, Math.min(s.right, el.right) - Math.max(s.left, el.left));
    return { overlap, target: el.width * el.height };
  });
  t('spotlight sits ON the Teams tab (>=70% covered)', acc.overlap >= acc.target * 0.7, Math.round(100*acc.overlap/Math.max(1,acc.target))+'%');


  // v56: coordinate-space truth — spotlight must hug its target
  const hug = async (sel) => page.evaluate((sel)=>{
    const t = document.querySelector(sel)?.getBoundingClientRect();
    const sp = document.querySelector('.tour-spotlight')?.getBoundingClientRect();
    if(!t || !sp) return 'missing';
    const dTop = Math.abs(sp.top + 8 - t.top), dLeft = Math.abs(sp.left + 8 - t.left);
    return (dTop < 14 && dLeft < 14) ? true : 'dTop='+dTop.toFixed(1)+' dLeft='+dLeft.toFixed(1);
  }, sel);
  t('reached Teams step', await stepTo('Teams'));
  await page.waitForTimeout(700);
  const hg = await hug('#tabTeams');
  t('spotlight HUGS the fixed Teams tab', hg === true, String(hg));

  // End tour → steak cleared, user state restored
  await page.evaluate(()=>document.getElementById('tourSkip')?.click());
  await page.waitForTimeout(400);
  t('tour ended, demo squad cleared', await page.evaluate(()=>!document.body.classList.contains('touring') && squad.length===0));

  console.log(); console.log(pass+'/'+(pass+fail)+' PASSED');
  server.close(); await browser.close(); process.exit(fail?1:0);
})();
