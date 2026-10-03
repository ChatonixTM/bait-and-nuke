/* emojitest — OUR OWN MARKS, NOT STOCK EMOJI
   ═════════════════════════════════════════════
   Founder, Oct 2 2026: "2. Like we should use our own logo/emojis". U2 draws B&N's own marks (the sheet at the top
   of index.html, placed by mark() in app.js) and retires the stock emoji slice by slice (Itachi's brief, U2 §5).

   TWO WITNESSES, because each is blind where the other sees:
   1 · THE CENSUS reads the shipped source. app.js and index.html's inline script are PARSED (acorn), so only string
       and template literals count and comments never do; index.html's markup counts with its comments stripped;
       styles.css counts with its comments stripped. It sees branches that never render on a test run (an analysis
       that failed, an impossible CP, a stale mega week).
   2 · THE SWEEP reads the live page in every witnessed state (tests/bn-states.js, shared with targettest) plus the
       three moments that throw glyphs (the logo's rain, the NUKE code, the help panel's glints): every text node,
       hidden ones included; every attribute, <head> meta included; ::before/::after content; document.title. It sees
       what the census cannot: data and markup built at run time. Every glyph it finds must be one the census
       knows, or the census is blind somewhere and says so.

   THE RATCHET. Until S5 the count is not zero. EXPECT holds the census count this slice leaves, exactly: a new emoji
   raises it (red), and a removed one lowers it (also red, until EXPECT is lowered to match — a number that changed
   without anyone writing it down is how a stale figure ships). S5 sets EXPECT to 0 and the sweep must then read 0.

   ALLOWED, by name — typography, not emoji (Itachi's brief §1): © ™ in the footer; ↗ on an outward link; ↩ on
   "back"; ♟ the chess-piece tier (with ♜♛, which are not pictographic and need no entry). Nothing else.

   WHAT THE RATCHET DOES NOT SEE, said plainly (Semiu, Oct 3): it counts glyph runs, not which glyphs — one stock emoji
   swapped for another leaves the count unchanged and stays green. The distinct set is not ratcheted.

   ⚠ CONTROLS FIRST. The census counts a planted literal and ignores a planted comment, in all three languages. The
   sweep plants ONE GLYPH PER CHANNEL IT CLAIMS — a visible text node, a display:none text node, a title attribute, a
   <meta content> in <head>, document.title, a ::before and an ::after — and must report each one by where it was
   planted, and exactly seven more than before. (Semiu, Oct 3: the first control planted three, and a sweep blinded to
   hidden text, to ::before and to <head> passed it 18/18 — those channels were claimed, not proved.)
   ⚠ AND THE MARKS THEMSELVES: every <use> on the page points at a symbol that exists; every symbol PAINTS — it is
   rasterised alone onto a 24x24 canvas and must ink at least 50 pixels that are at least half covered — measured Oct 3 on this Chromium: the faintest real mark inks 80, a 6x6 stray path 28, a hairline hook (stroke 0.2) 0; re-measure before trusting the floor on another rasteriser (Semiu, Oct 3: the first version measured
   getBBox, which is geometry, not paint — a 6x6 stray path, an unstroked rect, a path outside the viewBox and a
   hidden one all passed); and mark() throws on a name that does not exist.
   OWED AT S5 (Semiu): a glyph built at run time (String.fromCodePoint, an &#x entity) and shown only in a state no
   bench opens is invisible to both witnesses. When EXPECT reaches 0, add a source refusal: comment-stripped app.js and
   index.html hold no fromCodePoint, no fromCharCode(0xD8.., and no numeric entity that decodes to an emoji.
   NOT SEEN AT ALL, none in use in B&N today: ::marker, <template> content, an input's script-set value, shadow DOM,
   canvas text, iframe srcdoc, keycap and flag sequences (not Extended_Pictographic). */
const fs = require('fs');
const path = require('path');
const acorn = require('acorn');
const { chromium } = require('playwright');
const { STATES, witnessed } = require('./bn-states.js');

const EXPECT = 0;    // S5 (Oct 3): the tour, tier cards, vault, toasts, jackpot, dex, Sprocket's chip drawn (40 -> 0). Done.
/* KEPT BY HIS WORD. Marth, Oct 3, of the personality glyphs (Itachi's brief §6): "maybe emojis or skip it". So these
   five stay stock emoji where they are — the nightmare scream, the egg hint's detective, the idle wink's eyes, the
   jackpot's shrug, the dedication's handshake — and are counted EXACTLY (KEPT_EXPECT uses in the source), so one use more anywhere is red. */
const KEPT = new Set(['😱', '🕵‍♀', '👀', '😌', '🤝']);   // 😱 🕵️‍♀️ 👀 😌 🤝, compared with variation selectors removed
const KEPT_EXPECT = 8;
const ALLOW = new Set(['©', '™', '↗', '↩', '♟']);
const RE = /\p{Extended_Pictographic}️?(?:‍\p{Extended_Pictographic}️?)*/gu;
const ROOT = path.join(__dirname, '..');

/* ── the census ── */
const glyphs = (s) => [...String(s).matchAll(RE)].map((m) => m[0]).filter((g) => !ALLOW.has(g.replace(/️/g, '')));
function jsLiterals(src) {
  const out = [];
  const walk = (n) => {
    if (!n || typeof n.type !== 'string') return;
    if (n.type === 'Literal' && typeof n.value === 'string') out.push(n.value);
    if (n.type === 'TemplateElement') out.push(n.value.cooked || '');
    for (const k in n) { const v = n[k]; if (Array.isArray(v)) v.forEach(walk); else if (v && typeof v.type === 'string') walk(v); }
  };
  walk(acorn.parse(src, { ecmaVersion: 'latest', sourceType: 'script' }));
  return out.flatMap(glyphs);
}
function htmlGlyphs(html) {
  const out = [];
  const rest = html.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gi, (m, code) => { out.push(...jsLiterals(code)); return ''; });
  return out.concat(glyphs(rest.replace(/<!--[\s\S]*?-->/g, '')));
}
const cssGlyphs = (css) => glyphs(css.replace(/\/\*[\s\S]*?\*\//g, ''));
function census() {
  const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
  const by = { 'app.js': jsLiterals(read('app.js')), 'index.html': htmlGlyphs(read('index.html')), 'styles.css': cssGlyphs(read('styles.css')) };
  const all = Object.values(by).flat();
  const kept = all.filter((g) => KEPT.has(g.replace(/\uFE0F/g, '')));
  const rest = all.filter((g) => !KEPT.has(g.replace(/\uFE0F/g, '')));
  return { by, uses: rest.length, kept: kept.length, distinct: new Set(all.map((g) => g.replace(/\uFE0F/g, ''))) };
}

/* THE SOURCE REFUSAL (Semiu, owed at S5) — A REFUSAL SET OVER NAMED FORMS, AND NO MORE. A glyph built at run time
   is invisible to the census, so the shipped source may hold none of these named forms: a fromCodePoint call, a
   fromCharCode with a surrogate-range literal, a numeric entity that decodes to a pictograph — in app.js AND in
   index.html's own inline scripts, with comments blanked by the parser's own comment ranges (Semiu, Oct 3: a regex
   strip ate a string holding "//", and the inline scripts were never walked; both fixed).
   ⚠ WHAT IT IS NOT (Semiu's class ruling, Oct 3): an alias (const f = String.fromCodePoint), .call/.apply, computed
   arguments — these are one class, a fence on the SPELLING of source, and no list of spellings closes it. What bounds
   a run-time glyph is the sweep, in the witnessed states only; an unnamed form rendered only in an unwitnessed state
   stays invisible, and this bench says so rather than adding spellings. */
function builtGlyphs(js, html) {
  const out = [];
  const walk = (n) => {
    if (!n || typeof n.type !== 'string') return;
    if (n.type === 'CallExpression' && n.callee && n.callee.property) {
      const name = n.callee.property.name || n.callee.property.value;
      if (name === 'fromCodePoint') out.push('String.fromCodePoint(...)');
      if (name === 'fromCharCode' && n.arguments.some((a) => a.type === 'Literal' && typeof a.value === 'number' && a.value >= 0xD800 && a.value <= 0xDFFF)) out.push('fromCharCode(surrogate)');
    }
    for (const k in n) { const v = n[k]; if (Array.isArray(v)) v.forEach(walk); else if (v && typeof v.type === 'string') walk(v); }
  };
  const ent = (txt) => { for (const m of txt.matchAll(/&#(x[0-9a-f]+|\d+);/gi)) { const cp = m[1][0] === 'x' || m[1][0] === 'X' ? parseInt(m[1].slice(1), 16) : parseInt(m[1], 10); if (cp <= 0x10FFFF && /\p{Extended_Pictographic}/u.test(String.fromCodePoint(cp))) out.push(m[0]); } };
  /* one script: walk its calls, then scan its text for entities with every comment blanked in place (same length,
     so the parser's offsets stay true for the next comment) */
  const scan = (code) => {
    const comments = [];
    walk(acorn.parse(code, { ecmaVersion: 'latest', sourceType: 'script', onComment: (block, text, s, e) => comments.push([s, e]) }));
    let txt = code;
    for (const [s, e] of comments) txt = txt.slice(0, s) + ' '.repeat(e - s) + txt.slice(e);
    ent(txt);
  };
  scan(js);
  const markup = html.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gi, (m, code) => { scan(code); return ''; });
  ent(markup.replace(/<!--[\s\S]*?-->/g, ''));
  return out;
}

(async () => {
  let pass = 0, fail = 0;
  const t = (n, c, d) => { c ? pass++ : fail++; console.log((c ? '✅' : '❌ FAIL'), n + (c || !d ? '' : '\n     ' + d)); };

  // CENSUS CONTROLS — a literal counts, a comment does not, in each language
  t('CONTROL — the census counts a planted JS literal and ignores a planted JS comment',
    jsLiterals('// 🎣 a comment\n/* 💣 */ const a = "⭐", b = `x ${1} 🏆`;').join() === '⭐,🏆');
  t('CONTROL — the census counts planted markup and ignores an HTML comment and an inline-script comment',
    htmlGlyphs('<!-- 🎣 --><b title="⚠">💣</b><script>// 🎯\nconst c = "🎲";</script>').join() === '🎲,⚠,💣');
  t('CONTROL — the census counts planted CSS content and ignores a CSS comment; the allow-list holds',
    cssGlyphs('/* 💣 */ .a::after{content:"⭐"} .b::after{content:"© ™"}').join() === '⭐');

  t('CONTROL — the source refusal finds a fromCodePoint, a surrogate fromCharCode and a pictograph entity, and passes a plain entity (&#39;)',
    builtGlyphs('const a = String.fromCodePoint(0x1F984); const b = String.fromCharCode(0xD83E, 0xDD84); const c = "&#39;";', '<b>&#x1F3A3;</b><i>&#39;</i>').join() === 'String.fromCodePoint(...),fromCharCode(surrogate),&#x1F3A3;');
  t('CONTROL — the refusal reads index.html\'s own inline scripts, and an entity inside a string that holds "//" is still seen (Semiu K4, K7)',
    builtGlyphs('const s = "see // note &#x1F3A3;"; // a comment &#x1F4A3;', '<script>const z = String.fromCodePoint(1);</script>').join() === '&#x1F3A3;,String.fromCodePoint(...)');
  {
    const r = builtGlyphs(fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8'), fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8'));
    t('THE SOURCE builds no glyph from a number (no fromCodePoint, no surrogate fromCharCode, no pictograph entity)', r.length === 0, r.join(', '));
  }
  /* THE DATA (Semiu, Oct 3: a kept 😱 put into a Pokemon's name passed 21/21 — the sweep allows the kept five
     anywhere at run time and the census reads source only). The data the app fetches holds no pictograph at all,
     the kept five included. What a player types and stores is their own text, and stays out of the count. */
  {
    const gm = fs.readFileSync(path.join(ROOT, 'gamemaster.json'), 'utf8');
    const n = [...gm.matchAll(RE)].length;
    t(`THE DATA (gamemaster.json, the one data file the app fetches) holds ${n} pictographs, the kept five included — it must hold none`, n === 0);
  }
  const c = census();
  t(`HIS KEPT FIVE (😱 🕵️‍♀️ 👀 😌 🤝, "maybe emojis or skip it") are used exactly ${KEPT_EXPECT} times — no more, no fewer`, c.kept === KEPT_EXPECT, 'found ' + c.kept);
  t(`THE CENSUS reads ${c.uses} stock emoji in the shipped source (app.js ${c.by['app.js'].length} · index.html ${c.by['index.html'].length} · styles.css ${c.by['styles.css'].length}), and the ratchet expects exactly ${EXPECT}`,
    c.uses === EXPECT, c.uses < EXPECT ? `fewer than recorded — lower EXPECT to ${c.uses} in this file, in the commit that removed them` : `MORE than recorded — a stock emoji was added; the per-file counts above say which file grew`);

  // THE SWEEP
  const browser = await chromium.launch();
  const server = await require(path.join(__dirname, 'serve.js'))(ROOT, 8143);
  const open = async (st) => {
    const page = await (await browser.newContext({ viewport: { width: 428, height: 926 }, isMobile: true, hasTouch: true })).newPage();
    const errs = []; page.on('pageerror', (e) => errs.push(e.message));
    await page.goto('http://localhost:8143/index.html');
    await page.waitForFunction(() => typeof POKEMON !== 'undefined' && POKEMON.length > 1000, null, { timeout: 15000 });
    await page.waitForTimeout(600);
    if (st && st.go) { await page.evaluate(st.go); await page.waitForTimeout(600); }
    if (st && st.act) await st.act(page);
    return { page, errs };
  };
  const sweep = (page) => page.evaluate(([src, allowed]) => {
    const RE = new RegExp(src, 'gu');
    const ALLOW = new Set(allowed);
    const found = [];
    const add = (where, s) => { for (const m of String(s).matchAll(RE)) if (!ALLOW.has(m[0].replace(/️/g, ''))) found.push({ g: m[0], where }); };
    const name = (e) => e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (typeof e.className === 'string' && e.className ? '.' + e.className.trim().split(/\s+/)[0] : '');
    const w = document.createTreeWalker(document.documentElement, NodeFilter.SHOW_TEXT);
    for (let n; (n = w.nextNode());) { const p = n.parentElement; if (p && (p.tagName === 'SCRIPT' || p.tagName === 'STYLE' || p.tagName === 'TITLE')) continue; /* <title> is read once, as document.title */ add('text in ' + (p ? name(p) : '?'), n.nodeValue); }
    for (const e of document.querySelectorAll('*')) {
      for (const a of e.attributes) add(`${name(e)} [${a.name}]`, a.value);
      for (const pse of ['::before', '::after']) { const v = getComputedStyle(e, pse).content; if (v && v !== 'none' && v !== 'normal') add(name(e) + pse, v); }
    }
    add('document.title', document.title);
    return found;
  }, [RE.source, [...ALLOW, ...KEPT]]);

  // SWEEP CONTROL — one plant per channel the sweep claims, each found where it was planted, and exactly seven more
  {
    const { page } = await open(null);
    const before = (await sweep(page)).length;
    await page.evaluate(() => {
      const add = (tag, id, f, into) => { const e = document.createElement(tag); e.id = id; f(e); (into || document.body).appendChild(e); };
      add('span', 'plantText', (e) => { e.textContent = '🎣'; });
      add('span', 'plantHidden', (e) => { e.style.display = 'none'; e.textContent = '🎯'; });
      add('i', 'plantAttr', (e) => { e.title = '⚠'; });
      add('meta', 'plantMeta', (e) => { e.name = 'planted'; e.content = '🏆'; }, document.head);
      add('style', 'plantStyle', (e) => { e.textContent = '#plantBefore::before{content:"⭐"} #plantAfter::after{content:"💣"}'; }, document.head);
      add('b', 'plantBefore', () => {}); add('b', 'plantAfter', (e) => { e.style.display = 'none'; });
      document.title = document.title + ' 🎲';
    });
    const all = await sweep(page);
    const at = (g, w) => all.some((f) => f.g === g && f.where.includes(w));
    const seen = { 'visible text': at('🎣', 'span#plantText'), 'hidden text': at('🎯', 'span#plantHidden'), 'an attribute': at('⚠', 'i#plantAttr [title]'),
      '<head> meta': at('🏆', 'meta#plantMeta [content]'), 'document.title': at('🎲', 'document.title'), '::before': at('⭐', 'b#plantBefore::before'), '::after (on a hidden element)': at('💣', 'b#plantAfter::after') };
    const missed = Object.keys(seen).filter((k) => !seen[k]);
    t('CONTROL — the sweep finds one planted glyph in each of the seven channels it claims (visible text, hidden text, an attribute, <head> meta, document.title, ::before, ::after), and exactly seven more than before',
      missed.length === 0 && all.length === before + 7, `missed: ${missed.join(', ') || 'none'} · before ${before} after ${all.length}`);
    await page.context().close();
  }

  const TRANSIENT = [
    { label: 'the logo rain (bait and nuke)', witness: '.emoji-drop', act: async (p) => { await p.evaluate(() => document.querySelectorAll('#floatBrand .bw-emoji, .brand-wordmark .bw-emoji').forEach((e) => e.click())); await p.waitForTimeout(500); } },
    { label: 'the NUKE and BAIT codes', witness: '.shower-piece', act: async (p) => { await p.evaluate(() => document.activeElement && document.activeElement.blur()); await p.keyboard.type('NUKE'); await p.keyboard.type('BAIT'); await p.waitForTimeout(300); } },
    { label: 'the help panel glints', witness: '.egg-glint', go: () => document.getElementById('helpFab').click(), act: async (p) => { await p.waitForTimeout(1500); } },
  ];
  let swept = 0;
  for (const st of [...STATES, ...TRANSIENT]) {
    const { page, errs } = await open(st);
    const opened = await witnessed(page, st.witness, st.count);
    const found = await sweep(page);
    swept += found.length;
    const unknown = [...new Set(found.map((f) => f.g.replace(/️/g, '')))].filter((g) => !c.distinct.has(g));
    const ok = opened && errs.length === 0 && unknown.length === 0 && (EXPECT > 0 || found.length === 0);
    t(`${st.label}: OPENED (witness ${st.witness}), ${found.length} stock emoji on the page, every one known to the census${EXPECT ? '' : ', and none at all'}`,
      ok, (opened ? '' : 'NOT OPENED; ') + (errs[0] ? 'page error: ' + errs[0] + '; ' : '') + (unknown.length ? 'the census never saw: ' + unknown.join(' ') + ' at ' + found.filter((f) => unknown.includes(f.g.replace(/️/g, ''))).slice(0, 3).map((f) => f.where).join(', ') : found.slice(0, 6).map((f) => f.g + ' ' + f.where).join(' · ')));
    await page.context().close();
  }

  // THE MARKS — every <use> resolves, every symbol PAINTS (rasterised, ink counted), a wrong name throws
  {
    const { page } = await open(null);
    const r = await page.evaluate(async () => {
      const syms = [...document.querySelectorAll('.bn-marks symbol')];
      const ids = syms.map((s) => s.id);
      const dangling = [...document.querySelectorAll('use')].map((u) => (u.getAttribute('href') || u.getAttribute('xlink:href') || '').slice(1)).filter((id) => !ids.includes(id));
      /* each symbol alone, in the .bn-mark style, drawn as an image onto a 24x24 canvas: geometry that does not paint
         (unstroked, hidden, transparent, outside the viewBox) inks nothing and is caught */
      const ink = async (s) => {
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" style="color:#000" fill="none" stroke="#000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${s.outerHTML}<use href="#${s.id}"/></svg>`;
        const img = new Image(); img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
        await img.decode();
        const cv = document.createElement('canvas'); cv.width = 24; cv.height = 24;
        const cx = cv.getContext('2d'); cx.drawImage(img, 0, 0, 24, 24);
        const d = cx.getImageData(0, 0, 24, 24).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] >= 128) n++;   /* at least half covered: a hairline's anti-aliased fringe is not ink (Semiu) */
        return n;
      };
      const inked = {}; for (const s of syms) inked[s.id] = await ink(s);
      const faint = ids.filter((id) => inked[id] < 50);
      let threw = false; try { mark('no-such-mark'); } catch (e) { threw = true; }
      return { n: ids.length, dangling, faint, least: Math.min(...Object.values(inked)), threw };
    });
    t(`THE MARKS — ${r.n} drawn marks; every <use> points at one that exists; each one PAINTS at least 50 of its 576 pixels, each one at least half covered (the faintest inks ${r.least}); mark() refuses a name that is not drawn`,
      r.n >= 26 && r.dangling.length === 0 && r.faint.length === 0 && r.threw, JSON.stringify(r));
    await page.context().close();
  }

  console.log(`\n(the sweep found ${swept} stock emoji across ${STATES.length + TRANSIENT.length} states; S5 brings both counts to 0)`);
  console.log(pass + '/' + (pass + fail) + ' PASSED');
  server.close(); await browser.close(); process.exit(fail ? 1 : 0);
})();
