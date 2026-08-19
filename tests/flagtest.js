// v62: Elite TM / legacy move flagging.
// PLAIN ENGLISH: some moves can only be taught with a rare item (Elite TM),
// and some can't be taught at all anymore (legacy). Showing those without
// warning means someone spends candy on a build they can't make.
const fs = require('fs');
require(require('path').join(__dirname,'harness.js'));
const gm = JSON.parse(fs.readFileSync(require('path').join(__dirname,'..','gamemaster.json'),'utf8'));
const app = fs.readFileSync(require('path').join(__dirname,'..','app.js'),'utf8');
let pass=0, fail=0;
const t=(n,c,x)=>{c?pass++:fail++;console.log((c?'✅':'❌ FAIL'),n,x?'— '+x:'');};

// 1. Data present and additive (must not have damaged existing data)
t('moveFlags present', !!gm.moveFlags && Object.keys(gm.moveFlags).length > 300,
  Object.keys(gm.moveFlags||{}).length + ' mons flagged');
/* ⚠ THIS USED TO PIN THE EXACT COUNTS (1595 pokemon / 333 moves) AND IT FAILED
   THE FIRST TIME THE ROSTER LEGITIMATELY GREW — the Aug-19 sync brought the
   file to 1740 / 347, adding 145 mons and 14 moves and removing NOTHING. What
   this check is actually for is "adding moveFlags did not damage the rest of
   the file", so it asserts the two things that would prove damage: the roster
   NEVER SHRINKS below its recorded floor, and the derived tables are still
   there. A frozen equality over data designed to grow reports a green house as
   broken, and it trains you to edit the number instead of reading the diff. */
const FLOOR = { pokemon: 1595, moves: 333 };   // Aug 2026; only ever raise it
t('existing data untouched — nothing dropped, derived tables intact',
  gm.pokemon.length >= FLOOR.pokemon && Object.keys(gm.moves).length >= FLOOR.moves
  && !!gm.typeChart && !!gm.metaScores,
  `${gm.pokemon.length} pokemon (floor ${FLOOR.pokemon}) · ${Object.keys(gm.moves).length} moves (floor ${FLOOR.moves})`);

// 2. Known real-game facts (verified against actual Pokemon GO)
const isElite=(id,mv)=>!!(gm.moveFlags[id]&&(gm.moveFlags[id].e||[]).includes(mv));
[['swampert','HYDRO_CANNON'],['venusaur','FRENZY_PLANT'],['lapras','ICE_BEAM'],['charizard','BLAST_BURN']].forEach(([id,mv])=>{
  t(`${id} ${mv} flagged Elite TM`, isElite(id,mv));
});
t('Azumarill Ice Beam NOT flagged (normally available)', !isElite('azumarill','ICE_BEAM'));

// 3. Flags only reference moves the mon can actually learn
let orphan=0;
Object.entries(gm.moveFlags).forEach(([id,f])=>{
  const p=gm.pokemon.find(x=>x.speciesId===id); if(!p) return;
  const all=[...(p.fastMoves||[]),...(p.chargedMoves||[])];
  [...(f.e||[]),...(f.l||[])].forEach(mv=>{ if(!all.includes(mv)) orphan++; });
});
t('no flag references a move the mon cannot learn', orphan===0, orphan+' orphans');

// 4. UI actually renders the markers in all three dropdowns
t('fast dropdown shows flags', /fastOpts[\s\S]{0,200}moveFlag\(f\)/.test(app));
t('nuke dropdown shows flags', /nukeOpts[\s\S]{0,200}moveFlag\(c\)/.test(app));
t('bait dropdown shows flags', /baitOpts[\s\S]{0,300}moveFlag\(c\)/.test(app));
t('markers are 🎫 Elite TM and ⛔ legacy', app.includes('🎫 Elite TM') && app.includes('⛔ legacy'));

// 5. The old vague disclaimer must be gone
t('vague "doesn\'t yet flag which ones" text removed', !app.includes("doesn't yet flag which ones"));

console.log(); console.log(pass+'/'+(pass+fail)+' PASSED');
process.exit(fail?1:0);
