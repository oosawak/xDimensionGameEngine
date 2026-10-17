//! HD-2D game simulation — Rust implementation with the identical C WASM ABI.
//! Compile using cargo + wasm32-unknown-unknown, no JS glue or wasm-bindgen.
#![no_std]

static mut CURRENT_MAP: u32 = 0;
static mut POS_X: f32 = 0.0;
static mut POS_Z: f32 = 3.5;
static mut POS_Y: f32 = 0.0;
static mut VY: f32 = 0.0;
static mut GROUNDED: bool = true;
static mut RUNNING: bool = false;
static mut TICKS: u32 = 0;
static mut HITS: u32 = 0;
static mut VIEW_X:f32=0.65;
static mut VIEW_Z:f32=0.76;
static mut VIEW_MARGIN:f32=0.0;


include!("world.generated.rs");
include!("puzzle.generated.rs");
#[inline]
fn clampf(v:f32, a:f32, b:f32)->f32 { if v<a {a} else if v>b {b} else {v} }
#[inline]
fn sqrt_approx(x:f32)->f32 {
    let mut y=if x>1.0 {x} else {1.0};
    for _ in 0..6 {y=0.5*(y+x/y);}
    y
}
#[no_mangle]
pub extern "C" fn set_view_collision(x:f32,z:f32,margin:f32){
    unsafe {
        if x*x+z*z > 0.001 {
            let len=sqrt_approx(x*x+z*z);
            VIEW_X=x/len; VIEW_Z=z/len;
        }
        VIEW_MARGIN=clampf(margin,0.0,2.0);
    }
}
fn absv(v:f32)->f32 {if v<0.0{-v}else{v}}
fn mountain_road_z(x:f32)->f32 {if x<=0.0{-4.0+(x+24.0)*0.25}else{2.0+x*(5.0/24.0)}}
fn mountain_height(x:f32,z:f32)->f32 {
    let d=(absv(z-mountain_road_z(x))-2.15).max(0.0);
    let hill=(d*d*0.052).min(7.2);
    let bridge=clampf((8.0-absv(x))/6.0,0.0,1.0)*0.72;
    if absv(x)<AREA_1_RIVER_HALF_WIDTH&&absv(z-AREA_1_RIVER_CENTER_Z)>AREA_1_BRIDGE_HALF_WIDTH{return -1.45;}
    hill+bridge
}
fn alpine_town_height(x:f32,z:f32)->f32 {
    let ox=(absv(x)-17.8).max(0.0);
    let oz=(absv(z)-15.7).max(0.0);
    (ox*oz*0.075).min(3.0)
}
#[no_mangle] pub extern "C" fn set_map(id:u32){unsafe{if id<=2 {CURRENT_MAP=id;}}}
#[no_mangle] pub extern "C" fn get_map()->u32{unsafe{CURRENT_MAP}}
fn extra_blocked(map:u32,x:f32,z:f32)->bool {
    let r=PLAYER_RADIUS;
    if map==1 {
        if x<AREA_1_MINX||x>AREA_1_MAXX||z<AREA_1_MINZ||z>AREA_1_MAXZ{return true;}
        for &(cx,cz,rad) in &AREA_1_TREES {let dx=x-cx;let dz=z-cz;if dx*dx+dz*dz<(rad+r)*(rad+r){return true;}}
        for &(cx,cz,rad) in &AREA_1_ROCKS {let dx=x-cx;let dz=z-cz;if dx*dx+dz*dz<(rad+r)*(rad+r){return true;}}
        if absv(x)<AREA_1_RIVER_HALF_WIDTH+r&&absv(z-AREA_1_RIVER_CENTER_Z)>AREA_1_BRIDGE_HALF_WIDTH-r-AREA_1_BRIDGE_RAIL_HALF_THICKNESS{return true;}
        return false;
    }
    if map==2 {
        if x<AREA_2_MINX||x>AREA_2_MAXX||z<AREA_2_MINZ||z>AREA_2_MAXZ{return true;}
        unsafe {
            let pad_x=VIEW_MARGIN*VIEW_X;let pad_z=VIEW_MARGIN*VIEW_Z;
            for &(cx,cz,hx,hz) in &AREA_2_HOUSES {
                let dx=x-clampf(x,cx-hx+pad_x.min(0.0),cx+hx+pad_x.max(0.0));
                let dz=z-clampf(z,cz-hz+pad_z.min(0.0),cz+hz+pad_z.max(0.0));
                if dx*dx+dz*dz<r*r{return true;}
            }
        }
        for &(cx,cz,rad) in &AREA_2_TREES {let dx=x-cx;let dz=z-cz;if dx*dx+dz*dz<(rad+r)*(rad+r){return true;}}
        return false;
    }
    false
}
fn blocked_static(x:f32,z:f32)->bool {
    let map=unsafe{CURRENT_MAP};
    if map!=0{return extra_blocked(map,x,z);}

    let r=PLAYER_RADIUS;
    if x < WORLD_MIN_X || x > WORLD_MAX_X || z < WORLD_MIN_Z || z > WORLD_MAX_Z {return true;}
    unsafe {
        let vx=VIEW_X;
        let vz=VIEW_Z;
        let padX=VIEW_MARGIN*vx;
        let padZ=VIEW_MARGIN*vz;
        for &(cx,cz,hx,hz) in &HOUSES {
            let loX=cx-hx+padX.min(0.0);
            let hiX=cx+hx+padX.max(0.0);
            let loZ=cz-hz+padZ.min(0.0);
            let hiZ=cz+hz+padZ.max(0.0);
            let dx=x-clampf(x,loX,hiX);
            let dz=z-clampf(z,loZ,hiZ);
            if dx*dx+dz*dz < r*r {return true;}
        }
        for &(cx,cz,hx,hz) in &STAIR_WALLS {
            let dx=x-clampf(x,cx-hx,cx+hx);
            let dz=z-clampf(z,cz-hz,cz+hz);
            if dx*dx+dz*dz < r*r {return true;}
        }
        for i in 0..(TREES.len()+1) {
            let (cx,cz,rad)=if i==0 {FOUNTAIN} else {TREES[i-1]};
            let rx=x-cx;let rz=z-cz;
            let along=clampf(rx*vx+rz*vz,0.0,VIEW_MARGIN);
            let dx=rx-along*vx;let dz=rz-along*vz;
            let radius=rad+r;
            if dx*dx+dz*dz < radius*radius {return true;}
        }
    }
    false
}
// v0.0.13: dynamic moveable crates, matching the C WASM ABI.
fn puzzle_free(index:usize,x:f32,z:f32)->bool {
    if blocked_static(x,z){return false;}
    unsafe {
        for j in 0..PUZZLE_COUNT {
            if j==index {continue;}
            let dx=x-PUZZLE_X[j];let dz=z-PUZZLE_Z[j];
            if dx*dx+dz*dz<1.35*1.35{return false;}
        }
    }
    true
}
fn blocked(x:f32,z:f32)->bool {
    if blocked_static(x,z){return true;}
    if unsafe{CURRENT_MAP}==0 {
        unsafe {for j in 0..PUZZLE_COUNT {
            let dx=x-PUZZLE_X[j];let dz=z-PUZZLE_Z[j];
            if dx*dx+dz*dz<1.32*1.32{return true;}
        }}
    }
    false
}
#[no_mangle] pub extern "C" fn puzzle_count()->u32 {PUZZLE_COUNT as u32}
#[no_mangle] pub extern "C" fn puzzle_x(index:u32)->f32 {unsafe{if (index as usize)<PUZZLE_COUNT {PUZZLE_X[index as usize]}else{0.0}}}
#[no_mangle] pub extern "C" fn puzzle_z(index:u32)->f32 {unsafe{if (index as usize)<PUZZLE_COUNT {PUZZLE_Z[index as usize]}else{0.0}}}
#[no_mangle] pub extern "C" fn puzzle_reset(){
    unsafe {PUZZLE_X=PUZZLE_START_X;PUZZLE_Z=PUZZLE_START_Z;}
}
#[no_mangle] pub extern "C" fn puzzle_set(i:u32,x:f32,z:f32)->u32 {
    let index=i as usize;
    if index>=PUZZLE_COUNT||unsafe{CURRENT_MAP}!=0||!x.is_finite()||!z.is_finite()||x>20.0||x< -20.0||z<19.0||z>58.0||!puzzle_free(index,x,z){return 0;}
    unsafe {PUZZLE_X[index]=x;PUZZLE_Z[index]=z;} 1
}
#[no_mangle] pub extern "C" fn puzzle_push(i:u32,sx:i32,sz:i32)->u32 {
    let index=i as usize;
    if index>=PUZZLE_COUNT||unsafe{CURRENT_MAP}!=0||(sx!=0&&sz!=0)||(sx==0&&sz==0)||sx< -1||sx>1||sz< -1||sz>1{return 0;}
    unsafe {
        let relx=PUZZLE_X[index]-POS_X;let relz=PUZZLE_Z[index]-POS_Z;
        let along=relx*sx as f32+relz*sz as f32;
        let aside=absv(relx*sz as f32-relz*sx as f32);
        if along<0.67||along>2.25||aside>0.85{return 0;}
        for j in 1..=10 {
            let delta=PUZZLE_STEP*(j as f32)/10.0;
            let x=PUZZLE_X[index]+sx as f32*delta;
            let z=PUZZLE_Z[index]+sz as f32*delta;
            if x>20.0||x< -20.0||z<19.0||z>58.0||!puzzle_free(index,x,z){return 0;}
        }
        PUZZLE_X[index]+=sx as f32*PUZZLE_STEP;
        PUZZLE_Z[index]+=sz as f32*PUZZLE_STEP;
    }
    1
}
fn ground_at(x:f32,z:f32)->f32 {
    match unsafe{CURRENT_MAP}{1=>return mountain_height(x,z),2=>return alpine_town_height(x,z),_=>()};
    if x>=UPPER_DECK_X-UPPER_DECK_HALF_X && x<=UPPER_DECK_X+UPPER_DECK_HALF_X && z>=UPPER_DECK_Z_MIN && z<=UPPER_DECK_Z_MAX {return UPPER_DECK_HEIGHT;}
    if x>=UPPER_ACCESS_X-UPPER_ACCESS_HALF_X && x<=UPPER_ACCESS_X+UPPER_ACCESS_HALF_X && z>=UPPER_ACCESS_Z_MIN && z<UPPER_ACCESS_Z_MAX {
        let t=(UPPER_ACCESS_Z_MAX-z)/(UPPER_ACCESS_Z_MAX-UPPER_ACCESS_Z_MIN);
        if x>=UPPER_STAIRS_FROM_X {
            let k=((t*UPPER_STAIR_STEPS as f32) as i32).min(UPPER_STAIR_STEPS-1);
            return (k+1) as f32 / UPPER_STAIR_STEPS as f32 * UPPER_DECK_HEIGHT;
        }
        return t*UPPER_DECK_HEIGHT;
    }
    if x>=SOUTH_ACCESS_X-SOUTH_ACCESS_HALF_X && x<=SOUTH_ACCESS_X+SOUTH_ACCESS_HALF_X && z>=SOUTH_ACCESS_Z_MIN && z<SOUTH_ACCESS_Z_MAX {
        return (SOUTH_ACCESS_Z_MAX-z)/(SOUTH_ACCESS_Z_MAX-SOUTH_ACCESS_Z_MIN)*DECK_HEIGHT;
    }
    if x>=DECK_X-DECK_HALF_X && x<=DECK_X+DECK_HALF_X && z>=DECK_Z_MIN && z<=DECK_Z_MAX {return DECK_HEIGHT;}
    if x>=ACCESS_X-ACCESS_HALF_X && x<=ACCESS_X+ACCESS_HALF_X && z>=ACCESS_Z_MIN && z<ACCESS_Z_MAX {
        let t=(z-ACCESS_Z_MIN)/(ACCESS_Z_MAX-ACCESS_Z_MIN);
        if x>=STAIRS_FROM_X {
            let k=((t*STAIR_STEPS as f32) as i32).min(STAIR_STEPS-1);
            return (k+1) as f32/STAIR_STEPS as f32*DECK_HEIGHT;
        }
        return t*DECK_HEIGHT;
    }
    0.0
}
fn can_enter(x:f32,z:f32,y:f32)->bool {!blocked(x,z) && ground_at(x,z)<=y+MAX_STEP_UP}
#[no_mangle]
pub extern "C" fn get_y()->f32{unsafe{POS_Y}}
#[no_mangle]
pub extern "C" fn get_ground_y()->f32{unsafe{ground_at(POS_X,POS_Z)}}
#[no_mangle]
pub extern "C" fn get_ground_y_at(x:f32,z:f32)->f32{ground_at(x,z)}
#[no_mangle]
pub extern "C" fn is_grounded()->u32{unsafe{GROUNDED as u32}}
#[no_mangle]
pub extern "C" fn set_running(running:u32){unsafe{RUNNING=running!=0;}}
#[no_mangle]
pub extern "C" fn jump_player()->u32{
    unsafe{
        if !GROUNDED{return 0;}
        GROUNDED=false;VY=JUMP_VELOCITY;1
    }
}
#[no_mangle]
pub extern "C" fn engine_version()->u32 {213}
#[no_mangle]
pub extern "C" fn reset(x:f32,z:f32) {
    let (x,z)=if blocked(x,z) {match unsafe{CURRENT_MAP}{1=>(-23.5,-4.0),2=>(-23.0,6.0),_=>(0.0,3.5)}} else {(x,z)};
    unsafe { POS_X=x;POS_Z=z;POS_Y=ground_at(x,z);VY=0.0;GROUNDED=true;RUNNING=false;TICKS=0;HITS=0; }
}
#[no_mangle]
pub extern "C" fn move_player(mut dx:f32,mut dz:f32,dt:f32)->u32 {
    let dt=clampf(dt,0.0,0.05);
    let mag2=dx*dx+dz*dz;
    if mag2>1.0 {let mag=sqrt_approx(mag2);dx/=mag;dz/=mag;}
    unsafe {
        TICKS=TICKS.wrapping_add(1);
        let step=if RUNNING {5.94*dt} else {3.6*dt};
        let mut collided=0;
        let nx=POS_X+dx*step;
        if dx==0.0 || can_enter(nx,POS_Z,POS_Y) {POS_X=nx;}
        else if dx!=0.0 {collided=1;HITS=HITS.wrapping_add(1);}
        let nz=POS_Z+dz*step;
        if dz==0.0 || can_enter(POS_X,nz,POS_Y) {POS_Z=nz;}
        else if dz!=0.0 {collided=1;HITS=HITS.wrapping_add(1);}
        let surface=ground_at(POS_X,POS_Z);
        if GROUNDED && VY<=0.0 && surface>=POS_Y-0.26 {
            POS_Y=surface;VY=0.0;
        } else {
            GROUNDED=false;
            VY-=WORLD_GRAVITY*dt;
            POS_Y+=VY*dt;
            if POS_Y<=surface {POS_Y=surface;VY=0.0;GROUNDED=true;}
        }
        collided
    }
}
#[no_mangle]
pub extern "C" fn get_x()->f32 {unsafe{POS_X}}
#[no_mangle]
pub extern "C" fn get_z()->f32 {unsafe{POS_Z}}
#[no_mangle]
pub extern "C" fn get_frame_count()->u32 {unsafe{TICKS}}
#[no_mangle]
pub extern "C" fn get_collision_count()->u32 {unsafe{HITS}}
#[no_mangle]
pub extern "C" fn terrain_noise(x:i32,z:i32)->f32 {
    let mut u=(x as u32).wrapping_mul(374_761_393)
        ^(z as u32).wrapping_mul(668_265_263)^0x42f1_b6a3;
    u=(u^(u>>13)).wrapping_mul(1_274_126_177);
    u ^=u>>16;
    (u&0x00ff_ffff) as f32/16_777_215.0
}
