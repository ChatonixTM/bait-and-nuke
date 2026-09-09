// BASELINE BEFORE THE CHANGE, so "I did not disturb Great and Ultra" can be a
// measurement rather than a hope.
//
// Marth ruled that megas should appear in Master League as a separate unrated
// group. Great and Ultra already handle megas honestly: those leagues have CP
// caps, and cappedProduct scales a mega down like every other candidate, so a
// mega competes there on the same footing as anything else. Nothing about the
// Master change may reach them.
//
// This writes a fingerprint of a fixed set of boards. Run it before the change
// and after. Great and Ultra must be IDENTICAL in both cup states; Master may
// differ only by gaining megas.
//
// It is NOT a guard and asserts nothing. It prints a fingerprint and writes it
// to a file. The comparison is a person running it twice, or a guard built on
// top of it.
//
// Run: node tests/masterbaseline.js [outfile]
require(require('path').join(__dirname, 'harness.js'));
const fs = require('fs');

/* a fixed, named sample rather than a random one, so two fingerprints are
   comparable at all. Chosen to span the roles the board reasons about: a bulky
   waterer, a steel wall, a dragon, a fighter, a ghost, and the Master staple
   Marth actually plays. */
const SAMPLE = ['azumarill', 'skarmory', 'dragonite', 'machamp', 'gengar',
                'mewtwo', 'giratina_altered', 'swampert', 'tinkaton', 'lanturn'];
const LEAGUES = ['Great League', 'Ultra League', 'Master League'];

/* THE HARNESS STARTS WITH NO CUP, so a single pass sees zero megas in every
   league, which makes it blind to the one situation that matters most: a live
   Mega Edition week, where all three leagues allow megas and Master shows them
   apart rather than ranked.
   A baseline that cannot see the mega path cannot prove the mega path was left
   alone. So the sweep runs twice and the second pass turns a mega week on.

   The cup below is SYNTHETIC on purpose. It exercises the PROPERTY the code
   reads, megasAllowed plus the leagues the cup governs, rather than pinning
   this file to whichever real cup happens to be live on the day it runs. The
   real rows are already held by their own bench. */
const MEGA_WEEK = [{ name: 'Mega Edition week (synthetic, for this fingerprint)',
                     megasAllowed: true, noTypeCup: true,
                     /* ⚠ THIS LISTED ONLY GREAT AND ULTRA, so the "mega week"
                        pass never had megasAllowed and Master switched on at
                        the same time - the one scenario this whole tool exists
                        to watch. Obito found it: the Great/Ultra claim it makes
                        was still true, but the tool could not have caught a
                        Master-path regression bleeding into the capped leagues.
                        The real cup rows carry all three leagues, and so does
                        this now. */
                     leagues: ['Great League', 'Ultra League', 'Master League'] }];

function sweep(cups) {
  global.CUPS = cups;
  global.selectedCupIndex = 0;
  const out = {};
  for (const lg of LEAGUES) {
    global.__LEAGUE = lg;
    out[lg] = {};
    for (const id of SAMPLE) {
      const mon = POKEMON.find(p => p.speciesId === id);
      if (!mon) { out[lg][id] = 'NOT IN ROSTER'; continue; }
      let board;
      try { board = findNightmares(mon, 9) || []; }
      catch (e) { out[lg][id] = 'THREW: ' + e.message; continue; }
      /* the fingerprint is WHO appeared and in which tier, not the scores,
         which move for honest reasons. */
      /* RANKED entries, then the UNRATED group separately. The tool used to
         record only the ranked list, which meant it could not have seen the
         unrated group appear, vanish or change order at all - the very thing
         it now exists to watch beside the leagues it must not disturb. */
      out[lg][id] = board.map(n => (n.tier === undefined ? '?' : n.tier) + ':' + n.c.speciesId);
      const u = board.unratedMegas || [];
      if (u.length) out[lg][id + ' (unrated)'] = u.map(n => 'u:' + n.c.speciesId);
    }
  }
  return out;
}

const passes = { 'no cup': sweep([]), 'mega week': sweep(MEGA_WEEK) };

const flat = (o, lg) => Object.values(o[lg]).filter(Array.isArray).flat();
const megaCount = (o, lg) => flat(o, lg).filter(x => /_mega|_primal/.test(x) && x.indexOf('u:') !== 0).length;
const unratedCount = (o, lg) => flat(o, lg).filter(x => x.indexOf('u:') === 0).length;
const entries = (o, lg) => flat(o, lg).length;

console.log('');
console.log('  BOARD FINGERPRINT - ' + SAMPLE.length + ' mons x ' + LEAGUES.length + ' leagues x 2 cup states');
console.log('');
for (const label of Object.keys(passes)) {
  const o = passes[label];
  console.log('  --- ' + label + ' ---');
  for (const lg of LEAGUES) {
    console.log('    ' + lg.padEnd(15) + String(entries(o, lg)).padStart(4) + ' entries, ' +
      String(megaCount(o, lg)).padStart(3) + ' ranked megas, ' +
      String(unratedCount(o, lg)).padStart(3) + ' shown unrated');
  }
}
console.log('');
console.log('  Great and Ultra must be IDENTICAL before and after the Master change,');
console.log('  in BOTH cup states. Master may differ only by gaining megas.');
const file = process.argv[2];
if (file) {
  fs.writeFileSync(file, JSON.stringify(passes, null, 1));
  console.log('');
  console.log('  written: ' + file);
}
console.log('');
