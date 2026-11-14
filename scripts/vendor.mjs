import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root=fileURLToPath(new URL('../',import.meta.url));
const expected=JSON.parse(await readFile(join(root,'package.json'),'utf8')).dependencies.three;
const source=join(root,'node_modules','three');
const actual=JSON.parse(await readFile(join(source,'package.json'),'utf8')).version;
if(actual!==expected)throw new Error(`Three.js version mismatch: expected ${expected}, got ${actual}`);
const destination=join(root,'public','vendor','three');
await mkdir(destination,{recursive:true});
for(const name of ['three.module.js','three.core.js'])await cp(join(source,'build',name),join(destination,name));
await cp(join(source,'LICENSE'),join(destination,'LICENSE'));
await writeFile(join(destination,'version.json'),JSON.stringify({name:'three',version:actual,license:'MIT'})+'\n');
console.log(`Vendored Three.js ${actual} with its MIT license.`);
