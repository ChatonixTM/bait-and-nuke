// HARNESS — runs SHIPPED code from dist/index.html (standing rule #2). No re-implementation.
const fs = require('fs');
const { extract } = require(require('path').join(__dirname,'extract.js'));
global.document = { getElementById: (id) => id === 'leagueSelect' ? { value: global.__LEAGUE || 'Great League' } : null };
global.cupFilterActive = false; global.selectedCupIndex = 0; global.CUPS = [];
/* ═══════════════════════════════════════════════════════════════════════════
   NOTHING IS REMEMBERED HERE ANY MORE — board rule 135, executed.

   This carried a hand-typed list of app.js names. It is a manual mirror of a
   real call graph, and it caught me TWICE IN ONE HOUR with the identical
   failure: adding bonusMovesOf, then offTheBoards, to a shipped function made
   every board test die on a ReferenceError until each was remembered in.
   It had rotted the other way too — it carried moveRole, which NO bench calls
   and no reachable function references. A hand list goes stale in both
   directions and only one of them is loud.

   Now the bench itself says what it needs. Every app.js name the bench
   mentions is a root, and everything those roots reach is pulled in with
   them. Add a helper to a shipped function and nothing needs remembering.
   Call a new shipped function from a bench and nothing needs remembering.

   ⚠ IT STILL FAILS LOUD, AND THAT IS THE POINT. The board says in as many
   words: do not 'fix' this by catching the error. Nothing is caught. A name
   the graph does not reach is simply absent and the eval throws a
   ReferenceError exactly as it always did — a crash, not a wrong number.

   ⚠ ONLY THREE BENCHES USE THIS FILE - flagtest, leaguetest and metatest.
   I said five, because I grepped for the word "harness" instead of for a
   require of it, and coachtest and sleepertest mention it in a comment about
   an older bug. A mention is not a use, which is the defect this house repeats
   most, committed here while writing the tool that removes a different one.

   ⚠ THE FLOOR IS A CONTROL, NOT A SOURCE. The old hand list is kept below and
   the derived set must CONTAIN it, or this refuses to run. Itachi asked for
   the two to be proven to agree before the hand list was deleted, rather than
   trading a check that fails loud for one whose first real test is a green
   that means nothing yet. moveRole is deliberately absent from the floor,
   with its measurement written down rather than its name quietly dropped.

   ⚠⚠ ITS WOUND, PROVEN BY SEMIU RATHER THAN GUESSED: a name reached through
   a computed member with a string key - globalThis['rareHelper']?.() - is
   INVISIBLE to this walk, and the optional call swallows the undefined, so the
   bench passes with exit 0 and no error. The whole design leans on "cannot see
   it" and "will crash" being the same thing, and they are the same thing only
   for the plain identifier call the original incident took. No such pattern is
   in app.js today - she grepped, zero hits - so this is dormant, not live. It
   is also the one way this is WORSE than what it replaced: a stale hand list
   was at least a diffable artifact. The real mitigation is a committed
   manifest diffed on every run, which does not exist yet.

   ⚠ AND IT PRINTS WHAT IT DERIVED, unless BN_HARNESS_QUIET is set. A
   free-identifier walk can over-include on a name collision — a local sharing
   a name with a top-level declaration. That failure is SILENT, not loud, so
   the manifest is the thing that makes it visible.
   ═══════════════════════════════════════════════════════════════════════════ */
/* ⚠ THE WHOLE FIXTURE IS BUILT BEFORE ANYTHING IS DERIVED, and that ordering
   is load-bearing rather than tidy. The fixture is identified by snapshotting
   globalThis, so a fixture assigned AFTER the snapshot is invisible to it —
   and these four used to be. app.js's own declarations of them were eval'd and
   then clobbered by the real ones a few lines later. That worked by luck: it
   held only because the assignment came after, and only because none of those
   four initializers reaches for a browser. One that did would have thrown on a
   line nobody would think to look at. */
const gm = JSON.parse(fs.readFileSync(require('path').join(__dirname,'..','gamemaster.json'),'utf8'));
global.TYPE_CHART = gm.typeChart;
global.MOVES = {};
Object.entries(gm.moves).forEach(([id, m]) => { MOVES[id] = {moveId:id, ...m}; });
global.POKEMON = gm.pokemon;
// v61: mirror the browser's loadGameData — PvPoke meta scores per CP cap.
global.META_SCORES = gm.metaScores || {};

const { closureFor, extractAssigned } = require(require('path').join(__dirname,'extract.js'));

/* the bench that required us — it is the one that knows what it calls */
const benchFile = (require.main && require.main.filename) || '';
if(!/tests[\\/][^\\/]+\.js$/.test(benchFile))
  throw new Error('harness.js: cannot tell which bench required it (' + (benchFile||'no main') + '). ' +
    'It derives what to load FROM the bench, so an unknown caller is refused rather than guessed at.');
const derived = closureFor(fs.readFileSync(benchFile, 'utf8'));

/* ⚠ WHAT THIS FILE SUPPLIES ITSELF IS NOT app.js's TO PROVIDE, and the first
   version of this derivation ignored that and broke two benches. It pulled in
   app.js's own `selectedCupIndex`, whose initializer reads window.__bnCupDefault,
   and there is no window in node. Those names are this harness's FIXTURE: a
   deliberate stand-in for a browser, hand-built and reviewed above.

   ⚠ The exclusion is READ, NOT REMEMBERED. A typed exclusion list would be the
   same trap this rule exists to remove, one level up. This harness declares its
   fixture by assigning `global.NAME`, so that is what is scanned for. Add a
   fixture tomorrow and nothing needs remembering. */
/* ⚠ THIS USED TO SCAN ITS OWN SOURCE FOR `global.NAME =` AND THAT WAS A
   PATTERN, NOT THE THING. Ino broke it four ways — globalThis.X, global["X"],
   a line-broken assignment, and every assignment after the first in a comma-
   chained statement — and one of those breaks was SILENT: rewriting the CUPS
   fixture let app.js's own real CUPS array be eval'd in its place, leaving
   leaguetest fully green while metatest failed three assertions that read
   like product regressions and were harness misconfiguration.
   So the fixture is no longer read from text. It is the set of names that
   ALREADY EXIST on globalThis at this point in the file — after everything
   above has been assigned, before anything from app.js is eval'd. No spelling
   can hide from that, because it is not looking at spellings. */
const FIXTURE = new Set(Object.keys(globalThis));
const skipped = derived.names.filter(n => FIXTURE.has(n));
derived.names = derived.names.filter(n => !FIXTURE.has(n));

/* THE CONTROL — the old hand-typed list, kept as a floor the derivation must
   cover. If a future change to the walk quietly stops reaching one of these,
   this refuses to run and says which. */
const FLOOR = ['PRESSURE_REF','NM_LOADOUTS','defMult','nmEps','nmDpe','nmTurns','nmPressure',
               'findNightmares','cycleStats','pickDefaultLoadout',
               'bonusMovesOf','offTheBoards','isMegaOrPrimal','cupContext'];
/* ⚠ benches that call none of app.js's top-level names are legitimate:
   flagtest.js reads app.js as TEXT and asserts on gamemaster.json, so it
   derives zero roots on purpose. The floor is only owed by a bench that
   actually reaches into the board code. */
/* ⚠ AND THE FLOOR IS OWED ONLY BY A BENCH THAT REACHES THE BOARD ENGINE. The
   first version demanded it of every bench and refused a probe that legitimately
   called only moveRole and weaknessesFor — the control was right to be loud and
   wrong about who owed it. A bench whose roots touch none of the floor is asking
   app.js for something else entirely, and owes none of this. */
/* ⚠ SCOPED TO ONE ENTRY POINT, AND MIS-SCOPED TWICE BEFORE THIS. The hand-
   typed list was a mirror of findNightmares' closure and nothing else, so
   that is exactly what the control asserts: reach findNightmares and you owe
   its whole closure. A bench asking app.js for anything else owes none of it.
   The two earlier versions refused benches that had done nothing wrong — one
   calling only moveRole and weaknessesFor, one calling only nmPressure and
   pickDefaultLoadout. A control narrowed twice is one narrowing away from
   firing on nobody, which is why this is written down where it is read. */
if(derived.names.includes('findNightmares')){
  const short = FLOOR.filter(n => !derived.names.includes(n));
  if(short.length) throw new Error('harness.js: the derived closure lost ' + short.length +
    ' name(s) the hand-typed list carried: ' + short.join(', ') +
    '. The walk is wrong, or app.js changed shape. Do not paper over this.');
}

/* ⚠ THIS WAS OFF BY DEFAULT AND BOTH AUDITORS CALLED THAT WRONG. The manifest
   is the ONLY witness to a silent over-inclusion — Ino built a bench whose
   function PARAMETER shared a name with an app.js top-level function, and the
   walk pulled that function and its whole closure into global scope with exit
   0 and no output at all. Semiu confirmed package.json never sets the
   variable, so in the one place the benches actually run, nobody had ever
   seen it. It prints now, and must be silenced on purpose. */
if(!process.env.BN_HARNESS_QUIET)
  console.log('  harness: ' + require('path').basename(benchFile) + ' -> ' + derived.roots.length +
    ' root(s) -> ' + derived.names.length + ' of ' + derived.declared + ' top-level names\n    ' +
    derived.names.slice().sort().join(', ') +
    (skipped.length ? '\n    supplied by this harness, not eval\'d from app.js: ' + skipped.sort().join(', ') : ''));

const code = extractAssigned(derived.names);
(0, eval)(code);

module.exports = { gm };
