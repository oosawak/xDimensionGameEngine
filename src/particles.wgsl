// HD-2D Lab: future Rust/wgpu compute shader reference.
// Not dispatched by index.html; the web demo currently uses Three.js TSL
// to generate its own WGSL on the native WebGPU backend.
// Kept as a starting point for a future standalone Rust/wgpu renderer.
struct Particle {
    position: vec4<f32>,
    velocity: vec4<f32>,
};

struct Params {
    count: u32,
    kind: u32,         // 0 fireflies, 1 snow, 2 petals
    delta_seconds: f32,
    speed: f32,
};

@group(0) @binding(0) var<storage, read_write> particles: array<Particle>;
@group(0) @binding(1) var<uniform> params: Params;

@compute @workgroup_size(64)
fn update_particles(@builtin(global_invocation_id) gid: vec3<u32>) {
    let i = gid.x;
    if (i >= params.count) { return; }
    var particle = particles[i];
    let dt = min(params.delta_seconds, 0.05) * params.speed;
    if (params.kind == 1u) {
        particle.velocity.y = -1.1;
    } else if (params.kind == 2u) {
        particle.velocity.y = -0.38;
        particle.velocity.x = 0.12;
    }
    particle.position.xyz += particle.velocity.xyz * dt;
    if (particle.position.y > 4.4) { particle.position.y = 0.25; }
    if (particle.position.y < 0.15) { particle.position.y = 4.2; }
    if (particle.position.x > 14.0) { particle.position.x = -14.0; }
    if (particle.position.x < -14.0) { particle.position.x = 14.0; }
    if (particle.position.z > 11.0) { particle.position.z = -11.0; }
    if (particle.position.z < -11.0) { particle.position.z = 11.0; }
    particles[i] = particle;
}
