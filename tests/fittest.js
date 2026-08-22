/* fittest — THE SMART LEAGUE SWITCHER
   ═══════════════════════════════════════════════════════════════════════════
   Founder, Aug 22 2026, after peaking at 1854 rating with a squad he built blind:

     "when you're inputting a team, and their limits are below a leagues cap
      (morpeko for example or Altria - ultra league) we should have Bait&Nuke
      automatically smartly indicate we may be in the wrong league"

   And the thing he reported alongside it, which turned out to be the sharper
   half: he ran his squad, got a score, switched league, ran again and got the
   SAME score — so it read as though the analysis had not re-run. It had. Both
   capped leagues landed in the same scoring bucket while the threat underneath
   changed completely (Togedemaru -> Tinkaton -> Melmetal). A SCORE THAT STAYS
   THE SAME WHILE ITS REASON CHANGES COMPLETELY READS AS A SCORE THAT DID NOT
   RUN, so the reason now ships beside the score.

   ⚠ THE CEILING MATH IS PROVED AGAINST ANSWERS THE PLAYERBASE ALREADY KNOWS
   BEFORE IT IS POINTED AT ANYTHING NEW — Mewtwo 4724 and Slaking 5010 — AND
   THROUGH THE SAME CALL THE APP MAKES. That second clause was not true when this
   file was first written: the assertions passed a level the product never used,
   so the proof and the product were two different numbers. Obito caught it.
   A new instrument does not get to report a number until it has reproduced one
   somebody can check independently — on the path that actually ships.

   ⚠ THE CEILING IS TAKEN AT LEVEL 50, NOT 51, AND THAT IS A REAL-WORLD FACT
   RATHER THAN A CONVENIENCE: level 51 needs Best Buddy, only one Pokémon can be
   your buddy at a time, so at most ONE member of a three-mon squad can ever
   stand there. A squad-wide ceiling quoted at 51 is true of nobody's team.

   Run: node tests/fittest.js
   ═══════════════════════════════════════════════════════════════════════════ */
const path = require('path');
const { chromium } = require('playwright');
const DIST = process.env.BN_DIST || path.resolve(__dirname, '..');
const http = require('http'), fs = require('fs');
const MIME = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.json':'application/json' };
const srv = http.createServer((q,r)=>{
  const f = path.join(DIST, q.url==='/'?'/index.html':q.url.split('?')[0]);
  fs.readFile(f,(e,d)=>{ if(e){r.writeHead(404);r.end();return;}
    r.writeHead(200,{'Content-Type':MIME[path.extname(f)]||'application/octet-stream'}); r.end(d); });
});

(async () => {
  await new Promise(r=>srv.listen(8105,r));
  const b = await chromium.launch();
  const p = await b.newPage({ viewport:{width:390,height:844} });
  const errs = [];
  p.on('pageerror', e=>errs.push(e.message));
  p.on('console', m=>{ if(m.type()==='error' && !/Failed to load resource/.test(m.text())) errs.push(m.text()); });
  await p.goto('http://127.0.0.1:8105/index.html');
  await p.waitForFunction(()=>typeof POKEMON!=='undefined' && POKEMON.length>1000, {timeout:20000});
  await p.waitForTimeout(400);

  let pass=0, fail=0;
  const t=(l,c,x='')=>{ if(c){pass++;console.log('  ✅ '+l);} else {fail++;console.log('  ❌ '+l+(x?' — '+x:''));} };

  console.log('\n--- the ceiling math, against answers already known ---');
  /* ⚠ THE DEFAULT PATH, NOT A PATH BESIDE IT. The first version of this suite
     asserted `ceilingCP(bs, 50)` while every production call site passed 51 — so
     the two figures "the whole playerbase knows" verified an index the app never
     used, and the header claimed proof for numbers the founder would never see.
     Obito found it: *"two different numbers presented as one proof."*
     These calls now pass NO level argument, exactly as the app does. */
  const known = await p.evaluate(()=>{
    const c = id => { const m = POKEMON.find(x=>x.speciesId===id); return m ? ceilingCP(m.baseStats) : null; };
    return { mewtwo:c('mewtwo'), slaking:c('slaking'),
             morpeko:c('morpeko_full_belly'), altaria:c('altaria'),
             cramorant:c('cramorant'), meowscarada:c('meowscarada'),
             defaultLvl: (typeof CEIL_LVL !== 'undefined') ? CEIL_LVL : null };
  });
  t('the app\'s DEFAULT ceiling is taken at the level it claims to prove (50, not 51)',
    known.defaultLvl === 50, String(known.defaultLvl));
  t('Mewtwo tops out at 4724 — through the SHIPPED call, no test-only argument', known.mewtwo === 4724, String(known.mewtwo));
  t('Slaking tops out at 5010 — likewise', known.slaking === 5010, String(known.slaking));
  /* ⚠ CONTROL — if the ceiling could not be computed at all, every assertion
     below is vacuously true and this suite reports health while measuring
     nothing. An absent answer is not a passing answer. */
  t('CONTROL — the ceiling is computable for the founder\'s own squad',
    [known.morpeko, known.cramorant, known.meowscarada].every(v=>typeof v === 'number' && v > 0),
    JSON.stringify(known));

  console.log('\n--- his two examples, and they were both right ---');
  t(`Morpeko (Full Belly) can never reach Ultra's 2500 cap (${known.morpeko})`, known.morpeko < 2500, String(known.morpeko));
  t(`Altaria can never reach Ultra's 2500 cap (${known.altaria})`, known.altaria < 2500, String(known.altaria));
  t(`Meowscarada CAN reach it (${known.meowscarada}) — so this is not flagging everything`, known.meowscarada >= 2500, String(known.meowscarada));

  console.log('\n--- the notice, driven through all three leagues ---');
  const runs = await p.evaluate(()=>{
    const ids=['cramorant','meowscarada','morpeko_full_belly'];
    squad = ids.map(id=>POKEMON.find(x=>x.speciesId===id)).map(m=>{
      const fast=(m.fastMoves||[]).map(i=>MOVES[i]).filter(Boolean);
      const ch=(m.chargedMoves||[]).map(i=>MOVES[i]).filter(Boolean);
      const bait=[...ch].sort((a,b)=>(a.energy||99)-(b.energy||99))[0]||null;
      const nuke=[...ch].sort((a,b)=>(b.power||0)-(a.power||0))[0]||null;
      return buildLoadoutEntry(m,fast[0],bait,nuke);
    });
    const sel=document.getElementById('leagueSelect'); const out={};
    for(const lg of ['Great League','Ultra League','Master League']){
      sel.value=lg; sel.dispatchEvent(new Event('change',{bubbles:true}));
      const r=scoreSquadReal(); renderAnalysis(r);
      out[lg]={ score:r.synergy_score, threat:r.topThreat,
        notice: !!document.querySelector('.fit-note'),
        suggests: (document.querySelector('.fit-move')||{}).textContent||'',
        driver: (document.querySelector('.fit-driver')||{}).textContent||'',
        shortCount: (r.fit.shortOnes||[]).length,
        masterGap: !!r.fit.masterGap };
    }
    return out;
  });

  t('GREAT: silent — every one of them fills a 1500 cap, so there is nothing to say',
    runs['Great League'].notice === false, JSON.stringify(runs['Great League']));
  t('ULTRA: the notice fires, and names BOTH undersized members',
    runs['Ultra League'].notice === true && runs['Ultra League'].shortCount === 2,
    JSON.stringify(runs['Ultra League']));
  t('ULTRA: and it says where the squad actually belongs',
    /Great League/.test(runs['Ultra League'].suggests), runs['Ultra League'].suggests);
  /* Master has no cap to fall short of, so the cap check is blind there by
     construction — and silence in the league where an undersized squad is most
     hopeless is the same defect wearing a different hat. Compared against
     Master's OWN ranked pool, never against a number anybody picked. */
  t('MASTER: no cap to miss, so it compares against Master\'s own ranked meta instead',
    runs['Master League'].notice === true && runs['Master League'].masterGap === true,
    JSON.stringify(runs['Master League']));

  console.log('\n--- the score that looked stale ---');
  t('the two capped leagues genuinely score the same here (his report was accurate)',
    runs['Great League'].score === runs['Ultra League'].score,
    `${runs['Great League'].score} vs ${runs['Ultra League'].score}`);
  t('…but the THREAT behind it is different in every league — the reason is no longer hidden',
    new Set([runs['Great League'].threat, runs['Ultra League'].threat, runs['Master League'].threat]).size === 3,
    [runs['Great League'].threat, runs['Ultra League'].threat, runs['Master League'].threat].join(' / '));
  t('and every league states which meta it scored against',
    ['Great League','Ultra League','Master League'].every(l => new RegExp(l).test(runs[l].driver)),
    JSON.stringify(['Great League','Ultra League','Master League'].map(l=>runs[l].driver)));

  console.log('\n--- the ADVICE it gives, which is the expensive part ---');
  /* ⚠ ALL THREE OF THESE FAILED WHEN THEY WERE WRITTEN, and all three came from
     Obito rather than from me. A notice that is merely noisy wastes his
     attention. A notice that is WRONG sends him to rebuild a team in the wrong
     format — and the first version rendered *"this squad fills out in Great
     League"* for a squad holding a MEWTWO, which sits at about level 13 under a
     1500 cap. Reachable today: Analyze unlocks at two Pokémon, and every squad
     passes through that state while it is being built. */
  const advice = await p.evaluate(()=>{
    const build = ids => ids.map(id=>POKEMON.find(x=>x.speciesId===id)).filter(Boolean).map(m=>{
      const fast=(m.fastMoves||[]).map(i=>MOVES[i]).filter(Boolean);
      const ch=(m.chargedMoves||[]).map(i=>MOVES[i]).filter(Boolean);
      return buildLoadoutEntry(m,fast[0],ch[0]||null,ch[0]||null);
    });
    const run = (ids, lg) => {
      squad = build(ids);
      const sel=document.getElementById('leagueSelect');
      sel.value=lg; sel.dispatchEvent(new Event('change',{bubbles:true}));
      const r=scoreSquadReal(); renderAnalysis(r);
      return { suggested:r.fit.suggested, notice:!!document.querySelector('.fit-note'),
               move:(document.querySelector('.fit-move')||{}).textContent||'',
               crushed:(r.fit.crushedOnes||[]).map(c=>c.name) };
    };
    return {
      mixed:  run(['morpeko_full_belly','mewtwo'], 'Ultra League'),
      master: run(['mewtwo','slaking','metagross'], 'Great League'),
      empty:  { suggested: leagueFit([], 'Ultra League').suggested }
    };
  });
  t('a squad holding a MEWTWO is never told to go to Great League',
    advice.mixed.suggested !== 'Great League' && !/Great League/.test(advice.mixed.move),
    JSON.stringify(advice.mixed));
  t('a Master-tier squad parked in Great League is NOT silent — it is told it is too big',
    advice.master.notice === true && advice.master.crushed.length > 0,
    JSON.stringify(advice.master));
  t('an EMPTY squad declines to suggest anything ([].every() is true — this used to answer confidently)',
    advice.empty.suggested === null, JSON.stringify(advice.empty));

  console.log('\n--- the wound: a squad that fits must NOT be nagged ---');
  /* A notice that fires on everything is a notice nobody reads (and the engine
     already learned this once: an earlier scorer flagged EVERY squad as swept
     and gave them all an identical 34). So: three genuine Ultra picks, and the
     switcher must stay quiet. */
  const clean = await p.evaluate(()=>{
    const big = ['dialga','giratina_altered','melmetal'].map(id=>POKEMON.find(x=>x.speciesId===id)).filter(Boolean);
    if(big.length < 3) return { skipped:true };
    squad = big.map(m=>{
      const fast=(m.fastMoves||[]).map(i=>MOVES[i]).filter(Boolean);
      const ch=(m.chargedMoves||[]).map(i=>MOVES[i]).filter(Boolean);
      return buildLoadoutEntry(m,fast[0],ch[0]||null,ch[0]||null);
    });
    const sel=document.getElementById('leagueSelect');
    sel.value='Ultra League'; sel.dispatchEvent(new Event('change',{bubbles:true}));
    const r=scoreSquadReal(); renderAnalysis(r);
    return { skipped:false, notice: !!document.querySelector('.fit-note'),
             ceilings: r.fit.rows.map(x=>x.ceiling) };
  });
  if(clean.skipped){
    t('CONTROL — three genuine Ultra picks were available to test with', false,
      'could not resolve the control squad; the wound proves nothing');
  } else {
    t('a squad that comfortably clears the cap is NOT flagged (a notice that fires on everything is noise)',
      clean.notice === false, JSON.stringify(clean));
  }

  t('zero JS errors through the whole pass', errs.length === 0, errs.slice(0,3).join(' | '));

  console.log(`\n${pass} passed, ${fail} failed`);
  await b.close(); srv.close();
  process.exit(fail ? 1 : 0);
})();
