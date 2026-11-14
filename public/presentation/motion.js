/** Normalized sprite pose; impact remains at the timeline's 55% boundary. */
export function actorPose(progress,options={}) {
  const p=Math.max(0,Math.min(1,progress)),death=options.dying?(p===1?1:Math.max(0,(p-.55)/.45)):0;
  const pose={advance:0,recoil:0,scaleX:1,scaleY:1,rotation:0,drop:0,opacity:death===1?.18:1-death*.82};
  if(options.reducedMotion)return pose;
  if(options.attacking&&p<1){
    pose.advance=p<.25?-.025*Math.sin(p/.25*Math.PI):p<.55?.18*Math.sin((p-.25)/.6*Math.PI):.18*(1-(p-.55)/.45)**2;
    const squash=p<.25?Math.sin(p/.25*Math.PI)*.1:-Math.sin((p-.25)/.75*Math.PI)*.06;
    pose.scaleX=1+squash;pose.scaleY=1-squash;
  }
  if(options.hit&&p>.55&&p<1)pose.recoil=Math.sin((p-.55)/.45*Math.PI)*8;
  pose.drop=death*14;pose.rotation=death*.28;
  return pose;
}
