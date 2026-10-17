/** Pure data-independent area geometry and portal routing, shared by browser/Node tests. */
export function mountainRoadZ(x){return x<=0 ? -4+(x+24)*.25 : 2+x*(5/24);}
/** Ground height shared with C/Rust-WASM. Paths and village streets stay navigable. */
export function areaTerrainHeight(mapId,x,z){
  if(mapId===2){
    // Only the remote town corners rise: all six houses, streets and portals stay level.
    const ox=Math.max(0,Math.abs(x)-17.8),oz=Math.max(0,Math.abs(z)-15.7);
    return Math.min(3,ox*oz*.075);
  }
  if(mapId!==1)return 0;
  const away=Math.max(0,Math.abs(z-mountainRoadZ(x))-2.15);
  const hillside=Math.min(7.2,away*away*.052);
  const bridge=Math.max(0,Math.min(1,(8-Math.abs(x))/6))*.72;
  if(Math.abs(x)<2.15&&Math.abs(z-2)>2.15)return -1.45;
  return hillside+bridge;
}
export function insidePortal(portal,x,z){
  return (portal.fromEdge==='east'?x>=portal.x:x<=portal.x)&&z>=portal.zMin&&z<=portal.zMax;
}
export function findNearbyPortal(mapId,x,z,portals){
  return portals.find(p=>p.from===mapId && p.approachX!==undefined &&
    x>=p.approachX && x<p.x+1 && z>=p.zMin-(p.approachZMargin??0) && z<=p.zMax+(p.approachZMargin??0))??null;
}
export function findPortal(mapId,x,z,portals){
  return portals.find(p=>p.from===mapId&&insidePortal(p,x,z))??null;
}
export function collidesExtra(map,x,z,maps){
  const def=maps[map];
  if(x<def.bounds.minX||x>def.bounds.maxX||z<def.bounds.minZ||z>def.bounds.maxZ)return true;
  const player=.68;
  for(const h of Array.isArray(def.houses)?def.houses:[]){
    const cx=Math.max(h.x-h.halfX,Math.min(x,h.x+h.halfX));
    const cz=Math.max(h.z-h.halfZ,Math.min(z,h.z+h.halfZ));
    if((cx-x)**2+(cz-z)**2<player**2)return true;
  }
  for(const t of [...(def.trees||[]),...(def.rocks||[])])if(Math.hypot(x-t.x,z-t.z)<player+t.radius)return true;
  // The river is a barrier except for the physical bridge deck.
  if(map===1&&Math.abs(x)<def.river.halfWidth+player&&Math.abs(z-def.river.bridgeCenterZ)>def.river.bridgeHalfWidth-player-def.river.railHalfThickness)return true;
  return false;
}
