// The Facet system: Maud cuts facets into your soul-gem at Vigil Lamps.
// Four branches × 3 ranks, escalating gemdust cost. Bloodgems are found perks
// that stack onto the same stat block. recomputeStats() rebuilds from base
// every time either changes.

export interface PlayerStats {
  maxHp: number;
  dmgMult: number;
  dashCost: number;
  iframes: number;
  shardChip: number;
  shardCd: number;
  dustMult: number;
  lifesteal: number;
  staminaRegen: number;
  speedMult: number;
  visceralMult: number;
  phialMult: number;
  rallyRate: number;
}

export const BASE_STATS: PlayerStats = {
  maxHp: 100,
  dmgMult: 1,
  dashCost: 22,
  iframes: 0.18,
  shardChip: 3,
  shardCd: 0.55,
  dustMult: 1,
  lifesteal: 0,
  staminaRegen: 42,
  speedMult: 1,
  visceralMult: 1,
  phialMult: 1,
  rallyRate: 0.65,
};

export interface SkillBranch {
  id: string;
  name: string;
  desc: string;
  apply: (s: PlayerStats) => void; // applied once per rank
}

export const SKILL_BRANCHES: SkillBranch[] = [
  { id: 'vigor', name: 'VIGOR', desc: '+25 max health', apply: (s) => { s.maxHp += 25; } },
  { id: 'ferocity', name: 'FEROCITY', desc: '+15% weapon damage', apply: (s) => { s.dmgMult += 0.15; } },
  { id: 'grace', name: 'GRACE', desc: 'longer dash i-frames, cheaper dashes', apply: (s) => { s.iframes += 0.025; s.dashCost = Math.max(10, s.dashCost - 3); } },
  { id: 'lithomancy', name: 'LITHOMANCY', desc: 'harder shards, faster shardcaster', apply: (s) => { s.shardChip += 2; s.shardCd *= 0.85; } },
];

export const MAX_RANK = 3;

export function skillCost(totalRanks: number): number {
  return 80 * (totalRanks + 1);
}

export interface Gem {
  id: string;
  name: string;
  desc: string;
  apply: (s: PlayerStats) => void;
}

export const GEMS: Record<string, Gem> = {
  'leech-facet': {
    id: 'leech-facet', name: 'Leech Facet', desc: '3% of damage dealt returns as health',
    apply: (s) => { s.lifesteal += 0.03; },
  },
  'whetstone': {
    id: 'whetstone', name: 'Whetstone Gem', desc: '+8% weapon damage',
    apply: (s) => { s.dmgMult += 0.08; },
  },
  'ticks-eye': {
    id: 'ticks-eye', name: "Tick's Eye", desc: '+10% quickness',
    apply: (s) => { s.speedMult += 0.1; },
  },
  'foremans-grip': {
    id: 'foremans-grip', name: "Foreman's Grip", desc: '+45% stamina recovery',
    apply: (s) => { s.staminaRegen *= 1.45; },
  },
  'serrated-facet': {
    id: 'serrated-facet', name: 'Serrated Facet', desc: '+15% rally recovery',
    apply: (s) => { s.rallyRate += 0.15; },
  },
  'hollow-facet': {
    id: 'hollow-facet', name: 'Hollow Facet', desc: '+35% visceral damage… phials heal 20% less (cursed)',
    apply: (s) => { s.visceralMult += 0.35; s.phialMult *= 0.8; },
  },
  'gilded-core': {
    id: 'gilded-core', name: 'Gilded Core', desc: '+25% gemdust… −10% max health (cursed)',
    apply: (s) => { s.dustMult += 0.25; s.maxHp = Math.round(s.maxHp * 0.9); },
  },
};

export function computeStats(ranks: Record<string, number>, gems: string[]): PlayerStats {
  const s: PlayerStats = { ...BASE_STATS };
  for (const b of SKILL_BRANCHES) {
    const r = ranks[b.id] ?? 0;
    for (let i = 0; i < r; i++) b.apply(s);
  }
  for (const g of gems) GEMS[g]?.apply(s);
  return s;
}
