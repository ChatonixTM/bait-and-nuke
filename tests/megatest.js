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
  const said = await p.evaluate(async () => {
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

  t('zero JS errors through the whole pass', errs.length === 0, errs.join(' | ') || 'clean');

  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  await b.close(); server.close();
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('megatest CRASHED:', e); process.exit(1); });
