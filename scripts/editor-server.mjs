import http from 'node:http';
import { readFile,writeFile,rename,unlink } from 'node:fs/promises';
import { createHash,randomBytes } from 'node:crypto';
import { resolve,relative,extname,sep,isAbsolute } from 'node:path';
import { fileURLToPath,pathToFileURL } from 'node:url';
import { catalogErrors,parseCatalog,serializeCatalog } from '../public/core/artifact-schema.js';

const project=fileURLToPath(new URL('../',import.meta.url));
const digest=source=>createHash('sha256').update(source).digest('hex');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.svg':'image/svg+xml','.ttf':'font/ttf'};
const failure=(status,message)=>Object.assign(new Error(message),{status});

/** The editor writes one fixed module; requests cannot provide filesystem paths. */
export function createEditorServer({catalogPath=resolve(project,'public/core/artifact-catalog.js')}={}){
  const token=randomBytes(24).toString('hex');let writes=Promise.resolve();
  const json=(response,status,value)=>{response.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});response.end(JSON.stringify(value));};
  const server=http.createServer(async(request,response)=>{
    try{
      const port=server.address().port,host=request.headers.host;
      if(![`127.0.0.1:${port}`,`localhost:${port}`].includes(host))throw failure(403,'Недопустимый Host.');
      const origin=`http://${host}`;
      if(request.headers.origin&&request.headers.origin!==origin)throw failure(403,'Запрос с чужого сайта отклонён.');
      const pathname=new URL(request.url,origin).pathname;
      if(pathname==='/api/catalog'){
        if(request.method==='GET'){
          const source=await readFile(catalogPath,'utf8');json(response,200,{catalog:parseCatalog(source),revision:digest(source),token});return;
        }
        if(request.method!=='PUT')throw failure(405,'Метод не поддерживается.');
        if(request.headers.origin!==origin||request.headers['x-editor-token']!==token)throw failure(403,'Перезагрузите локальный редактор.');
        if(request.headers['content-type']!=='application/json')throw failure(415,'Ожидается application/json.');
        const chunks=[];let size=0;
        for await(const chunk of request){size+=chunk.length;if(size>1_000_000)throw failure(413,'Каталог слишком большой.');chunks.push(chunk);}
        let body;try{body=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw failure(400,'Неверный JSON.');}
        const write=async()=>{
          const source=await readFile(catalogPath,'utf8');
          if(body?.revision!==digest(source))throw failure(409,'Каталог изменён в другой вкладке или на диске. Экспортируйте черновик и загрузите актуальную версию.');
          const previous=parseCatalog(source),errors=catalogErrors(body.catalog,previous);
          if(errors.length)throw failure(422,errors.join('\n'));
          const catalog={schema:1,items:Object.fromEntries([...Object.keys(previous.items),...Object.keys(body.catalog.items).filter(id=>!Object.hasOwn(previous.items,id))].map(id=>[id,body.catalog.items[id]]))};
          const output=serializeCatalog(catalog),temporary=`${catalogPath}.${randomBytes(8).toString('hex')}.tmp`;
          try{await writeFile(temporary,output,{flag:'wx'});await rename(temporary,catalogPath);}finally{await unlink(temporary).catch(()=>{});}
          return {catalog,revision:digest(output),token};
        };
        const pending=writes.then(write);writes=pending.catch(()=>{});
        json(response,200,await pending);return;
      }
      if(request.method!=='GET'&&request.method!=='HEAD')throw failure(405,'Метод не поддерживается.');
      const game=pathname.startsWith('/game/'),root=resolve(project,game?'public':'tools/artifact-editor');
      const name=decodeURIComponent(game?(pathname.slice(6)||'index.html'):pathname==='/'?'index.html':pathname.slice(1));
      if(!game&&!['index.html','editor.js','editor.css'].includes(name))throw failure(404,'Не найдено.');
      const path=resolve(root,name),inside=relative(root,path);
      if(isAbsolute(inside)||inside==='..'||inside.startsWith(`..${sep}`)||resolve(path)===root||inside.split(/[\\/]/).some(part=>part.startsWith('.')))throw failure(404,'Не найдено.');
      const data=await readFile(path);
      response.writeHead(200,{'Content-Type':mime[extname(path)]??'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"frame-ancestors 'none'"});response.end(request.method==='HEAD'?undefined:data);
    }catch(error){json(response,error.status??(error.code==='ENOENT'?404:500),{error:error.status?error.message:error.code==='ENOENT'?'Не найдено.':'Ошибка чтения или записи каталога.'});}
  });
  return server;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const index=process.argv.indexOf('--port'),port=index<0?4174:Number(process.argv[index+1]);
  createEditorServer().listen(port,'127.0.0.1',()=>console.log(`Sparkfall artifact editor: http://127.0.0.1:${port}`));
}
