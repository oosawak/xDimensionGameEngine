/** Motion in world units per second for the WebGL simulation. */
export const PARTICLE_MOTION_PRESETS={
  petal:  {fall:-.38,drift:.13,sway:.52,swayRate:1.65,bob:.035,bobRate:1.1},
  firefly:{fall: .01,drift:.015,sway:.16,swayRate:1.28,bob:.23,bobRate:1.8},
  leaf:   {fall:-.67,drift:.19,sway:.68,swayRate:2.28,bob:.06,bobRate:1.2},
  snow:   {fall:-1.05,drift:.05,sway:.19,swayRate:.72,bob:.015,bobRate:.9}
};
export function particleVelocity(mode,time,index){
  const c=PARTICLE_MOTION_PRESETS[mode]??PARTICLE_MOTION_PRESETS.firefly;
  const phase=index*.783;
  return {
    x:c.drift+c.sway*Math.sin(time*c.swayRate+phase),
    y:c.fall+c.bob*Math.sin(time*c.bobRate+index*2.31),
    z:c.sway*.58*Math.cos(time*c.swayRate*.83+index*1.11)
  };
}
