/* ═══════════════════════════════════════════════════════════════════════════
   megatest — THE MEGA EVOLUTION BONUS MOVE, and the three defects found under it.

   Marth, Sept 3 2026, from the field with three screenshots of his Mega Mewtwo Y:

     > "1 I don't think he account for mega evolutions & 2 when I type a mon,
     >  if eligible; there's no slot for a mega pokemons 4th move."

   He named two. There were four, and the one he named first turned out to be
   the smallest of them:

     1. DATA — `extraChargedMoves`, the link from a mega to its bonus move, was
        dropped by refresh_roster.js's field whitelist. All 13 `_PLUS` moves had
        been sitting in gamemaster.json since Aug 19 with nothing pointing at them.
     2. UI — no slot for the 4th move (his ask, exactly).
     3. SPROCKET COULD NOT FIND A MEGA AT ALL. "moves for mewtwo mega y" →
        *"I don't know a mon called 'mewtwo mega y'."* The roster spells it
        **Mewtwo (Mega Y)** and nobody types brackets. This was never mega-only:
        every parenthesised form — Armored, Shadow, Alolan, Galarian — was
        unreachable by its form name.
     4. SPROCKET ANSWERED CONFIDENTLY AND WRONGLY. Megas are excluded from every
        board (they cannot enter GBL — correct, and kept). But "not on the board"
        was read as "not a threat", so a mega matchup returned *"Neither
        hard-counters the other... even fight; play it clean."* The engine had no
        opinion; Sprocket reported its silence as a finding.

   And one bystander, found while reading the picker and PROVEN in a browser
   rather than argued from the shape:
     5. `switchToSquadMon` restored fast and bait but never the nuke, because a
        squad entry carries `.charged` while an engine pick carries `.nuke`.
        Choose Ice Beam, seat it, come back → the dropdown read HYDRO_PUMP while
        the squad still held ICE_BEAM. The control lied about what he built.

   ── WHAT EACH CHECK KNOWS, AND WHAT IT CANNOT SEE ──────────────────────────
   Every assertion below carries a KNOWN ANSWER (a value that must be exactly
   this, so the check cannot pass by accident on an empty result) and, where it
   matters, its WOUND — the thing it is still blind to.

   ⚠ THE CONTROL MATTERS AS MUCH AS THE CASE. A bench that only ever visits the
   broken state always reports health. Azumarill is checked at every step for
   the OPPOSITE outcome: no bonus slot, a normal verdict, an unchanged answer.
   ═══════════════════════════════════════════════════════════════════════════ */
'use strict';
const path = require('path');
const fs = require('fs');
const ROOT = process.env.BN_DIST || path.resolve(__dirname, '..');
const { chromium } = require(path.join(ROOT, 'node_modules', 'playwright'));

let pass = 0, fail = 0;
const t = (name, ok, detail) => {
  if (ok) { pass++; console.log('  ✅ ' + name + (detail ? '  — ' + detail : '')); }
  else { fail++; console.log('  ❌ ' + name + (detail ? '  — ' + detail : '')); }
};

(async () => {
  /* ---- PART 1: the data, read straight off disk ------------------------- */
  console.log('\n--- the data ---');
  const gm = JSON.parse(fs.readFileSync(path.join(ROOT, 'gamemaster.json'), 'utf8'));
  const linked = gm.pokemon.filter(p => (p.extraChargedMoves || []).length);
  const flagged = Object.entries(gm.moves).filter(([, m]) => m.isMegaMove);

  /* KNOWN ANSWER: 16 — 13 megas plus Cramorant's three forms. Not ">0", which
     would pass on a single surviving link after the other 15 were lost. */
  t('16 species carry a bonus move', linked.length === 16, linked.length + ' found');

  /* KNOWN ANSWER: 13. The authoritative upstream flag, kept as a PROPERTY so
     nothing here has to match on the _PLUS suffix — this house's most-repeated
     defect is matching a mention instead of reading a property. */
  t('13 moves flagged isMegaMove', flagged.length === 13, flagged.length + ' found');

  /* THE AUG 19 BUG ITSELF: every _PLUS definition was present and NONE was
     reachable. A bonus move pointing at a move that does not exist is the same
     failure wearing the other face. */
  const orphans = linked.flatMap(p => p.extraChargedMoves).filter(id => !gm.moves[id]);
  t('no bonus move points at a missing definition', orphans.length === 0, orphans.join(',') || 'none');

  /* CROSS-CHECK between two independently-sourced fields. If refresh_roster
     ever copies one and drops the other, these two counts diverge and this line
     goes red — which is precisely how the original bug would have announced
     itself instead of hiding for two weeks. */
  const distinctBonus = new Set(linked.flatMap(p => p.extraChargedMoves));
  const megaOnly = [...distinctBonus].filter(id => gm.moves[id].isMegaMove);
  t('every isMegaMove move is actually linked to a species',
    flagged.every(([id]) => distinctBonus.has(id)),
    megaOnly.length + ' of ' + distinctBonus.size + ' linked moves are mega moves');

  /* his own screenshot, byte-checked against our table. If Niantic reworks the
     move this goes red and SHOULD — that is a data change worth being told about. */
  const fsp = gm.moves.FUTURE_SIGHT_PLUS;
  const mmy = gm.pokemon.find(p => p.speciesId === 'mewtwo_mega_y');
  t('Mewtwo (Mega Y) -> Future Sight+, 130 power / 80 energy (his screenshot)',
    !!fsp && fsp.power === 130 && fsp.energy === 80 &&
    (mmy.extraChargedMoves || []).indexOf('FUTURE_SIGHT_PLUS') !== -1,
    fsp ? fsp.power + '/' + fsp.energy : 'ABSENT');

  /* ⚠ NOT MEGA-ONLY. Cramorant carries Gulp Missile in this same field, so any
     implementation keyed off /_mega/ works today and breaks on him. This check
     exists to make that shortcut fail loudly if anyone takes it later. */
  const cram = gm.pokemon.find(p => p.speciesId === 'cramorant');
  t('a NON-mega uses the same field (Cramorant) — /_mega/ shortcuts must fail here',
    !!cram && (cram.extraChargedMoves || []).length === 2,
    cram ? (cram.extraChargedMoves || []).join(', ') : 'ABSENT');

  /* ⚠ THE STALE-DATA GUARD — Marth's field test is the reason this exists.
     He opened the shipped app and reported "Don't see the 3rd slot tho", with a
     status line reading 1740 Pokémon · 347 moves against a shipped 1742 · 349.
     Nothing was broken on the server; `_headers` caches gamemaster.json for a
     WEEK and the app asked for the same URL every time, so his phone kept a
     copy from before the mega links existed. Every bench in this file was green
     the whole time, because they all read the file off disk.
     ⭐ HIS OWN SENTENCES WERE THE DIAGNOSIS: "the updated sprites are a good
     touch tho" alongside the old counts — app.js fresh, roster a week behind. */
  const appSrc = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');
  const stamped = (appSrc.match(/const DATA_VERSION = '([^']*)'/) || [, null])[1];
  t('app.js carries a DATA_VERSION cache-buster', !!stamped, String(stamped));
  t('it matches the roster it ships with — a mismatch means a stale fetch URL',
    stamped === gm.rosterSource.syncedAt,
    'app ' + stamped + ' vs roster ' + gm.rosterSource.syncedAt);
  t('the roster fetch is versioned, not a bare URL',
    /fetch\('gamemaster\.json\?v='\s*\+\s*DATA_VERSION\)/.test(appSrc),
    /fetch\('gamemaster\.json'\)/.test(appSrc) ? 'STILL A BARE URL' : 'versioned');
  /* and the claim that misled him: prose asserting currency it cannot check */
  t('the status line no longer claims "full current roster" as a fact',
    !/full current roster, synced/.test(appSrc), 'claim removed');

  /* ---- PART 2: the app, driven in a real browser ------------------------ */
  const server = await require(path.join(__dirname, 'serve.js'))(ROOT, 8801);
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 390, height: 900 } });   // his phone
  const errs = [];
  p.on('pageerror', e => errs.push(String(e).slice(0, 160)));
  await p.goto('http://localhost:8801/index.html');
  await p.waitForFunction(() => typeof POKEMON !== 'undefined' && POKEMON.length > 1000,
    null, { timeout: 20000 });

  console.log('\n--- the 4th move slot (his ask) ---');
  const slot = await p.evaluate(() => {
    const read = id => {
      renderResult(POKEMON.find(x => x.speciesId === id));
      const picker = document.querySelector('.moveset-picker');
      const slots = [...picker.querySelectorAll('.bonus-slot')];
      return {
        slots: slots.length,
        text: slots.map(s => s.textContent.replace(/\s+/g, ' ').trim()),
        anySelect: slots.some(s => s.tagName === 'SELECT' || s.querySelector('select')),
        selects: picker.querySelectorAll('select').length,
        over: [...picker.querySelectorAll('*')]
          .filter(el => el.getBoundingClientRect().right > innerWidth + 1).length,
      };
    };
    return { mega: read('mewtwo_mega_y'), plain: read('azumarill') };
  });
  t('a mega shows exactly one bonus slot', slot.mega.slots === 1, slot.mega.slots + ' slot(s)');
  t('it names the move and its numbers', /Future Sight\+/.test(slot.mega.text[0] || ''),
    slot.mega.text[0] || 'EMPTY');

  /* ⭐ THE DESIGN, ASSERTED. He cannot pick this move and cannot TM it off, so
     a <select> would be a control offering a choice the game does not have.
     If someone "improves" this into a dropdown later, this line stops them. */
  t('it is NOT a dropdown — the move is granted, not chosen',
    !slot.mega.anySelect && slot.mega.selects === 3, slot.mega.selects + ' selects');

  /* CONTROL — the half that proves the check can say no. */
  t('CONTROL: a non-mega shows no bonus slot at all', slot.plain.slots === 0,
    slot.plain.slots + ' slot(s) on Azumarill');
  t('nothing overflows at 390px (his phone)', slot.mega.over === 0 && slot.plain.over === 0,
    slot.mega.over + ' overflowing');

  console.log('\n--- Sprocket can find a mega at all ---');
  /* ⚠ THE WIDER CLASS. Megas were the symptom; parentheses were the disease.
     Each of these is a form nobody types with brackets. */
  const resolved = await p.evaluate(() => {
    const R = window.__bnCoach.resolveMon;
    const out = {};
    ['mewtwo mega y', 'mewtwo mega x', 'mega mewtwo y', 'mewtwo armored',
     'mewtwo shadow', 'azumarill', 'mewtwo',
     'charizard mega x', 'charizard mega y'].forEach(q => {
      const m = R(q);
      out[q] = m ? m.speciesId : null;
    });
    return out;
  });
  t('"mewtwo mega y" resolves', resolved['mewtwo mega y'] === 'mewtwo_mega_y', String(resolved['mewtwo mega y']));
  t('"mewtwo mega x" resolves', resolved['mewtwo mega x'] === 'mewtwo_mega_x', String(resolved['mewtwo mega x']));
  t('word order does not matter ("mega mewtwo y")', resolved['mega mewtwo y'] === 'mewtwo_mega_y', String(resolved['mega mewtwo y']));
  /* ⚠ THE SINGLE-LETTER DISCRIMINATOR — X and Y are the whole difference, and
     the first version of the resolver dropped tokens shorter than 2 chars,
     silently answering Mega X for a Mega Y question. Both pairs checked, both
     directions, because getting one right by luck is not getting it right. */
  t('X and Y are not interchangeable (charizard)',
    resolved['charizard mega x'] === 'charizard_mega_x' &&
    resolved['charizard mega y'] === 'charizard_mega_y',
    resolved['charizard mega x'] + ' / ' + resolved['charizard mega y']);
  t('the class, not the case: "mewtwo armored" resolves', resolved['mewtwo armored'] === 'mewtwo_armored', String(resolved['mewtwo armored']));
  t('the class, not the case: "mewtwo shadow" resolves', resolved['mewtwo shadow'] === 'mewtwo_shadow', String(resolved['mewtwo shadow']));

  /* CONTROL, AND THE ONE THAT MUST NOT REGRESS. The old resolver deliberately
     preferred the shortest name so a base form is never hijacked by a variant.
     Widening the match must not cost that. */
  t('CONTROL: "azumarill" still gets the base form, not a variant',
    resolved['azumarill'] === 'azumarill', String(resolved['azumarill']));
  t('CONTROL: bare "mewtwo" still gets base Mewtwo, not a Mega',
    resolved['mewtwo'] === 'mewtwo', String(resolved['mewtwo']));

  console.log('\n--- Sprocket refuses instead of guessing ---');
  /* ⚠ THIS SECTION USED TO READ THE CLOCK AND DID NOT KNOW IT. Written before
     the cups were made mega-aware, it asserted that a mega matchup always
     refuses — and passed, because the live cup that day happened to be a mega
     cup... no: it passed because megas were excluded from every board on every
     day. The moment cups gained `megasAllowed`, all three lines went red on a
     live mega cup, and the CODE was right: Sprocket refuses because the engine
     is blind, so when the cup makes megas real candidates the refusal must lift.

     The fix is not to loosen these. It is to say WHICH WORLD each is testing —
     and that makes the section strictly stronger, because it now also proves
     the refusal LIFTS, which nothing checked before. */
  const said = await p.evaluate(async () => {
    /* pin a cup where megas are NOT legal — the world the refusal is for */
    selectedCupIndex = CUPS.findIndex(c => !c.megasAllowed && c.startISO);
    const ask = async q => {
      document.getElementById('coachInput').value = q;
      document.querySelector('.coach-send').click();
      await new Promise(r => setTimeout(r, 350));
      const el = document.querySelector('#coachLog .from-coach:last-child');
      return {
        text: el ? el.textContent.replace(/\s+/g, ' ').trim() : '',
        state: document.querySelector('#coachPanel .coach').dataset.state,
      };
    };
    document.getElementById('coachDock').click();
    await new Promise(r => setTimeout(r, 300));
    return {
      moves: await ask('moves for mewtwo mega y'),
      oneSided: await ask('mewtwo mega y vs gyarados'),
      bothMega: await ask('mewtwo mega x vs mewtwo mega y'),
      normal: await ask('azumarill vs medicham'),
    };
  });

  t('"moves for mewtwo mega y" names the bonus move',
    /Future Sight\+/.test(said.moves.text) && said.moves.state === 'answer',
    said.moves.state);

  /* ⭐ THE WRONG-VERDICT CHECK. This is the assertion that would have caught the
     original defect. It is written as "must NOT contain the confident phrase"
     as well as "must be a shrug", because a future rewrite could keep the
     shrug state and still print an even-fight sentence. */
  t('a mega matchup REFUSES rather than calling it even',
    said.oneSided.state === 'shrug' && !/even fight/i.test(said.oneSided.text),
    said.oneSided.state);
  t('it still says the half it CAN see (not a blanket refusal)',
    /half the picture/i.test(said.oneSided.text), 'asymmetric blindness handled');
  t('mega vs mega refuses outright', said.bothMega.state === 'shrug' &&
    /no reading/i.test(said.bothMega.text), said.bothMega.state);

  /* CONTROL: the ordinary path must be untouched. If this goes red, the refusal
     leaked into normal matchups and Sprocket has gone silent on real questions —
     which would be a worse bug than the one being fixed. */
  t('CONTROL: a normal matchup still gets a real verdict',
    said.normal.state === 'answer' && /even fight|wins|threaten/i.test(said.normal.text),
    said.normal.state);

  /* ⭐ THE OTHER HALF, which nothing checked until the cups exposed it: the
     refusal must END when its cause ends. A refusal that outlived the blindness
     that justified it would be the twin of the bug it replaced — Sprocket
     staying silent about a matchup it can now actually see. */
  const lifted = await p.evaluate(async () => {
    selectedCupIndex = CUPS.findIndex(c => c.megasAllowed);
    document.getElementById('coachInput').value = 'mewtwo mega y vs gyarados';
    document.querySelector('.coach-send').click();
    await new Promise(r => setTimeout(r, 400));
    const el = document.querySelector('#coachLog .from-coach:last-child');
    return { text: el ? el.textContent.replace(/\s+/g, ' ').trim() : '',
             state: document.querySelector('#coachPanel .coach').dataset.state };
  });
  t('the refusal LIFTS in a mega cup — he gets a straight verdict',
    lifted.state === 'answer' && !/can't call this one/i.test(lifted.text),
    lifted.state + ': ' + lifted.text.slice(0, 60));

  console.log('\n--- the bystander: your chosen nuke comes back ---');
  /* PROVEN BROKEN before it was fixed: HYDRO_PUMP shown, ICE_BEAM held. */
  const restore = await p.evaluate(() => {
    const mon = POKEMON.find(x => x.speciesId === 'azumarill');
    renderResult(mon);
    const sel = document.getElementById('nukeSelect');
    const auto = sel.value;
    const other = [...sel.options].map(o => o.value).find(v => v && v !== auto);
    sel.value = other; sel.dispatchEvent(new Event('change'));
    squad.length = 0;
    squad.push(getSelectedLoadout(mon,
      mon.fastMoves.map(i => MOVES[i]).filter(Boolean),
      mon.chargedMoves.map(i => MOVES[i]).filter(Boolean)));
    renderResult(POKEMON.find(x => x.speciesId === 'medicham'));
    switchToSquadMon('azumarill');
    return { auto, chose: other, held: squad[0].charged.moveId,
             shown: document.getElementById('nukeSelect').value };
  });
  t('the dropdown shows the nuke he actually chose',
    restore.shown === restore.chose && restore.held === restore.chose,
    'chose ' + restore.chose + ', shown ' + restore.shown + ', held ' + restore.held);
  /* KNOWN ANSWER guard: if the auto-pick and his pick were ever the same move,
     the check above would pass without testing anything. */
  t('the check is meaningful (his pick differed from the auto-pick)',
    restore.auto !== restore.chose, restore.auto + ' vs ' + restore.chose);

  /* ═══ THE CUPS — Marth's correction, Sept 4 2026 ═════════════════════════
     "nah the cups should be updated because this is now a standing feature,
      hence why i even brought it up in the first place."

     ⚠ EVERY CHECK BELOW SETS THE CUP EXPLICITLY AND NEVER READS THE CLOCK.
     The live cup on the day this was written happened to be a mega cup, so a
     clock-reading test would pass today and go red on Sep 9 for no defect at
     all — a guard that punishes the house for the calendar moving is a guard
     people learn to ignore, and the first real failure after that is the one
     nobody sees. */
  console.log('\n--- megas on the boards, when the cup allows them ---');
  const cups = await p.evaluate(() => {
    const pick = want => CUPS.findIndex(c => !!c.megasAllowed === want && c.startISO);
    const boardFor = (anchor, idx) => {
      selectedCupIndex = idx;
      const big = findNightmares(POKEMON.find(x => x.speciesId === anchor), 500);
      return big.map((k, i) => ({ i: i + 1, id: k.c.speciesId, t: k.tier }));
    };
    const megaIdx = pick(true), plainIdx = pick(false);
    const onMega = boardFor('medicham', megaIdx);
    const onPlain = boardFor('medicham', plainIdx);
    const isM = e => /_mega|_primal/.test(e.id);
    const sab = onMega.find(e => e.id === 'sableye_mega');
    return {
      megaCup: CUPS[megaIdx].name, plainCup: CUPS[plainIdx].name,
      megaCupFlag: !!CUPS[megaIdx].megasAllowed,
      note: CUPS[megaIdx].note || null,
      onMegaCount: onMega.filter(isM).length,
      onPlainCount: onPlain.filter(isM).length,
      anyT1: onMega.filter(e => isM(e) && e.t === 1).length,
      sableye: sab ? { rank: sab.i, tier: sab.t } : null,
      /* the base form must still be there too — a mega must ADD an entry, not
         evict its own base by winning the dedup the other way */
      baseStillThere: onMega.some(e => e.id === 'sableye'),
      total: onMega.length,
    };
  });

  t('a mega cup is identified by a FIELD, not by words in its name',
    cups.megaCupFlag === true, cups.megaCup);

  /* ⚠⚠ THE SUITE WAS GRADING A SUBSTITUTE AND COULD NOT TELL — Obito's second
     catch, and it is this house's oldest defect wearing test clothes. Nearly
     every check in this file finds "the mega cup" with
     `CUPS.findIndex(c => c.megasAllowed)`, which returns THE FIRST MATCH. He
     set `megasAllowed:true` on the type-restricted Weather Cup; findIndex
     silently switched to it by array order, and the suite went on passing —
     grading a cup nobody meant, reporting health about the wrong thing. Only
     two incidental assertions noticed, and neither said why.
     One flag, one cup, asserted. If a second mega cup is ever legitimately
     added, this line goes red on purpose and every findIndex above must be
     changed to name its cup instead of taking whichever comes first. */
  const megaFlagged = await p.evaluate(() =>
    CUPS.map((c, i) => ({ i, name: c.name, on: !!c.megasAllowed })).filter(c => c.on));
  t('exactly ONE cup carries megasAllowed — findIndex cannot grade a substitute',
    megaFlagged.length === 1,
    megaFlagged.length + ' flagged: ' + megaFlagged.map(c => c.name).join(' | '));
  /* KNOWN ANSWER, not ">0": before this work exactly ONE mega reached a
     247-entry board, and it was an accident — plain Chesnaught happened to miss
     the board so its mega escaped the base-name dedup. */
  t('megas actually reach the board in a mega cup', cups.onMegaCount >= 10,
    cups.onMegaCount + ' megas in ' + cups.total + ' entries');
  /* ⭐ THE EXTERNALLY-VALIDATED ONE. Independent PvP rankings for Great League:
     Mega Edition put Mega Sableye near the top of the whole cup. Our engine,
     which has never seen that ranking, puts it Tier 1 near the top of
     Medicham's board. Two instruments that share no data agreeing is worth more
     than either alone — and if a future change silently re-damps megas, this is
     the line that notices. */
  t('Mega Sableye is a Tier-1 threat to Medicham (independent rankings agree)',
    !!cups.sableye && cups.sableye.tier === 1 && cups.sableye.rank <= 20,
    cups.sableye ? '#' + cups.sableye.rank + ' T' + cups.sableye.tier : 'ABSENT');
  t('megas reach Tier 1 at all — proves viability is not still damped to 0.20',
    cups.anyT1 > 0, cups.anyT1 + ' mega(s) at T1');
  t('a mega does not evict its own base form', cups.baseStillThere, 'sableye present');

  /* CONTROL — the half that proves the check can say no. Without this the
     whole section would pass on an engine that simply always shows megas. */
  t('CONTROL: zero megas in a cup that does NOT allow them',
    cups.onPlainCount === 0, cups.onPlainCount + ' on ' + cups.plainCup);

  console.log('\n--- a cup governs only its own leagues ---');
  /* ⚠ SHISUI'S CATCH, and it was a hole in the first version of `cupContext()`.
     It returned the selected cup no matter which league was being viewed, so
     picking the Great League mega cup and switching the dropdown to Master let
     megas onto Master boards — he measured 45,382 candidate appearances, with
     Mega Rayquaza and Mega Latias at Tier 2 in a league the cup does not
     govern. The CUPS header had claimed Master was "excluded" for a year; it
     was excluded by intention and nothing else. */
  const leagues = await p.evaluate(() => {
    const setL = v => { const s = document.getElementById('leagueSelect');
                        s.value = v; s.dispatchEvent(new Event('change')); };
    const megaIdx = CUPS.findIndex(c => c.megasAllowed);
    const megasOn = a => findNightmares(POKEMON.find(x => x.speciesId === a), 500)
      .filter(k => /_mega|_primal/.test(k.c.speciesId)).length;
    const out = {};
    selectedCupIndex = megaIdx;
    out.declared = CUPS[megaIdx].leagues || [CUPS[megaIdx].league];
    /* narrow the cup to Great League only, then look at Master — the leak */
    const saved = CUPS[megaIdx].leagues;
    CUPS[megaIdx].leagues = ['Great League'];
    setL('Master League');
    out.narrowedCtx = cupContext() ? 'APPLIES' : 'null';
    out.narrowedMegas = megasOn('dialga');
    setL('Great League');
    out.inItsOwnLeague = cupContext() ? 'APPLIES' : 'null';
    CUPS[megaIdx].leagues = saved;
    /* a plain Great-League cup must not govern Master either */
    selectedCupIndex = CUPS.findIndex(c => !c.megasAllowed && c.startISO);
    setL('Master League');
    out.plainAtMaster = cupContext() ? 'APPLIES' : 'null';
    setL('Great League');
    return out;
  });
  t('the mega cup declares its leagues as DATA, not in its name',
    Array.isArray(leagues.declared) && leagues.declared.length >= 1, leagues.declared.join(', '));
  t('a Great-League-only cup does NOT govern Master League',
    leagues.narrowedCtx === 'null' && leagues.narrowedMegas === 0,
    leagues.narrowedCtx + ', ' + leagues.narrowedMegas + ' megas');
  t('CONTROL: it still governs its own league', leagues.inItsOwnLeague === 'APPLIES',
    leagues.inItsOwnLeague);
  t('CONTROL: an ordinary GL cup does not govern Master either',
    leagues.plainAtMaster === 'null', leagues.plainAtMaster);

  console.log('\n--- THE FLOOD GUARD: megas must not take over a board ---');
  /* ⚠⚠ THE INSTRUMENT THAT WOULD HAVE REFUSED ME, and the reason it exists.
     Every other check in this file asks "does a mega APPEAR?" — and each of
     them passed while megas were quietly taking over Master League. Obito found
     it by sweeping ~300 anchors and counting slots: Great and Ultra produced
     zero flooded boards, Master produced 40 of 300 where 7+ of 9 slots were
     megas or primals, because I had given every unranked mega a flat viability
     of 1.0 in the uncapped league — above PvPoke's own #1-rated Master pick.

     ⭐ "DOES IT APPEAR" AND "HAS IT TAKEN OVER" ARE DIFFERENT QUESTIONS, and a
     suite that only ever asks the first will pass its way into the second. This
     asks the second, in every league, and it is the check that must not be
     loosened when it complains — a flooded board is the failure, not the alarm.

     ⚠ Deliberately sampled, not exhaustive: enough anchors to catch a takeover,
     few enough to keep the suite runnable. It cannot see a flood confined to
     mons outside this sample. */
  const flood = await p.evaluate(() => {
    const setL = v => { const s = document.getElementById('leagueSelect');
                        s.value = v; s.dispatchEvent(new Event('change')); };
    selectedCupIndex = CUPS.findIndex(c => c.megasAllowed);
    const anchors = ['azumarill','medicham','registeel','skarmory','lickitung','swampert',
                     'altaria','bastiodon','umbreon','galvantula','dialga','garchomp',
                     'metagross','melmetal','giratina_altered','gyarados','talonflame','abomasnow'];
    const out = {};
    for (const lg of ['Great League','Ultra League','Master League']) {
      setL(lg);
      let worst = 0, worstOn = '', flooded = 0, boards = 0, topMega = 0;
      for (const a of anchors) {
        const mon = POKEMON.find(x => x.speciesId === a); if (!mon) continue;
        const board = findNightmares(mon, 9);          // the DISPLAY board he sees
        if (!board.length) continue;
        boards++;
        const share = board.filter(k => /_mega|_primal/.test(k.c.speciesId)).length / board.length;
        if (share > worst) { worst = share; worstOn = a; }
        if (share >= 0.7) flooded++;
        /* ⭐ THE SHARPER NEEDLE, and it is Obito's, not mine. He weakened the
           mega proxy exponent 2.5 -> 1.0 and the 70% takeover check stayed GREEN
           across the FULL 1742-anchor roster (worst 56%) — a real mistuning my
           guard could not feel. But the share of boards where a mega is the
           single TOP threat moved cleanly, 0% -> 7% in Great and 14% in Ultra.
           A threshold catches a takeover; this catches a thumb on the scale. */
        if (/_mega|_primal/.test(board[0].c.speciesId)) topMega++;
      }
      out[lg] = { worst: Math.round(worst * 100), worstOn, flooded, boards,
                  topMega: Math.round((topMega / Math.max(1, boards)) * 100) };
    }
    setL('Great League');
    return out;
  });
  for (const lg of Object.keys(flood)) {
    const f = flood[lg];
    /* KNOWN ANSWER: zero flooded boards. Not "fewer than before" — a threshold
       that moves with the bug is a threshold that ratifies it. */
    t('no board is taken over by megas in ' + lg, f.flooded === 0,
      f.flooded + ' of ' + f.boards + ' flooded · worst ' + f.worst + '% (' + (f.worstOn || 'none') + ')');
    /* KNOWN ANSWER: 0%. Measured across the whole 1742-mon roster on the real
       tree — a mega is never the single biggest threat to anybody, in any
       league. Not "rarely": zero. That is the number a thumb on the scale
       moves first, so it is the number worth pinning. */
    t('no mega is the TOP threat to anyone in ' + lg, f.topMega === 0,
      f.topMega + '% of boards led by a mega');
  }
  /* CONTROL: the guard must be capable of seeing a mega at all, or "0 flooded"
     is just the old broken behaviour reported as health — the exact failure this
     house calls a bench that only visits the resting state. */
  t('CONTROL: the flood guard can actually see megas (else 0% is meaningless)',
    flood['Great League'].worst > 0 || flood['Ultra League'].worst > 0,
    'GL worst ' + flood['Great League'].worst + '% · UL worst ' + flood['Ultra League'].worst + '%');
  /* Master is out of mega cups entirely now — its own note says why. */
  t('Master League sees no megas from a mega cup (no cap, no honest baseline)',
    flood['Master League'].worst === 0, flood['Master League'].worst + '%');

  console.log('\n--- a mega shows its OWN artwork ---');
  /* Every mega shares its base form's dex number, and the sprite path keyed off
     dex alone — so a Mega Mewtwo card returned HTTP 200 and rendered plain
     Mewtwo. A confident picture of the wrong Pokémon, which only stopped being
     harmless when megas could finally reach a board. */
  const art = await p.evaluate(() => {
    const read = id => {
      const html = spriteImg(POKEMON.find(x => x.speciesId === id), 48, '');
      return { src: (html.match(/src="([^"]+)"/) || [, ''])[1],
               fb: (html.match(/data-static="([^"]*)"/) || [, ''])[1] };
    };
    return { mega: read('mewtwo_mega_y'), primal: read('groudon_primal'),
             base: read('mewtwo'), plain: read('azumarill') };
  });
  t('a mega does not borrow its base form\'s sprite',
    /mewtwo-megay/.test(art.mega.src) && !/\/150\./.test(art.mega.src),
    art.mega.src.split('/').pop());
  t('a primal too', /groudon-primal/.test(art.primal.src), art.primal.src.split('/').pop());
  /* ⚠ AND THE FALLBACK MUST NOT REINTRODUCE IT — the static PNG is dex-keyed
     as well, so falling back would land on the base form one step later. */
  t('a mega has NO wrong-Pokemon fallback — it vanishes instead',
    art.mega.fb === '' && art.primal.fb === '', 'fallback: "' + art.mega.fb + '"');
  t('CONTROL: an ordinary mon keeps its animated sprite and its PNG fallback',
    /\/184\.gif$/.test(art.plain.src) && /\/184\.png$/.test(art.plain.fb),
    art.plain.src.split('/').pop() + ' / ' + art.plain.fb.split('/').pop());
  t('CONTROL: the BASE form still uses the dex path', /\/150\.gif$/.test(art.base.src),
    art.base.src.split('/').pop());

  console.log('\n--- the board card names the 4th move too ---');
  /* Rendered at 390px, Sableye and Sableye (Mega) landed side by side on the
     same Tier 1 row with the IDENTICAL kit line and identical numbers —
     pressure and DPE are move-derived and a mega learns the same moves, so the
     only honest difference on the card was two words in the name. Where a mega
     HAS a bonus move, that is the thing genuinely different about it, and the
     picker already showed it while the board did not. */
  const kits = await p.evaluate(() => {
    const one = id => {
      const c = POKEMON.find(x => x.speciesId === id);
      const fl = c.fastMoves.map(i => MOVES[i]).filter(Boolean);
      const cl = c.chargedMoves.map(i => MOVES[i]).filter(Boolean);
      const d = pickDefaultLoadout(c, fl, cl);
      const html = nightmareBoardHTML([{ c, tier: 1, offMult: 2, viaType: 'x',
        viaCoverage: false, myBest: 1, pressure: { idx: 1, ttc: 5, turns: 2 },
        dpe: 1.5, theirFast: d.fast, theirBait: d.bait, theirNuke: d.nuke }], 'test', '');
      return (html.match(/<div class="nm-kit">([\s\S]*?)<\/div>/) || [, ''])[1]
        .replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    };
    return { withBonus: one('skarmory_mega'), megaNoBonus: one('sableye_mega'),
             plain: one('skarmory') };
  });
  t('a mega with a bonus move shows it on the board card',
    /\+ Drill Peck\+/.test(kits.withBonus), kits.withBonus);
  /* CONTROL ×2 — only 13 of 61 megas have a bonus move, so "every mega" would
     be wrong, and a non-mega must never grow a fourth entry. */
  t('CONTROL: a mega WITHOUT a bonus move shows no extra move',
    !/\s\+\s/.test(kits.megaNoBonus), kits.megaNoBonus);
  t('CONTROL: an ordinary mon is unchanged', !/\s\+\s/.test(kits.plain), kits.plain);

  console.log('\n--- the banner tells the truth ---');
  const banner = await p.evaluate(() => {
    const out = {};
    const megaIdx = CUPS.findIndex(c => c.megasAllowed);
    selectedCupIndex = megaIdx; renderCupBanner();
    out.sub = document.querySelector('.cup-banner-sub').textContent.replace(/\s+/g, ' ').trim();
    const n = document.querySelector('.cup-banner-note');
    out.note = n ? n.textContent.replace(/\s+/g, ' ').trim() : null;
    const plainIdx = CUPS.findIndex(c => !c.megasAllowed && c.types.length <= 9);
    selectedCupIndex = plainIdx; renderCupBanner();
    out.plainNote = document.querySelector('.cup-banner-note') ? 'shown' : null;
    return out;
  });
  /* the banner printed "all except " with nothing after it on every open-type
     week — five cups allow all 18 types, so the excluded list came back empty
     and the sentence just stopped. An empty list rendered as if it were a list. */
  t('an all-types cup reads "all types", not "all except "',
    /all types/.test(banner.sub) && !/all except\s*·/.test(banner.sub), banner.sub.slice(0, 60));
  /* `note` sat on the Evolution Cup since it was written and NOTHING read it —
     an honest admission recorded and never shown is not an admission. */
  t('the cup caveat actually renders', !!banner.note && /Mega Evolved/.test(banner.note),
    banner.note ? banner.note.slice(0, 50) + '…' : 'STILL NOT RENDERED');
  t('CONTROL: a cup with no caveat shows no caveat box', banner.plainNote === null,
    String(banner.plainNote));

  /* ⚠ STALENESS WITH TEETH. Past CUP_SCHEDULE_END the live-cup picker falls
     back to the last cup that ENDED — and if that was a mega week the boards
     keep repopulating with megas on a date when they may not be legal. The
     existing "Schedule out of date" line was written when a stale cup could
     only get a type filter wrong; it now silently covers whole boards changing
     composition, so it has to name that. */
  const stale = await p.evaluate(() => {
    selectedCupIndex = CUPS.findIndex(c => c.megasAllowed);
    window.__bnCupScheduleStale = true; renderCupBanner();
    /* ⚠ NORMALISE THE WHITESPACE BEFORE MATCHING. The banner's text comes from a
       multi-line template literal, so `textContent` carries the newline and the
       source indentation INSIDE the sentence — "may no longer be\n   legal".
       A regex written for single spaces missed it and reported the warning
       absent when it was on screen. My hand-probe normalised and passed; the
       test did not and failed. The instrument disagreed with itself. */
    const on = [...document.querySelectorAll('.cup-banner-note')]
      .map(n => n.textContent.replace(/\s+/g, ' ').trim());
    window.__bnCupScheduleStale = false; renderCupBanner();
    const off = [...document.querySelectorAll('.cup-banner-note')].length;
    return { staleCount: on.length, saysMega: on.some(x => /may no longer be legal/i.test(x)),
             freshCount: off };
  });
  t('an expired mega week warns that boards may still be showing megas',
    stale.staleCount === 2 && stale.saysMega, stale.staleCount + ' notes');
  t('CONTROL: no such warning while the schedule is current', stale.freshCount === 1,
    stale.freshCount + ' note');

  t('zero JS errors through the whole pass', errs.length === 0, errs.join(' | ') || 'clean');

  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  await b.close(); server.close();
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('megatest CRASHED:', e); process.exit(1); });
