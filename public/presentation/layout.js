/** Shared geometry aligns WebGL sprites, accessible targets and the input grid. */
export function combatLayout(width,availableHeight,count) {
  const mobile=width<700;
  const short=!mobile&&availableHeight<820;
  const arena=mobile?176:short?160:240;
  const size=Math.min(mobile?350:short?328:380,width);
  const padding=mobile||short?2:4,gap=mobile||short?1:2;
  const board={x:(width-size)/2,y:arena+24,size,padding,gap,cell:(size-padding*2-gap*6)/7};
  const heroSize=mobile||short?94:142;
  const actors=[{x:width*(mobile?.15:.19),y:arena-8,size:heroSize,hudWidth:mobile?100:200}];
  for(let i=0;i<count;i++){
    const start=count===1?.77:count===2?.59:.46;
    const end=count===1?.77:.88;
    actors.push({x:width*(start+(end-start)*i/Math.max(1,count-1)),y:arena-8,size:mobile||short?(count===3?70:88):count===3?116:142,hudWidth:mobile?(count===3?67:count===2?92:100):count===3?Math.min(174,width*.21-8):174});
  }
  return {width,height:board.y+size+8,arena,board,actors,mobile};
}
