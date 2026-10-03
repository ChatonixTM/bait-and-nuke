/* bn-states — the screens a bench must visit, each with the WITNESS that proves it opened.
   Shared by targettest (every control a thumb's width) and emojitest (our own marks), so both benches stand in the
   same rooms. Moved here unchanged from targettest on Oct 3 2026.
   ⚠ Semiu, Oct 2: "the state witness is the click, not the opened thing" — a state counts only when its witness is
   visible; a bench that measures a state whose witness is missing must say so as a red of its own.
   Each `go` runs INSIDE the page (Playwright serialises the function), so it may use the app's own globals and may
   not use anything defined in this file. */
const STATES = [
  { label: 'the page', witness: '#search', go: null },
  { label: 'the cup banner tucked', witness: '#cupExpandBtn', go: () => { cupCollapsed = true; renderCupBanner(); } },
  { label: 'the cup banner opened', witness: '#cupPicker', go: () => { cupCollapsed = true; renderCupBanner(); const b = document.getElementById('cupExpandBtn'); if (b) b.click(); } },
  { label: 'the profile sheet', witness: '#profileClose', go: () => document.getElementById('tabProfile').click() },
  { label: 'the saved-teams vault', witness: '#vipClose', go: () => document.getElementById('tabTeams').click() },
  { label: 'the help panel', witness: '#helpTourBtn', go: () => document.getElementById('helpFab').click() },
  { label: 'a Pokemon selected', witness: '#fastSelect', go: async () => {
      /* the first search plays the app's show before rendering (Semiu: ~260 ms of slack on a fixed wait) - poll instead */
      selectPokemon('azumarill');
      for (let k = 0; k < 60 && !document.getElementById('fastSelect'); k++) await new Promise((r) => setTimeout(r, 100));
    } },
  { label: 'a squad of three', witness: '.slot-remove', count: 3, go: async () => {
      /* seat three, each one PROVED seated before the next (the first version clicked too soon after load and seated two);
         inline, because a function handed to the page cannot see a helper defined out here */
      for (const id of ['azumarill', 'medicham', 'lanturn']) {
        /* the first search after a quiet spell plays the app's own show before the result renders (selectPokemon,
           app.js: dueForShow) — so wait for THIS mon's add button, never a fixed delay */
        selectPokemon(id);
        const name = POKEMON.find((p) => p.speciesId === id).speciesName;
        for (let k = 0; k < 60; k++) { const b = document.getElementById('addSquadBtn'); if (b && b.textContent.includes(name)) { b.click(); break; } await new Promise((r) => setTimeout(r, 100)); }
        for (let k = 0; k < 30 && !squad.some((m) => (m && (m.speciesId || m)) === id); k++) await new Promise((r) => setTimeout(r, 100));
      }
    } },
  { label: 'a team saved in the vault', witness: '.saved-card-actions button', count: 2, go: async () => {
      /* seat three, each one PROVED seated before the next (the first version clicked too soon after load and seated two);
         inline, because a function handed to the page cannot see a helper defined out here */
      for (const id of ['azumarill', 'medicham', 'lanturn']) {
        /* the first search after a quiet spell plays the app's own show before the result renders (selectPokemon,
           app.js: dueForShow) — so wait for THIS mon's add button, never a fixed delay */
        selectPokemon(id);
        const name = POKEMON.find((p) => p.speciesId === id).speciesName;
        for (let k = 0; k < 60; k++) { const b = document.getElementById('addSquadBtn'); if (b && b.textContent.includes(name)) { b.click(); break; } await new Promise((r) => setTimeout(r, 100)); }
        for (let k = 0; k < 30 && !squad.some((m) => (m && (m.speciesId || m)) === id); k++) await new Promise((r) => setTimeout(r, 100));
      }
      account.tier = 'scout';                                   // the demo tier that may save (a fresh context is free)
      document.getElementById('saveBtn').click(); await new Promise((r) => setTimeout(r, 600));
      document.getElementById('tabTeams').click();
    } },
];

/* witnessed(page, selector, count): is the state's witness visible on the page (at least `count` of it)? */
const witnessed = (page, sel, count) => page.evaluate(([q, k]) => {
  const vis = (e) => { const s = getComputedStyle(e); const b = e.getBoundingClientRect(); return s.display !== 'none' && s.visibility !== 'hidden' && +s.opacity > 0 && b.width > 0 && b.height > 0; };
  return [...document.querySelectorAll(q)].filter(vis).length >= (k || 1);
}, [sel, count]);

module.exports = { STATES, witnessed };
