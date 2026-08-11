/* confgeartest — Sprocket Confidence Gear (Upgrade #1) honesty guard.
   Serves the source dir (this folder) and drives the real Coach in Chromium.
   The whole point: a tag must be EARNED from the engine. Unverifiable → can't
   verify; a verified Tier-1 read → high read. If a thin answer wears "high read",
   the gear is lying — this test fails it. */
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), pth = require('path');
const DIR = __dirname;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
const PORT = 8078;
http.createServer((q, r) => {
  const f = pth.join(DIR, q.url === '/' ? '/index.html' : q.url.split('?')[0]);
  fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': MIME[pth.extname(f)] || 'application/octet-stream' }); r.end(d); });
}).listen(PORT);

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text()); });
  await p.goto(`http://127.0.0.1:${PORT}/index.html`);
  await p.waitForFunction(() => typeof POKEMON !== 'undefined' && POKEMON.length > 1000, { timeout: 15000 });
  await p.waitForTimeout(400);

  let pass = 0, fail = 0;
  const t = (l, c, x = '') => { if (c) { pass++; console.log('  OK ' + l); } else { fail++; console.log('  XX ' + l + (x ? ' — ' + x : '')); } };

  t('app boots with zero JS errors (edits are clean)', errs.length === 0, errs.slice(0, 3).join(' | '));

  await p.click('#coachDock'); await p.waitForTimeout(300);
  const ask = async (q) => {
    await p.fill('#coachInput', q); await p.click('.coach-send'); await p.waitForTimeout(450);
    return await p.evaluate(() => {
      const el = document.querySelector('#coachLog .from-coach:last-child');
      const chip = el && el.querySelector('.conf');
      return { text: el ? el.textContent : '', conf: chip ? [...chip.classList].find(c => c.startsWith('conf-')) : null, chip: chip ? chip.textContent.trim() : null };
    });
  };

  // engine ground truth for azumarill
  const board = await p.evaluate(() => { const m = POKEMON.find(x => x.speciesName.toLowerCase() === 'azumarill'); return findNightmares(m, 9).map(k => ({ n: k.c.speciesName, tier: k.tier })); });
  const hasT1 = board.some(k => k.tier === 1);

  console.log('\n--- verified reads earn a tag ---');
  const rC = await ask('who beats azumarill?');
  t('counters answer carries a confidence tag', !!rC.conf, JSON.stringify(rC));
  t('counters reply still names the engine\'s #1 threat', rC.text.includes(board[0].n), board[0].n);
  if (hasT1) t('POSITIVE GUARD: azumarill has a Tier-1 counter → HIGH READ', rC.conf === 'conf-high', JSON.stringify(rC));

  console.log('\n--- the honesty guard: no fake certainty ---');
  const rU = await ask('what is the meaning of life');
  t('unverifiable question → CAN\'T VERIFY (not a confident tag)', rU.conf === 'conf-cant', JSON.stringify(rU));
  const rS = await ask('is my squad good?');
  t('empty squad → CAN\'T VERIFY (shrug, no fake score)', rS.conf === 'conf-cant', JSON.stringify(rS));

  console.log('\n--- opinion is labeled a read, never verified truth ---');
  const rO = await ask('do you like azumarill');
  t('opinion → LEANING · opinion', rO.conf === 'conf-lean' && /opinion/i.test(rO.chip || ''), JSON.stringify(rO));

  console.log('\n--- moveset carries an earned tag ---');
  const rM = await ask('moves for azumarill');
  t('moveset answer carries a tag', !!rM.conf, JSON.stringify(rM));

  console.log(`\n${pass} passed, ${fail} failed`);
  await b.close();
  process.exit(fail ? 1 : 0);
})();
