const http=require('http'),fs=require('fs'),p=require('path');
const T={
  '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8',
  '.js':'text/javascript; charset=utf-8', '.json':'application/json; charset=utf-8',
  '.xml':'application/xml', '.txt':'text/plain; charset=utf-8',
  '.webp':'image/webp', '.avif':'image/avif', '.png':'image/png',
  '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.gif':'image/gif',
  '.svg':'image/svg+xml', '.ico':'image/x-icon',
  '.woff2':'font/woff2', '.woff':'font/woff',
  '.mp4':'video/mp4', '.webm':'video/webm'
};
http.createServer((q,r)=>{
  let f=decodeURIComponent(q.url.split('?')[0]); if(f==='/')f='/index.html';
  const fp=p.join(__dirname,f);
  fs.readFile(fp,(e,d)=>{ if(e){r.writeHead(404);r.end('404');return;} r.writeHead(200,{'Content-Type':T[p.extname(fp)]||'application/octet-stream'}); r.end(d); });
}).listen(4321,()=>console.log('http://localhost:4173'));
