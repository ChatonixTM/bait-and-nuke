// Persistent static server inside the test process — no shell lifetime issues.
const http = require('http'), fs = require('fs'), path = require('path');
const MIME = {'.html':'text/html','.json':'application/json','.js':'text/javascript','.css':'text/css'};
module.exports = function serve(dir, port){
  return new Promise(res => {
    const s = http.createServer((req, r) => {
      const f = path.join(dir, req.url === '/' ? 'index.html' : req.url.split('?')[0]);
      fs.readFile(f, (e, d) => {
        if(e){ r.writeHead(404); r.end(); return; }
        r.writeHead(200, {'Content-Type': MIME[path.extname(f)] || 'application/octet-stream'});
        r.end(d);
      });
    }).listen(port, () => res(s));
  });
};
