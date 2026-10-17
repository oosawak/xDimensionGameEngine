/* HD-2D game simulation — C reference implementation, WebAssembly freestanding. */
#include <stdint.h>
#define EXPORT(name) __attribute__((export_name(name)))

static uint32_t current_map=0;
static float pos_x = 0.0f, pos_z = 3.5f, pos_y=0.0f, vy=0.0f;
static int on_ground=1, is_running=0;
static uint32_t ticks = 0, hits = 0;
/* Extra visual clearance ONLY on the camera-facing side of objects.
 * This is an optional presentation aid; the normal physical footprint is unchanged. */
static float view_x=0.65f, view_z=0.76f, view_margin=0.0f;
/* Generated collision geometry: same source as Three.js scene and Rust WASM. */
#include "world.generated.h"
#include "puzzle.generated.h"
static float clampf(float v,float a,float b){return v<a?a:(v>b?b:v);}
static float sqrt_approx(float x) {
  float y = x > 1.0f ? x : 1.0f;
  for(int i=0;i<6;i++) y = 0.5f*(y+x/y);
  return y;
}
EXPORT("set_view_collision") void set_view_collision(float x, float z, float margin){
  /* Treat the view vector as horizontal object-to-camera unit direction. */
  if(x*x+z*z > .001f){
    float len=sqrt_approx(x*x+z*z);
    view_x=x/len;view_z=z/len;
  }
  view_margin=clampf(margin,0.0f,2.0f);
}

static float absv(float v){return v<0?-v:v;}
static float mountain_road_z(float x){return x<=0.0f?-4.0f+(x+24.0f)*0.25f:2.0f+x*(5.0f/24.0f);}
static float mountain_height(float x,float z){
  float away=absv(z-mountain_road_z(x))-2.15f;
  if(away<0)away=0;
  float hill=away*away*.052f;if(hill>7.2f)hill=7.2f;
  float bridge=clampf((8.0f-absv(x))/6.0f,0.0f,1.0f)*.72f;
  if(absv(x)<AREA_1_RIVER_HALF_WIDTH && absv(z-AREA_1_RIVER_CENTER_Z)>AREA_1_BRIDGE_HALF_WIDTH)return -1.45f;
  return hill+bridge;
}
static float alpine_town_height(float x,float z){
  float ox=absv(x)-17.8f,oz=absv(z)-15.7f;
  if(ox<0)ox=0;if(oz<0)oz=0;
  float h=ox*oz*.075f;return h>3.0f?3.0f:h;
}
EXPORT("set_map") void set_map(uint32_t map){if(map<=2)current_map=map;}
EXPORT("get_map") uint32_t get_map(void){return current_map;}
static int extra_blocked(float x,float z){
  const float r=PLAYER_RADIUS;
  if(current_map==1){
    if(x<AREA_1_MINX||x>AREA_1_MAXX||z<AREA_1_MINZ||z>AREA_1_MAXZ)return 1;
    for(int i=0;i<AREA_1_TREES_COUNT;i++){
      float dx=x-area_1_trees[i][0],dz=z-area_1_trees[i][1];
      float rad=r+area_1_trees[i][2];if(dx*dx+dz*dz<rad*rad)return 1;
    }
    for(int i=0;i<AREA_1_ROCKS_COUNT;i++){
      float dx=x-area_1_rocks[i][0],dz=z-area_1_rocks[i][1];
      float rad=r+area_1_rocks[i][2];if(dx*dx+dz*dz<rad*rad)return 1;
    }
    if(absv(x)<AREA_1_RIVER_HALF_WIDTH+r && absv(z-AREA_1_RIVER_CENTER_Z)>AREA_1_BRIDGE_HALF_WIDTH-r-AREA_1_BRIDGE_RAIL_HALF_THICKNESS)return 1;
    return 0;
  }
  if(current_map==2){
    if(x<AREA_2_MINX||x>AREA_2_MAXX||z<AREA_2_MINZ||z>AREA_2_MAXZ)return 1;
    for(int i=0;i<AREA_2_HOUSES_COUNT;i++){
      const float *h=area_2_houses[i];
      float px=view_margin*view_x,pz=view_margin*view_z;
      float dx=x-clampf(x,h[0]-h[2]+(px<0?px:0),h[0]+h[2]+(px>0?px:0));
      float dz=z-clampf(z,h[1]-h[3]+(pz<0?pz:0),h[1]+h[3]+(pz>0?pz:0));
      if(dx*dx+dz*dz<r*r)return 1;
    }
    for(int i=0;i<AREA_2_TREES_COUNT;i++){
      float dx=x-area_2_trees[i][0],dz=z-area_2_trees[i][1];
      float rad=r+area_2_trees[i][2];if(dx*dx+dz*dz<rad*rad)return 1;
    }
    return 0;
  }
  return 0;
}
static int static_blocked(float x,float z) {
  if(current_map!=0)return extra_blocked(x,z);
  const float r = PLAYER_RADIUS;
  if(x < WORLD_MIN_X || x > WORLD_MAX_X || z < WORLD_MIN_Z || z > WORLD_MAX_Z) return 1;
  for(int i=0;i<HOUSE_COUNT;i++) {
    const float padX=view_margin*view_x, padZ=view_margin*view_z;
    /* Expand only the faces that look toward the camera. */
    const float loX=houses[i][0]-houses[i][2]+(padX<0.0f?padX:0.0f);
    const float hiX=houses[i][0]+houses[i][2]+(padX>0.0f?padX:0.0f);
    const float loZ=houses[i][1]-houses[i][3]+(padZ<0.0f?padZ:0.0f);
    const float hiZ=houses[i][1]+houses[i][3]+(padZ>0.0f?padZ:0.0f);
    float dx = x - clampf(x,loX,hiX);
    float dz = z - clampf(z,loZ,hiZ);
    if(dx*dx+dz*dz < r*r) return 1;
  }
  /* Stair-side masonry is solid, independent of the camera. Its two
   * AABBs stop the player's circular body from entering a step sideways. */
  for(int i=0;i<STAIR_WALL_COUNT;i++){
    const float *b=stair_walls[i];
    const float dx=x-clampf(x,b[0]-b[2],b[0]+b[2]);
    const float dz=z-clampf(z,b[1]-b[3],b[1]+b[3]);
    if(dx*dx+dz*dz < r*r) return 1;
  }
  /* Capsule: unchanged far side, camera-facing margin on the near side. */
  for(int i=-1;i<TREE_COUNT;i++) {
    const float cx=i<0?fountain[0]:trees[i][0];
    const float cz=i<0?fountain[1]:trees[i][1];
    const float radius=(i<0?fountain[2]:trees[i][2])+r;
    const float offsetX=x-cx,offsetZ=z-cz;
    const float along=clampf(offsetX*view_x+offsetZ*view_z,0.0f,view_margin);
    const float dx=offsetX-along*view_x,dz=offsetZ-along*view_z;
    if(dx*dx+dz*dz < radius*radius) return 1;
  }
  return 0;
}
/* v0.0.13: Moveable puzzle crates share the WASM collision authority. */
static int puzzle_free(uint32_t index,float x,float z){
  if(static_blocked(x,z))return 0;
  for(uint32_t j=0;j<PUZZLE_COUNT;j++){
    if(j==index)continue;
    float dx=x-puzzle_x[j],dz=z-puzzle_z[j];
    if(dx*dx+dz*dz<1.35f*1.35f)return 0;
  }
  return 1;
}
static int blocked(float x,float z){
  if(static_blocked(x,z))return 1;
  if(current_map==0){
    for(uint32_t j=0;j<PUZZLE_COUNT;j++){
      float dx=x-puzzle_x[j],dz=z-puzzle_z[j];
      if(dx*dx+dz*dz<1.32f*1.32f)return 1;
    }
  }
  return 0;
}
EXPORT("puzzle_count") uint32_t puzzle_count(void){return PUZZLE_COUNT;}
EXPORT("puzzle_x") float get_puzzle_x(uint32_t i){return i<PUZZLE_COUNT?puzzle_x[i]:0.0f;}
EXPORT("puzzle_z") float get_puzzle_z(uint32_t i){return i<PUZZLE_COUNT?puzzle_z[i]:0.0f;}
EXPORT("puzzle_reset") void puzzle_reset(void){
  for(uint32_t i=0;i<PUZZLE_COUNT;i++){
    puzzle_x[i]=puzzle_initial_x[i];puzzle_z[i]=puzzle_initial_z[i];
  }
}
EXPORT("puzzle_set") uint32_t puzzle_set(uint32_t i,float x,float z){
  if(i>=PUZZLE_COUNT||current_map!=0)return 0;
  if(x!=x||z!=z||x>20.0f||x< -20.0f||z<19.0f||z>58.0f)return 0;
  if(!puzzle_free(i,x,z))return 0;
  puzzle_x[i]=x;puzzle_z[i]=z;return 1;
}
/* Press E when standing on the correct side, then atomically push 1.5m.
 * Sweep the entire path to avoid teleporting through scenery or crates. */
EXPORT("puzzle_push") uint32_t puzzle_push(uint32_t i,int32_t sx,int32_t sz){
  if(i>=PUZZLE_COUNT||current_map!=0)return 0;
  if((sx!=0&&sz!=0)||((sx==0)==(sz==0))||sx< -1||sx>1||sz< -1||sz>1)return 0;
  float relx=puzzle_x[i]-pos_x,relz=puzzle_z[i]-pos_z;
  float along=relx*(float)sx+relz*(float)sz;
  float aside=absv(relx*(float)sz-relz*(float)sx);
  if(along<.67f||along>2.25f||aside>.85f)return 0;
  for(int j=1;j<=10;j++){
    float delta=PUZZLE_STEP*(float)j/10.0f;
    float x=puzzle_x[i]+(float)sx*delta,z=puzzle_z[i]+(float)sz*delta;
    if(x>20.0f||x< -20.0f||z<19.0f||z>58.0f||!puzzle_free(i,x,z))return 0;
  }
  puzzle_x[i]+=(float)sx*PUZZLE_STEP;
  puzzle_z[i]+=(float)sz*PUZZLE_STEP;
  return 1;
}
/* Height surfaces: a top deck reached by a continuous ramp (left lane)
 * or collision steps (right lane). Never derive collision from a camera angle. */
static float ground_at(float x, float z) {
  if(current_map==1)return mountain_height(x,z);
  if(current_map==2)return alpine_town_height(x,z);
  /* Upper residential deck and its downward-facing stair/ramp access. */
  if(x >= UPPER_DECK_X-UPPER_DECK_HALF_X && x <= UPPER_DECK_X+UPPER_DECK_HALF_X &&
     z >= UPPER_DECK_Z_MIN && z <= UPPER_DECK_Z_MAX) return UPPER_DECK_HEIGHT;
  if(x >= UPPER_ACCESS_X-UPPER_ACCESS_HALF_X && x <= UPPER_ACCESS_X+UPPER_ACCESS_HALF_X &&
     z >= UPPER_ACCESS_Z_MIN && z < UPPER_ACCESS_Z_MAX) {
    float t=(UPPER_ACCESS_Z_MAX-z)/(UPPER_ACCESS_Z_MAX-UPPER_ACCESS_Z_MIN);
    if(x>=UPPER_STAIRS_FROM_X){
      int k=(int)(t*(float)UPPER_STAIR_STEPS);
      if(k>=UPPER_STAIR_STEPS) k=UPPER_STAIR_STEPS-1;
      return ((float)(k+1)/(float)UPPER_STAIR_STEPS)*UPPER_DECK_HEIGHT;
    }
    return t*UPPER_DECK_HEIGHT;
  }
  /* Gently descend the original plaza on the way out to the next town.
   * This also allows the player to RETURN from the south without a cliff jump. */
  if(x >= SOUTH_ACCESS_X-SOUTH_ACCESS_HALF_X && x <= SOUTH_ACCESS_X+SOUTH_ACCESS_HALF_X &&
     z >= SOUTH_ACCESS_Z_MIN && z < SOUTH_ACCESS_Z_MAX) {
    float t=(SOUTH_ACCESS_Z_MAX-z)/(SOUTH_ACCESS_Z_MAX-SOUTH_ACCESS_Z_MIN);
    return t*DECK_HEIGHT;
  }
  if(x >= DECK_X-DECK_HALF_X && x <= DECK_X+DECK_HALF_X &&
     z >= DECK_Z_MIN && z <= DECK_Z_MAX) return DECK_HEIGHT;
  if(x >= ACCESS_X-ACCESS_HALF_X && x <= ACCESS_X+ACCESS_HALF_X &&
     z >= ACCESS_Z_MIN && z < ACCESS_Z_MAX) {
    float t=(z-ACCESS_Z_MIN)/(ACCESS_Z_MAX-ACCESS_Z_MIN);
    if(x>=STAIRS_FROM_X) {
      int k=(int)(t*(float)STAIR_STEPS);
      if(k>=STAIR_STEPS) k=STAIR_STEPS-1;
      return ((float)(k+1)/(float)STAIR_STEPS)*DECK_HEIGHT;
    }
    return t*DECK_HEIGHT;
  }
  return 0.0f;
}
static int can_enter(float x, float z) {
  if(blocked(x,z)) return 0;
  /* Can't enter a high platform sideways. Uphill walking must use access lane. */
  return ground_at(x,z) <= pos_y+MAX_STEP_UP;
}
static void vertical_step(float dt) {
  float surface=ground_at(pos_x,pos_z);
  if(on_ground && vy <= 0.0f && surface >= pos_y-0.26f) {
    pos_y=surface; vy=0; return;
  }
  on_ground=0;
  vy-=WORLD_GRAVITY*dt;
  pos_y+=vy*dt;
  if(pos_y<=surface) {pos_y=surface;vy=0.0f;on_ground=1;}
}
EXPORT("get_y") float get_y(void){return pos_y;}
EXPORT("get_ground_y") float get_ground_y(void){return ground_at(pos_x,pos_z);}
EXPORT("get_ground_y_at") float get_ground_y_at(float x,float z){return ground_at(x,z);}
EXPORT("is_grounded") uint32_t is_grounded(void){return (uint32_t)on_ground;}
EXPORT("set_running") void set_running(uint32_t running){is_running=running?1:0;}
EXPORT("jump_player") uint32_t jump_player(void){
  if(!on_ground)return 0;
  on_ground=0;vy=JUMP_VELOCITY;return 1;
}
EXPORT("engine_version") uint32_t engine_version(void){return 113;}
EXPORT("reset") void reset(float x,float z){
  if(blocked(x,z)){
    if(current_map==1){x=-23.5f;z=-4.0f;}
    else if(current_map==2){x=-23.0f;z=6.0f;}
    else{x=0.0f;z=3.5f;}
  }
  pos_x=x;pos_z=z;pos_y=ground_at(x,z);vy=0;on_ground=1;is_running=0;ticks=0;hits=0;
}
EXPORT("move_player") uint32_t move_player(float dx,float dz,float dt){
  ticks++;
  dt=clampf(dt,0.0f,0.05f);
  float mag2=dx*dx+dz*dz;
  if(mag2>1.0f){float mag=sqrt_approx(mag2);dx/=mag;dz/=mag;}
  float step=(is_running?5.94f:3.6f)*dt;
  uint32_t collided=0;
  float nx=pos_x+dx*step;
  if(!dx || can_enter(nx,pos_z))pos_x=nx;
  else if(dx!=0.0f){collided=1;hits++;}
  float nz=pos_z+dz*step;
  if(!dz || can_enter(pos_x,nz))pos_z=nz;
  else if(dz!=0.0f){collided=1;hits++;}
  vertical_step(dt);
  return collided;
}
EXPORT("get_x") float get_x(void){return pos_x;}
EXPORT("get_z") float get_z(void){return pos_z;}
EXPORT("get_frame_count") uint32_t get_frame_count(void){return ticks;}
EXPORT("get_collision_count") uint32_t get_collision_count(void){return hits;}
EXPORT("terrain_noise") float terrain_noise(int32_t x,int32_t z){
  uint32_t u=((uint32_t)x*374761393u)^((uint32_t)z*668265263u)^0x42f1b6a3u;
  u=(u^(u>>13))*1274126177u;
  u^=u>>16;
  return (float)(u & 0x00ffffffu)/16777215.0f;
}
