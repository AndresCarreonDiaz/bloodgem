// All tuning in one place. Research anchors (docs/research/): Bloodborne quickstep =
// 11 i-frames / 18f recovery; rally window 5s; ~50ms hit-stop sweet spot; victim
// freezes ~2 frames longer than attacker (Capcom's The Punisher); i-frames cancel on
// attack (Hades); aggro clamped so enemies never strike from off-screen (Tunic flaw).

export const VIEW_W = 480;
export const VIEW_H = 270;
export const TILE = 16;
export const TIER_H = 32; // world-z pixels per height tier
export const WALL_TIER = 9;

export const GRAVITY = 620;
export const STEP_UP = 10; // max z difference walkable without a ramp
export const AIR_FRICTION = 0.2;

export const PLAYER = {
  hp: 100,
  speed: 112,
  radius: 5,
  stamina: 100,
  staminaRegen: 42,
  staminaDelay: 0.35,
  dashDuration: 0.35,
  dashSpeed: 235,
  dashIFrames: 0.18, // front-loaded, cancelled if an attack is buffered out of the dash
  dashCost: 22,
  inputBuffer: 0.13,
  attack: { windup: 0.1, active: 0.1, recover: 0.2, dmg: 12, range: 26, arc: 1.9, cost: 16, hitStop: 3 },
  transformLock: 0.28,     // idle transform animation commit
  transformBonus: 1.35,    // a transform strike hits harder (the BB signature)
  shardCooldown: 0.55,
  shardSpeed: 460,
  shardChip: 3,
  visceralDmg: 62,
  visceralBossDmg: 90,
  visceralLock: 0.72,
  rallyWindow: 5.0,
  rallyRate: 0.65,
  respawnDelay: 1.6, // death-to-retry < 2s (Rubinite lesson)
  phials: 5,
  shardPouch: 12, // quicksilver — every parry attempt is spent metal
  phialHeal: 45,
  phialDrinkTime: 0.55, // animation-committed swig
};

export const RABBLE = {
  hp: 42,
  speed: 62,
  radius: 5,
  aggroRange: 150, // < 80% of half-viewport
  attackRange: 20,
  windup: 0.48,
  parryFlash: 0.12, // white flash this long before active frames
  active: 0.12,
  recover: 0.65,
  dmg: 15,
  arc: 1.6,
  range: 22,
  staggerTime: 2.2,
  stumbleTime: 0.4,
  hitStop: 3,
};

export const HOUND = {
  hp: 26,
  speed: 98,
  radius: 5,
  aggroRange: 190,
  lungeRange: 70,   // starts its lunge from this far out
  windup: 0.34,     // crouch — parryable
  lungeTime: 0.3,
  lungeSpeed: 265,
  recover: 0.55,
  dmg: 12,
};

export const WATCHMAN = {
  hp: 30,
  radius: 5,
  aggroRange: 235,  // long — the sniper that forces vertical thinking
  windup: 1.2,      // aim; the laser-sight line tracks then locks
  lockAt: 0.9,      // aim locks here — move in the last 0.3s to dodge
  recover: 1.6,
  dmg: 16,
  shotSpeed: 250,
};

export const HUSK = {
  // crystal-fused miner: slower, tougher, hits harder — same melee brain as rabble
  hp: 70,
  speed: 44,
  windup: 0.62,
  dmg: 20,
};

export const PRIEST = {
  hp: 24,
  speed: 58,
  radius: 5,
  fleeRange: 95,   // keeps this distance from the player
  healRadius: 95,
  healAmount: 8,
  healInterval: 2.6,
};

export const DUST: Record<string, number> = {
  rabble: 25, hound: 20, watchman: 30, priest: 40, husk: 35, chorister: 35,
};

export const BRUTE = {
  hp: 320,
  radius: 11,
  speed: 46,
  triggerRange: 130,
  slam: { windup: 0.85, radius: 36, dmg: 30, recover: 0.95 }, // parryable
  sweep: { windup: 0.55, range: 32, arc: 4.6, dmg: 22, active: 0.22, recover: 0.75 }, // dodge, not parryable
  charge: { windup: 0.6, speed: 290, maxTime: 1.1, dmg: 25, recover: 1.0, wallRecover: 1.7 },
  staggerTime: 2.8,
  gemdust: 300,
};

// THE SEAMSPLITTER — trick weapon. Two forms, toggled with Q; toggling
// mid-combo performs a transform strike (faster than a fresh heavy, harder
// than either form — mastery means weaving transforms into combos).
export interface WeaponForm {
  name: string; style: 'pick' | 'longpick' | 'rapier' | 'greatsword';
  windup: number; active: number; recover: number;
  dmg: number; range: number; arc: number; cost: number; hitStop: number;
}
export interface WeaponSet { id: string; a: WeaponForm; b: WeaponForm }
export const WEAPON_SETS: Record<string, WeaponSet> = {
  seamsplitter: {
    id: 'seamsplitter',
    a: { name: 'Seamsplitter — pick-hammer', style: 'pick', windup: 0.1, active: 0.1, recover: 0.2, dmg: 12, range: 26, arc: 1.9, cost: 16, hitStop: 3 },
    b: { name: 'Seamsplitter — long-haft pick', style: 'longpick', windup: 0.24, active: 0.14, recover: 0.34, dmg: 23, range: 39, arc: 2.5, cost: 27, hitStop: 6 },
  },
  facetblade: {
    id: 'facetblade',
    // Cassar's blade: needle-quick thrusts, or let the gem grow a greatsword around it
    a: { name: 'Facet Blade — rapier', style: 'rapier', windup: 0.08, active: 0.08, recover: 0.16, dmg: 10, range: 31, arc: 0.9, cost: 12, hitStop: 2 },
    b: { name: 'Facet Blade — crystal greatsword', style: 'greatsword', windup: 0.3, active: 0.16, recover: 0.44, dmg: 30, range: 36, arc: 3.0, cost: 32, hitStop: 7 },
  },
};

export const GRIST = {
  hp: 380,
  radius: 10,
  speed: 42,
  triggerRange: 120,
  sweep: { windup: 0.62, range: 42, arc: 4.8, dmg: 24, active: 0.24, recover: 0.8 }, // cart on chain — dash through
  slam: { windup: 0.9, radius: 30, dmg: 32, recover: 1.0 },                          // parryable
  hook: { windup: 0.7, minRange: 55, speed: 230, dmg: 10, recover: 0.9 },            // chain pull
  staggerTime: 2.6,
  gemdust: 500,
};

export const MOTHER = {
  hp: 450,
  radius: 12,
  speed: 34,
  triggerRange: 150,
  phase2At: 0.5,        // hp fraction — the eye opens
  phase2Haste: 0.72,    // wind-up/recover multiplier in phase 2
  claw: { windup: 0.7, range: 34, arc: 2.4, dmg: 26, recover: 0.8 }, // parryable
  ring: { windup: 0.9, count: 9, count2: 13, speed: 170, dmg: 14, recover: 1.0 },
  lance: { windup: 0.75, count: 3, spread: 0.22, speed: 300, dmg: 18, recover: 0.9 },
  staggerTime: 2.6,
  gemdust: 800,
};

export const JUICE = {
  victimExtraFreeze: 2 / 60,
  shakeHit: 3,
  shakeParry: 9,
  shakeVisceral: 6,
  shakeDecay: 0.86,
  slowMoVisceral: 0.3,
  slowMoTime: 0.25,
  whiteFlash: 2 / 60,
};

export const COLORS = {
  // scarlet is the reserved signal color — if it's red, it means something
  blood: '#9e1c2c',
  bloodBright: '#d43148',
  rally: '#d98a2b',
  stamina: '#5d7a52',
  bg: '#0a0709',
  floor0: '#1d1a22',
  floor1: '#28242e',
  floor2: '#332e3a',
  face: '#141118',
  wall: '#3d3545',
  ramp: '#2e2936',
  bone: '#b4a58c',
  lampGlow: '#e8b04a',
};
