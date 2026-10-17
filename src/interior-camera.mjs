/** Auto-fit a cutaway room into a perspective camera, regardless of viewport aspect.
 * Camera sits at lookAt + direction * distance. All units are world units.
 * This is a pure function used both by browser and regression tests.
 */
export function computeInteriorFitDistance({aspect,fovDeg,azimuth,elevation,margin=.80,focusY=1}) {
  const a=Math.max(.30,Number.isFinite(aspect)?aspect:1);
  const fov=Math.max(25,Math.min(75,Number.isFinite(fovDeg)?fovDeg:52));
  const safeMargin=Math.max(.6,Math.min(.95,Number.isFinite(margin)?margin:.80));
  const halfTan=Math.tan(fov*Math.PI/360);
  const cx=Math.cos(azimuth),sx=Math.sin(azimuth);
  const ce=Math.cos(elevation),se=Math.sin(elevation);
  // unit vectors: camera location, screen right, screen up
  const front=[sx*ce,se,cx*ce], right=[cx,0,-sx],up=[-sx*se,ce,-cx*se];
  let radius=5;
  // Walls including their thickness + slight spatial safety buffer.
  for(const x of [-4.30,4.30])for(const y of [-.25,3.30])for(const z of [-4.18,4.06]){
    const p=[x,y-focusY,z];
    const depth=p[0]*front[0]+p[1]*front[1]+p[2]*front[2];
    const horizontal=Math.abs(p[0]*right[0]+p[1]*right[1]+p[2]*right[2]);
    const vertical=Math.abs(p[0]*up[0]+p[1]*up[1]+p[2]*up[2]);
    radius=Math.max(radius,depth+horizontal/(halfTan*a*safeMargin),depth+vertical/(halfTan*safeMargin));
  }
  return Math.max(7,Math.min(96,radius));
}
