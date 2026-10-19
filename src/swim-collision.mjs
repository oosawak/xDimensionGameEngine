/** Static triangle-mesh collisions for a vertical capsule on the swim plane.
 * No render-loop allocations; geometry is transformed and cached on map entry.
 * C/Rust land physics is independent. Future WASM needs only cached triangles
 * plus capsule coordinates, not Three.js objects or access to the scene.
 */
export function sphereHitsTriangle(p,r,a,b,c){
  const abx=b.x-a.x,aby=b.y-a.y,abz=b.z-a.z;
  const acx=c.x-a.x,acy=c.y-a.y,acz=c.z-a.z;
  const apx=p.x-a.x,apy=p.y-a.y,apz=p.z-a.z;
  const d1=abx*apx+aby*apy+abz*apz,d2=acx*apx+acy*apy+acz*apz;
  let qx,qy,qz;
  if(d1<=0&&d2<=0){qx=a.x;qy=a.y;qz=a.z;}
  else{
    const bpx=p.x-b.x,bpy=p.y-b.y,bpz=p.z-b.z;
    const d3=abx*bpx+aby*bpy+abz*bpz,d4=acx*bpx+acy*bpy+acz*bpz;
    if(d3>=0&&d4<=d3){qx=b.x;qy=b.y;qz=b.z;}
    else{
      const vc=d1*d4-d3*d2;
      if(vc<=0&&d1>=0&&d3<=0){const v=d1/(d1-d3);qx=a.x+v*abx;qy=a.y+v*aby;qz=a.z+v*abz;}
      else{
        const cpx=p.x-c.x,cpy=p.y-c.y,cpz=p.z-c.z;
        const d5=abx*cpx+aby*cpy+abz*cpz,d6=acx*cpx+acy*cpy+acz*cpz;
        if(d6>=0&&d5<=d6){qx=c.x;qy=c.y;qz=c.z;}
        else{
          const vb=d5*d2-d1*d6;
          if(vb<=0&&d2>=0&&d6<=0){const w=d2/(d2-d6);qx=a.x+w*acx;qy=a.y+w*acy;qz=a.z+w*acz;}
          else{
            const va=d3*d6-d5*d4;
            if(va<=0&&d4-d3>=0&&d5-d6>=0){
              const w=(d4-d3)/((d4-d3)+(d5-d6));qx=b.x+w*(c.x-b.x);qy=b.y+w*(c.y-b.y);qz=b.z+w*(c.z-b.z);
            }else{
              const total=va+vb+vc;
              if(Math.abs(total)<1e-15)return false; // zero-area faces carry no surface
              const v=vb/total,w=vc/total;qx=a.x+abx*v+acx*w;qy=a.y+aby*v+acy*w;qz=a.z+abz*v+acz*w;
            }
          }
        }
      }
    }
  }
  return (p.x-qx)**2+(p.y-qy)**2+(p.z-qz)**2<=r*r;
}

export function createSwimTriangleCollider(groups,{z=.75,radius=.32}={}){
  const point={x:0,y:0,z};const offsets=[.32,.72,1.12];
  return (x,depth)=>{
    const footY=-depth*.28;
    for(const group of groups){
      const b=group.bounds;
      if(x+radius<b.minX||x-radius>b.maxX||footY+1.44<b.minY||footY>b.maxY||z+radius<b.minZ||z-radius>b.maxZ)continue;
      point.x=x;
      for(const offset of offsets){
        point.y=footY+offset;
        for(const triangle of group.triangles)if(sphereHitsTriangle(point,radius,triangle[0],triangle[1],triangle[2]))return true;
      }
    }
    return false;
  };
}

export function createSwimMeshCollider(THREE,meshes){
  const groups=[];
  for(const mesh of meshes){
    mesh.updateWorldMatrix(true,false);
    const position=mesh.geometry.attributes.position,index=mesh.geometry.index;
    const triangles=[],bounds=new THREE.Box3();
    const count=index?index.count:position.count;
    for(let i=0;i<count;i+=3){
      const triangle=[];
      for(let k=0;k<3;k++){
        const vertex=new THREE.Vector3().fromBufferAttribute(position,index?index.getX(i+k):i+k).applyMatrix4(mesh.matrixWorld);
        bounds.expandByPoint(vertex);triangle.push(vertex);
      }
      triangles.push(triangle);
    }
    groups.push({triangles,bounds:{minX:bounds.min.x,minY:bounds.min.y,minZ:bounds.min.z,maxX:bounds.max.x,maxY:bounds.max.y,maxZ:bounds.max.z}});
  }
  return createSwimTriangleCollider(groups);
}
