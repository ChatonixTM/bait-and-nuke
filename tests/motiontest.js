/* motiontest — THE FEEL: 190 ms, DECELERATING, AND NOTHING SITS ON A CONTROL
   ═════════════════════════════════════════════════════════════════════════════
   Founder, Oct 3 2026: "continue and push and finish current wave and then begin new wave". U3 brings B&N's motion
   inside the house FEEL — 190 ms, decelerating (U1's --beat / --ease) — and gives Sprocket a place that covers nothing.
   Itachi's brief: bait-and-nuke/U3_FEEL_2026-10-03/ITACHI_BRIEF_U3.md.

   FOUR WITNESSES, each a RATCHET like emojitest's: it holds today's measured count EXACTLY, so a new defect is red
   and a fixed one is red until the number is lowered in the commit that fixed it. U3's slices drive each to 0.
   1 · THE RULES. Every style rule in styles.css that declares a transition or an animation (read through the CSSOM,
       so @media blocks are walked and the cascade's own parse is used), minus CHARACTER (motion that is the app's
       personality, Itachi's group b, and the long-by-design group c — named below, by keyframe or selector). A rule
       offends if any duration is over 190 ms or its easing is not U1's --ease. Reduced-motion blocks are not read
       here; witness 3 owns them.
   2 · WHAT REACHES THE CONTROLS. The computed transition on the controls a thumb presses, in the witnessed states.
       (Itachi, Oct 3: U1's 190 ms token never reached .analyze-btn or .tab-item — a class rule outranked the bare
       button rule — so the buttons Marth liked moved at .12s ease. Witness 1 reads rules; only this reads the cascade.)
   3 · REDUCED MOTION. With the phone's "reduce motion" on, no element in a witnessed state runs a transition or an
       animation longer than 1 ms.
   4 · SPROCKET COVERS NOTHING. In every witnessed state where the dock is showing, its box meets no visible control's
       box (buttons, selects, inputs, links, role=button, and the profile rows, which are divs).
   ⚠ CONTROLS FIRST, one per witness: a planted .5s rule is counted (1); a planted .5s inline transition on a control
   is seen (2); the no-preference context reads motion where the reduce context must not (3); a planted button under
   the dock is found (4). And every state must prove it OPENED (its witness), or it is a red of its own.
   ⚠ SEMIU, Oct 3 (first ruling), and what changed:
   · (1) was BLIND to var() tokens: a shorthand holding var() reads '' through the CSSOM longhands, so
     "var(--beat) linear" and "var(--slow) var(--ease)" passed. Now every motion item that uses a var() must be
     exactly var(--beat) and var(--ease) — any other token, or a missing one, is red — and a literal item beside
     tokens is judged on its own numbers. Both of her plants are controls below.
   · A UI rule that BORROWS a character keyframe (e.g. animation:pulse) is not judged: the allow-list is by keyframe
     name. Said, not fixed.
   · (2) read a named list only; now it reads every visible clickable, so a new control class off the beat is seen.
     The visibility test honours an ancestor at opacity 0 everywhere (the closed coach panel's input is not visible).
   · (3) was BLIND to ::before/::after (six carried motion, none reached by a reduce block); now each element's two
     pseudo-elements are read, and her plant is a control. Hidden elements are read too — reduce must cover them.
   · (4) measures the dock's BOX, not the sprite: a control under its transparent corner counts. Strict, never blind.
   · NOT READ YET: the eight smooth-scroll sites (the brief's SMOOTH constant, U3 S4), and JS-timed waits (S3). */
const path = require('path');
const { chromium } = require('playwright');
const { STATES, witnessed } = require('./bn-states.js');

const EXPECT = { rules: 1, controls: 0, reduced: 13, dock: 5 };   // S2 (Oct 3): the 190 pass (rules 41 -> 1, the nightmare-tab drop held for his word; controls 24 -> 0; reduced 66 -> 13, the restored chevron counted) — S3-S5 drive the rest to 0
const BEAT = 190;
/* THE CHARACTER FINGERPRINT, measured Oct 3 after U3 S2 (deckNudge restored to 1.6s): every use of a personality
   keyframe as the browser serialises it. Retiming one is red; changing one on purpose means rewriting its line here. */
const CHARACTER_PRINT = ["0.32s ease 0s 1 normal none running tourNudge","0.3s ease 0s 1 normal none running jpPop","0.6s ease 0s 1 normal none running helpFlash","0.6s ease-in-out 0s infinite normal none running pulse","0.7s cubic-bezier(0.34, 1.56, 0.64, 1) 0s 1 normal none running ringFlex","0.7s ease 0s 1 normal none running bwSwivel","0.85s ease 0s 2 normal none running msPulse","0.85s ease-in-out 0s 4 normal none running qaNudge","0.9s ease-in-out 0s 2 normal none running tourPulse","1.15s ease-in-out 0s 2 normal none running goldSweep","1.15s linear 0s infinite normal none running rsSweep","1.1s ease-in-out 0s infinite normal none running swapPulse","1.4s ease-in-out 0s infinite normal none running goldSweep","1.6s ease-in-out 0s infinite normal none running deckNudge","1.8s cubic-bezier(0.22, 1, 0.36, 1) 0s 1 normal forwards running decelSwivel","1.8s ease-in-out 0s infinite normal none running emblemPulse","1.8s ease-in-out 0s infinite normal none running pulse","14s linear 0s infinite normal none running idleSpin","1s cubic-bezier(0.16, 1, 0.3, 1) 0s 1 normal none running pingRipple","2.1s ease-out 0s infinite normal none running rsPulse","2.4s ease-in-out 0s infinite normal none running sparkleTwinkle","2.4s ease-out 0s 1 normal forwards running eggGlint","2.6s ease-in-out 0s infinite normal none running dwellBreath","3.5s ease-in-out 0s infinite normal none running tsbShimmer","5s ease-in 1.2s infinite normal none running shootingStar","auto linear 0s 1 normal forwards running emojiFall","confettiFall","showerFall"];
const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';
/* CHARACTER — motion that is the app's personality or is long on purpose (Itachi's groups b and c). Named, so the
   list is read, not inferred. Keyframes: */
const CHARACTER_KEYFRAMES = ['msPulse', 'qaNudge', 'emblemPulse', 'idleSpin', 'decelSwivel', 'showerFall', 'ringFlex', 'pingRipple',
  'pulse', 'eggGlint', 'helpFlash', 'deckNudge', 'goldSweep', 'jpPop', 'bwSwivel', 'emojiFall', 'tsbShimmer', 'sparkleTwinkle',
  'shootingStar', 'dwellBreath', 'confettiFall', 'rsPulse', 'rsSweep', 'tourPulse', 'swapPulse', 'tourNudge'];
/* ...and selectors whose transition is character or a lesson: the radar emblem's fade and ring and the idle wink (U3
   S2, Oct 3 — named aside, not sped up), the pull-to-refresh cast, the tour's glide, Sprocket's rig */
const CHARACTER_SELECTORS = [/^\.theme-mark$/, /^\.outer-ring$/, /^\.idle-wink$/, /\.pull-refresh/, /\.tour-spotlight/, /\.tour-caption/, /(^|[\s,>])\.coach\b|\.coach-|#coach/, /\.easter-caption/];
const CONTROLS = '.analyze-btn, .save-btn, .clear-btn, .tab-item, .qa-analyze, .add-squad-btn, .tier-cta, .coach-chip, .profile-row';
const CLICKABLE = 'button, select, input:not([type=hidden]), a[href], [role=button], .profile-row';

(async () => {
  let pass = 0, fail = 0;
  const t = (n, c, d) => { c ? pass++ : fail++; console.log((c ? '✅' : '❌ FAIL'), n + (c || !d ? '' : '\n     ' + d)); };
  const ratchet = (key, n, what) => {
    const want = EXPECT[key];
    if (want < 0) { console.log(`   (unrecorded: ${what} measures ${n} — write EXPECT.${key} = ${n})`); fail++; return; }
    t(`${what}: ${n}, and the ratchet expects exactly ${want}`, n === want, n < want ? `fewer than recorded — lower EXPECT.${key} to ${n} in the commit that fixed them` : `MORE than recorded — a motion defect was added`);
  };
  const server = await require(path.join(__dirname, 'serve.js'))(path.join(__dirname, '..'), 8144);
  const browser = await chromium.launch();
  const open = async (st, opts = {}) => {
    const ctx = await browser.newContext({ viewport: { width: 428, height: 926 }, isMobile: true, hasTouch: true, reducedMotion: opts.reduce ? 'reduce' : 'no-preference' });
    const page = await ctx.newPage();
    const errs = []; page.on('pageerror', (e) => errs.push(e.message));
    await page.goto('http://localhost:8144/index.html');
    await page.waitForFunction(() => typeof POKEMON !== 'undefined' && POKEMON.length > 1000, null, { timeout: 15000 });
    await page.waitForTimeout(600);
    if (st && st.go) { await page.evaluate(st.go); await page.waitForTimeout(600); }
    return { page, errs };
  };

  /* ── 1 · THE RULES ── */
  const ruleCensus = (page) => page.evaluate(([beat, ease, kf, sels]) => {
    const KF = new Set(kf), SEL = sels.map((s) => new RegExp(s));
    const ms = (v) => v.split(',').map((x) => x.trim()).filter(Boolean).map((x) => x.endsWith('ms') ? parseFloat(x) : parseFloat(x) * 1000);
    const out = [];
    window.__bnCharPrints = [];
    const sheet = [...document.styleSheets].find((s) => (s.href || '').includes('styles.css'));
    const walk = (rules, inReduce) => {
      for (const r of rules) {
        if (r.cssRules && r.media) { walk(r.cssRules, inReduce || /prefers-reduced-motion/.test(r.media.mediaText)); continue; }
        if (!r.style || inReduce || !r.selectorText) continue;
        const st = r.style, text = st.cssText;
        const hasT = /transition/.test(text), hasA = /animation/.test(text) && !/animation:\s*none|animation-name:\s*none/.test(text);
        if (!hasT && !hasA) continue;
        /* THE CHARACTER FINGERPRINT (Obito, Oct 3: S2's rewrite sped the "swipe me" deckNudge from 1.6s to 190 ms,
           infinite — a 5-a-second jitter — and this witness was blind to it, because a character keyframe is skipped
           by name). Every use of a character keyframe is recorded as written, and must match CHARACTER_PRINT. */
        for (const m of text.matchAll(/animation(?:-name)?\s*:\s*([^;]+);/g)) for (const item of m[1].split(/,(?![^(]*\))/)) {
          const nm = (item.match(/[A-Za-z][\w-]*/g) || []).find((w) => KF.has(w));
          if (nm) (window.__bnCharPrints = window.__bnCharPrints || []).push(item.trim().replace(/\s+/g, ' '));
        }
        if (SEL.some((re) => re.test(r.selectorText))) continue;
        const names = (st.animationName || '').split(',').map((s) => s.trim()).filter((s) => s && s !== 'none');
        if (hasA && !hasT && names.length && names.every((n) => KF.has(n))) continue;
        /* a declaration that uses var(): every item must be exactly var(--beat) + var(--ease); a literal item beside
           tokens is judged on its own numbers (Semiu: the CSSOM longhands read '' when the shorthand holds a var) */
        const decls = [...text.matchAll(/(transition|animation)(-[a-z-]+)?\s*:\s*([^;]+);/g)];
        if (decls.some((d) => /var\(/.test(d[3]))) {
          const bad = [];
          for (const d of decls) for (const item of d[3].split(/,(?![^(]*\))/)) {
            if (d[1] === 'animation' && (item.match(/[A-Za-z][\w-]*/g) || []).some((w) => KF.has(w))) continue;   // a character keyframe: the fingerprint owns it
            const toks = [...item.matchAll(/var\((--[\w-]+)/g)].map((m) => m[1]);
            if (toks.length) {
              const wantBoth = !d[2];   // a shorthand item needs both; a longhand needs its own one
              if (toks.some((k) => k !== '--beat' && k !== '--ease') || (wantBoth && !(toks.includes('--beat') && toks.includes('--ease')))) bad.push(item.trim());
            } else {
              const durs = [...item.matchAll(/(\d*\.?\d+)(ms|s)\b/g)].map((m) => m[2] === 'ms' ? +m[1] : +m[1] * 1000);
              if (durs.some((x) => x > beat) || (durs.some((x) => x > 0) && !item.replace(/\s/g, '').includes(ease.replace(/\s/g, '').replace('0.22', '.22').replace('0.36', '.36')) && !item.replace(/\s/g, '').includes(ease.replace(/\s/g, '')))) bad.push(item.trim());
            }
          }
          if (bad.length) out.push(r.selectorText.slice(0, 70) + ' — off-house token or timing: ' + bad.join(' | ').slice(0, 120));
          continue;
        }
        const why = [];
        if (hasT) {
          const d = ms(st.transitionDuration || ''), e = (st.transitionTimingFunction || '').split(/,(?![^(]*\))/).map((x) => x.trim()).filter(Boolean);
          if (d.some((x) => x > beat)) why.push('transition ' + st.transitionDuration);
          if (d.some((x) => x > 0) && e.some((x) => x.replace(/\s/g, '') !== ease.replace(/\s/g, ''))) why.push('easing ' + st.transitionTimingFunction);
        }
        if (hasA && !names.every((n) => KF.has(n))) {
          const d = ms(st.animationDuration || ''), e = (st.animationTimingFunction || '').split(/,(?![^(]*\))/).map((x) => x.trim()).filter(Boolean);
          if (d.some((x) => x > beat)) why.push(`animation ${names.join('+')} ${st.animationDuration}`);
          else if (d.some((x) => x > 0) && e.some((x) => x.replace(/\s/g, '') !== ease.replace(/\s/g, ''))) why.push(`animation ${names.join('+')} easing ${st.animationTimingFunction}`);
        }
        if (why.length) out.push(r.selectorText.slice(0, 70) + ' — ' + why.join('; '));
      }
    };
    walk(sheet.cssRules, false);
    return out;
  }, [BEAT, EASE, CHARACTER_KEYFRAMES, CHARACTER_SELECTORS.map((r) => r.source)]);

  {
    const { page } = await open(null);
    const before = await ruleCensus(page);
    const prints = await page.evaluate(() => [...new Set(window.__bnCharPrints)].sort());
    if (!CHARACTER_PRINT) { console.log('   (unrecorded: the character fingerprint reads —\n     ' + JSON.stringify(prints) + ')'); fail++; }
    else {
      const added = prints.filter((p) => !CHARACTER_PRINT.includes(p)), lost = CHARACTER_PRINT.filter((p) => !prints.includes(p));
      t(`THE CHARACTER FINGERPRINT — ${prints.length} uses of the app's personality keyframes, each as written (a sped-up or slowed character is red)`,
        !added.length && !lost.length, `changed: ${added.join(' | ') || '-'} · was: ${lost.join(' | ') || '-'}`);
      await page.evaluate(() => { const s = [...document.styleSheets].find((x) => (x.href || '').includes('styles.css')); s.insertRule('.deck-chevron.planted{animation:deckNudge 190ms ease infinite}', s.cssRules.length); });
      await ruleCensus(page);
      const p2 = await page.evaluate(() => [...new Set(window.__bnCharPrints)].sort());
      t('CONTROL 1c — Obito\'s case: a character keyframe planted at 190 ms changes the fingerprint', p2.some((p) => !CHARACTER_PRINT.includes(p) && p.includes('deckNudge') && /^(190ms|0\.19s) /.test(p)), JSON.stringify(p2.filter((p) => !CHARACTER_PRINT.includes(p))));
      await page.evaluate(() => { const s = [...document.styleSheets].find((x) => (x.href || '').includes('styles.css')); s.deleteRule(s.cssRules.length - 1); });
    }
    await page.evaluate(() => { const s = [...document.styleSheets].find((x) => (x.href || '').includes('styles.css')); s.insertRule('#search{transition:opacity .5s ease}', s.cssRules.length); });
    const after = await ruleCensus(page);
    t('CONTROL 1 — a planted rule (#search, .5s ease) is counted, exactly one more', after.length === before.length + 1 && after.some((x) => x.startsWith('#search')), after.length + ' vs ' + before.length);
    await page.evaluate(() => { const s = [...document.styleSheets].find((x) => (x.href || '').includes('styles.css'));
      s.insertRule('#searchInput{transition:opacity var(--beat) linear}', s.cssRules.length);
      s.insertRule(':root{--slow:.5s}', s.cssRules.length);
      s.insertRule('.search-shell{transition:opacity var(--slow) var(--ease)}', s.cssRules.length); });
    const tok = await ruleCensus(page);
    t('CONTROL 1b — Semiu\'s plants: "var(--beat) linear" and "var(--slow) var(--ease)" are each counted', tok.length === after.length + 2 && tok.some((x) => x.startsWith('#searchInput')) && tok.some((x) => x.startsWith('.search-shell')), tok.length + ' vs ' + after.length);
    await page.context().close();
    ratchet('rules', before.length, 'THE RULES — style rules with motion over 190 ms or off the house easing (character and lessons named aside)');
    if (before.length) console.log('     ' + before.join('\n     '));
  }

  /* ── 2 · WHAT REACHES THE CONTROLS, and 4 · THE DOCK, in every witnessed state ── */
  const reach = (page) => page.evaluate(([sel, beat, ease]) => {
    const vis = (e) => { const s = getComputedStyle(e); const b = e.getBoundingClientRect(); if (s.display === 'none' || s.visibility === 'hidden' || !(b.width > 0 && b.height > 0)) return false; for (let a = e; a && a.nodeType === 1; a = a.parentElement) if (+getComputedStyle(a).opacity === 0) return false; return true; };
    const ms = (v) => v.split(',').map((x) => x.trim()).map((x) => x.endsWith('ms') ? parseFloat(x) : parseFloat(x) * 1000);
    const name = (e) => e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (typeof e.className === 'string' && e.className ? '.' + e.className.trim().split(/\s+/)[0] : '');
    const bad = new Set();
    for (const e of document.querySelectorAll(sel)) {
      if (!vis(e)) continue;
      const s = getComputedStyle(e), d = ms(s.transitionDuration), f = s.transitionTimingFunction.split(/,(?![^(]*\))/).map((x) => x.trim());
      if (d.some((x) => x > beat) || d.some((x, i) => x > 0 && (f[i] || f[0]).replace(/\s/g, '') !== ease.replace(/\s/g, ''))) bad.add(name(e) + ' ' + s.transitionDuration.split(',')[0] + ' ' + f[0]);
    }
    return [...bad];
  }, [CLICKABLE, BEAT, EASE]);
  const dock = (page, sel) => page.evaluate((q) => {
    /* visible means visible to his eye: an ancestor at opacity 0 hides it too (Sprocket's CLOSED panel fades itself out,
       and its input and send button read visible one element at a time — the first run counted them as covered) */
    const vis = (e) => { const s = getComputedStyle(e); const b = e.getBoundingClientRect(); if (s.display === 'none' || s.visibility === 'hidden' || !(b.width > 0 && b.height > 0)) return false; for (let a = e; a && a.nodeType === 1; a = a.parentElement) if (+getComputedStyle(a).opacity === 0) return false; return true; };
    const d = document.getElementById('coachDock');
    if (!d || !vis(d) || d.classList.contains('hidden')) return { showing: false, hits: [] };
    const r = d.getBoundingClientRect();
    const hits = [...document.querySelectorAll(q)].filter((e) => e !== d && !d.contains(e) && vis(e)).filter((e) => {
      const b = e.getBoundingClientRect(); return b.left < r.right && b.right > r.left && b.top < r.bottom && b.bottom > r.top;
    }).map((e) => e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (typeof e.className === 'string' && e.className ? '.' + e.className.trim().split(/\s+/)[0] : ''));
    return { showing: true, hits };
  }, sel);
  {
    const { page } = await open(STATES[0]);
    const base = await reach(page);
    await page.evaluate(() => { const b = document.querySelector('.analyze-btn'); if (b) b.style.transition = 'transform .5s ease'; });
    const planted = await reach(page);
    t('CONTROL 2 — a planted .5s transition on the Analyze button is seen', planted.some((x) => x.includes('analyze-btn') && x.includes('0.5s')), JSON.stringify(planted));
    const d0 = await dock(page, CLICKABLE);
    await page.evaluate(() => { const r = document.getElementById('coachDock').getBoundingClientRect(); const b = document.createElement('button'); b.id = 'plantedUnderDock'; b.textContent = 'x'; b.style.cssText = `position:fixed;left:${r.left + 4}px;top:${r.top + 4}px;width:44px;height:44px;z-index:1`; document.body.appendChild(b); });
    const d1 = await dock(page, CLICKABLE);
    t('CONTROL 4 — a planted button under the dock is found', d0.showing && d1.hits.includes('button#plantedUnderDock'), JSON.stringify(d1));
    await page.context().close();
    void base;
  }
  const slowControls = new Set(), dockStates = [];
  for (const st of STATES) {
    const { page, errs } = await open(st);
    const opened = await witnessed(page, st.witness, st.count);
    const r = await reach(page), d = await dock(page, CLICKABLE);
    r.forEach((x) => slowControls.add(x));
    if (d.showing && d.hits.length) dockStates.push(`${st.label}: ${d.hits.slice(0, 4).join(', ')}`);
    t(`${st.label}: OPENED (witness ${st.witness}), no page errors — ${r.length} control(s) off the beat; the dock ${d.showing ? (d.hits.length ? 'covers ' + d.hits.length : 'covers nothing') : 'is not showing'}`, opened && errs.length === 0, (opened ? '' : 'NOT OPENED; ') + (errs[0] || ''));
    await page.context().close();
  }
  ratchet('controls', slowControls.size, 'WHAT REACHES THE CONTROLS — distinct visible clickables whose computed transition is over 190 ms or off the house easing');
  if (slowControls.size) console.log('     ' + [...slowControls].join('\n     '));
  ratchet('dock', dockStates.length, 'SPROCKET — witnessed states where the dock\'s BOX covers a control');
  if (dockStates.length) console.log('     ' + dockStates.join('\n     '));

  /* ── 3 · REDUCED MOTION ── */
  const longest = (page) => page.evaluate(() => {
    const ms = (v) => Math.max(...v.split(',').map((x) => x.trim()).map((x) => x.endsWith('ms') ? parseFloat(x) : parseFloat(x) * 1000));
    const name = (e) => e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (typeof e.className === 'string' && e.className ? '.' + e.className.trim().split(/\s+/)[0] : '');
    const out = new Set();
    for (const e of document.querySelectorAll('body *')) for (const pse of [null, '::before', '::after']) {
      const s = getComputedStyle(e, pse);
      if (pse && (s.content === 'none' || s.content === 'normal')) continue;
      const tr = s.transitionProperty !== 'none' ? ms(s.transitionDuration) : 0, an = s.animationName !== 'none' ? ms(s.animationDuration) : 0;
      if (tr > 1 || an > 1) out.add(name(e) + (pse || '') + (an > 1 ? ' anim ' + s.animationName + ' ' + s.animationDuration : ' trans ' + s.transitionDuration.split(',')[0]));
    }
    return [...out];
  });
  {
    const a = await open(STATES[0]); const free = await longest(a.page); await a.page.context().close();
    t('CONTROL 3 — with no motion preference the page does run motion longer than 1 ms (so a zero below is a reading, not blindness)', free.length > 0, String(free.length));
    { const b = await open(STATES[0], { reduce: true });
      const r0 = await longest(b.page);
      await b.page.evaluate(() => { const st = document.createElement('style'); st.textContent = '@keyframes plantSpin{to{opacity:.5}} #search::after{content:"";animation:plantSpin 2s infinite}'; document.head.appendChild(st); });
      const r1 = await longest(b.page);
      t('CONTROL 3b — Semiu\'s plant: a 2 s keyframe on #search::after is seen under "reduce motion"', r1.some((x) => x.startsWith('input#search::after')) && r1.length === r0.length + 1, JSON.stringify(r1.filter((x) => x.includes('::after')).slice(0, 4)));
      await b.page.context().close(); }
    const reduced = new Set();
    for (const st of STATES) {
      const { page } = await open(st, { reduce: true });
      if (await witnessed(page, st.witness, st.count)) (await longest(page)).forEach((x) => reduced.add(x));
      await page.context().close();
    }
    ratchet('reduced', reduced.size, 'REDUCED MOTION — distinct elements still moving longer than 1 ms with "reduce motion" on');
    if (reduced.size) console.log('     ' + [...reduced].slice(0, 30).join('\n     ') + (reduced.size > 30 ? `\n     … and ${reduced.size - 30} more` : ''));
  }

  console.log('\n' + pass + '/' + (pass + fail) + ' PASSED');
  server.close(); await browser.close(); process.exit(fail ? 1 : 0);
})();
