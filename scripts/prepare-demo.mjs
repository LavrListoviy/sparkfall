import { mkdir, copyFile } from 'node:fs/promises';
const root=new URL('../',import.meta.url),destination=new URL('public/_dev/',root);
await mkdir(destination,{recursive:true});
for(const [source,target] of [['scripts/media/demo.html','demo.html'],['scripts/media/demo.js','demo.js'],['docs/browser-playthrough-0.5.json','demo-report.json']])await copyFile(new URL(source,root),new URL(target,destination));
console.log('Open /_dev/demo.html on the local preview. The recorder uses the real rules and Three.js renderer.');
