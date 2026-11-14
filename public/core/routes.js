/** Legacy generation keeps its RNG calls and node order intact for existing expeditions. */
export function createRoute(random,version) {
  const events=['experiment','workshop','fountain'];
  const first=events.splice(random.int(events.length),1)[0],second=events[random.int(events.length)];
  const combat=(...enemyIds)=>({kind:'battle',enemyIds});
  const elite=(id,encounterScale=1)=>({...combat(id),kind:'elite',encounterScale});
  const event=id=>({kind:'event',event:id});
  let layers;
  if(version<3){
    layers=[
      [combat('furnace')],[combat('sentinel'),combat('collector')],
      [event(first),event(second)],[combat('guardian'),combat('sentinel','collector')],
      [{...combat('jailer'),kind:'elite'},{...combat('alchemist'),kind:'elite'}],
      [{kind:'rest',event:'rest'}],[version===1?combat('guardian','sentinel'):combat('guardian','sentinel','collector'),combat('furnace','collector')],
      [{...combat('heart'),kind:'boss'}],
    ];
  }else{
    const weather=()=>({...event(first),stormEvent:random.int(2)?'ashCaravan':'groundTower'});
    layers=[
      [combat('furnace')],
      [combat('sentinel'),combat('collector'),combat('guardian')],
      [event(first),combat('sentinel','collector'),elite('jailer',.8)],
      [combat('guardian'),event(second),weather()],
      [combat('sentinel','collector'),elite('jailer'),elite('alchemist')],
      [{kind:'rest',event:'rest'},combat('furnace','collector'),weather()],
      [combat('furnace','collector'),combat('guardian','sentinel','collector'),elite(random.int(2)?'jailer':'alchemist')],
      [{...combat('heart'),kind:'boss'}],
    ];
  }
  const route=layers.map((layer,floor)=>layer.map((node,lane)=>({...node,id:`${floor}-${lane}`,...(version>=3?{lane,travel:floor===0?0:floor===7?3:[4,2,0][lane]}:{})})));
  if(version>=3)for(let floor=0;floor<7;floor++)for(const node of route[floor]){
    node.next=route[floor+1].filter(next=>floor===0||floor===6||Math.abs(node.lane-next.lane)<=1).map(n=>n.id);
  }
  return route;
}

/** A route edge is a gameplay restriction, not just a disabled map button. */
export function reachableNodes(run) {
  const layer=run.route[run.floor]??[];
  if(run.routeVersion<3||run.floor===0)return layer;
  const previous=run.route[run.floor-1]?.find(n=>n.id===run.currentNode);
  return layer.filter(node=>previous?.next?.includes(node.id));
}
