// HARNESS — runs SHIPPED code from dist/index.html (standing rule #2). No re-implementation.
const fs = require('fs');
const { extract } = require(require('path').join(__dirname,'extract.js'));
global.document = { getElementById: (id) => id === 'leagueSelect' ? { value: global.__LEAGUE || 'Great League' } : null };
global.cupFilterActive = false; global.selectedCupIndex = 0; global.CUPS = [];
// `bonusMovesOf` and `offTheBoards` added Sept 3 2026: findNightmares now calls
// both, so leaving either off this list makes every board test die on a
// ReferenceError rather than measure anything.
//
// ⚠ THIS HAND-TYPED LIST IS ITSELF A TRAP, and it caught me twice in one hour
// with the identical failure. It is a manual mirror of app.js's real call graph,
// so it goes stale the moment a shipped function gains a helper — and it fails
// LOUD (a crash, not a wrong number), which is the only reason it is survivable.
// A version that derived the closure automatically would not need remembering.
const code = extract(['PRESSURE_REF','NM_LOADOUTS','defMult','nmEps','nmDpe','nmTurns','nmPressure',
                      'findNightmares','cycleStats','moveRole','pickDefaultLoadout',
                      'bonusMovesOf','offTheBoards','isMegaOrPrimal','cupContext']);
(0, eval)(code.replace(/\bfunction (\w+)/g, 'globalThis.$1 = function $1'));
const gm = JSON.parse(fs.readFileSync(require('path').join(__dirname,'..','gamemaster.json'),'utf8'));
global.TYPE_CHART = gm.typeChart;
global.MOVES = {};
Object.entries(gm.moves).forEach(([id, m]) => { MOVES[id] = {moveId:id, ...m}; });
global.POKEMON = gm.pokemon;
// v61: mirror the browser's loadGameData — PvPoke meta scores per CP cap.
global.META_SCORES = gm.metaScores || {};
module.exports = { gm };
