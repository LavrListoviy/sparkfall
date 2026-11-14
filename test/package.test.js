import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, copyFile, writeFile, readFile, access, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

test('P01: distributable packages include game assets and exclude local recorder files',async()=>{
  const root=await mkdtemp(join(tmpdir(),'sparkfall-package-'));
  try{
    for(const dir of ['scripts','docs','public/assets','public/_dev'])await mkdir(join(root,dir),{recursive:true});
    await copyFile(new URL('../scripts/package.mjs',import.meta.url),join(root,'scripts/package.mjs'));
    const files={'package.json':'{"version":"test"}','public/index.html':'game','public/assets/sprite.png':'sprite','public/_dev/demo.html':'local only','scripts/serve.mjs':'','start-game.cmd':'','docs/PLAYTEST.md':''};
    for(const [path,body] of Object.entries(files))await writeFile(join(root,path),body);
    execFileSync(process.execPath,[join(root,'scripts/package.mjs')],{stdio:'pipe'});
    for(const path of ['web','playtest/public']){
      const output=join(root,'releases/sparkfall-test',path);
      assert.equal(await readFile(join(output,'index.html'),'utf8'),'game');
      assert.equal(await readFile(join(output,'assets/sprite.png'),'utf8'),'sprite');
      await assert.rejects(access(join(output,'_dev')),{code:'ENOENT'});
    }
  }finally{await rm(root,{recursive:true,force:true});}
});
