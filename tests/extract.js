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
module.exports = { extract, getScript };
