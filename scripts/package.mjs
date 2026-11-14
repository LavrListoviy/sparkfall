import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root=fileURLToPath(new URL('../',import.meta.url));
const {version}=JSON.parse(await readFile(join(root,'package.json'),'utf8'));
const release=join(root,'releases',`sparkfall-${version}`);
await mkdir(join(release,'playtest','scripts'),{recursive:true});
const publicCopy={recursive:true,filter:source=>source!==join(root,'public','_dev')};
await cp(join(root,'public'),join(release,'web'),publicCopy);
await cp(join(root,'public'),join(release,'playtest','public'),publicCopy);
await cp(join(root,'scripts','serve.mjs'),join(release,'playtest','scripts','serve.mjs'));
await cp(join(root,'start-game.cmd'),join(release,'playtest','start-game.cmd'));
await cp(join(root,'docs','PLAYTEST.md'),join(release,'playtest','PLAYTEST.md'));
await writeFile(join(release,'playtest','package.json'),JSON.stringify({name:'sparkfall-playtest',version,private:true,type:'module',scripts:{start:'node scripts/serve.mjs'},engines:{node:'>=22'}},null,2)+'\n');
console.log(`Prepared static and local playtest packages: ${release}`);
