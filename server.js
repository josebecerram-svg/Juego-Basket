import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
const root=process.cwd();
http.createServer(async(req,res)=>{try {const path=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!path.startsWith(root+'/')&&path!==root)throw Error();const file=path===root+'/'||path===root?root+'/index.html':path; const data=await readFile(file);res.writeHead(200,{'Content-Type':({'.html':'text/html','.js':'text/javascript','.css':'text/css'})[extname(file)]||'application/octet-stream'});res.end(data);}catch{res.writeHead(404);res.end('No encontrado');}}).listen(Number(process.env.PORT)||5173,'0.0.0.0',()=>console.log('Servidor listo en puerto '+(process.env.PORT||5173)));
