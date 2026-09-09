// Parser-based extraction of top-level functions/consts from the shipped file.
const fs = require('fs');
const acorn = require('acorn');
function getScript(){
  // v53: post-monolith-split. The app's brain lives in app.js; inline
  // snippets in index.html are boot glue only. Falls back to parsing the
  // HTML if app.js is absent (pre-split builds).
  const path = require('path');
  const appJs = require('path').join(__dirname,'..','app.js');
  if(fs.existsSync(appJs)) return fs.readFileSync(appJs, 'utf8');
  const html = fs.readFileSync(require('path').join(__dirname,'..','index.html'), 'utf8');
  return [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]).join('\n;\n');
}
function extract(names){
  const src = getScript();
  const ast = acorn.parse(src, {ecmaVersion: 'latest'});
  const out = [];
  for(const node of ast.body){
    if(node.type === 'FunctionDeclaration' && names.includes(node.id.name))
      out.push(src.slice(node.start, node.end));
    if(node.type === 'VariableDeclaration'){
      for(const d of node.declarations){
        if(d.id && names.includes(d.id.name))
          out.push('globalThis.' + d.id.name + ' = ' + src.slice(d.init.start, d.init.end) + ';');
      }
    }
  }
  return out.join('\n\n');
}

/* ═══════════════════════════════════════════════════════════════════════════
   THE DERIVED CLOSURE — board rule 135.

   harness.js used to carry a hand-typed list of app.js names to eval. It is
   a manual mirror of a real call graph, so it goes stale the moment a shipped
   function gains a helper, and it did: adding bonusMovesOf and then
   offTheBoards broke every board test twice in one hour with a ReferenceError
   until each was remembered into the list. It had rotted in the other
   direction too - it carried moveRole, which no bench calls and no reachable
   function references.

   ⚠ IT MUST KEEP FAILING LOUD. The hand-typed list was survivable ONLY
   because a missing name was a CRASH, not a wrong number, and the board says
   in as many words: do not 'fix' it by catching the error. Nothing here
   catches anything. A name the graph does not reach is simply absent, and the
   eval throws exactly as it always did.

   ⚠ AND IT PRINTS WHAT IT DERIVED. Itachi named the failure mode of this
   approach before it was written: a free-identifier walk without full scope
   resolution can pull in a top-level name that merely SHARES a name with some
   unrelated function's local. That failure is silent and over-inclusive - it
   does not crash, it just extracts a slightly larger closure. Harmless to
   correctness, because eval'd code that nothing calls does nothing. But it
   means "the deriver reached X" is not proof X is used. The manifest turns a
   silent over-inclusion into one line a person can glance at.
   ═══════════════════════════════════════════════════════════════════════════ */

/* every name app.js declares at the TOP LEVEL, with the node that declares it */
function topLevel(src, ast){
  const m = new Map();
  for(const node of ast.body){
    if(node.type === 'FunctionDeclaration' && node.id) m.set(node.id.name, node);
    if(node.type === 'VariableDeclaration')
      for(const d of node.declarations)
        if(d.id && d.id.type === 'Identifier') m.set(d.id.name, d);
  }
  return m;
}

/* identifiers a node MENTIONS.
   ⚠ obj.foo must not contribute "foo", and {foo: x} must not contribute
   "foo" either. Missing either of those is how a closure walk stops being a
   call graph and becomes a text search - a MENTION instead of a property,
   which is the defect this house repeats most. */
function mentions(node){
  const out = new Set();
  (function walk(n){
    if(!n || typeof n !== 'object') return;
    if(Array.isArray(n)){ for(const x of n) walk(x); return; }
    if(n.type === 'Identifier'){ out.add(n.name); return; }
    if(n.type === 'MemberExpression' && !n.computed){ walk(n.object); return; }
    if(n.type === 'Property' && !n.computed){ walk(n.value); return; }
    for(const k of Object.keys(n)) if(k !== 'type' && k !== 'start' && k !== 'end') walk(n[k]);
  })(node);
  return out;
}

/* the names a BENCH asks app.js for: mentioned by the bench, declared at
   app.js top level, and not declared by the bench itself. */
function rootsOf(benchSrc, top){
  const acorn2 = require('acorn');
  const ast = acorn2.parse(benchSrc, {ecmaVersion: 'latest'});
  const own = new Set();
  (function decls(n){
    if(!n || typeof n !== 'object') return;
    if(Array.isArray(n)){ for(const x of n) decls(x); return; }
    if(n.type === 'FunctionDeclaration' && n.id) own.add(n.id.name);
    if(n.type === 'VariableDeclarator' && n.id && n.id.type === 'Identifier') own.add(n.id.name);
    for(const k of Object.keys(n)) if(k !== 'type' && k !== 'start' && k !== 'end') decls(n[k]);
  })(ast);
  return [...mentions(ast)].filter(x => top.has(x) && !own.has(x));
}

/* roots, then everything they reach, to a fixpoint */
function closureFor(benchSrc){
  const acorn2 = require('acorn');
  const src = getScript();
  const ast = acorn2.parse(src, {ecmaVersion: 'latest'});
  const top = topLevel(src, ast);
  const roots = rootsOf(benchSrc, top);
  const seen = new Set();
  (function close(names){
    for(const n of names){
      if(seen.has(n) || !top.has(n)) continue;
      seen.add(n);
      close([...mentions(top.get(n))].filter(x => x !== n));
    }
  })(roots);
  return { roots, names: [...seen], declared: top.size };
}

/* ⚠ THE OLD eval DID `code.replace(/\bfunction (\w+)/g, ...)` OVER THE WHOLE
   BLOB, which rewrites INNER named functions too. That was harmless while the
   list was fifteen hand-picked names and stops being harmless the moment the
   closure is derived and larger. So each declaration is assigned precisely,
   at slice time, by the code that knows which node is top level. */
function extractAssigned(names){
  const acorn2 = require('acorn');
  const src = getScript();
  const ast = acorn2.parse(src, {ecmaVersion: 'latest'});
  const out = [];
  for(const node of ast.body){
    if(node.type === 'FunctionDeclaration' && node.id && names.includes(node.id.name))
      out.push('globalThis.' + node.id.name + ' = ' + src.slice(node.start, node.end) + ';');
    if(node.type === 'VariableDeclaration')
      for(const d of node.declarations)
        if(d.id && names.includes(d.id.name) && d.init)
          out.push('globalThis.' + d.id.name + ' = ' + src.slice(d.init.start, d.init.end) + ';');
  }
  return out.join('\n\n');
}

module.exports = { extract, getScript, closureFor, extractAssigned };
