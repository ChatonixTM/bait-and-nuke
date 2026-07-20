// v60: league cross-referencing — boards must reflect the league you're in.

require(require('path').join(__dirname,'harness.js'));
let pass=0, fail=0;
const t=(n,c,x)=>{c?pass++:fail++;console.log((c?'✅':'❌ FAIL'),n,x?'— '+x:'');};
const board = (id, lg, limit) => { global.__LEAGUE = lg; return findNightmares(POKEMON.find(p=>p.speciesId===id), limit); };
const names = b => b.map(n=>n.c.speciesName).join(',');

// 1. Boards actually differ per league
const gl = board('greninja','Great League'), ul = board('greninja','Ultra League'), ml = board('greninja','Master League');
t('Greninja GL board differs from Master', names(gl) !== names(ml));
t('Greninja UL board differs from Master', names(ul) !== names(ml));
t('all three leagues return full boards', [gl,ul,ml].every(b=>b.length>=6));

// 2. Cap-crushed legendaries must not be Tier 1 in capped leagues
const LEGEND = /zacian|zamazenta|mewtwo|dialga|palkia|giratina|kyogre|groudon|rayquaza|zygarde_complete|xerneas|yveltal|lugia|ho_oh|reshiram|zekrom|kyurem_(black|white)/;
// Great League only: at 1500 the biggest legendaries are crushed to cpm ~0.47-0.50
// and are genuinely unplayable. In ULTRA (2500) they are legitimately viable
// (Zacian cpm 0.639 / viability 0.61 sits alongside Swampert 0.72, Talonflame
// 0.73, and Giratina 1.00 — all real UL meta), so they SHOULD appear there.
{
  const deep = board('greninja', 'Great League', 200);
  const t1 = deep.filter(n=>n.tier===1 && LEGEND.test(n.c.speciesId));
  t('no cap-crushed legendary is Tier 1 in Great League', t1.length===0, t1.map(n=>n.c.speciesName).join(',')||'none');
  const ulDeep = board('greninja','Ultra League',200);
  t('Ultra League DOES rank viable legendaries (correct)', ulDeep.some(n=>LEGEND.test(n.c.speciesId)),
    ulDeep.filter(n=>LEGEND.test(n.c.speciesId)).slice(0,3).map(n=>n.c.speciesName).join(',')||'none');
  // Mewtwo is crushed even in UL (viability 0.46) — must not be Tier 1 there
  t('Mewtwo not Tier 1 in Ultra (viability 0.46)', !ulDeep.some(n=>n.c.speciesId==='mewtwo'&&n.tier===1));
}

// 3. Master League (no cap) must still rank legendaries as real threats
const mlDeep = board('greninja','Master League', 200);
t('Master League still ranks legendaries', mlDeep.some(n=>LEGEND.test(n.c.speciesId)),
  mlDeep.filter(n=>LEGEND.test(n.c.speciesId)).slice(0,3).map(n=>n.c.speciesName).join(',')||'none');

// 4. Known-good engine answers survive (display board is what users see)
const azuGL = board('azumarill','Great League');
t('Azu GL: all three tiers present', [1,2,3].every(x=>azuGL.some(n=>n.tier===x)));
t('Azu GL: Toxapex + Lanturn are grinders (v25/v38 known-good)',
  ['toxapex','lanturn'].every(id=>azuGL.some(n=>n.c.speciesId===id && n.tier===2)),
  azuGL.filter(n=>n.tier===2).map(n=>n.c.speciesName).join(','));
t('Azu GL: Skarmory not a fake grinder', !board('azumarill','Great League',200).some(n=>n.c.speciesId==='skarmory'&&n.tier===2));
t('Medicham GL: three tiers', [1,2,3].every(x=>board('medicham','Great League').some(n=>n.tier===x)));

// 5. Rouge's example: a GL board should be full of GL-legal threats
const azuDeep = board('azumarill','Great League',60);
const crushedT1 = azuDeep.filter(n=>n.tier===1 && LEGEND.test(n.c.speciesId));
t("Rouge's rule: GL board free of cap-crushed Tier 1s", crushedT1.length===0, crushedT1.map(n=>n.c.speciesName).join(',')||'clean');

console.log(); console.log(pass+'/'+(pass+fail)+' PASSED');
process.exit(fail?1:0);
