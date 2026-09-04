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
// * IT REFUSES TO WRITE when upstream offers a field neither mapper keeps and
//   nobody has written down why. That is the Aug 19 bug's exact shape, and a
//   version of this check that only WARNED was still failing open — it printed
//   a perfect warning and wrote the file anyway. Obito caught that by breaking
//   a mapper and watching --apply succeed. Override: --allow-unreasoned.
//
// Usage:
//   node tests/refresh_roster.js                 # dry run, prints the diff
//   node tests/refresh_roster.js --apply         # write it
//   node tests/refresh_roster.js --apply --allow-unreasoned   # write despite a
//                                                 # dropped field with no reason
//   npm test                                     # then run the suite
'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const APPLY = process.argv.includes('--apply');
const ALLOW_REMOVALS = process.argv.includes('--allow-removals');
/* deliberate override for the field-coverage refusal below — see the ⛔ block */
const ALLOW_UNREASONED = process.argv.includes('--allow-unreasoned');
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
  /* ⭐ THE MEGA EVOLUTION BONUS MOVE — added Sept 3 2026, and the reason this
     whole field exists in the first place. Marth, from the field:

       > "1 I don't think he account for mega evolutions & 2 when I type a mon,
       >  if eligible; there's no slot for a mega pokemons 4th move."

     He was right twice. His Mega Mewtwo Y shows FOUR moves in-game — Psycho Cut,
     Psystrike, Thunderbolt, and **Future Sight+** under a pink MEGA EVOLUTION
     BONUS tag — and this app knew about none of it.

     ⚠ THE PART THAT MATTERS, AND THE REASON IT MUST BE FIXED *HERE*: the 13
     `_PLUS` move DEFINITIONS were already in our gamemaster — the Aug 19 sync
     pulled them in and its own header even names them ("14 moves missing, all
     the _PLUS reworks"). What was missing was never the moves. It was the LINK
     saying which mega gets which one. Upstream holds that in `extraChargedMoves`
     and this whitelist silently dropped the field, so the ammunition sat in the
     building with nothing wired to fire it.

     ⚠⚠ AND IT CANNOT BE PATCHED BY HAND. Line ~204 does
     `gm.pokemon = src.pokemon.map(mapMon).concat(keptMon)` — it REPLACES the
     array wholesale rather than merging. A hand-added `extraChargedMoves` on
     mewtwo_mega_y would be silently destroyed by the very next --apply, and the
     bug would come back wearing a fixed-once badge. Izumi proved that by reading
     line 204 rather than trusting the shape.

     ⚠ NOT MEGA-ONLY, despite the name everyone will reach for. Cramorant and its
     two forms carry Gulp Missile in this same field. Anything keyed off
     /_mega/ here would work today and break on the first non-mega that uses it.

     Only stamped when non-empty, for the same reason as `released` below. */
  if (Array.isArray(p.extraChargedMoves) && p.extraChargedMoves.length) {
    out.extraChargedMoves = p.extraChargedMoves;
  }
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
  /* ⭐ THE AUTHORITATIVE MEGA-MOVE FLAG. Found by the field-coverage check
     below on its very first run — `isMegaMove`, carried by exactly 13 of 349.

     ⚠ TAKE THIS AND NEVER MATCH ON THE NAME. The obvious shortcut is
     /_PLUS$/.test(moveId), and today it gives the identical answer: all 13
     flagged moves end in _PLUS, and no _PLUS move is unflagged (checked both
     directions against upstream, Sept 3 2026). It is still the wrong instrument,
     and it is this house's most-repeated defect in one line — MATCHING A MENTION
     INSTEAD OF READING A PROPERTY. A future mega move named without the suffix,
     or a plain rework that happens to take one, and a name-matcher is silently
     wrong while looking right. The flag is the fact; the suffix is a coincidence
     that currently agrees with it. */
  if (m.isMegaMove) out.isMegaMove = true;
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

/* ══ FIELD COVERAGE — the guard that should have existed on Aug 19 ══════════
   ⚠ THIS IS THE WOUND THIS SCRIPT SHIPPED WITH, and it is worth stating in full
   because the shape repeats. On Aug 19 this script ran, reported "145 new
   pokemon, 14 new moves, nothing removed", and was believed. It was telling the
   truth and it was still useless, because the thing that was actually broken was
   a FIELD it does not copy — `extraChargedMoves`, the link from a mega to its
   bonus move. Every _PLUS move arrived. Not one was reachable. The report was
   green for two weeks over a feature that did not work, and Marth found it by
   playing the game rather than by reading a number.

   A diff that only compares WHICH ENTRIES EXIST is blind to WHAT IS IN THEM.
   Both sets matched perfectly while a whole feature was missing.

   So: compare what upstream OFFERS against what `mapMon`/`mapMove` actually
   KEEP — and derive the kept set by running the mappers, never by typing a list
   beside them, or the check drifts the first time somebody edits a mapper and
   forgets the twin. Known-deliberate drops are named with their reason and stay
   quiet; anything else is loud, with a count of how many entries carry it, so a
   new field cannot arrive unannounced again.

   ⚠ WHAT THIS STILL CANNOT SEE: a field we DO copy whose MEANING changes
   upstream, and a field that is present but empty on every entry today and
   filled in next month. It watches the shape, not the semantics. */
const KNOWN_DROPPED_MON = {
  tags: 'PvPoke bookkeeping (shadoweligible, legendary) — not used by any board',
  defaultIVs: 'per-league rank-1 IV spreads; this app computes its own',
  searchPriority: "PvPoke's search ordering, not ours",
  level25CP: 'raid-boss CP; this app is PvP-only and has no raid path at all',
  eliteMoves: 'refresh_meta.js owns these, as gm.moveFlags[id].e',
  legacyMoves: 'refresh_meta.js owns these, as gm.moveFlags[id].l',
  buddyDistance: 'overworld, not battle',
  thirdMoveCost: 'the stardust/candy price of unlocking a 2nd charged move',
  levelFloor: 'raid/hatch level floor; PvP-only app',
  family: 'evolution family id — no board or score reads it',
  aliasId: "PvPoke's internal redirect for a renamed form",
  originalFormId: 'form-change bookkeeping (which form this reverts to)',
  formChange: 'form-change bookkeeping (which forms this can become)',
  nicknames: 'UNEXAMINED — community shorthand ("Azu"), 103 mons. Would likely '
    + "improve Sprocket's mon lookup, since Marth types casually. Not his ask today.",
  nativeStatBuffs: 'UNEXAMINED — only 2 mons carry it, but it reads like a '
    + 'permanent stat modifier, which would touch damage math. Look before dismissing.',
};
const KNOWN_DROPPED_MOVE = {
  moveId: 'becomes the KEY of the moves object rather than a field on it',
  abbreviation: 'display shorthand this app does not use',
  buffs: 'reshaped by mapBuff into {chance, effects}',
  buffTarget: 'reshaped by mapBuff', buffApplyChance: 'reshaped by mapBuff',
  buffsSelf: 'reshaped by mapBuff', buffsOpponent: 'reshaped by mapBuff',
  archetype: 'carried through — listed only if the mapper stops keeping it',
  turns: 'derived, not dropped: app.js:187 computes Math.round(cooldown/500)',
  category: "PvPoke bookkeeping on 2 moves", tags: 'PvPoke bookkeeping on 2 moves',
  damageMethod: 'PvPoke bookkeeping on 2 moves',
  unlisted: 'UNEXAMINED — 20 moves flagged. If it means "not obtainable", a board '
    + 'could be recommending a move nobody can actually have. Worth one look.',
};
const keysOver = (list, fn) => {
  const s = new Set();
  for (const x of list) for (const k of Object.keys(fn ? fn(x) : x)) s.add(k);
  return s;
};
function coverage(label, list, mapper, known) {
  const offered = keysOver(list, null);
  const kept = keysOver(list, mapper);
  const dropped = [...offered].filter(k => !kept.has(k));
  const surprise = dropped.filter(k => !(k in known));
  console.log(`\n  FIELD COVERAGE (${label}): upstream offers ${offered.size}, we keep ${kept.size}`);

  /* ⚠ A KNOWN-DROPS LIST IS A SNOOZE BUTTON unless deferring stays visible.
     The whole point of this guard is that a field went missing quietly; if
     "I'll look at that later" also goes quiet, the guard has grown its own
     version of the bug it was built to catch. So a reason beginning UNEXAMINED
     keeps printing — dimmer than a surprise, louder than nothing — until
     somebody actually rules on it and writes a real reason. */
  const deferred = dropped.filter(k => /^UNEXAMINED\b/.test(known[k] || ''));
  if (deferred.length) {
    console.log(`    · ${deferred.length} dropped field(s) DEFERRED, not decided:`);
    for (const k of deferred) console.log(`       ${k} — ${known[k].replace(/^UNEXAMINED — /, '')}`);
  }
  if (!surprise.length) {
    console.log(`    ✓ every other dropped field is a known, reasoned drop `
      + `(${dropped.length - deferred.length})`);
    return 0;
  }
  console.log(`    ⚠ ${surprise.length} UPSTREAM FIELD(S) DROPPED WITH NO REASON ON RECORD:`);
  for (const k of surprise) {
    const carriers = list.filter(x => {
      const v = x[k];
      return Array.isArray(v) ? v.length : (v !== undefined && v !== null && v !== '');
    }).length;
    console.log(`       ${k}  — carried by ${carriers} of ${list.length}`);
  }
  console.log(`    Decide each one: copy it in ${label === 'pokemon' ? '`mapMon`' : '`mapMove`'},`);
  console.log(`    or name it in KNOWN_DROPPED with the reason. Do not leave it silent —`);
  console.log(`    that silence is exactly how the mega bonus move went missing.`);
  return surprise.length;
}
const surprises = coverage('pokemon', src.pokemon, mapMon, KNOWN_DROPPED_MON)
                + coverage('moves', src.moves, mapMove, KNOWN_DROPPED_MOVE);

if ((goneMon.length || goneMv.length) && !ALLOW_REMOVALS) {
  console.log(`\n  ⚠ REMOVALS DETECTED and not applied. A mon disappearing from PvPoke must`);
  console.log(`    never silently delete itself out of a squad somebody built. Re-run with`);
  console.log(`    --allow-removals if that is genuinely what you want.`);
}

/* ⚠⚠ THE GUARD MUST REFUSE, NOT MERELY REMARK — Obito's catch, Sept 3 2026,
   and he found it by doing the thing I did not: he broke `mapMon` so it silently
   dropped `types`, ran --apply, and watched it **print the warning loudly and
   write the file anyway, exit 0.**

   That is a guard that fails OPEN. It would have printed a perfect warning on
   Aug 19 and the mega bonus move would still have gone missing, because the run
   succeeded and nobody reads a green run's console. Detecting a defect and
   proceeding is not prevention; it is a louder version of the same silence.

   So: an unreasoned dropped field STOPS the write. The escape hatch mirrors
   `--allow-removals` exactly — deliberate, named, and impossible to hit by
   accident — because refusing forever would be the other failure, a guard that
   punishes the house for normal work until somebody rips it out. */
if (surprises > 0 && !ALLOW_UNREASONED) {
  console.log(`\n  ⛔ REFUSING${APPLY ? ' TO WRITE' : ''}: ${surprises} upstream field(s) are dropped with no`);
  console.log(`     reason on record (listed above). That is the exact shape of the bug this`);
  console.log(`     check exists to catch — the mega bonus move was one of these for two weeks.`);
  console.log(`     Copy the field in its mapper, or name it in KNOWN_DROPPED with a reason.`);
  console.log(`     If you have genuinely decided and want to proceed anyway: --allow-unreasoned\n`);
  process.exit(1);
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

/* ⚠⚠ AND STAMP THE CACHE-BUSTER, because Marth found what happens when nobody
   does. `_headers` caches gamemaster.json for a WEEK, and the app fetched the
   same URL every time — so after the mega work shipped he opened it on his
   phone and reported "Don't see the 3rd slot tho", with a status line reading
   1740 Pokémon against a shipped 1742. The data was right on the server and a
   week old in his hand.

   app.js now fetches `gamemaster.json?v=DATA_VERSION`, so a new roster is a new
   URL and the stale copy is never asked for again. THIS is what keeps the two
   in step: a version a person has to remember to bump is silently wrong the
   first busy day, which is the same shape as the bug it fixes. */
const APP = path.join(path.dirname(TARGET), 'app.js');
try {
  const before = fs.readFileSync(APP, 'utf8');
  const after = before.replace(/const DATA_VERSION = '[^']*';/,
    `const DATA_VERSION = '${gm.rosterSource.syncedAt}';`);
  if (after === before) {
    console.log(`  ⚠ COULD NOT STAMP DATA_VERSION in app.js — the constant was not found.`);
    console.log(`    Set it to ${gm.rosterSource.syncedAt} by hand, or browsers will keep`);
    console.log(`    serving the roster they already have for up to a week.`);
  } else {
    fs.writeFileSync(APP, after);
    console.log(`  stamped app.js DATA_VERSION = ${gm.rosterSource.syncedAt}  (cache-buster)`);
  }
} catch (e) {
  console.log(`  ⚠ COULD NOT READ app.js to stamp DATA_VERSION: ${e.message}`);
}

console.log(`  NOW RUN THE SUITE: npm test\n`);
