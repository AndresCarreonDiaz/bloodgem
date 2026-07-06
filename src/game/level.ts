// Level model: heightmap grid (tier per tile, 9 = wall) + ramp regions (stairs),
// ladders, LOCKED GATES (the shortcut-loop payoff), ELEVATORS (moving ground),
// and level-to-level transitions. groundZAt() is the single source of truth for
// elevation; gates and elevator platforms plug into it so movement rules stay
// uniform. Tier semantics: 0 = canal/galleries, 1 = streets, 2 = ramparts.

import { TILE, TIER_H, WALL_TIER } from './constants';

export interface Ramp {
  x0: number; y0: number; x1: number; y1: number; // tile bounds, inclusive
  dir: 'N' | 'S' | 'E' | 'W'; // walking this direction goes UP
  lowZ: number;
  highZ: number;
}

export interface Ladder {
  tx: number; ty: number;   // base cell (on the LOW tier)
  topTy: number;            // cell you arrive at on the high tier
  lowZ: number;
  highZ: number;
  // a pulled-up ladder: unusable until kicked down from the TOP (the Dark
  // Souls shortcut — the loop clicks from the far side)
  locked?: boolean;
  id?: string;
}

export interface Gate {
  id: string;
  tx: number; ty: number; w: number; h: number; // tile rect, solid while closed
  // px rect you must stand in to unlock it (the "wrong side" of a loop)
  unlock: { x0: number; y0: number; x1: number; y1: number } | null;
  auto: 'brute' | null; // opens automatically on this flag instead
  open: boolean;
  label: string;
}

export interface Elevator {
  id: string;
  tx: number; ty: number; w: number; h: number; // platform tile rect
  lowZ: number;
  highZ: number;
  z: number;          // runtime height
  home: number;       // build position — restored when the world re-wakes
  target: number | null; // height it is moving toward
}

export interface Transition {
  x0: number; y0: number; x1: number; y1: number; // px rect
  target: LevelName;
  entry: string;
}

export interface LampDef { x: number; y: number }
export interface PickupDef { x: number; y: number; gem: string }
export type PropType = 'crate' | 'barrel' | 'stall' | 'post' | 'crystal' | 'cart' | 'beam' | 'grave' | 'gallows';
export type DecalType = 'blood' | 'moss' | 'crack' | 'rubble';
export interface DecalSeed { x: number; y: number; z: number; r: number; type: DecalType }
export interface MatOverride { x0: number; y0: number; x1: number; y1: number; tex: string }
export interface NpcDef { id: string; x: number; y: number }
export interface SecretWall {
  id: string;
  tx: number; ty: number; w: number; h: number; // sealed cells (wall until broken)
  revealTier: number;
  broken: boolean;
}
export interface PropDef { x: number; y: number; type: PropType }
export type EnemyKindName = 'rabble' | 'hound' | 'watchman' | 'priest' | 'husk' | 'chorister';
export interface SpawnDef { x: number; y: number; kind: EnemyKindName; waypoints?: { x: number; y: number }[] }

export type LevelName = 'ember' | 'undervein';

export interface Palette {
  floor0: string; floor1: string; floor2: string;
  face: string; wall: string; ramp: string;
  darkness: number;
}

const EMBER_PALETTE: Palette = {
  floor0: '#161b1e', floor1: '#28242e', floor2: '#332e3a',
  face: '#141118', wall: '#3d3545', ramp: '#2e2936', darkness: 0.52,
};
const UNDERVEIN_PALETTE: Palette = {
  floor0: '#1c1216', floor1: '#2b1c20', floor2: '#38262a',
  face: '#120b0e', wall: '#40282e', ramp: '#2b1e22', darkness: 0.62,
};

export class Level {
  readonly w: number;
  readonly h: number;
  readonly tiers: Uint8Array;
  readonly ramps: Ramp[] = [];
  readonly ladders: Ladder[] = [];
  readonly lamps: LampDef[] = [];
  readonly spawns: SpawnDef[] = [];
  readonly gates: Gate[] = [];
  readonly elevators: Elevator[] = [];
  readonly transitions: Transition[] = [];
  readonly entries: Record<string, { x: number; y: number }> = {};
  name: LevelName = 'ember';
  title = '';
  ambience = 'amb_ember_row';
  palette: Palette = EMBER_PALETTE;
  playerSpawn = { x: 0, y: 0 };
  bruteSpawn: { x: number; y: number } | null = null;
  motherSpawn: { x: number; y: number } | null = null;
  gristSpawn: { x: number; y: number } | null = null;
  cassarSpawn: { x: number; y: number } | null = null;
  readonly pickups: PickupDef[] = [];
  readonly props: PropDef[] = [];
  readonly decalSeeds: DecalSeed[] = [];
  readonly matOverrides: MatOverride[] = [];
  readonly secrets: SecretWall[] = [];
  readonly npcs: NpcDef[] = [];

  breakSecret(sec: SecretWall) {
    sec.broken = true;
    this.rect(sec.tx, sec.ty, sec.tx + sec.w - 1, sec.ty + sec.h - 1, sec.revealTier);
  }

  texFor(tx: number, ty: number): string | null {
    for (const m of this.matOverrides)
      if (tx >= m.x0 && tx <= m.x1 && ty >= m.y0 && ty <= m.y1) return m.tex;
    return null;
  }

  seedDecals(list: [number, number, number, DecalType][]) {
    for (const [x, y, r, type] of list) {
      this.decalSeeds.push({ x, y, z: this.groundZAt(x, y), r, type });
    }
  }

  constructor(w: number, h: number) {
    this.w = w;
    this.h = h;
    this.tiers = new Uint8Array(w * h);
  }

  get pixelW() { return this.w * TILE; }
  get pixelH() { return this.h * TILE; }

  tierAt(tx: number, ty: number): number {
    if (tx < 0 || ty < 0 || tx >= this.w || ty >= this.h) return WALL_TIER;
    return this.tiers[ty * this.w + tx];
  }

  rect(x0: number, y0: number, x1: number, y1: number, tier: number) {
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++)
        this.tiers[y * this.w + x] = tier;
  }

  rampAtTile(tx: number, ty: number): Ramp | null {
    for (const r of this.ramps)
      if (tx >= r.x0 && tx <= r.x1 && ty >= r.y0 && ty <= r.y1) return r;
    return null;
  }

  groundZAt(wx: number, wy: number): number {
    const tx = Math.floor(wx / TILE);
    const ty = Math.floor(wy / TILE);

    for (const g of this.gates) {
      if (!g.open && tx >= g.tx && tx < g.tx + g.w && ty >= g.ty && ty < g.ty + g.h) {
        return WALL_TIER * TIER_H;
      }
    }
    for (const e of this.elevators) {
      if (tx >= e.tx && tx < e.tx + e.w && ty >= e.ty && ty < e.ty + e.h) return e.z;
    }

    const ramp = this.rampAtTile(tx, ty);
    if (ramp) {
      let t = 0;
      const px0 = ramp.x0 * TILE, py0 = ramp.y0 * TILE;
      const px1 = (ramp.x1 + 1) * TILE, py1 = (ramp.y1 + 1) * TILE;
      if (ramp.dir === 'N') t = (py1 - wy) / (py1 - py0);
      else if (ramp.dir === 'S') t = (wy - py0) / (py1 - py0);
      else if (ramp.dir === 'W') t = (px1 - wx) / (px1 - px0);
      else t = (wx - px0) / (px1 - px0);
      return ramp.lowZ + (ramp.highZ - ramp.lowZ) * Math.max(0, Math.min(1, t));
    }
    return this.tierAt(tx, ty) * TIER_H;
  }

  ladderNear(wx: number, wy: number): Ladder | null {
    const tx = Math.floor(wx / TILE);
    const ty = Math.floor(wy / TILE);
    for (const l of this.ladders)
      if (tx === l.tx && (ty === l.ty || ty === l.topTy)) return l;
    return null;
  }

  elevatorAt(wx: number, wy: number): Elevator | null {
    const tx = Math.floor(wx / TILE);
    const ty = Math.floor(wy / TILE);
    for (const e of this.elevators)
      if (tx >= e.tx && tx < e.tx + e.w && ty >= e.ty && ty < e.ty + e.h) return e;
    return null;
  }
}

const T = TILE;

// ---------------------------------------------------------------------------
// LEVEL 1 — EMBER ROW. Chapel terrace hub (t2) over Chapel Square (t1); upper
// streets with the hunt-mob patrol; rooftop + rampart watchman pockets (t2);
// Gallows Square with the Chained Brute; a canal underlayer (t0) along the
// south and up the west edge; the locked West Gate loop (canal → dock alcove →
// gate clicks open beside the chapel); the Great Chain elevator (t1↔t2); and
// the Minehead Gate east, which opens when the Brute falls → The Undervein.
// ---------------------------------------------------------------------------
export function buildEmberRow(): Level {
  const lvl = new Level(72, 52);
  lvl.name = 'ember';
  lvl.title = 'EMBER ROW';
  lvl.ambience = 'amb_ember_row';
  lvl.palette = EMBER_PALETTE;

  lvl.rect(0, 0, 71, 51, WALL_TIER);
  lvl.rect(2, 2, 69, 49, 1);                    // streets everywhere, carved below

  // chapel terrace (hub, t2) + parapet with stair gap
  lvl.rect(2, 2, 19, 10, 2);
  lvl.rect(2, 11, 19, 11, WALL_TIER);
  lvl.rect(10, 11, 13, 11, 2);                  // gap above the chapel stairs
  lvl.ramps.push({ x0: 10, y0: 12, x1: 13, y1: 14, dir: 'N', lowZ: TIER_H, highZ: TIER_H * 2 });

  // rooftop pocket (t2) with ladder from the street
  lvl.rect(30, 2, 40, 7, 2);
  lvl.rect(30, 8, 40, 8, WALL_TIER);
  lvl.rect(34, 8, 35, 8, 2);                    // ladder-top gap
  lvl.ladders.push({ tx: 34, ty: 9, topTy: 8, lowZ: TIER_H, highZ: TIER_H * 2 });

  // east rampart (t2) with drop gap + the Great Chain elevator
  lvl.rect(58, 2, 69, 9, 2);
  lvl.rect(58, 10, 69, 10, WALL_TIER);
  lvl.rect(60, 10, 60, 10, 2);                  // kicked-ladder gap
  lvl.rect(62, 10, 63, 10, 2);                  // drop-down gap
  lvl.rect(66, 10, 67, 10, 2);                  // elevator arrival gap
  // pulled-up ladder over Gallows Square: kick it down from the rampart top
  // and the elevator loop closes into a full circuit
  lvl.ladders.push({ tx: 60, ty: 11, topTy: 10, lowZ: TIER_H, highZ: TIER_H * 2, locked: true, id: 'gallows-ladder' });
  lvl.elevators.push({ id: 'great-chain', tx: 66, ty: 11, w: 2, h: 2, lowZ: TIER_H, highZ: TIER_H * 2, z: TIER_H, home: TIER_H, target: null });

  // the painted row-house blocks (public/maps/ember.png) — the city is
  // streets between buildings now, not an empty plaza
  lvl.rect(12, 21, 25, 35, WALL_TIER);
  lvl.rect(36, 22, 54, 34, WALL_TIER);
  lvl.rect(64, 18, 69, 26, WALL_TIER); // the corner house east of Gallows Square

  // canal underlayer (t0): south band + west arm
  lvl.rect(2, 40, 69, 47, 0);
  lvl.rect(2, 16, 6, 47, 0);
  // dock alcove (t1) reached only from the canal ladder — the wrong side of the gate
  lvl.rect(2, 12, 6, 15, 1);
  lvl.ladders.push({ tx: 4, ty: 16, topTy: 15, lowZ: 0, highZ: TIER_H });
  // the West Gate: opens only from the alcove side — loop 1 clicks here
  lvl.gates.push({
    id: 'west-gate', tx: 7, ty: 12, w: 1, h: 4,
    unlock: { x0: 2 * T, y0: 12 * T, x1: 7 * T, y1: 16 * T },
    auto: null, open: false, label: 'THE GATE GRINDS OPEN',
  });

  // stairs: plaza → canal band (two, for route variety)
  lvl.ramps.push({ x0: 30, y0: 37, x1: 33, y1: 39, dir: 'N', lowZ: 0, highZ: TIER_H });
  lvl.rect(30, 37, 33, 39, 0);
  lvl.ramps.push({ x0: 56, y0: 37, x1: 59, y1: 39, dir: 'N', lowZ: 0, highZ: TIER_H });
  lvl.rect(56, 37, 59, 39, 0);
  // ladder out of the canal, east
  lvl.ladders.push({ tx: 64, ty: 40, topTy: 39, lowZ: 0, highZ: TIER_H });

  // Minehead Gate: opens when the Brute falls → The Undervein
  lvl.gates.push({
    id: 'minehead-gate', tx: 68, ty: 30, w: 1, h: 3,
    unlock: null, auto: 'brute', open: false, label: 'THE MINEHEAD GATE OPENS',
  });
  lvl.rect(68, 29, 69, 29, WALL_TIER);          // gate flanks sealed —
  lvl.rect(68, 33, 69, 33, WALL_TIER);          // no walking around the Minehead Gate
  lvl.transitions.push({ x0: 69 * T, y0: 30 * T, x1: 70 * T, y1: 33 * T, target: 'undervein', entry: 'from-ember' });
  lvl.entries['start'] = { x: 8 * T, y: 8 * T };
  lvl.entries['from-undervein'] = { x: 67 * T, y: 31.5 * T };

  lvl.lamps.push({ x: 8 * T, y: 6 * T });       // Vigil Chapel
  lvl.playerSpawn = { x: 8 * T, y: 8 * T };

  // the hunt mob: a torch procession patrolling the upper streets, with a
  // Sable Priest keeping them frenzied — kill the priest first, or go around
  const mobRoute = [
    { x: 16 * T, y: 19 * T }, { x: 52 * T, y: 19 * T },
    { x: 52 * T, y: 20 * T }, { x: 16 * T, y: 20 * T },
  ];
  lvl.spawns.push(
    { x: 26 * T, y: 19 * T, kind: 'rabble', waypoints: mobRoute },
    { x: 30 * T, y: 19 * T, kind: 'rabble', waypoints: mobRoute },
    { x: 34 * T, y: 19 * T, kind: 'rabble', waypoints: mobRoute },
    { x: 38 * T, y: 19 * T, kind: 'rabble', waypoints: mobRoute },
    { x: 32 * T, y: 21 * T, kind: 'priest', waypoints: mobRoute },
    // the teach pair: first fight, fully visible at the foot of the chapel stairs
    { x: 17 * T, y: 16 * T, kind: 'rabble' },
    { x: 18.5 * T, y: 18 * T, kind: 'rabble' },
    { x: 29 * T, y: 22 * T, kind: 'hound' },
    // the ambush lesson: a hound waiting behind the market stall
    { x: 34 * T, y: 29 * T, kind: 'hound' },
    { x: 50 * T, y: 44 * T, kind: 'hound' },
    { x: 34 * T, y: 7 * T, kind: 'watchman' },   // rooftop edge, covers the mob street
    { x: 62 * T, y: 9 * T, kind: 'watchman' },   // rampart edge, covers Gallows Square
  );

  lvl.bruteSpawn = { x: 61 * T, y: 29 * T };     // Gallows Square
  lvl.cassarSpawn = { x: 64 * T, y: 5 * T };     // east rampart — after the Brute falls

  // the living (what's left of them)
  lvl.npcs.push(
    { id: 'maud', x: 11 * T, y: 7 * T },          // beside the chapel lamp
    { id: 'sissel', x: 33.5 * T, y: 21 * T },     // under her lamp post, mid-street
    { id: 'verne', x: 65 * T, y: 29 * T + 8 },    // haunting the Minehead Gate
    { id: 'broker', x: 3 * T + 8, y: 13 * T },    // dock alcove — for the lucid only
    { id: 'dunhill', x: 4 * T, y: 19 * T },       // his barge, west canal dock
  );

  // bloodgem caches: reward the climbs and the dark corners
  lvl.pickups.push(
    { x: 38 * T, y: 4 * T, gem: 'whetstone' },     // rooftop pocket
    { x: 3 * T, y: 46 * T, gem: 'gilded-core' },   // canal west arm dead-end
  );

  // the Canal Hollow: a bricked-up alcove behind a cracked wall — strike it
  lvl.rect(24, 48, 27, 49, 0);                    // the hollow itself
  lvl.rect(24, 48, 27, 48, WALL_TIER);            // sealed until broken
  lvl.secrets.push({ id: 'canal-hollow', tx: 24, ty: 48, w: 4, h: 1, revealTier: 0, broken: false });
  lvl.pickups.push({ x: 25.5 * T, y: 49 * T + 6, gem: 'ticks-eye' });
  lvl.seedDecals([[25.5 * T, 47 * T + 10, 8, 'crack'], [26.5 * T, 47 * T + 4, 5, 'crack']]);

  // street furniture — the city was alive this morning
  const props: [number, number, PropDef['type']][] = [
    [5, 4, 'grave'], [13, 3, 'grave'], [16, 5, 'grave'],          // chapel yard
    [21, 13, 'post'], [40, 13, 'post'], [55, 13, 'post'],
    [24, 27, 'stall'], [30, 30, 'stall'], [38, 26, 'barrel'],     // market plaza
    [25, 31, 'barrel'], [26, 31, 'crate'], [45, 33, 'crate'],
    [56, 20, 'post'], [22, 36, 'crate'], [58, 30, 'barrel'],
    [8, 42, 'crate'], [9, 44, 'crate'], [30, 45, 'barrel'],       // canal docks
    [50, 42, 'crate'], [63, 45, 'barrel'], [12, 46, 'barrel'],
    [33, 21, 'post'], [46, 22, 'post'],
  ];
  for (const [px, py, type] of props) lvl.props.push({ x: px * T + 8, y: py * T + 12, type });
  // the gallows themselves — Gallows Square earns its name
  lvl.props.push({ x: 58 * T, y: 26 * T, type: 'gallows' });
  lvl.props.push({ x: 63 * T + 6, y: 27 * T, type: 'gallows' });

  // the executioner's paving is older than the streets around it
  lvl.matOverrides.push({ x0: 42, y0: 26, x1: 62, y1: 36, tex: 'tex_flagstone' });

  // environmental storytelling: they dragged the bodies to the canal
  lvl.seedDecals([
    [59 * T + 4, 28 * T, 6, 'blood'], [60 * T, 30 * T, 4, 'blood'],
    [60 * T, 33 * T + 6, 5, 'blood'], [59 * T, 35 * T, 4, 'blood'],
    [58 * T + 8, 37 * T, 4, 'blood'], [58 * T + 8, 38 * T + 8, 6, 'blood'],
    // weathering scattered through the district
    [10 * T, 14 * T, 5, 'moss'], [26 * T, 17 * T, 4, 'moss'], [58 * T, 21 * T, 6, 'moss'],
    [8 * T, 30 * T, 5, 'moss'], [30 * T, 33 * T, 4, 'moss'], [62 * T, 24 * T, 5, 'moss'],
    [28 * T, 21 * T, 7, 'crack'], [31 * T, 28 * T, 6, 'crack'], [59 * T, 17 * T, 7, 'crack'],
    [29 * T, 42 * T, 5, 'moss'], [46 * T, 45 * T, 6, 'moss'], [15 * T, 44 * T, 6, 'crack'],
  ]);

  return lvl;
}

// ---------------------------------------------------------------------------
// LEVEL 2 — THE UNDERVEIN. The minehead platform (t2) hangs over black
// galleries (t0); the cargo lift drops the full 64px in one ride; the Gantry
// (t1 scaffold ring) crosses the caverns with choristers chanting on it;
// husk miners wade the flooded floor. Red crystal light instead of gas.
// ---------------------------------------------------------------------------
export function buildUndervein(): Level {
  const lvl = new Level(56, 44);
  lvl.name = 'undervein';
  lvl.title = 'THE UNDERVEIN';
  lvl.ambience = 'amb_undervein';
  lvl.palette = UNDERVEIN_PALETTE;

  lvl.rect(0, 0, 55, 43, WALL_TIER);
  lvl.rect(2, 2, 53, 41, 0);                    // black galleries

  // minehead platform (t2) — you arrive here from Ember Row
  lvl.rect(2, 2, 16, 8, 2);
  lvl.lamps.push({ x: 6 * T, y: 5 * T });        // The Winch-House lamp
  lvl.entries['from-ember'] = { x: 12 * T, y: 5 * T };
  lvl.playerSpawn = { x: 12 * T, y: 5 * T };
  lvl.transitions.push({ x0: 14 * T, y0: 2 * T, x1: 16 * T, y1: 4 * T, target: 'ember', entry: 'from-undervein' });

  // the cargo lift: minehead (t2) straight down to the gallery floor (t0)
  lvl.elevators.push({ id: 'cargo-lift', tx: 8, ty: 9, w: 2, h: 2, lowZ: 0, highZ: TIER_H * 2, z: TIER_H * 2, home: TIER_H * 2, target: null });

  // the Heartseam chamber wears its crown of crystal
  for (const [cx, cy] of [[43, 4], [46, 3], [51, 3], [53, 6], [52, 14], [44, 14]] as [number, number][]) {
    lvl.props.push({ x: cx * T + 8, y: cy * T + 12, type: 'crystal' });
  }

  // the Gantry: scaffold ring (t1) crossing the caverns
  lvl.rect(20, 12, 44, 14, 1);
  lvl.rect(30, 15, 32, 30, 1);
  lvl.rect(20, 26, 44, 28, 1);
  lvl.ladders.push({ tx: 22, ty: 15, topTy: 14, lowZ: 0, highZ: TIER_H });
  lvl.ladders.push({ tx: 42, ty: 29, topTy: 28, lowZ: 0, highZ: TIER_H });

  // Heartseam chamber (NE) — MOTHER OF FACETS waits before the seam
  lvl.rect(42, 2, 53, 16, 0);
  lvl.motherSpawn = { x: 48 * T, y: 8 * T };
  lvl.lamps.push({ x: 48 * T, y: 38 * T });      // The Sluice lamp

  lvl.gristSpawn = { x: 32 * T, y: 27 * T }; // holds the lower Gantry walk

  const uprops: [number, number, PropDef['type']][] = [
    [4, 10, 'cart'], [11, 12, 'cart'], [7, 22, 'crystal'], [16, 34, 'crystal'],
    [24, 20, 'beam'], [38, 20, 'beam'], [24, 32, 'beam'], [40, 34, 'crystal'],
    [46, 30, 'crystal'], [50, 18, 'crystal'], [10, 38, 'crate'], [20, 40, 'barrel'],
    [44, 8, 'crystal'], [47, 12, 'crystal'], [35, 38, 'cart'],
  ];
  for (const [px, py, type] of uprops) lvl.props.push({ x: px * T + 8, y: py * T + 12, type });

  lvl.seedDecals([
    [10 * T, 16 * T, 6, 'rubble'], [22 * T, 24 * T, 5, 'rubble'], [36 * T, 18 * T, 6, 'rubble'],
    [44 * T, 36 * T, 7, 'rubble'], [16 * T, 28 * T, 5, 'crack'], [28 * T, 36 * T, 7, 'crack'],
    [40 * T, 22 * T, 6, 'crack'], [48 * T, 28 * T, 5, 'rubble'], [12 * T, 36 * T, 6, 'rubble'],
    [50 * T, 14 * T, 5, 'crack'], [33 * T, 10 * T, 5, 'rubble'], [20 * T, 34 * T, 4, 'rubble'],
  ]);

  lvl.spawns.push(
    { x: 18 * T, y: 20 * T, kind: 'husk' },
    { x: 36 * T, y: 34 * T, kind: 'husk' },
    { x: 48 * T, y: 22 * T, kind: 'husk' },
    { x: 26 * T, y: 38 * T, kind: 'husk' },
    { x: 50 * T, y: 10 * T, kind: 'husk' },      // antechamber guard
    { x: 24 * T, y: 13 * T, kind: 'chorister' }, // gantry snipers
    { x: 40 * T, y: 27 * T, kind: 'chorister' },
    { x: 31 * T, y: 22 * T, kind: 'chorister' },
    { x: 14 * T, y: 30 * T, kind: 'hound' },
  );

  return lvl;
}

export function buildLevel(name: LevelName): Level {
  return name === 'ember' ? buildEmberRow() : buildUndervein();
}
