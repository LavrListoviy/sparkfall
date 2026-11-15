import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp,writeFile,readFile,rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';
import { ARTIFACT_CATALOG } from '../public/core/artifact-catalog.js';
import { serializeCatalog } from '../public/core/artifact-schema.js';
import { createEditorServer } from '../scripts/editor-server.mjs';

test('AE04: local API validates writes, origin and concurrent revisions without corrupting data',async()=>{
  const directory=await mkdtemp(join(tmpdir(),'sparkfall-editor-'));
  const catalogPath=join(directory,'artifact-catalog.js');
  await writeFile(catalogPath,serializeCatalog(ARTIFACT_CATALOG));
  const server=createEditorServer({catalogPath});
  server.listen(0,'127.0.0.1');await once(server,'listening');
  const origin=`http://127.0.0.1:${server.address().port}`;
  try{
    const response=await fetch(`${origin}/api/catalog`);
    assert.equal(response.status,200);
    const {catalog,revision,token}=await response.json();
    catalog.items.coil.name='Проверка записи';
    const put=(data,source=origin)=>fetch(`${origin}/api/catalog`,{method:'PUT',headers:{'Content-Type':'application/json',Origin:source,'X-Editor-Token':token},body:JSON.stringify(data)});
    assert.equal((await put({catalog,revision},'https://foreign.example')).status,403);
    const invalid=structuredClone(catalog);invalid.items.coil.cost=-1;
    assert.equal((await put({catalog:invalid,revision})).status,422);
    const attempts=await Promise.all([put({catalog,revision}),put({catalog,revision})]);
    assert.deepEqual(attempts.map(r=>r.status).sort(),[200,409]);
    assert.match(await readFile(catalogPath,'utf8'),/Проверка записи/);
    assert.equal((await fetch(`${origin}/.git/config`)).status,404);
    assert.equal((await fetch(`${origin}/game/../package.json`)).status,404);
  }finally{
    server.closeAllConnections();await new Promise(resolve=>server.close(resolve));
    await rm(directory,{recursive:true,force:true});
  }
});
