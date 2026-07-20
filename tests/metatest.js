// v61: meta relevance — boards must contain mons people ACTUALLY run (Rouge's catch).
require(require('path').join(__dirname,'harness.js'));
let pass=0, fail=0;
const t=(n,c,x)=>{c?pass++:fail++;console.log((c?'✅':'❌ FAIL'),n,x?'— '+x:'');};
const board=(id,lg,lim)=>{global.__LEAGUE=lg;return findNightmares(POKEMON.find(p=>p.speciesId===id),lim);};

// 1. Meta data present and sane
t('metaScores loaded for all three caps', ['1500','2500','10000'].every(k=>META_SCORES[k] && Object.keys(META_SCORES[k]).length>100),
  ['1500','2500','10000'].map(k=>k+':'+Object.keys(META_SCORES[k]||{}).length).join(' '));

// 2. Nothing PvPoke refuses to rank may be Tier 1
for(const [lg,key] of [['Great League','1500'],['Ultra League','2500'],['Master League','10000']]){
  const deep = board('greninja', lg, 150);
  const unranked = deep.filter(n=>n.tier===1 && META_SCORES[key][n.c.speciesId]===undefined);
  t(`${lg}: no UNRANKED mon is Tier 1`, unranked.length===0, unranked.map(n=>n.c.speciesName).join(',')||'none');
}

// 3. Virizion: unranked in GL, ranked in UL/ML -> must follow the data
t('Virizion absent from GL board (PvPoke does not rank it there)',
  !board('greninja','Great League',150).some(n=>n.c.speciesId==='virizion'),
  META_SCORES['1500']['virizion']===undefined?'confirmed unranked in GL':'IS ranked?!');
t('Virizion present in UL or ML (PvPoke ranks it there)',
  board('greninja','Ultra League',150).some(n=>n.c.speciesId==='virizion') ||
  board('greninja','Master League',150).some(n=>n.c.speciesId==='virizion'));

// 4. Display boards should be meta-relevant top to bottom
for(const [lg,key] of [['Great League','1500'],['Ultra League','2500']]){
  const b = board('azumarill', lg);
  const weak = b.filter(n=>{ const s=META_SCORES[key][n.c.speciesId]; return s===undefined || s<65; });
  t(`${lg}: every Azumarill board entry scores >=65`, weak.length===0,
    weak.map(n=>n.c.speciesName+'('+(META_SCORES[key][n.c.speciesId]??'unranked')+')').join(',')||'all meta-relevant');
}

// 5. Known-good engine answers survive real rankings
const azu = board('azumarill','Great League');
t('Azu GL: all three tiers', [1,2,3].every(x=>azu.some(n=>n.tier===x)));
t('Azu GL: Toxapex + Lanturn still grinders (v25/v38)',
  ['toxapex','lanturn'].every(id=>azu.some(n=>n.c.speciesId===id&&n.tier===2)),
  azu.filter(n=>n.tier===2).map(n=>n.c.speciesName).join(','));
t('Medicham GL: three tiers', [1,2,3].every(x=>board('medicham','Great League').some(n=>n.tier===x)));

// 6. Cap-crushed legendaries still excluded from GL (v60 behavior preserved)
const LEG=/zacian|zamazenta|mewtwo|dialga|giratina|kyogre|groudon|rayquaza/;
t('GL: no cap-crushed legendary Tier 1 (v60 preserved)',
  !board('greninja','Great League',150).some(n=>n.tier===1&&LEG.test(n.c.speciesId)));

console.log(); console.log(pass+'/'+(pass+fail)+' PASSED');
process.exit(fail?1:0);
