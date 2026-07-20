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
t('existing data untouched', gm.pokemon.length===1595 && Object.keys(gm.moves).length===333 && !!gm.typeChart && !!gm.metaScores);

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
