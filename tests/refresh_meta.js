#!/usr/bin/env node
// Refreshes PvPoke-derived data inside gamemaster.json.
//
// PLAIN ENGLISH: two things in our data file come from PvPoke and go stale —
//   1. metaScores  : how good each Pokemon is per league (the meta shifts)
//   2. moveFlags   : which moves need an Elite TM or are legacy
// This re-downloads both and merges them in WITHOUT touching our own
// Pokemon/moves/typeChart data.
//
// Usage:  node refresh_meta.js [path/to/gamemaster.json]
// Then:   run the test suite, especially metatest.js and flagtest.js
const fs = require('fs');
const { execSync } = require('child_process');

const TARGET = process.argv[2] || require('path').join(__dirname,'..','gamemaster.json');
const BASE = 'https://raw.githubusercontent.com/pvpoke/pvpoke/master/src/data';
const RANKINGS = { '1500': 'rankings-1500.json', '2500': 'rankings-2500.json', '10000': 'rankings-10000.json' };

const get = url => {
  const out = execSync(`curl -sSL "${url}"`, { maxBuffer: 64 * 1024 * 1024 });
  return JSON.parse(out.toString());
};

console.log('Reading', TARGET);
const gm = JSON.parse(fs.readFileSync(TARGET, 'utf8'));
const before = { pokemon: gm.pokemon.length, moves: Object.keys(gm.moves).length, typeChart: !!gm.typeChart };

// --- 1. meta scores ---
const metaScores = {};
for (const [cap, file] of Object.entries(RANKINGS)) {
  const list = get(`${BASE}/rankings/all/overall/${file}`);
  metaScores[cap] = {};
  list.forEach(e => { metaScores[cap][e.speciesId] = Math.round(e.score * 10) / 10; });
  console.log(`  cap ${cap}: ${list.length} ranked`);
}

// --- 2. elite / legacy move flags ---
const src = get(`${BASE}/gamemaster.json`);
const moveFlags = {};
src.pokemon.forEach(p => {
  const e = p.eliteMoves || [], l = p.legacyMoves || [];
  if (!e.length && !l.length) return;
  const o = {}; if (e.length) o.e = e; if (l.length) o.l = l;
  moveFlags[p.speciesId] = o;
});
console.log(`  move flags: ${Object.keys(moveFlags).length} mons`);

// --- 3. merge additively ---
const stamp = new Date().toISOString().slice(0, 10);
gm.metaScores = metaScores;
gm.metaSource = `PvPoke overall rankings, fetched ${stamp}`;
gm.moveFlags = moveFlags;
gm.moveFlagsSource = `PvPoke gamemaster eliteMoves/legacyMoves, fetched ${stamp}`;

// --- 4. refuse to write if our own data changed ---
const after = { pokemon: gm.pokemon.length, moves: Object.keys(gm.moves).length, typeChart: !!gm.typeChart };
if (before.pokemon !== after.pokemon || before.moves !== after.moves || before.typeChart !== after.typeChart) {
  console.error('ABORT: core data changed. Nothing written.');
  process.exit(1);
}

fs.writeFileSync(TARGET, JSON.stringify(gm));
console.log(`Wrote ${TARGET} (${(fs.statSync(TARGET).size / 1024).toFixed(0)}KB)`);
console.log('Now run: node metatest.js && node flagtest.js');
