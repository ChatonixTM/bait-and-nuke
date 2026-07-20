// HARNESS — runs SHIPPED code from dist/index.html (standing rule #2). No re-implementation.
const fs = require('fs');
const { extract } = require(require('path').join(__dirname,'extract.js'));
global.document = { getElementById: (id) => id === 'leagueSelect' ? { value: global.__LEAGUE || 'Great League' } : null };
global.cupFilterActive = false; global.selectedCupIndex = 0; global.CUPS = [];
const code = extract(['PRESSURE_REF','NM_LOADOUTS','defMult','nmEps','nmDpe','nmTurns','nmPressure',
                      'findNightmares','cycleStats','moveRole','pickDefaultLoadout']);
(0, eval)(code.replace(/\bfunction (\w+)/g, 'globalThis.$1 = function $1'));
const gm = JSON.parse(fs.readFileSync(require('path').join(__dirname,'..','gamemaster.json'),'utf8'));
global.TYPE_CHART = gm.typeChart;
global.MOVES = {};
Object.entries(gm.moves).forEach(([id, m]) => { MOVES[id] = {moveId:id, ...m}; });
global.POKEMON = gm.pokemon;
// v61: mirror the browser's loadGameData — PvPoke meta scores per CP cap.
global.META_SCORES = gm.metaScores || {};
module.exports = { gm };
