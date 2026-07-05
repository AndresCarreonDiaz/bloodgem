export interface Vec2 { x: number; y: number }
export interface Vec3 { x: number; y: number; z: number }

export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const len = (x: number, y: number) => Math.hypot(x, y);
export const dist = (a: Vec2, b: Vec2) => Math.hypot(a.x - b.x, a.y - b.y);
export const angleTo = (from: Vec2, to: Vec2) => Math.atan2(to.y - from.y, to.x - from.x);

export function norm(x: number, y: number): Vec2 {
  const l = Math.hypot(x, y);
  return l > 0.0001 ? { x: x / l, y: y / l } : { x: 0, y: 0 };
}

// smallest signed difference between two angles
export function angleDiff(a: number, b: number): number {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

// frame-rate independent exponential smoothing factor
export const damp = (rate: number, dt: number) => 1 - Math.exp(-rate * dt);
