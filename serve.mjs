import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve, extname, sep} from 'node:path';
import {fileURLToPath} from 'node:url';
const root = fileURLToPath(new URL('.', import.meta.url)).replace(/[\\/]$/, '');
const port = Number(process.env.PORT || 4173);
const types = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.webmanifest':'application/manifest+json','.svg':'image/svg+xml'};
const publicFiles = new Set(['index.html','styles.css','app.js','core.js','sw.js','manifest.webmanifest','icon.svg','catalog.json']);
http.createServer(async (req,res)=>{
  try {
    const path = decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\/+/, '') || 'index.html';
    const absolute = resolve(root,path);
    if (!absolute.startsWith(root+sep) || !publicFiles.has(path)) {res.writeHead(404);return res.end('Não encontrado');}
    const body=await readFile(absolute);
    res.writeHead(200,{'Content-Type':types[extname(path)]||'application/octet-stream','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});res.end(body);
  } catch {res.writeHead(404);res.end('Não encontrado');}
}).listen(port, '0.0.0.0',()=>console.log(`Flix List: http://localhost:${port}`));
