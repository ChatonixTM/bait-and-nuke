const { chromium } = require('playwright');
const pathmod=require('path');
const DIST = process.env.BN_DIST || pathmod.resolve(__dirname, '..');
const http=require('http'),fs=require('fs'),pth=require('path');
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json'};
http.createServer((q,r)=>{ const f=pth.join(DIST, q.url==='/'?'/index.html':q.url.split('?')[0]);
  fs.readFile(f,(e,d)=>{ if(e){r.writeHead(404);r.end();return;}
    r.writeHead(200,{'Content-Type':MIME[pth.extname(f)]||'application/octet-stream'});r.end(d);});}).listen(8121);
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.goto('http://127.0.0.1:8121/index.html');
  await p.waitForFunction(()=>typeof POKEMON!=="undefined"&&POKEMON.length>1000,{timeout:15000});
  const r = await p.evaluate(()=>{
    const az=POKEMON.find(m=>m.speciesName==='Azumarill');
    const board=findNightmares(az,9);
    const lant=board.find(k=>/lanturn/i.test(k.c.speciesName));
    return {tiers:[...new Set(board.map(k=>k.tier))].sort().join(','), lant:lant?lant.tier:null};
  });
  const ok = r.tiers==='1,2,3' && r.lant===2;
  console.log(ok?'✅ ENGINE REGRESSION PASS':'❌ ENGINE FAIL '+JSON.stringify(r));
  await b.close(); process.exit(ok?0:1);
})();
