import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml','.mp4':'video/mp4','.m4a':'audio/mp4','.pdf':'application/pdf','.md':'text/plain; charset=utf-8','.webm':'video/webm'};
http.createServer((req,res)=>{
 let p;try {p=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch {res.writeHead(400).end();return;}
 const target=path.resolve(root,'.'+(p.endsWith('/')?p+'index.html':p));
 if(!target.startsWith(root+path.sep)||!fs.existsSync(target)||!fs.statSync(target).isFile()){res.writeHead(404).end('Not found');return;}
 const size=fs.statSync(target).size; const headers={'Content-Type':mime[path.extname(target)]||'application/octet-stream','Accept-Ranges':'bytes','Cache-Control':'no-cache'};
 const range=req.headers.range?.match(/^bytes=(\d+)-(\d*)$/);
 if(range){const start=Number(range[1]),end=Math.min(range[2]?Number(range[2]):size-1,size-1);if(start>=size||end<start){res.writeHead(416,{'Content-Range':`bytes */${size}`}).end();return;}res.writeHead(206,{...headers,'Content-Range':`bytes ${start}-${end}/${size}`,'Content-Length':end-start+1});fs.createReadStream(target,{start,end}).pipe(res);}
 else {res.writeHead(200,{...headers,'Content-Length':size});fs.createReadStream(target).pipe(res);}
}).listen(5188,'127.0.0.1',()=>console.log('This Moment preview: http://127.0.0.1:5188'));
