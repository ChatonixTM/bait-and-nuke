// MASTERTEST — megas in Master League are shown apart, and never rated.
//
// Marth, Sept 9 2026: "show megas in master as a seperate group." He was given
// three options after three measured attempts to score a mega in Master had each
// failed in a different direction: a stat-product proxy flooded 75-78% of boards,
// interpolation inverted the order and suppressed the strongest, a flat
// suppression made them invisible. PvPoke ranks 0 of 61 megas in Master against
// 405 ranked entries — the list was never asked the question, and an empty
// answer is not a negative answer.
//
// WHAT THIS HOLDS:
//   1 the group FILLS in Master during a week that allows megas, and is EMPTY
//     otherwise — a section that never appears proves nothing.
//   2 not one of them reaches the ranked list. That is the whole ruling.
//   3 none of them carries a `tier`. THE TRAP ITACHI NAMED: findSleepers weights
//     every entry by (4 - tier), so a placeholder tier would put the invented
//     number back one layer downstream, silently, where nobody would look.
//   4 Great and Ultra are untouched — there a mega is scaled to the cap like
//     everything else and is ranked normally, which was already honest.
//   5 the ORDER is the matchup, and a control proves it is not the stat product
//     wearing a different name, which is how two of the failed attempts began.
//   6 the rendered block carries no tier word, no tier class and no rank number.
//
// ITS WOUND, NAMED: it proves the group is separate, ordered and labelled. It
// cannot prove a reader understands it. That is Marth's eyes on his phone.
//
// Run: node tests/mastertest.js
require(require('path').join(__dirname, 'harness.js'));
const fs = require('fs');

let pass = 0, fail = 0;
const t = (n, c, x) => { c ? pass++ : fail++; console.log((c ? '✅' : '❌ FAIL'), n, x ? '— ' + x : ''); };

/* SYNTHETIC on purpose — it exercises the property the code reads rather than
   pinning this bench to whichever real cup is live on the day it runs. The real
   rows are held by megatest. */
const MEGA_WEEK = [{ name: 'Mega Edition week (synthetic)', megasAllowed: true, noTypeCup: true,
                     leagues: ['Great League', 'Ultra League', 'Master League'] }];
const SAMPLE = ['mewtwo', 'dragonite', 'giratina_altered'];

function board(lg, id, cups) {
  global.CUPS = cups;
  global.selectedCupIndex = 0;
  global.__LEAGUE = lg;
  const mon = POKEMON.find(p => p.speciesId === id);
  if (!mon) return null;
  const b = findNightmares(mon, 9) || [];
  return { ranked: b, unrated: b.unratedMegas || [] };
}

console.log('\n--- the group fills, and only where it should ---');
{
  const ml = SAMPLE.map(id => board('Master League', id, MEGA_WEEK));
  t('Master League fills the unrated group during a mega week',
    ml.every(b => b && b.unrated.length > 0),
    ml.map((b, i) => SAMPLE[i] + ':' + (b ? b.unrated.length : '?')).join(' '));
  /* CONTROL — a section that appears everywhere proves nothing about Master. */
  const noCup = SAMPLE.map(id => board('Master League', id, []));
  t('CONTROL: with no mega week running, Master has no unrated group at all',
    noCup.every(b => b && b.unrated.length === 0),
    noCup.map((b, i) => SAMPLE[i] + ':' + (b ? b.unrated.length : '?')).join(' '));
  /* ⚠⚠ THIS ASSERTED ONLY THAT THE GROUP IS EMPTY IN THE CAPPED LEAGUES, AND
     SEMIU PROVED THAT IS NOT THE SAME FACT. She patched a scratch copy to drop
     megas from Great and Ultra entirely - not ranked, not unrated, simply gone,
     for a reason with nothing to do with this ruling - and all twenty checks
     stayed green. "Absent from the unrated group" is true whether a mega was
     scored honestly or erased upstream, and the guard could not tell them
     apart. That is this house's own law - an empty answer is not a negative
     answer - broken inside a bench whose header quotes it.
     So the claim is made POSITIVELY: a mega must actually BE on the ranked
     board in a capped league, carrying a real tier. Erase them and this goes
     red, which is the whole point. */
  for (const lg of ['Great League', 'Ultra League']) {
    const capped = SAMPLE.map(id => board(lg, id, MEGA_WEEK));
    t('CONTROL: ' + lg + ' has no unrated group',
      capped.every(b => b && b.unrated.length === 0),
      capped.map((b, i) => SAMPLE[i] + ':' + (b ? b.unrated.length : '?')).join(' '));
    const rankedMegas = capped.flatMap((b, i) => (b ? b.ranked : [])
      .filter(n => /_mega|_primal/.test(n.c.speciesId))
      .map(n => SAMPLE[i] + '/' + n.c.speciesId + ':T' + n.tier));
    t('CONTROL: and a mega IS ranked in ' + lg + ', with a real tier — not merely absent',
      rankedMegas.length > 0 && capped.every(b => !b || b.ranked
        .filter(n => /_mega|_primal/.test(n.c.speciesId))
        .every(n => typeof n.tier === 'number')),
      rankedMegas.join(' ') || 'NO MEGA ON ANY CAPPED BOARD - they may have been erased rather than ranked');
  }
}

console.log('\n--- and not one of them is rated ---');
{
  const b = board('Master League', 'mewtwo', MEGA_WEEK);
  const leaked = b.ranked.filter(n => /_mega|_primal/.test(n.c.speciesId));
  t('no mega reaches the ranked list — the ruling, in one assertion',
    leaked.length === 0, leaked.map(n => n.c.speciesId).join(', '));
  /* THE TRAP: findSleepers weights by (4 - cand.tier). An unrated entry that
     carried a tier would be scored by a number nobody computed. */
  /* ⚠ `[].every(...)` IS TRUE, so both of these used to pass on an EMPTY
     group - never wrong, never witnesses either. Ino caught them passing
     vacuously in a run where the group had been forced empty. Each demands a
     non-empty group before it claims anything about its contents. */
  t('no unrated entry carries a tier — the sleeper scorer can never weight one',
    b.unrated.length > 0 && b.unrated.every(n => n.tier === undefined),
    b.unrated.length ? JSON.stringify(b.unrated.map(n => n.tier)) : 'THE GROUP IS EMPTY - this proved nothing');
  t('and none carries a threat or a viability either',
    b.unrated.length > 0 && b.unrated.every(n => n.threat === undefined && n.viability === undefined),
    b.unrated.length ? '' : 'THE GROUP IS EMPTY - this proved nothing');
  /* and the downstream consumer itself, driven rather than reasoned about.
     ⚠ IT IS A SECONDARY WITNESS, NOT A SECOND OPINION. Ino found it staying
     green in a run where a mega HAD reached the ranked list, because it samples
     the top slots and a low-scoring mega misses them. The assertion above it is
     the one doing the real work; this proves the consumer still runs. */
  global.CUPS = MEGA_WEEK; global.selectedCupIndex = 0; global.__LEAGUE = 'Master League';
  const mon = POKEMON.find(p => p.speciesId === 'mewtwo');
  let sleepers = null;
  try { sleepers = findSleepers(mon) || []; } catch (e) { sleepers = 'THREW: ' + e.message; }
  t('findSleepers still runs in Master during a mega week, and returns no mega',
    Array.isArray(sleepers) && !sleepers.some(s => /_mega|_primal/.test((s.c && s.c.speciesId) || s.speciesId || '')),
    Array.isArray(sleepers) ? sleepers.length + ' sleepers' : String(sleepers));
}

console.log('\n--- the order is the matchup, not a score ---');
{
  /* ⚠ THIS SAMPLED ONE MON. Semiu checked all three by hand and found they
     all differ, so it was not passing by luck - but the guard only knew about
     dragonite, and a control that happens to be right is not a control. */
  const b = board('Master League', 'dragonite', MEGA_WEEK);
  const byType = b.unrated.slice().sort((x, y) => y.typeRatio - x.typeRatio || y.pressure.idx - x.pressure.idx);
  /* and this one too - two empty arrays stringify identically */
  t('the group is ordered by type matchup, then shield pressure',
    b.unrated.length > 0 &&
    JSON.stringify(b.unrated.map(n => n.c.speciesId)) === JSON.stringify(byType.map(n => n.c.speciesId)),
    b.unrated.map(n => n.c.speciesId + ' ' + n.typeRatio.toFixed(2)).join(', '));
  /* CONTROL — if this order happened to equal the stat-product order, the claim
     "not a power ranking" would be empty words. It must differ. */
  const differs = SAMPLE.map(id => {
    const bb = board('Master League', id, MEGA_WEEK);
    const t1 = bb.unrated.map(n => n.c.speciesId);
    const t2 = bb.unrated.slice().sort((x, y) => y.statSum - x.statSum).map(n => n.c.speciesId);
    return { id, differs: JSON.stringify(t1) !== JSON.stringify(t2) };
  });
  t('CONTROL: on EVERY sampled mon the order is NOT the stat-product order — the invented number two failed attempts used',
    differs.every(d => d.differs),
    differs.map(d => d.id + ':' + (d.differs ? 'differs' : 'IDENTICAL')).join(' '));
  t('the strongest matchup is genuinely a type answer — Gardevoir Mega is fairy into a dragon',
    b.unrated.length > 0 && b.unrated[0].typeRatio >= 2,
    b.unrated.length ? b.unrated[0].c.speciesId + ' ' + b.unrated[0].typeRatio.toFixed(2) + '×' : 'empty');
}

console.log('\n--- the squad score reports them beside it, never inside it ---');
{
  /* ⭐⭐ THIS ONE WAS A SHIPPED BUG, NOT A GAP. scoreSquadReal did
     `findNightmares(...).filter(...)`, and `.filter` returns a NEW plain array
     that does not carry the unrated group across. So every Master mega
     threatening the squad was invisible to Shared Nightmares, the largest
     bucket in the score, and to the swept alert, and to the two Sprocket
     answers built on it. Itachi found it by reading. Semiu had named this exact
     shape as a FUTURE risk the day before; it was already live when she said it.
     The squad is seated the way the app seats one, through buildLoadoutEntry. */
  const seat = id => {
    const m = POKEMON.find(p => p.speciesId === id);
    if (!m) return null;
    const fl = m.fastMoves.map(i => MOVES[i]).filter(Boolean);
    const cl = m.chargedMoves.map(i => MOVES[i]).filter(Boolean);
    const d = pickDefaultLoadout(m, fl, cl);
    return buildLoadoutEntry(m, d.fast, d.bait, d.nuke, null);
  };
  const run = (lg) => {
    global.CUPS = MEGA_WEEK; global.selectedCupIndex = 0; global.__LEAGUE = lg;
    global.squad = ['mewtwo', 'dragonite', 'giratina_altered'].map(seat).filter(Boolean);
    try { return scoreSquadReal(); } catch (e) { return { threw: e.message }; }
  };
  const ml = run('Master League'), gl = run('Great League');
  const line = r => ((r && r.risks) || []).filter(x => /not counted in the score/.test(x));
  t('the squad score NAMES the unrated megas that threaten it',
    !ml.threw && line(ml).length === 1,
    ml.threw ? 'THREW: ' + ml.threw : line(ml).length + ' line(s)');
  t('and says plainly they are NOT counted in the score',
    !ml.threw && /not counted in the score/.test(line(ml)[0] || ''),
    (line(ml)[0] || '').replace(/<[^>]+>/g, '').slice(0, 90));
  /* CONTROL × 2 — a line that appears everywhere says nothing, and a score that
     moved would mean the megas had been folded in after all. */
  t('CONTROL: Great League gets no such line — there a mega is counted normally',
    !gl.threw && line(gl).length === 0,
    gl.threw ? 'THREW: ' + gl.threw : line(gl).length + ' line(s)');
  /* ⚠⚠ THIS COMPARED MASTER TO GREAT LEAGUE and called equality proof that
     nothing was folded into the score. Ino ran eight squads on correct code:
     FIVE score legitimately differently across leagues, because movesets and
     boards genuinely differ by cap. The trio this bench uses is one of the
     three that happen to coincide. Swap in another and the control fails on
     correct code. A control that happens to be right is not a control.
     Obito built the one it should have been - SAME league, cup toggled, so
     the only difference is whether megas are present at all. */
  const megaOn = run('Master League');
  global.CUPS = []; global.selectedCupIndex = 0;
  global.__LEAGUE = 'Master League';
  global.squad = ['mewtwo', 'dragonite', 'giratina_altered'].map(seat).filter(Boolean);
  let megaOff; try { megaOff = scoreSquadReal(); } catch (e) { megaOff = { threw: e.message }; }
  t('CONTROL: the score is IDENTICAL with the megas present and absent, same league — nothing was folded in',
    !megaOn.threw && !megaOff.threw && megaOn.synergy_score === megaOff.synergy_score,
    megaOn.threw || megaOff.threw ? 'threw' : megaOn.synergy_score + ' with, ' + megaOff.synergy_score + ' without');
  t('CONTROL: and the ONLY difference is the extra risk line',
    !megaOn.threw && !megaOff.threw &&
    (megaOn.risks || []).length === (megaOff.risks || []).length + 1,
    ((megaOn.risks||[]).length) + ' risks with, ' + ((megaOff.risks||[]).length) + ' without');
}

/* ⚠⚠ TWO SECTIONS WERE REMOVED FROM HERE ON Sept 10 2026, AND THAT IS NOT A
   REDUCTION IN COVERAGE - IT IS THE REMOVAL OF COVERAGE THAT WAS NEVER THERE.

   One tested the head-to-head verdict through `decide()`, a REIMPLEMENTATION
   of the branch logic, because voiceMatchup is nested and node cannot reach
   it. Semiu neutered the real branch with `if(false && ...)`, leaving every
   literal string intact, and all four assertions stayed green while the
   shipped app went back to printing "Even fight; play it clean". A bench that
   checks its own copy of the logic checks nothing.

   The other cut each coach function out of app.js by text and grepped the
   slice. Ino broke it three ways: the cut's `slice(i, -1)` returns nearly the
   whole FILE when its end marker is missing, which is already latent on the
   real source today; she made it read 21,575 chars instead of 2,274 and
   swallow another function's intact call, reporting 36/36 green over a real
   regression; and two checks were satisfied by a bare identifier over dead
   code.

   All of those claims are now DRIVEN in tests/megatest.js, in a browser,
   against the real functions through the door opened in app.js. Eight checks
   with two controls. They are not gone; they moved to where they can see. */
console.log('\n--- and the page does not call it a rank ---');
{
  const b = board('Master League', 'mewtwo', MEGA_WEEK);
  const html = nightmareBoardHTML(b.ranked, 'Mewtwo', '');
  /* ⚠⚠ THIS WAS A LAZY REGEX AND INO PROVED IT READ ALMOST NOTHING. It cut
     from the block marker to the FIRST inner double-close, so wrapping the
     blurb in one more div ended the cut before the cards. She did exactly that,
     and put a real Tier 3 badge inside every unrated card at the same time -
     the precise defect this bench exists to catch - and it reported 20 of 20
     GREEN. Every tier assertion had run against a fragment with no cards in it.
     Taken to the END of the board html now, not guessed at. The only thing
     after this block is the hint line, which this bench passes as empty. */
  const at = html.indexOf('<div class="nm-unrated">');
  const block = at < 0 ? '' : html.slice(at);
  /* ⚠ AND THE EXTRACTION IS ITSELF CHECKED, because the failure above was not
     a wrong answer, it was a right answer to a question asked of the wrong
     text. If the cut ever stops containing the cards, this says so and goes
     red BEFORE anything is concluded from it. */
  t('the extracted block actually contains the cards — the cut is not reading a fragment',
    block.indexOf('nm-unrated-card') !== -1 &&
    b.unrated.every(n => block.indexOf(n.c.speciesName) !== -1),
    'cards found: ' + (block.match(/nm-unrated-card/g) || []).length + ' of ' + b.unrated.length);
  t('the unrated block renders at all', block.length > 0);
  /* ⚠ THIS FIRST ASSERTED THAT THE BLOCK NEVER CONTAINS THE WORD "Tier", and it
     failed on copy I want to keep: the blurb says these are "not ranked against
     the tiers above", which is the sentence doing the most work on the page. The
     claim was never "never mention a tier". It is "never be labelled as one". So
     it holds the two things that would actually make it read as a tier: a Tier N
     badge, and the tier class that carries the severity colour. */
  t('it is never LABELLED a tier — no Tier 1/2/3 badge anywhere in the block',
    !/Tier\s*[123]/.test(block), (block.match(/Tier\s*[123]/g)||[]).join(", "));
  t('and it carries no nm-tier class', !/nm-tier/.test(block));
  /* and the ONE place it may name the tiers is the sentence disclaiming rank */
  t('the only mention of the tiers is the sentence saying it is not one of them',
    (block.match(/tier/gi)||[]).length === 1 && /not ranked against the tiers/i.test(block),
    (block.match(/tier/gi)||[]).join(", "));
  t('it carries no tier class — no t1, t2 or t3 severity colour', !/\bt[123]\b/.test(block));
  t('it says in plain words that no rating exists', /no rating exists/i.test(block));
  t('and that they are not ranked against the tiers above', /not ranked against the tiers/i.test(block));
  t('and that the order is not strength', /not ordered by strength/i.test(block));
  /* CONTROL — the tiers above must still say what they always said. */
  t('CONTROL: the tiered part of the same board still badges Tier 1', /Tier 1/.test(html));
}

console.log('\n' + (fail ? '❌ ' + fail + ' failed, ' + pass + ' passed'
                         : '✅ ' + pass + ' passed, 0 failed'));
process.exit(fail ? 1 : 0);
