#!/usr/bin/env node
// Refreshes the POKEMON ROSTER and MOVES inside gamemaster.json from PvPoke.
//
// WHY THIS EXISTS. refresh_meta.js says so itself, in its own header:
//   "This re-downloads both and merges them in WITHOUT touching our own
//    Pokemon/moves/typeChart data."
// and line 57 ERRORS if the roster changed. So the meta scores, the move flags
// and the dated cups all stay current, while the roster is frozen and the
// freeze is actively enforced. Marth found it the way he finds everything:
//
//   "i forgot that the dated Cups auto update, but NOTHING as for when pokemon
//    and new moves are added to the game or pokemon, like cramorant was just
//    added. and mega greninja has a sillouette in pokemon go."
//
// He was right on both counts. Measured Aug 19 2026 against PvPoke master:
//   145 Pokemon missing (cramorant and greninja_mega among them), 14 moves
//   missing (all the _PLUS reworks), and NOTHING removed.
//
// ---- THE PART THAT IS NOT OBVIOUS -----------------------------------------
// 140 of those 145 are marked `released: false` by PvPoke, which is why the
// original snapshot skipped them. But PvPoke's `released` does NOT mean "not
// in the game" — Ditto and Shedinja are released:false too, and they have been
// catchable for years. It means roughly "not something PvPoke ranks for PvP".
// So filtering on it silently hides mons that DO exist, which is exactly the
// Cramorant complaint.
//
// This script therefore syncs EVERYTHING and CARRIES THE FLAG, rather than
// deciding for him. `released` lands on each entry so the UI can mark a
// silhouette as a silhouette instead of pretending it does not exist.
//
// ---- SAFETY ---------------------------------------------------------------
// * DRY RUN BY DEFAULT. It prints what would change and writes nothing.
//   Pass --apply to write. A script that rewrites a shipped app's data file on
//   the first run is not a tool, it is an accident.
// * It never touches metaScores / moveFlags / typeChart — refresh_meta.js owns
//   those. Two scripts, two jobs, no overlap.
// * Removals are reported LOUDLY and require --allow-removals, because a mon
//   vanishing from PvPoke should never quietly delete itself out of a squad
//   somebody built.
//
// Usage:
//   node tests/refresh_roster.js                 # dry run, prints the diff
//   node tests/refresh_roster.js --apply         # write it
//   npm test                                     # then run the suite
'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const APPLY = process.argv.includes('--apply');
const ALLOW_REMOVALS = process.argv.includes('--allow-removals');
const TARGET = process.argv.find(a => a.endsWith('.json')) ||
  path.join(__dirname, '..', 'gamemaster.json');
const SRC = 'https://raw.githubusercontent.com/pvpoke/pvpoke/master/src/data/gamemaster.json';

const get = url => JSON.parse(
  execSync(`curl -sSL "${url}"`, { maxBuffer: 64 * 1024 * 1024 }).toString());

console.log(`\n  REFRESH ROSTER${APPLY ? '' : '   (DRY RUN — nothing written)'}`);
console.log('  ' + '─'.repeat(70));

const gm = JSON.parse(fs.readFileSync(TARGET, 'utf8'));
console.log(`  local : ${gm.pokemon.length} pokemon · ${Object.keys(gm.moves).length} moves`);
const src = get(SRC);
console.log(`  pvpoke: ${src.pokemon.length} pokemon · ${src.moves.length} moves`);

/* ---- the shape this app actually uses -------------------------------------
   Deliberately a SUBSET of PvPoke's entry, matching what the existing file
   holds exactly — copying their whole object would triple the download the
   browser makes on every load, and this app's promise is "works offline". */
const mapMon = p => {
  const out = {
    dex: p.dex,
    speciesId: p.speciesId,
    speciesName: p.speciesName,
    types: p.types,
    baseStats: p.baseStats,
    fastMoves: p.fastMoves || [],
    chargedMoves: p.chargedMoves || [],
  };
  /* carried so a silhouette can be SHOWN as a silhouette. Only stamped when
     false, so the file does not grow by 1,600 redundant `released:true`. */
  if (p.released === false) out.released = false;
  return out;
};

/* moves are an OBJECT keyed by moveId here, an ARRAY there. Fast moves carry
   energyGain+cooldown; charged moves carry energy. Written to match the
   existing entries field-for-field — a shape change would ripple into every
   damage calculation in the app. */
const mapMove = m => {
  const out = { name: m.name, type: m.type, power: m.power };
  if (m.energy) out.energy = m.energy;
  if (m.energyGain) out.energyGain = m.energyGain;
  if (m.cooldown && !m.energy) out.cooldown = m.cooldown;
  if (m.archetype) out.archetype = m.archetype;
  const b = mapBuff(m);
  if (b) out.buff = b;
  return out;
};

/* ⚠ THE BUFF FIELD IS DERIVED, AND LEAVING IT OUT WOULD HAVE BEEN A DISASTER.
   The first version of this script simply did not carry `buff`. 86 of the 333
   moves have one — Acid Spray's -2 defence, Aeroblast's attack boost, Super
   Power's self-debuff — and this app's whole Debuff / Boost Nuke / Boost Spam
   archetype system and its damage math read it. Running that version would
   have silently gutted stat changes across a quarter of the move pool, in a
   SHIPPED app, with every test still passing because no test compares a move
   to its previous self.

   ⚠ CORRECTED Aug 19 2026: this comment said "184 of the 333" and "more than
   half the move pool". BOTH WERE WRONG — the number was never counted. The file
   carried 86, confirmed two independent ways: counting the `buff` field, and
   summing the Debuff / Boost Nuke / Boost Spam / Boost / Debuff Nuke / Debuff
   Spam / Self-Debuff* archetype families, which come to exactly 86 as well.
   That agreement is the check — one count could be a bug, two counts from
   unrelated fields agreeing is the answer.

   ⚠ AND THE FIGURE IS PINNED, because this script is what moves it. "86 of
   333" is gamemaster.json at commit d4c137a^ — BEFORE this sync ran. After it:
   97 of 347. The first draft of this very correction was written in the present
   tense while the sync had already changed the file, so a reader checking it
   against the live data would have found 97 and concluded the correction was
   the error. A number about a file that a script rewrites MUST carry the commit
   it was taken at.
     node -e "const g=require('./gamemaster.json');const m=Object.values(g.moves);
              console.log(m.filter(x=>x.buff).length,'of',m.length)"
   The defect this comment describes was real and worth catching. The size of
   it was invented, and then quoted onward into the cold audit, the handoff and
   the space map, where it became the headline justification for a session.
   A number nobody measured is a number somebody made up.
   It was caught by the review gate Marth ordered an hour earlier — "every 3
   tasks you complete, review them and make fixes and THEN progress" — on the
   first review it ever forced. That is the entire argument for the gate.

   The shape, read off the data rather than guessed:
     PvPoke : buffs: [atkStages, defStages] · buffTarget: self|opponent
              buffApplyChance: "1" | ".3" | ".125"   (a STRING)
     ours   : { chance: Number, effects: [{ who: 'self'|'opp', stat, stages }] }
   atk is emitted before def (Super Power's [-1,-1] proves the order), and a
   zero stage is omitted rather than written as a no-op effect. */
function mapBuff(m) {
  if (!Array.isArray(m.buffs) || !m.buffs.length) return null;
  const push = (out, who, pair) => {
    if (!Array.isArray(pair)) return;
    const [atk, def] = pair;
    if (atk) out.push({ who, stat: 'atk', stages: atk });
    if (def) out.push({ who, stat: 'def', stages: def });
  };
  const effects = [];
  /* ⚠ ONE MOVE IN THE WHOLE GAME HITS BOTH SIDES, and dropping half of it was
     the second thing this review caught. OBSTRUCT raises your own defence AND
     lowers theirs: buffTarget:"both", with the two halves in buffsSelf and
     buffsOpponent rather than in `buffs`. A single-target mapper silently kept
     the self-buff and threw away the debuff — a real change to how the move
     scores, on the one move where it would be hardest to notice.
     `buffs` alone is not enough information; read the split fields first. */
  if (m.buffTarget === 'both') {
    push(effects, 'self', m.buffsSelf);
    push(effects, 'opp', m.buffsOpponent);
  } else {
    push(effects, m.buffTarget === 'opponent' ? 'opp' : 'self', m.buffs);
  }
  if (!effects.length) return null;
  return { chance: Number(m.buffApplyChance), effects };
}

const haveMon = new Set(gm.pokemon.map(p => p.speciesId));
const wantMon = new Set(src.pokemon.map(p => p.speciesId));
const addedMon = src.pokemon.filter(p => !haveMon.has(p.speciesId));
const goneMon = gm.pokemon.filter(p => !wantMon.has(p.speciesId));

const haveMv = new Set(Object.keys(gm.moves));
const wantMv = new Set(src.moves.map(m => m.moveId));
const addedMv = src.moves.filter(m => !haveMv.has(m.moveId));
const goneMv = [...haveMv].filter(id => !wantMv.has(id));

const show = (label, list, fmt) => {
  console.log(`\n  ${label}: ${list.length}`);
  if (list.length) console.log('    ' + list.map(fmt).join(', '));
};
show('NEW POKEMON', addedMon, p => p.speciesId + (p.released === false ? '*' : ''));
show('NEW MOVES', addedMv, m => m.moveId);
show('GONE FROM PVPOKE (pokemon)', goneMon, p => p.speciesId);
show('GONE FROM PVPOKE (moves)', goneMv, id => id);
console.log(`\n  * = PvPoke marks it released:false. NOTE their flag means "not ranked for PvP",`);
console.log(`    NOT "not in the game" — Ditto and Shedinja carry it too. Carried through as`);
console.log(`    \`released:false\` so the UI can show a silhouette rather than hide the mon.`);

if ((goneMon.length || goneMv.length) && !ALLOW_REMOVALS) {
  console.log(`\n  ⚠ REMOVALS DETECTED and not applied. A mon disappearing from PvPoke must`);
  console.log(`    never silently delete itself out of a squad somebody built. Re-run with`);
  console.log(`    --allow-removals if that is genuinely what you want.`);
}

if (!APPLY) {
  console.log(`\n  dry run only — re-run with --apply to write, then: npm test\n`);
  process.exit(0);
}

/* ---- write ---------------------------------------------------------------- */
const keptMon = ALLOW_REMOVALS ? [] : goneMon.map(p => p);      // preserved as-is
gm.pokemon = src.pokemon.map(mapMon).concat(keptMon)
  .sort((a, b) => (a.dex - b.dex) || a.speciesId.localeCompare(b.speciesId));

const moves = {};
for (const m of src.moves) moves[m.moveId] = mapMove(m);
if (!ALLOW_REMOVALS) for (const id of goneMv) moves[id] = gm.moves[id];   // keep
gm.moves = moves;

/* ⚠ NOT TOUCHED, ON PURPOSE: metaScores, metaSource, moveFlags, moveFlagsSource,
   typeChart. refresh_meta.js owns those. Two scripts, two jobs — the moment
   they overlap, one of them starts quietly undoing the other. */
gm.rosterSource = { url: SRC, syncedAt: new Date().toISOString().slice(0, 10) };

fs.writeFileSync(TARGET, JSON.stringify(gm));
console.log(`\n  ✓ written: ${gm.pokemon.length} pokemon · ${Object.keys(gm.moves).length} moves`);
console.log(`  stamped rosterSource.syncedAt = ${gm.rosterSource.syncedAt}`);
console.log(`  NOW RUN THE SUITE: npm test\n`);
