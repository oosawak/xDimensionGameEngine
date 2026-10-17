/** Distinct alpha silhouettes for both TSL SpriteNodeMaterial and WebGL PointsMaterial. */
export const PARTICLE_SHAPE_MODES=['firefly','petal','leaf','snow'];
export function paintParticleMask(ctx,mode){
  if(!PARTICLE_SHAPE_MODES.includes(mode))throw new Error('unknown particle mode: '+mode);
  ctx.clearRect(0,0,64,64);
  ctx.save();
  ctx.translate(32,32);
  ctx.fillStyle='#ffffff';ctx.strokeStyle='#ffffff';
  if(mode==='firefly'){
    const g=ctx.createRadialGradient(0,0,1,0,0,28);
    g.addColorStop(0,'rgba(255,255,255,1)');
    g.addColorStop(.24,'rgba(255,255,255,.97)');
    g.addColorStop(.58,'rgba(255,255,255,.34)');
    g.addColorStop(1,'rgba(255,255,255,0)');
    ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,28,0,Math.PI*2);ctx.fill();
  } else if(mode==='petal'){
    // Curved, tapered petal instead of a circular point.
    ctx.rotate(-.30);ctx.beginPath();ctx.moveTo(-3,-21);
    ctx.bezierCurveTo(15,-23,23,-3,13,12);
    ctx.bezierCurveTo(7,22,-2,24,-13,9);
    ctx.bezierCurveTo(-25,-5,-17,-18,-3,-21);
    ctx.closePath();ctx.fill();
    ctx.strokeStyle='rgba(255,255,255,.45)';ctx.lineWidth=1.4;
    ctx.beginPath();ctx.moveTo(-4,-14);ctx.quadraticCurveTo(4,4,2,15);ctx.stroke();
  } else if(mode==='leaf'){
    // Elliptic autumn leaf with pointed ends and visible vein.
    ctx.rotate(.42);ctx.beginPath();ctx.moveTo(0,-27);
    ctx.bezierCurveTo(7,-21,18,-19,16,-9);
    ctx.bezierCurveTo(20,1,13,15,0,26);
    ctx.bezierCurveTo(-14,17,-20,2,-15,-9);
    ctx.bezierCurveTo(-17,-17,-6,-22,0,-27);ctx.closePath();ctx.fill();
    ctx.strokeStyle='rgba(255,255,255,.60)';ctx.lineWidth=1.6;
    ctx.beginPath();ctx.moveTo(0,-21);ctx.lineTo(0,23);ctx.stroke();
    for(const side of [-1,1])for(let i=-12;i<=12;i+=12){
      ctx.beginPath();ctx.moveTo(0,i+3);ctx.lineTo(side*10,i-6);ctx.stroke();
    }
  } else {
    // Six-sided snow crystal: branching lines, not a round dot.
    ctx.lineWidth=3;ctx.lineCap='round';
    for(let i=0;i<6;i++){
      ctx.save();ctx.rotate(i*Math.PI/3);
      ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(0,-24);
      ctx.moveTo(0,-15);ctx.lineTo(-6,-11);
      ctx.moveTo(0,-15);ctx.lineTo(6,-11);
      ctx.stroke();ctx.restore();
    }
    ctx.beginPath();ctx.arc(0,0,3.5,0,Math.PI*2);ctx.fill();
  }
  ctx.restore();
}
