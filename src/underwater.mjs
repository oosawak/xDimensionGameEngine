/** Lightweight, engine-independent controller for the side-view swim mode. */
export const UNDERWATER_MODE = Object.freeze({
  environmentMode: 'underwater',
  cameraMode: 'side',
  movementMode: 'swim2d'
});

export function createSwim2D(options = {}) {
  let collisionQuery=null;
  const state = {
    x: options.x ?? 0,
    depth: options.depth ?? 0,
    vx: 0,
    vy: 0,
    maxSpeed: options.maxSpeed ?? 7,
    acceleration: options.acceleration ?? 22,
    drag: options.drag ?? 3.8,
    speedMultiplier: 1,
    depthMin: options.depthMin ?? -1,
    depthMax: options.depthMax ?? 240
  };
  return {
    state,
    setCollisionQuery(query){collisionQuery=typeof query==='function'?query:null;},
    setSpeedMultiplier(value){
      state.speedMultiplier=Number.isFinite(value)?Math.max(.75,Math.min(2.5,value)):1;
      return state.speedMultiplier;
    },
    step(input = {}, dt = 0) {
      let dx = Number.isFinite(input.axisX) ? input.axisX : (input.right ? 1 : 0) - (input.left ? 1 : 0);
      let dy = Number.isFinite(input.axisY) ? input.axisY : (input.down ? 1 : 0) - (input.up ? 1 : 0);
      const inputLength=Math.hypot(dx,dy);
      if(inputLength>1){dx/=inputLength;dy/=inputLength;}
      const boost = (input.boost ? 1.45 : 1) * state.speedMultiplier;
      state.vx += dx * state.acceleration * boost * dt;
      state.vy += dy * state.acceleration * boost * dt;
      const damping = Math.exp(-state.drag * dt);
      state.vx *= damping;
      state.vy *= damping;
      const speed = Math.hypot(state.vx, state.vy);
      const limit = state.maxSpeed * boost;
      if (speed > limit) {
        const scale = limit / speed;
        state.vx *= scale;
        state.vy *= scale;
      }
      const nextX=state.x+state.vx*dt;
      const nextDepth=Math.max(state.depthMin,Math.min(state.depthMax,state.depth+state.vy*dt*(options.verticalSpeedMultiplier??1)));
      if(collisionQuery){
        const moved=resolveSwimMotion(state.x,state.depth,nextX,nextDepth,collisionQuery);
        state.x=moved.x;state.depth=moved.depth;
        if(moved.blockedX)state.vx=0;
        if(moved.blockedDepth)state.vy=0;
      }else{state.x=nextX;state.depth=nextDepth;}
      if (state.depth === state.depthMin || state.depth === state.depthMax) state.vy = 0;
      return state;
    },
    reset(x = 0, depth = 0) {
      Object.assign(state, { x, depth, vx: 0, vy: 0 });
      return state;
    }
  };
}

/** Substeps are measured in world units. Separating axes allows wall sliding.
 * This pure movement boundary can be moved to a separate WASM ABI later. */
export function resolveSwimMotion(x,depth,nextX,nextDepth,collides){
  const dx=nextX-x,dd=nextDepth-depth;
  const count=Math.max(1,Math.ceil(Math.max(Math.abs(dx),Math.abs(dd)*.28)/.1));
  let blockedX=false,blockedDepth=false;
  for(let i=0;i<count;i++){
    if(!collides(x+dx/count,depth))x+=dx/count;else blockedX=true;
    if(!collides(x,depth+dd/count))depth+=dd/count;else blockedDepth=true;
  }
  return {x,depth,blockedX,blockedDepth};
}

export function underwaterPalette(depth) {
  const t = Math.max(0, Math.min(1, depth / 240));
  return {
    fog: [0.08 - t * 0.055, 0.35 - t * 0.22, 0.45 - t * 0.27],
    light: 1 - t * 0.72,
    haze: 0.008 + t * 0.026
  };
}

/** XY-plane projectiles, independent of rendering. Segment hits avoid tunnelling
 * even at low frame rates. Targets behind the scenery are never passed here. */
export function createFishShooter({capacity=12, speed=22, range=20, cooldown=.3}={}) {
  const shots=Array.from({length:capacity},()=>({active:false,x:0,y:0,dx:1,dy:0,remaining:0}));
  let wait=0,caught=0;
  return {shots, get caught(){return caught;},
    fire(x,y,dx=1,dy=0){
      if(wait>0)return false;
      const length=Math.hypot(dx,dy);if(!length)return false;
      const shot=shots.find(s=>!s.active);if(!shot)return false;
      Object.assign(shot,{active:true,x,y,dx:dx/length,dy:dy/length,remaining:range});
      wait=cooldown;return true;
    },
    step(dt,targets){
      wait=Math.max(0,wait-dt);const hits=[];
      for(const shot of shots){
        if(!shot.active)continue;
        const travel=Math.min(speed*dt,shot.remaining);
        let nearest=null,nearestDistance=Infinity;
        for(const target of targets){
          if(target.captured)continue;
          const tx=target.x-shot.x,ty=target.y-shot.y;
          const along=tx*shot.dx+ty*shot.dy;
          const radius=(target.radius??.5)+.12;
          const perpendicular=tx*tx+ty*ty-along*along;
          if(perpendicular>radius*radius)continue;
          const half=Math.sqrt(Math.max(0,radius*radius-perpendicular));
          if(along+half<0)continue;
          const distance=Math.max(0,along-half);
          if(distance<=travel&&distance<nearestDistance){nearest=target;nearestDistance=distance;}
        }
        shot.x+=shot.dx*travel;shot.y+=shot.dy*travel;shot.remaining-=travel;
        if(nearest){
          nearest.maxHp??=3;
          nearest.hp=Math.max(0,(nearest.hp??nearest.maxHp)-1);
          if(nearest.hp===0){nearest.captured=true;caught++;}
          hits.push(nearest);shot.active=false;
        }
        else if(shot.remaining<=0)shot.active=false;
      }
      return hits;
    },
    clear(){for(const s of shots)s.active=false;wait=0;}
  };
}

/** Only active fish in the swim plane are eligible; scenery fish stay decorative. */
export function nearestShootableFish(x,y,targets,range=3.5){
  let nearest=null,distanceSquared=range*range;
  for(const target of targets){
    if(target.captured)continue;
    const distance=(target.x-x)**2+(target.y-y)**2;
    if(distance<=distanceSquared){nearest=target;distanceSquared=distance;}
  }
  return nearest;
}
