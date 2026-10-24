import {createServer} from 'node:http';
import {createServer as createViteServer} from 'vite';
import {makeApi} from '../server/api.mjs';
const api=makeApi(process.env);
const vite=await createViteServer({server:{middlewareMode:true},appType:'spa'});
const server=createServer(async(req,res)=>{
 if(req.url.startsWith('/api/')){
  try{
   let body='';for await(const chunk of req){body+=chunk;if(body.length>22000){res.writeHead(413);res.end();return;}}
   const url=`http://localhost:5173${req.url}`;
   const request=new Request(url,{method:req.method,headers:req.headers,body:['GET','HEAD'].includes(req.method)?undefined:body});
   const response=process.env.API_UPSTREAM?await fetch(process.env.API_UPSTREAM+req.url.replace(/^\/api/,''),{method:req.method,headers:Object.fromEntries(Object.entries(req.headers).filter(([key])=>!['host','connection','content-length'].includes(key))),body:['GET','HEAD'].includes(req.method)?undefined:body}):await api(request);
   const headers=Object.fromEntries([...response.headers].filter(([key])=>!['content-length','content-encoding','transfer-encoding'].includes(key)));res.writeHead(response.status,headers);res.end(Buffer.from(await response.arrayBuffer()));
  }catch{res.writeHead(500,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'Local preview API failed.'}));}
 }else vite.middlewares(req,res);
});
server.listen(5173,'127.0.0.1',()=>console.log('Local: http://localhost:5173'));
