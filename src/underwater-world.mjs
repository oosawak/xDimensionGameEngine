/** Procedural underwater diorama. Shared geometry and instancing bound GPU cost.
 * Coordinates: X horizontal, Y up (0 at surface), Z depth; swimmer stays Z=0.75.
 * All artwork is generated here; no extra assets or network requests.
 */
export function createUnderwaterWorld(THREE, {compact = false} = {}) {
  const root = new THREE.Group();
  root.name = 'Layered underwater reef';
  const worldY = depth => -depth * .28;
  const stone = new THREE.IcosahedronGeometry(1, 1);
  const ball = new THREE.SphereGeometry(1, 8, 5);
  const materials = ['#34535a','#456c67','#507c70','#233f4e'].map(color =>
    new THREE.MeshStandardMaterial({color, roughness: .95, flatShading: true}));
  const mesh = (geometry, material, x,y,z, sx=1,sy=1,sz=1) => {
    const object = new THREE.Mesh(geometry, material);
    object.position.set(x,y,z);object.scale.set(sx,sy,sz);root.add(object);return object;
  };
  // The far wall is real relief across three distances, visible through water fog.
  const placement=new THREE.Object3D();
  for (let layer=0;layer<3;layer++) {
    const wall=new THREE.InstancedMesh(stone,materials[layer===0?3:0],99);
    root.add(wall);let index=0;
    for (let row=0;row<9;row++) for(let col=0;col<11;col++) {
      const x=-55+col*11+Math.sin(row*2+col)*3;
      const y=-9-row*9;
      placement.position.set(x,y,-14-layer*13);
      placement.scale.set(6+Math.sin(col*3+row)*2,7+(col+row)%4,4+(col%3));
      placement.rotation.set(row*.13,col*.47,row*.21);placement.updateMatrix();
      wall.setMatrixAt(index++,placement.matrix);
    }
  }
  const sand = new THREE.MeshStandardMaterial({color:'#849b83',roughness:1,flatShading:true});
  // Irregular shelves frame the descent, leaving an open swimming corridor.
  const shelves=[];
  for(let level=0;level<8;level++) {
    const y=-7-level*8.4;
    for(const side of [-1,1]) {
      const x=side*(11+Math.sin(level*1.8)*2);
      const ledge=mesh(stone,materials[level%3],x,y,-3,7,2.5,7);
      ledge.rotation.z=side*.12;
      mesh(stone,sand,x,y+1.6,-2.5,5.5,.5,5);
      shelves.push({x,y:y+2,z:-1,level});
    }
  }
  const floorGeometry=new THREE.PlaneGeometry(130,90,44,30);
  floorGeometry.rotateX(-Math.PI/2);
  const fp=floorGeometry.attributes.position;
  for(let i=0;i<fp.count;i++)fp.setY(i,-70+Math.sin(fp.getX(i)*.18)*1.2+Math.cos(fp.getZ(i)*.24)*.8);
  floorGeometry.computeVertexNormals();mesh(floorGeometry,sand,0,0,-15);
  // Horizontal water surface seen from below, with an animated wave silhouette.
  const surfaceGeometry=new THREE.PlaneGeometry(150,110,48,30);surfaceGeometry.rotateX(-Math.PI/2);
  const surfaceMat=new THREE.MeshStandardMaterial({color:'#64d8d1',emissive:'#1a7f88',emissiveIntensity:.55,
    roughness:.88,metalness:0,side:THREE.DoubleSide,transparent:true,opacity:.86});
  mesh(surfaceGeometry,surfaceMat,0,2,-20);
  const surfacePositions=surfaceGeometry.attributes.position;
  const caustics=new THREE.Group();root.add(caustics);
  const causticMat=new THREE.MeshBasicMaterial({color:'#b9fff0',transparent:true,opacity:.07,depthWrite:false});
  const ring=new THREE.TorusGeometry(1,.022,4,20);
  const rp=ring.attributes.position;
  for(let i=0;i<rp.count;i++){const a=Math.atan2(rp.getY(i),rp.getX(i));const s=1+Math.sin(a*5)*.14;rp.setX(i,rp.getX(i)*s);rp.setY(i,rp.getY(i)*s);}
  for(let i=0;i<30;i++) {
    const c=new THREE.Mesh(ring,causticMat);c.rotation.x=-Math.PI/2;
    c.position.set(-34+(i*13)%69,1.8,-30+(i*17)%47);c.scale.set(1+(i%4),.6+(i%3)*.3,1);caustics.add(c);
  }
  // Soft gradient shafts, with no hard rectangular edges or fullscreen filter.
  const rayCanvas=document.createElement('canvas');rayCanvas.width=64;rayCanvas.height=128;
  const ctx=rayCanvas.getContext('2d');
  const g=ctx.createLinearGradient(0,0,64,0);g.addColorStop(0,'transparent');g.addColorStop(.5,'rgba(164,255,234,.5)');g.addColorStop(1,'transparent');
  ctx.fillStyle=g;ctx.fillRect(0,0,64,128);
  ctx.globalCompositeOperation='destination-in';const fade=ctx.createLinearGradient(0,0,0,128);
  fade.addColorStop(0,'transparent');fade.addColorStop(.55,'white');fade.addColorStop(1,'white');ctx.fillStyle=fade;ctx.fillRect(0,0,64,128);
  const rayTexture=new THREE.CanvasTexture(rayCanvas);
  const rayMat=new THREE.MeshBasicMaterial({map:rayTexture,transparent:true,opacity:.34,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending});
  const rays=new THREE.Group();root.add(rays);
  for(let i=0;i<8;i++) {
    const r=new THREE.Mesh(new THREE.PlaneGeometry(3+i%3,40),rayMat);
    r.position.set(-30+i*9,-17,-5-(i%3)*4);r.rotation.z=-.22; rays.add(r);
  }
  const kelp=[];
  const kelpMats=['#285e4c','#40785a','#477e65'].map(color=>new THREE.MeshStandardMaterial({color,roughness:.8,side:THREE.DoubleSide}));
  const bladeGeometry=new THREE.PlaneGeometry(.45,1,2,8);bladeGeometry.translate(0,.5,0);
  const bp=bladeGeometry.attributes.position;
  for(let i=0;i<bp.count;i++){
    const y=bp.getY(i);bp.setX(i,bp.getX(i)*Math.max(.03,Math.sin(Math.PI*y)*.9)+Math.sin(y*7)*.09);
    bp.setZ(i,Math.sin(y*5)*.12);
  }
  bladeGeometry.computeVertexNormals();
  for(const shelf of shelves) for(let k=0;k<(compact?4:7);k++) {
    const blade=new THREE.Mesh(bladeGeometry,kelpMats[k%3]);
    blade.position.set(shelf.x-5+k*1.5,shelf.y,shelf.z+(k%3)*1.1);
    blade.scale.set(.6+(k%3)*.3,2+(k*3+shelf.level)%5,1);blade.userData.phase=k+shelf.level;
    root.add(blade);kelp.push(blade);
  }
  // Branching coral on shelves rather than objects floating in open water.
  const coralMats=['#cc7b7c','#b58baf','#cda76a'].map(color=>new THREE.MeshStandardMaterial({color,roughness:.75}));
  for(const shelf of shelves) for(let k=0;k<4;k++) {
    const x=shelf.x-4+k*2.4;
    for(let b=0;b<3;b++) {
      const branch=mesh(ball,coralMats[(shelf.level+k)%3],x+(b-1)*.3,shelf.y+.4+(b===1?.3:0),-2,.18,.65+(b%2)*.4,.22);
      branch.rotation.z=(b-1)*-.5;
    }
  }
  // Foreground silhouettes establish camera depth without covering the swimmer.
  const foregroundMat=new THREE.MeshStandardMaterial({color:'#123d40',roughness:1});
  for(let i=0;i<12;i++)mesh(stone,foregroundMat,(i%2?1:-1)*(25+i%3*3),-5-i*5.7,5,4,3.5,2);
  const fishGeometry=new THREE.SphereGeometry(1,8,5);
  const tailGeometry=new THREE.ConeGeometry(.35,.65,3);tailGeometry.rotateZ(Math.PI/2);
  const fishMaterials=['#86bbad','#c8ad6f','#548d9a'].map(color=>new THREE.MeshStandardMaterial({color,roughness:.55}));
  const fish=[];
  const fishTargets=[];
  const healthGeometry=new THREE.PlaneGeometry(1,1);
  const healthBackground=new THREE.MeshBasicMaterial({color:'#172d34',depthWrite:false});
  const healthFill=new THREE.MeshBasicMaterial({color:'#efbe66',depthWrite:false});
  const catchableMat=new THREE.MeshStandardMaterial({color:'#e9b55c',emissive:'#60421b',emissiveIntensity:.35,roughness:.5});
  for(let i=0;i<(compact?24:42);i++) {
    const catchable=i<12;
    const f=new THREE.Group();const mat=catchable?catchableMat:fishMaterials[i%3];
    const body=new THREE.Mesh(fishGeometry,mat);body.scale.set(.46,.19,.13);f.add(body);
    const tail=new THREE.Mesh(tailGeometry,mat);tail.position.x=-.55;f.add(tail);
    f.userData={x:-28+(i*13)%56,y:-4-(i*7)%61,z:-5-(i%4)*3,phase:i*.71};root.add(f);fish.push(f);
    if(catchable){
      Object.assign(f.userData,{x:(i%2?-1:1)*(4+i%3),y:.6-i*5.7,z:.75});
      const target={id:i,x:f.userData.x,y:f.userData.y,radius:.65,captured:false,hp:3,maxHp:3,hitAt:-1000};
      f.userData.target=target;f.scale.setScalar(1.35);fishTargets.push(target);
      const bar=new THREE.Group();root.add(bar);
      const background=new THREE.Mesh(healthGeometry,healthBackground);background.scale.set(1.35,.2,1);bar.add(background);
      const fill=new THREE.Mesh(healthGeometry,healthFill);fill.scale.set(1.2,.1,1);fill.position.z=.01;bar.add(fill);
      f.userData.healthBar={bar,fill};
    }
  }
  // A fixed instance pool rises through the water; no per-frame allocations.
  const bubbleCount=compact?70:130;
  const bubbles=new THREE.InstancedMesh(ball,new THREE.MeshBasicMaterial({color:'#a9ece7',transparent:true,opacity:.32,depthWrite:false}),bubbleCount);
  bubbles.instanceMatrix.setUsage(THREE.DynamicDrawUsage);bubbles.frustumCulled=false;root.add(bubbles);
  const dummy=new THREE.Object3D();
  const dustCount=compact?160:320, dustPositions=new Float32Array(dustCount*3);
  for(let i=0;i<dustCount;i++){dustPositions[i*3]=-38+(i*17.31)%76;dustPositions[i*3+1]=-(i*13.17)%74;dustPositions[i*3+2]=-23+(i*3.37)%29;}
  const dustGeo=new THREE.BufferGeometry();dustGeo.setAttribute('position',new THREE.BufferAttribute(dustPositions,3));
  root.add(new THREE.Points(dustGeo,new THREE.PointsMaterial({color:'#9cdbd6',size:.045,transparent:true,opacity:.34,depthWrite:false})));
  const ambient=new THREE.HemisphereLight('#75d8df','#142e39',1.1);root.add(ambient);
  const sun=new THREE.DirectionalLight('#b7fff0',2.4);sun.position.set(-12,20,12);root.add(sun);
  const lamp=new THREE.PointLight('#b5ffff',6,12,1.6);root.add(lamp);
  return {root, worldY, fishTargets, update(time,depth,x,lightOn){
    for(let i=0;i<surfacePositions.count;i++)surfacePositions.setY(i,Math.sin(surfacePositions.getX(i)*.3+time*.7)*.18+Math.sin(surfacePositions.getZ(i)*.4-time*.5)*.12);
    surfacePositions.needsUpdate=true;surfaceGeometry.computeVertexNormals();
    caustics.position.x=Math.sin(time*.18)*.8;causticMat.opacity=.055+Math.sin(time*.7)*.015;
    rays.children.forEach((r,i)=>{r.rotation.z=-.22+Math.sin(time*.2+i)*.025;});
    kelp.forEach(k=>{k.rotation.z=Math.sin(time*.8+k.userData.phase)*.13;k.rotation.y=Math.sin(time*.35+k.userData.phase)*.3;});
    fish.forEach(f=>{
      const d=f.userData;f.visible=!d.target?.captured;
      f.position.set(d.x+Math.sin(time*.18+d.phase)*(d.target?1.5:6),d.y+Math.sin(time*.9+d.phase)*.3,d.z);
      f.rotation.y=Math.cos(time*.18+d.phase)>0?0:Math.PI;f.rotation.z=Math.sin(time*4+d.phase)*.035;
      if(d.target){
        d.target.x=f.position.x;d.target.y=f.position.y;
        const flash=Math.max(0,1-(time-d.target.hitAt)/.25);f.scale.setScalar(1.35+flash*.18);
        const {bar,fill}=d.healthBar;
        bar.visible=!d.target.captured&&(d.target.hp<d.target.maxHp||Math.hypot(d.target.x-x,d.target.y-worldY(depth))<6);
        bar.position.set(f.position.x,f.position.y+.7,1);
        const ratio=d.target.hp/d.target.maxHp;fill.scale.x=1.2*ratio;fill.position.x=-.6+.6*ratio;
      }
    });
    for(let i=0;i<bubbleCount;i++){
      const by=-72+((i*13.23+time*(.5+i%4*.18))%74);
      dummy.position.set(-28+(i*17.7)%56+Math.sin(time*.7+i)*.15,by,-10+(i*2.3)%16);
      dummy.scale.setScalar(.025+(i%5)*.014);dummy.updateMatrix();bubbles.setMatrixAt(i,dummy.matrix);
    }
    bubbles.instanceMatrix.needsUpdate=true;
    ambient.intensity=Math.max(.12,1.1-depth*.004);sun.intensity=2.4*Math.exp(-depth/65);
    lamp.visible=lightOn;lamp.position.set(x,worldY(depth)+.6,2);
  }};
}
