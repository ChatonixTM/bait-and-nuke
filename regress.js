const { chromium } = require('playwright');
const http=require('http'),fs=require('fs'),pth=require('path');
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json'};
http.createServer((q,r)=>{ const f=pth.join('/home/claude/dist', q.url==='/'?'/index.html':q.url.split('?')[0]);
  fs.readFile(f,(e,d)=>{ if(e){r.writeHead(404);r.end();return;}
    r.writeHead(200,{'Content-Type':MIME[pth.extname(f)]||'application/octet-stream'});r.end(d);});}).listen(8081);
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport:{width:390,height:844} });
  await p.goto('http://127.0.0.1:8081/index.html');
  await p.waitForFunction(()=>typeof POKEMON!=="undefined"&&POKEMON.length>1000,{timeout:15000});
  const r = await p.evaluate(()=>{
    const az = POKEMON.find(m=>m.speciesName==='Azumarill');
    const board = findNightmares(az, 9);
    const tiers = [...new Set(board.map(k=>k.tier))].sort();
    const lant = board.find(k=>/lanturn/i.test(k.c.speciesName));
    return {tiers, lanturnTier: lant?lant.tier:null, top: board[0].c.speciesName, n: board.length};
  });
  console.log(JSON.stringify(r));
  const ok = r.tiers.join(',')==='1,2,3' && r.lanturnTier===2;
  console.log(ok ? '✅ ENGINE REGRESSION PASS: all three tiers, Lanturn Tier-2' : '❌ ENGINE REGRESSION FAIL');
  // screenshot the Coach live in the real app
  await p.click('#coachDock'); await p.waitForTimeout(400);
  await p.fill('#coachInput','who beats azumarill?');
  await p.click('.coach-send'); await p.waitForTimeout(300);
  await p.screenshot({path:'/home/claude/coach_live.png'});
  await b.close(); process.exit(ok?0:1);
})();
