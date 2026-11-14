import * as THREE from '../vendor/three/three.module.js';

const COLORS={steel:'#e3e5dc',fire:'#ffb84f',ice:'#7ce5e8',poison:'#bddf67',heal:'#f09ba9',crater:'#92657e',void:'#403b49'};
const patterns={
  steel:['        xx','       xxx','      xxx ','     xxx  ','    xxx   ',' x xxx    ','  xxx     ',' xxxx     ','xx  x     ','x         '],
  fire:['     x    ','    xx    ','   xxx    ','  xxxxx   ',' xxxxxxx  ',' xx xxxxx ','xxx  xxxx ','xxx   xxx ',' xxxx xx  ','  xxxxx   '],
  ice:['    xx    ','   xxxx   ','  xxxxxx  ',' xxxxxxxx ','xxxxxxxxxx',' xxxxxxxx ','  xxxxxx  ','   xxxx   ','    xx    ','    xx    '],
  poison:['    xx    ','   xxxx   ','  xxxxxx  ',' xxxxxxxx ','xxxxxxxxxx','xx  xx  xx','xx  xx  xx',' xxx  xxx ','  xxxxxx  ','   xxxx   '],
  heal:['   xxxx   ','   xxxx   ','    xx    ','   xxxx   ','  xxxxxx  ',' xxxxxxxx ',' xxx  xxx ',' xx    xx ',' xxx  xxx ','  xxxxxx  '],
};
/** Small code-native rune textures use integer pixels and nearest-neighbor sampling. */
export function canvasTexture(canvas) {
  const texture=new THREE.CanvasTexture(canvas);
  texture.magFilter=texture.minFilter=THREE.NearestFilter;
  texture.generateMipmaps=false;texture.colorSpace=THREE.SRGBColorSpace;
  return texture;
}
export function tileTexture(type,{selected=false,locked=false,unstable=false,marked=false,age=0,blockedHeal=false}={}) {
  const canvas=document.createElement('canvas');canvas.width=canvas.height=32;
  const c=canvas.getContext('2d');c.imageSmoothingEnabled=false;
  c.fillStyle=selected?'#ffe1a0':'#201c31';c.fillRect(0,0,32,32);
  c.fillStyle=selected?'#b39155':unstable?'#d47be8':type==='void'?'#211c29':'#72586a';c.fillRect(1,1,30,30);
  c.fillStyle={steel:'#383b50',fire:'#55383b',ice:'#29444d',poison:'#39453d',heal:'#533845',crater:'#292232',void:'#211c29'}[type]??'#322b3b';c.fillRect(2,3,28,27);
  c.fillStyle='#ffffff12';c.fillRect(3,3,26,2);
  if(patterns[type]){
    c.fillStyle='#171c2a';patterns[type].forEach((row,y)=>[...row].forEach((v,x)=>{if(v==='x')c.fillRect(7+x*2,7+y*2,2,2);}));
    c.fillStyle=COLORS[type];patterns[type].forEach((row,y)=>[...row].forEach((v,x)=>{if(v==='x')c.fillRect(6+x*2,5+y*2,2,2);}));
    c.fillStyle='#fff5cf';c.fillRect(type==='fire'?14:12,9,2,4);
  }else{
    c.fillStyle=COLORS[type];for(let i=0;i<5;i++){c.fillRect(10+i*2,10+i*2,2,2);c.fillRect(18-i*2,10+i*2,2,2);}
    if(age){c.fillStyle='#dfbcea';c.font='bold 10px monospace';c.fillText(String(age),22,28);}
  }
  if(blockedHeal){c.fillStyle='#30293699';c.fillRect(3,3,26,27);c.fillStyle='#df9cba';for(let i=0;i<11;i++)c.fillRect(5+i*2,25-i*2,2,2);}
  if(locked){c.fillStyle='#c5a4e2';for(let i=1;i<29;i+=5){c.fillRect(i,14,4,3);c.fillRect(14,i,3,4);}}
  if(unstable){c.fillStyle='#e4a2ff';c.fillRect(26,4,3,7);c.fillRect(26,13,3,2);}
  if(marked){c.fillStyle='#efb0ff';c.fillRect(26,1,2,8);c.fillRect(23,4,8,2);}
  return canvasTexture(canvas);
}
export function effectTexture(color='#ffe7a3',label='',kind='star') {
  const canvas=document.createElement('canvas');canvas.width=label?160:24;canvas.height=label?40:24;
  const c=canvas.getContext('2d');c.imageSmoothingEnabled=false;
  if(label){c.font='bold 26px monospace';c.textAlign='center';c.fillStyle='#181523';c.fillText(label,81,30);c.fillStyle=color;c.fillText(label,80,28);}
  else if(patterns[kind]){c.fillStyle=color;patterns[kind].forEach((row,y)=>[...row].forEach((v,x)=>{if(v==='x')c.fillRect(2+x*2,2+y*2,2,2);}));}
  else if(kind==='spark'){c.fillStyle=color;c.fillRect(6,6,12,12);}
  else if(kind==='meteor'){c.fillStyle='#9472bd';c.fillRect(10,1,4,12);c.fillRect(7,6,10,12);c.fillStyle=color;c.fillRect(5,12,14,9);c.fillStyle='#fff0cb';c.fillRect(8,13,6,4);c.fillStyle='#625073';c.fillRect(14,18,4,4);}
  else if(kind==='attack'){c.fillStyle=color;for(let i=0;i<9;i++)c.fillRect(2+i*2,20-i*2,6,3);}
  else{c.fillStyle=color;c.fillRect(9,1,6,22);c.fillRect(1,9,22,6);c.fillRect(6,6,12,12);c.fillStyle='#fff7dc';c.fillRect(9,9,6,6);}
  return canvasTexture(canvas);
}
