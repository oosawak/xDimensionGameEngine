/** Lightweight, engine-independent controller for the side-view swim mode. */
export const UNDERWATER_MODE = Object.freeze({
  environmentMode: 'underwater',
  cameraMode: 'side',
  movementMode: 'swim2d'
});

export function createSwim2D(options = {}) {
  const state = {
    x: options.x ?? 0,
    depth: options.depth ?? 0,
    vx: 0,
    vy: 0,
    maxSpeed: options.maxSpeed ?? 7,
    acceleration: options.acceleration ?? 22,
    drag: options.drag ?? 3.8,
    depthMin: options.depthMin ?? -1,
    depthMax: options.depthMax ?? 240
  };
  return {
    state,
    step(input = {}, dt = 0) {
      const dx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
      const dy = (input.down ? 1 : 0) - (input.up ? 1 : 0);
      const boost = input.boost ? 1.45 : 1;
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
      state.x += state.vx * dt;
      state.depth = Math.max(state.depthMin, Math.min(state.depthMax, state.depth + state.vy * dt));
      if (state.depth === state.depthMin || state.depth === state.depthMax) state.vy = 0;
      return state;
    },
    reset(x = 0, depth = 0) {
      Object.assign(state, { x, depth, vx: 0, vy: 0 });
      return state;
    }
  };
}

export function underwaterPalette(depth) {
  const t = Math.max(0, Math.min(1, depth / 240));
  return {
    fog: [0.08 - t * 0.055, 0.35 - t * 0.22, 0.45 - t * 0.27],
    light: 1 - t * 0.72,
    haze: 0.008 + t * 0.026
  };
}
