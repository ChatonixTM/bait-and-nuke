const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({viewport:{width:1280,height:800}})).newPage();
  let pass=0, fail=0;
  const t=(n,c)=>{c?pass++:fail++;console.log((c?'✅':'❌ FAIL'),n);};
  const server = await require(require('path').join(__dirname,'serve.js'))(require('path').join(__dirname,'..'), 8776);
  await page.goto('http://localhost:8776/index.html');
  await page.waitForFunction(()=>typeof POKEMON!=='undefined'&&POKEMON.length>1000,null,{timeout:15000});
  await page.evaluate(()=>document.body.focus());
  for(const k of ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a']) await page.keyboard.press(k);
  await page.waitForTimeout(300);
  t('↑↑↓↓←→←→BA opens the Secret Dex', await page.evaluate(()=>document.getElementById('secretDex')?.classList.contains('show')));
  await page.evaluate(()=>closeSecretDex());
  // wrong sequence does nothing
  for(const k of ['ArrowUp','ArrowDown','b','a']) await page.keyboard.press(k);
  await page.waitForTimeout(200);
  t('wrong sequence stays silent', await page.evaluate(()=>!document.getElementById('secretDex').classList.contains('show')));
  // typing in search must not trigger
  await page.evaluate(()=>SEARCH.focus());
  await page.keyboard.type('ba');
  await page.waitForTimeout(200);
  t('typing in fields ignored', await page.evaluate(()=>!document.getElementById('secretDex').classList.contains('show')));
  console.log(); console.log(pass+'/'+(pass+fail)+' PASSED');
  server.close(); await browser.close(); process.exit(fail?1:0);
})();
