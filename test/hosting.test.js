import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';

test('P01: every entry-page asset stays inside a GitHub Pages project path and exists',async()=>{
  const base=new URL('https://example.github.io/sparkfall/');
  const sources=[
    ['index.html',/(?:src|href)="([^"]+)"/g],
    ['pixel.css',/url\(['"]?([^)'"\s]+)['"]?\)/g],
    ['presentation/scene.js',/['"]([^'"]+\.(?:png|svg))['"]/g],
  ];
  for(const [file,pattern] of sources){
    const source=await readFile(new URL(`../public/${file}`,import.meta.url),'utf8');
    for(const [,reference] of source.matchAll(pattern)){
      if(/^(https?:|#|data:)/.test(reference))continue;
      const resolved=new URL(reference,new URL(file,base));
      assert.ok(resolved.pathname.startsWith(base.pathname),`${file}: ${reference} escapes the project path`);
      const relative=resolved.pathname.slice(base.pathname.length)||'index.html';
      await access(new URL(`../public/${relative}`,import.meta.url));
    }
  }
});
