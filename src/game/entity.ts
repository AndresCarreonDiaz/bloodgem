// Shared entity model (CrossCode-style): x/y are ground-plane coords, z is height.
// Movement only touches x/y; z belongs to the gravity integrator. Per-entity
// freeze timers implement asymmetric hit-stop (victim freezes longer than attacker).

import { GRAVITY, STEP_UP, TIER_H } from './constants';
import type { Level } from './level';
import type { Vec3 } from '../engine/math';

export interface Entity {
  pos: Vec3;
  vel: Vec3;
  radius: number;
  airborne: boolean;
  freezeT: number;    // hit-stop: skip updates while > 0
  flashT: number;     // white flash on being hit
}

export const tierOf = (e: Entity) => Math.round(e.pos.z / TIER_H);
export const sameTier = (a: Entity, b: Entity) => Math.abs(a.pos.z - b.pos.z) < TIER_H / 2;

// Move along the ground with heightmap rules: blocked by rises > STEP_UP,
// walking off a ledge transitions to airborne (one-way drop-downs for free).
export function moveGrounded(e: Entity, lvl: Level, dx: number, dy: number) {
  if (dx !== 0) {
    const nx = e.pos.x + dx;
    const gz = lvl.groundZAt(nx + Math.sign(dx) * e.radius, e.pos.y);
    if (gz <= e.pos.z + STEP_UP) {
      e.pos.x = nx;
      settleZ(e, lvl);
    }
  }
  if (dy !== 0) {
    const ny = e.pos.y + dy;
    const gz = lvl.groundZAt(e.pos.x, ny + Math.sign(dy) * e.radius);
    if (gz <= e.pos.z + STEP_UP) {
      e.pos.y = ny;
      settleZ(e, lvl);
    }
  }
}

function settleZ(e: Entity, lvl: Level) {
  const gz = lvl.groundZAt(e.pos.x, e.pos.y);
  if (gz > e.pos.z - 4) {
    e.pos.z = gz; // walking up/down ramps and small steps
  } else {
    e.airborne = true; // walked off a ledge
  }
}

// gravity integration while airborne; returns true on the landing frame
export function applyGravity(e: Entity, lvl: Level, dt: number): boolean {
  if (!e.airborne) return false;
  e.vel.z -= GRAVITY * dt;
  e.pos.z += e.vel.z * dt;
  const gz = lvl.groundZAt(e.pos.x, e.pos.y);
  if (e.pos.z <= gz) {
    e.pos.z = gz;
    e.vel.z = 0;
    e.airborne = false;
    return true;
  }
  return false;
}

export function separate(a: Entity, b: Entity) {
  if (!sameTier(a, b)) return;
  const dx = b.pos.x - a.pos.x;
  const dy = b.pos.y - a.pos.y;
  const d = Math.hypot(dx, dy);
  const min = a.radius + b.radius;
  if (d > 0.001 && d < min) {
    const push = (min - d) / 2;
    const nx = dx / d, ny = dy / d;
    a.pos.x -= nx * push; a.pos.y -= ny * push;
    b.pos.x += nx * push; b.pos.y += ny * push;
  }
}
