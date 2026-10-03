/* versionbump — A PUSH PLAYERS CAN SEE MUST MOVE THE VERSION
   ═══════════════════════════════════════════════════════════
   The update banner ("New version deployed — tap to update") fires only when index.html's app-version meta changes
   (app.js, the version check). Twice it did not: the September work shipped under v73 and no returning player was
   told (U0, Oct 2), and on Oct 3 U2 S1-S3 and the bubbles were pushed under v74 — caught by hand minutes later.
   A lesson recorded is not learned, so this refuses it: between two commits, if any file a player loads changed
   (index.html, app.js, styles.css, gamemaster.json) and the app-version meta did not, it fails and says so.
   CI runs it on every push with the commit the push started from; by hand:  node tests/versionbump.js <base> [head]
   ⚠ CONTROLS FIRST, on this repo's own history: U1 (ede4ebe → 854108d) bumped v73 → v74 and must PASS; the Oct 3
   push (aacc81c → dbf0dbc) changed app.js and did not bump, and must FAIL. Both are asserted before the real check
   runs, so a check that passes everything, or fails everything, is red. */
const { execFileSync } = require('child_process');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const SHIPPED = ['index.html', 'app.js', 'styles.css', 'gamemaster.json'];
const git = (...a) => execFileSync('git', a, { cwd: ROOT, encoding: 'utf8' });
const versionAt = (sha) => (git('show', sha + ':index.html').match(/<meta name="app-version" content="([^"]+)">/) || [])[1] || null;
function verdict(base, head) {
  const changed = git('diff', '--name-only', base, head, '--', ...SHIPPED).split('\n').filter(Boolean);
  const from = versionAt(base), to = versionAt(head);
  return { changed, from, to, ok: changed.length === 0 || (from !== to && !!to) };
}
const has = (sha) => { try { git('cat-file', '-e', sha + '^{commit}'); return true; } catch (e) { return false; } };
let pass = 0, fail = 0;
const t = (n, c, d) => { c ? pass++ : fail++; console.log((c ? '✅' : '❌ FAIL'), n + (c || !d ? '' : '\n     ' + d)); };

// controls on known history (skipped, and said so, in a shallow clone that lacks them)
if (has('ede4ebe') && has('854108d') && has('aacc81c') && has('dbf0dbc')) {
  const good = verdict('ede4ebe', '854108d'), bad = verdict('aacc81c', 'dbf0dbc');
  t(`CONTROL — U1 (ede4ebe → 854108d) changed ${good.changed.length} shipped file(s) and moved ${good.from} → ${good.to}: passes`, good.ok, JSON.stringify(good));
  t(`CONTROL — the Oct 3 push (aacc81c → dbf0dbc) changed ${bad.changed.join(', ')} under ${bad.to} unmoved: fails`, !bad.ok, JSON.stringify(bad));
} else console.log('  (controls skipped: this clone does not hold the four control commits — fetch-depth 0 brings them)');

const base = process.argv[2], head = process.argv[3] || 'HEAD';
if (!base || /^0+$/.test(base) || !has(base)) console.log(`  (no usable base commit "${base || ''}" — nothing to compare; a first push or a forced one)`);
else {
  const v = verdict(base, head);
  t(`THIS PUSH (${base.slice(0, 7)} → ${head === 'HEAD' ? 'HEAD' : head.slice(0, 7)}): ${v.changed.length ? v.changed.join(', ') + ' changed' : 'no shipped file changed'}; version ${v.from} → ${v.to}` + (v.ok ? '' : ' — players would never be told'),
    v.ok, `bump <meta name="app-version"> in index.html (e.g. v${(parseInt((v.to || 'v0').slice(1), 10) || 0) + 1}-<date>) so the update banner fires`);
}
console.log('\n' + pass + '/' + (pass + fail) + ' PASSED');
process.exit(fail ? 1 : 0);
