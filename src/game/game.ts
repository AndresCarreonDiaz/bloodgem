// Game orchestration: combat resolution, shard projectiles, viscerals, rally,
// gemdust drop/recovery, death & sub-2s respawn, hit-stop and slow-mo.

import { PLAYER, RABBLE, HOUND, WATCHMAN, BRUTE, MOTHER, GRIST, PRIEST, DUST, JUICE, TIER_H, COLORS } from './constants';
import { buildLevel, type Level, type LevelName } from './level';
import { Player } from './player';
import { Enemy } from './enemy';
import { Brute } from './brute';
import { Mother } from './mother';
import { Grist } from './grist';
import { Cassar, CASSAR } from './cassar';
import { GEMS, SKILL_BRANCHES, MAX_RANK, skillCost } from './skills';
import { DIALOG } from './dialog';
import { separate, sameTier, tierOf } from './entity';
import { Particles } from '../engine/particles';
import { Camera } from '../engine/camera';
import type { Input } from '../engine/input';
import { angleDiff, angleTo, dist } from '../engine/math';

export interface Shard {
  x: number; y: number; z: number;
  vx: number; vy: number;
  life: number;
}

export interface DustDrop { x: number; y: number; z: number; amount: number; level: LevelName }

export interface EnemyShot {
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  life: number;
  dmg: number;
}

export type Combatant = Enemy | Brute | Mother | Grist | Cassar;

export interface FloatText { x: number; y: number; z: number; text: string; life: number; color: string }

export class Game {
  lvl: Level = buildLevel('ember');
  player = new Player();
  enemies: Enemy[] = [];
  brute: Brute | null = null;
  mother: Mother | null = null;
  grist: Grist | null = null;
  cassar: Cassar | null = null;
  gristHook: { x: number; y: number; vx: number; vy: number; life: number } | null = null;
  shards: Shard[] = [];
  enemyShots: EnemyShot[] = [];
  dustDrop: DustDrop | null = null;
  particles = new Particles();
  camera = new Camera();
  texts: FloatText[] = [];

  timeScale = 1;
  events: string[] = []; // drained each frame by the audio layer
  private slowMoT = 0;
  deathT = 0; // respawn countdown while > 0
  decals: { x: number; y: number; z: number; r: number }[] = [];

  // world state that survives level transitions and deaths
  flags = {
    bruteDefeated: false, motherDefeated: false, gristDefeated: false, cassarDefeated: false,
    gatesOpen: new Set<string>(), gemsTaken: new Set<string>(),
    laddersDropped: new Set<string>(), seenVista: false,
    secretsBroken: new Set<string>(),
  };
  vistaT: number | null = null; // scripted camera pan on first Undervein arrival
  lucidity = 0; // insight: knowing is its own affliction
  areaTitle: { text: string; t: number } | null = null;
  fadeT = 0;
  menuOpen = false;
  dialogue: { name: string; lines: string[]; idx: number; npcId?: string } | null = null;
  paused = false;
  private menuCd = 0; // blocks the lamp from re-opening off the menu-close keypress
  endingChoice = false;
  ending: 'shatter' | 'seal' | null = null;
  heartseam: { x: number; y: number } | null = null;

  constructor() {
    const startLevel = this.loadSave();
    this.loadLevel(startLevel, 'start');
  }

  private loadSave(): LevelName {
    try {
      const raw = localStorage.getItem('bloodgem-save');
      if (!raw) return 'ember';
      const d = JSON.parse(raw);
      this.player.gemdust = d.gemdust ?? 0;
      this.player.skillRanks = d.skillRanks ?? {};
      this.player.gems = d.gems ?? [];
      this.player.ownedWeapons = d.weapons ?? ['seamsplitter'];
      if (d.weaponSet && this.player.ownedWeapons.includes(d.weaponSet)) this.player.weaponSet = d.weaponSet;
      this.player.recomputeStats();
      this.player.hp = this.player.stats.maxHp;
      this.flags.bruteDefeated = !!d.flags?.bruteDefeated;
      this.flags.motherDefeated = !!d.flags?.motherDefeated;
      this.flags.gristDefeated = !!d.flags?.gristDefeated;
      this.flags.cassarDefeated = !!d.flags?.cassarDefeated;
      this.flags.gatesOpen = new Set(d.flags?.gatesOpen ?? []);
      this.flags.gemsTaken = new Set(d.flags?.gemsTaken ?? []);
      this.flags.laddersDropped = new Set(d.flags?.laddersDropped ?? []);
      this.flags.seenVista = !!d.flags?.seenVista;
      this.flags.secretsBroken = new Set(d.flags?.secretsBroken ?? []);
      this.lucidity = d.lucidity ?? 0;
      return d.level === 'undervein' ? 'undervein' : 'ember';
    } catch {
      return 'ember';
    }
  }

  save() {
    try {
      localStorage.setItem('bloodgem-save', JSON.stringify({
        gemdust: this.player.gemdust,
        lucidity: this.lucidity,
        skillRanks: this.player.skillRanks,
        gems: this.player.gems,
        weapons: this.player.ownedWeapons,
        weaponSet: this.player.weaponSet,
        level: this.lvl.name,
        flags: {
          bruteDefeated: this.flags.bruteDefeated,
          motherDefeated: this.flags.motherDefeated,
          gristDefeated: this.flags.gristDefeated,
          cassarDefeated: this.flags.cassarDefeated,
          gatesOpen: [...this.flags.gatesOpen],
          gemsTaken: [...this.flags.gemsTaken],
          laddersDropped: [...this.flags.laddersDropped],
          seenVista: this.flags.seenVista,
          secretsBroken: [...this.flags.secretsBroken],
        },
      }));
    } catch { /* private mode etc. — saving is a nicety */ }
  }

  loadLevel(name: LevelName, entryId: string) {
    this.lvl = buildLevel(name);
    const entry = this.lvl.entries[entryId] ?? this.lvl.playerSpawn;
    this.lvl.playerSpawn = { ...entry };
    for (const g of this.lvl.gates) if (this.flags.gatesOpen.has(g.id)) g.open = true;
    for (const l of this.lvl.ladders) if (l.id && this.flags.laddersDropped.has(l.id)) l.locked = false;
    for (const sec of this.lvl.secrets) if (this.flags.secretsBroken.has(sec.id)) this.lvl.breakSecret(sec);
    this.brute = null;
    if (this.lvl.bruteSpawn) {
      this.brute = new Brute(this.lvl.bruteSpawn.x, this.lvl.bruteSpawn.y, this.lvl);
      if (this.flags.bruteDefeated) {
        this.brute.defeated = true;
        this.brute.setState('dead');
      }
    }
    this.grist = null;
    this.gristHook = null;
    if (this.lvl.gristSpawn) {
      this.grist = new Grist(this.lvl.gristSpawn.x, this.lvl.gristSpawn.y, this.lvl);
      if (this.flags.gristDefeated) {
        this.grist.defeated = true;
        this.grist.setState('dead');
      }
    }
    this.cassar = null;
    // the rival only shows himself once the way to the seam is open
    if (this.lvl.cassarSpawn && this.flags.bruteDefeated && !this.flags.cassarDefeated) {
      this.cassar = new Cassar(this.lvl.cassarSpawn.x, this.lvl.cassarSpawn.y, this.lvl);
    }
    this.mother = null;
    this.heartseam = null;
    if (this.lvl.motherSpawn) {
      this.mother = new Mother(this.lvl.motherSpawn.x, this.lvl.motherSpawn.y, this.lvl);
      if (this.flags.motherDefeated) {
        this.mother.defeated = true;
        this.mother.setState('dead');
        this.heartseam = { x: this.lvl.motherSpawn.x + 32, y: this.lvl.motherSpawn.y - 64 };
      }
    }
    this.shards = [];
    this.enemyShots = [];
    this.decals = this.lvl.decalSeeds.map((d) => ({ ...d }));
    this.texts = [];
    this.spawnEnemies();
    this.player.pos = { x: entry.x, y: entry.y, z: this.lvl.groundZAt(entry.x, entry.y) };
    this.player.airborne = false;
    // arriving mid-action must not carry momentum into the new level
    this.player.dashT = 0;
    this.player.attack = null;
    this.player.drinkT = 0;
    this.player.climbing = null;
    if (name === 'undervein' && !this.flags.seenVista) this.vistaT = 0;
    this.camera.x = entry.x - 320;
    this.camera.y = entry.y - 180;
    this.areaTitle = { text: this.lvl.title, t: 3 };
    this.fadeT = 0.9;
    this.events.push(`level_${name}`);
  }

  private spawnEnemies() {
    this.enemies = this.lvl.spawns.map((s) => new Enemy(s.x, s.y, this.lvl, s.kind, s.waypoints));
    this.brute?.reset(this.lvl);
    this.mother?.reset(this.lvl);
    this.grist?.reset(this.lvl);
    this.cassar?.reset(this.lvl);
    for (const el of this.lvl.elevators) {
      el.z = el.home;
      el.target = null;
    }
  }

  get combatants(): Combatant[] {
    const list: Combatant[] = [...this.enemies];
    if (this.brute?.alive) list.push(this.brute);
    if (this.mother?.alive) list.push(this.mother);
    if (this.grist?.alive) list.push(this.grist);
    if (this.cassar?.alive) list.push(this.cassar);
    return list;
  }

  get activeBoss(): { name: string; hp: number; maxHp: number } | null {
    if (this.brute?.active && this.brute.alive) return { name: 'THE CHAINED BRUTE', hp: this.brute.hp, maxHp: this.brute.maxHp };
    if (this.mother?.active && this.mother.alive) return { name: 'MOTHER OF FACETS', hp: this.mother.hp, maxHp: this.mother.maxHp };
    if (this.grist?.active && this.grist.alive) return { name: 'FOREMAN GRIST, HOLLOWED', hp: this.grist.hp, maxHp: this.grist.maxHp };
    if (this.cassar?.active && this.cassar.alive) return { name: 'CASSAR, THE RIVAL', hp: this.cassar.hp, maxHp: this.cassar.maxHp };
    return null;
  }

  buySkill(i: number) {
    const b = SKILL_BRANCHES[i];
    if (!b) return;
    const rank = this.player.skillRanks[b.id] ?? 0;
    const total = Object.values(this.player.skillRanks).reduce((a, v) => a + v, 0);
    const cost = skillCost(total);
    if (rank >= MAX_RANK || this.player.gemdust < cost) return;
    this.player.gemdust -= cost;
    this.player.skillRanks[b.id] = rank + 1;
    this.player.recomputeStats();
    this.events.push('pickup');
    this.save();
  }

  closeMenu() {
    if (!this.menuOpen) return;
    this.menuOpen = false;
    this.menuCd = 0.35;
    this.events.push('menu_close');
  }

  chooseEnding(which: 'shatter' | 'seal') {
    if (!this.endingChoice) return;
    this.endingChoice = false;
    this.ending = which;
    this.events.push('ending');
  }

  update(dt: number, input: Input, aimWorld: { x: number; y: number }) {
    if (this.menuOpen || this.endingChoice || this.ending || this.dialogue || this.paused) return; // menus pause the hunt
    this.menuCd = Math.max(0, this.menuCd - dt);
    if (this.slowMoT > 0) {
      this.slowMoT -= dt;
      if (this.slowMoT <= 0) this.timeScale = 1;
    }
    const sdt = dt * this.timeScale;
    const wasDashing = this.player.dashT > 0;

    // visceral claims the attack press before the normal swing path can consume it
    if (!this.player.dead) this.resolveVisceral(input);
    this.player.update(sdt, input, this.lvl, aimWorld);
    if (!wasDashing && this.player.dashT > 0) {
      this.events.push('dash');
      this.particles.burst(this.player.pos.x, this.player.pos.y, this.player.pos.z, 6, '#6a6058', 45);
    }
    if (this.player.transformed) {
      this.player.transformed = false;
      this.events.push('transform');
    }
    if (this.player.heavySwung) {
      this.player.heavySwung = false;
      this.events.push('whoosh_heavy');
    }
    if (this.player.stepped) {
      this.player.stepped = false;
      const onWood = this.lvl.name === 'undervein' && Math.round(this.player.pos.z / TIER_H) === 1;
      this.events.push(onWood ? 'step_wood' : 'step_stone');
    }
    for (const e of this.enemies) e.update(sdt, this.lvl, this.player);
    this.brute?.update(sdt, this.lvl, this.player, this.events);
    this.mother?.update(sdt, this.lvl, this.player, this.events);
    this.grist?.update(sdt, this.lvl, this.player, this.events);
    this.cassar?.update(sdt, this.lvl, this.player, this.events);
    this.resolveBruteAttacks();
    this.resolveCassarAttacks();
    this.resolveMotherAttacks();
    this.resolveGristAttacks(sdt);
    this.resolveWatchmanShots(sdt);
    this.particles.update(sdt);

    for (let i = 0; i < this.enemies.length; i++) {
      for (let j = i + 1; j < this.enemies.length; j++)
        if (this.enemies[i].alive && this.enemies[j].alive) separate(this.enemies[i], this.enemies[j]);
      if (this.enemies[i].alive && !this.player.dead) separate(this.enemies[i], this.player);
    }
    if (this.brute?.alive && !this.player.dead && this.brute.state !== 'charge') separate(this.brute, this.player);
    if (this.mother?.alive && !this.player.dead) separate(this.mother, this.player);
    if (this.grist?.alive && !this.player.dead) separate(this.grist, this.player);
    if (this.cassar?.alive && !this.player.dead && this.cassar.state !== 'quickstep') separate(this.cassar, this.player);

    if (!this.player.dead) {
      this.resolvePlayerAttack();
      this.resolveShardFire(input);
      this.resolveEnemyAttacks();
      this.resolveDustPickup();
      this.resolveLampRest(input);
      this.resolveGates(input);
      this.resolveElevators(input, sdt);
      this.resolvePriestHeals();
      this.resolvePickups();
      this.resolveSecretWalls();
      this.resolveLadderKick(input);
      this.resolveNpcTalk(input);
      this.resolveHeartseam(input);
      this.resolveTransitions();
    }
    if (this.areaTitle) {
      this.areaTitle.t -= dt;
      if (this.areaTitle.t <= 0) this.areaTitle = null;
    }
    this.fadeT = Math.max(0, this.fadeT - dt);
    this.updateShards(sdt);

    for (let i = this.texts.length - 1; i >= 0; i--) {
      const t = this.texts[i];
      t.life -= dt;
      t.z += 24 * dt;
      if (t.life <= 0) this.texts.splice(i, 1);
    }

    // death → drop dust → fast respawn (never > 2s to retry)
    if (this.player.dead && this.deathT === 0) {
      this.deathT = PLAYER.respawnDelay;
      if (this.player.gemdust > 0) {
        // second death before recovery shatters the previous drop
        this.dustDrop = { x: this.player.pos.x, y: this.player.pos.y, z: this.player.pos.z, amount: this.player.gemdust, level: this.lvl.name };
        this.player.gemdust = 0;
      }
    }
    if (this.deathT > 0) {
      this.deathT -= dt;
      if (this.deathT <= 0) {
        this.deathT = 0;
        this.player.respawn(this.lvl);
        this.spawnEnemies(); // lamps respawn the world
        this.events.push('lamp');
      }
    }

    if (this.vistaT !== null && this.lvl.motherSpawn) {
      // first descent: the camera drifts toward the far red glow of the
      // Heartseam chamber and returns — the level shows you its heart
      this.vistaT += dt / 3.2;
      this.player.dropLockT = 0.1;
      if (this.vistaT >= 1) {
        this.vistaT = null;
        this.flags.seenVista = true;
        this.gainLucidity('the deep vista');
      } else {
        const k = Math.sin(Math.PI * Math.min(1, this.vistaT)) * 0.75;
        const tx = this.player.pos.x + (this.lvl.motherSpawn.x - this.player.pos.x) * k;
        const ty = this.player.pos.y + (this.lvl.motherSpawn.y - this.player.pos.y) * k;
        this.camera.x = tx - 320;
        this.camera.y = ty - 180;
      }
    } else {
      this.camera.follow(this.player.pos, aimWorld, dt, this.lvl.pixelW, this.lvl.pixelH);
    }
  }

  private hitStop(attacker: { freezeT: number }, victim: { freezeT: number }, frames: number) {
    attacker.freezeT = Math.max(attacker.freezeT, frames / 60);
    victim.freezeT = Math.max(victim.freezeT, frames / 60 + JUICE.victimExtraFreeze);
  }

  private resolvePlayerAttack() {
    const a = this.player.attack;
    if (!a || a.phase !== 'active') return;
    const c = a.cfg;
    for (const e of this.combatants) {
      if (!e.alive || a.hit.has(e) || !sameTier(this.player, e)) continue;
      const d = dist(this.player.pos, e.pos);
      if (d > c.range + e.radius) continue;
      if (Math.abs(angleDiff(angleTo(this.player.pos, e.pos), a.dir)) > c.arc / 2) continue;
      a.hit.add(e);
      if (e instanceof Cassar && e.state === 'counter') {
        // the raised pistol was the warning — COUNTERED
        e.setState('riposte');
        const taken = this.player.takeDamage(CASSAR.counter.riposteDmg);
        this.player.dropLockT = CASSAR.counter.staggerPlayer;
        this.events.push('parry');
        this.texts.push({ x: this.player.pos.x, y: this.player.pos.y, z: this.player.pos.z + 22, text: 'COUNTERED', life: 1.0, color: '#f5e9c8' });
        this.hitStop(e, this.player, 6);
        this.camera.shake(JUICE.shakeParry);
        if (taken > 0) this.particles.burst(this.player.pos.x, this.player.pos.y, this.player.pos.z, 8, COLORS.blood);
        continue;
      }
      const dmg = c.dmg * a.bonus * this.player.stats.dmgMult;
      e.takeDamage(dmg, a.dir);
      this.events.push('hit_light');
      const healed = this.player.rallyBack(dmg);
      if (this.player.stats.lifesteal > 0) {
        this.player.hp = Math.min(this.player.stats.maxHp, this.player.hp + dmg * this.player.stats.lifesteal);
      }
      this.hitStop(this.player, e, c.hitStop);
      this.camera.shake(JUICE.shakeHit + (c.hitStop > 4 ? 1.5 : 0));
      this.particles.burst(e.pos.x, e.pos.y, e.pos.z, 7, COLORS.bloodBright);
      if (healed > 0.5) this.texts.push({ x: this.player.pos.x, y: this.player.pos.y, z: this.player.pos.z + 18, text: `+${Math.round(healed)}`, life: 0.7, color: COLORS.rally });
      if (e instanceof Brute && e.state === 'dormant') { e.active = true; e.setState('chase'); this.events.push('boss_start'); }
      if (e instanceof Mother && e.state === 'dormant') { e.active = true; e.setState('chase'); this.events.push('boss_start_mother'); }
      if (e instanceof Grist && e.state === 'dormant') { e.active = true; e.setState('chase'); this.events.push('boss_start'); }
      if (!e.alive) this.onEnemyDeath(e);
    }
  }

  private resolveShardFire(input: Input) {
    if (this.player.busy || this.player.shardCd > 0) return;
    if (!input.consume('shard', PLAYER.inputBuffer)) return;
    this.player.shardCd = this.player.stats.shardCd;
    this.events.push('shard');
    const dir = this.player.aim;
    this.shards.push({
      x: this.player.pos.x, y: this.player.pos.y, z: this.player.pos.z + 10,
      vx: Math.cos(dir) * PLAYER.shardSpeed, vy: Math.sin(dir) * PLAYER.shardSpeed,
      life: 0.6,
    });
    this.camera.shake(1.5);
  }

  private updateShards(dt: number) {
    for (let i = this.shards.length - 1; i >= 0; i--) {
      const s = this.shards[i];
      s.life -= dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      let dead = s.life <= 0 || this.lvl.groundZAt(s.x, s.y) > s.z + 6; // walls stop shards
      if (!dead) {
        for (const e of this.combatants) {
          if (!e.alive) continue;
          if (Math.abs(tierOf(e) - Math.round(s.z / TIER_H)) > 1) continue; // |Δtier| ≤ 1
          if (Math.hypot(e.pos.x - s.x, e.pos.y - s.y) > e.radius + 3) continue;
          const dir = Math.atan2(s.vy, s.vx);
          if (e.parryable) {
            // THE parry: stagger → visceral window opens
            e.setState('stagger');
            e.flashT = 4 / 60;
            this.events.push('parry');
            this.events.push('stagger');
            this.hitStop(this.player, e, 6);
            this.camera.shake(JUICE.shakeParry);
            this.particles.burst(e.pos.x, e.pos.y, e.pos.z + 8, 14, '#f5e9c8', 120, false);
            this.texts.push({ x: e.pos.x, y: e.pos.y, z: e.pos.z + 22, text: 'STAGGERED', life: 0.9, color: '#f5e9c8' });
          } else {
            // forgiveness ladder: near-miss still chips and stumbles
            e.takeDamage(this.player.stats.shardChip, dir, 40);
            if (e instanceof Enemy && e.state === 'windup') e.setState('stumble');
            if (e instanceof Brute && e.state === 'dormant') { e.active = true; e.setState('chase'); this.events.push('boss_start'); }
            if (e instanceof Mother && e.state === 'dormant') { e.active = true; e.setState('chase'); this.events.push('boss_start_mother'); }
            if (e instanceof Grist && e.state === 'dormant') { e.active = true; e.setState('chase'); this.events.push('boss_start'); }
            this.particles.burst(e.pos.x, e.pos.y, e.pos.z + 8, 4, COLORS.bloodBright);
            if (!e.alive) this.onEnemyDeath(e);
          }
          dead = true;
          break;
        }
      }
      if (dead) this.shards.splice(i, 1);
    }
  }

  private resolveVisceral(input: Input) {
    if (this.player.busy || this.player.attack) return;
    const target = this.combatants.find(
      (e) => e.alive && e.state === 'stagger' && sameTier(e, this.player) && dist(e.pos, this.player.pos) < 26 + e.radius,
    );
    if (!target) return;
    if (!input.consume('attack', PLAYER.inputBuffer)) return;
    // visceral: invulnerable, massive damage, maximum rally restore, slow-mo
    this.player.visceralT = PLAYER.visceralLock;
    this.events.push('visceral');
    const dmg = ('isBoss' in target ? PLAYER.visceralBossDmg : PLAYER.visceralDmg) * this.player.stats.dmgMult * this.player.stats.visceralMult;
    target.takeDamage(dmg, this.player.aim, 150);
    const healed = this.player.rallyBack(dmg, true);
    this.hitStop(this.player, target, 9);
    this.camera.shake(JUICE.shakeVisceral);
    this.timeScale = JUICE.slowMoVisceral;
    this.slowMoT = JUICE.slowMoTime;
    // one parry buys ONE visceral — the stagger is spent
    if (target.alive) {
      if (target instanceof Enemy) target.setState('recover');
      else if (target instanceof Cassar) target.setState('strafe');
      else target.setState('chase');
    }
    this.particles.burst(target.pos.x, target.pos.y, target.pos.z + 6, 26, COLORS.bloodBright, 130);
    this.particles.burst(target.pos.x, target.pos.y, target.pos.z + 10, 10, '#e8607a', 90);
    this.texts.push({ x: target.pos.x, y: target.pos.y, z: target.pos.z + 24, text: 'VISCERAL', life: 1.0, color: COLORS.bloodBright });
    if (healed > 0.5) this.texts.push({ x: this.player.pos.x, y: this.player.pos.y, z: this.player.pos.z + 16, text: `+${Math.round(healed)}`, life: 0.8, color: COLORS.rally });
    if (!target.alive) this.onEnemyDeath(target);
  }

  private resolveEnemyAttacks() {
    for (const e of this.enemies) {
      if (e.state !== 'attack' || e.attackHit || !sameTier(e, this.player)) continue;
      if (e.kind === 'hound') {
        // committed lunge: contact damage while flying
        if (dist(e.pos, this.player.pos) > e.radius + this.player.radius + 3) continue;
        e.attackHit = true;
        const t = this.player.takeDamage(HOUND.dmg);
        if (t > 0) this.hurtFx(e);
        continue;
      }
      const d = dist(e.pos, this.player.pos);
      if (d > RABBLE.range + this.player.radius) continue;
      if (Math.abs(angleDiff(angleTo(e.pos, this.player.pos), e.attackDir)) > RABBLE.arc / 2) continue;
      e.attackHit = true;
      const taken = this.player.takeDamage(e.meleeStats.dmg * this.lucidityDmgMult);
      if (taken > 0) {
        this.events.push(this.player.dead ? 'death_bell' : 'hurt');
        this.hitStop(e, this.player, RABBLE.hitStop);
        this.camera.shake(JUICE.shakeHit + 1);
        this.particles.burst(this.player.pos.x, this.player.pos.y, this.player.pos.z, 8, COLORS.blood);
        this.decals.push({ x: this.player.pos.x + (Math.random() * 10 - 5), y: this.player.pos.y + (Math.random() * 10 - 5), z: this.player.pos.z, r: 3 + Math.random() * 3 });
      }
    }
  }

  private onEnemyDeath(e: Combatant) {
    this.events.push('enemy_die');
    const boss = 'isBoss' in e;
    const base = e instanceof Brute ? BRUTE.gemdust : e instanceof Mother ? MOTHER.gemdust : e instanceof Grist ? GRIST.gemdust : e instanceof Cassar ? CASSAR.gemdust : (DUST[(e as Enemy).kind] ?? 25);
    const amount = Math.round(base * this.player.stats.dustMult);
    this.player.gemdust += amount;
    this.texts.push({ x: e.pos.x, y: e.pos.y, z: e.pos.z + 14, text: `+${amount}`, life: 0.9, color: '#c94b5e' });
    this.particles.burst(e.pos.x, e.pos.y, e.pos.z + 4, boss ? 40 : 16, COLORS.blood, boss ? 140 : 100);
    // permanence: corpses stain the ground
    this.decals.push({ x: e.pos.x, y: e.pos.y, z: e.pos.z, r: (boss ? 14 : 7) + Math.random() * 4 });
    if ('isBoss' in e) this.gainLucidity('a great one felled');
    if (e instanceof Brute) {
      this.flags.bruteDefeated = true;
      this.events.push('boss_dead');
      this.texts.push({ x: e.pos.x, y: e.pos.y, z: e.pos.z + 30, text: 'THE CHAIN IS BROKEN', life: 2.5, color: COLORS.bloodBright });
      this.camera.shake(10);
      if (!this.player.gems.includes('leech-facet')) {
        this.player.gems.push('leech-facet');
        this.player.recomputeStats();
        this.texts.push({ x: e.pos.x, y: e.pos.y, z: e.pos.z + 44, text: 'LEECH FACET taken', life: 2.5, color: '#c94b5e' });
      }
      this.save();
    } else if (e instanceof Grist) {
      this.flags.gristDefeated = true;
      this.events.push('boss_dead');
      this.texts.push({ x: e.pos.x, y: e.pos.y, z: e.pos.z + 30, text: 'THE GANTRY IS QUIET', life: 2.5, color: COLORS.bloodBright });
      this.camera.shake(9);
      if (!this.player.gems.includes('foremans-grip')) {
        this.player.gems.push('foremans-grip');
        this.player.recomputeStats();
        this.texts.push({ x: e.pos.x, y: e.pos.y, z: e.pos.z + 44, text: "FOREMAN'S GRIP taken", life: 2.5, color: '#c94b5e' });
      }
      this.save();
    } else if (e instanceof Cassar) {
      this.flags.cassarDefeated = true;
      this.events.push('boss_dead');
      this.texts.push({ x: e.pos.x, y: e.pos.y, z: e.pos.z + 30, text: 'THE RIVAL YIELDS THE NIGHT', life: 2.5, color: COLORS.bloodBright });
      if (!this.player.gems.includes('hollow-facet')) {
        this.player.gems.push('hollow-facet');
        this.player.recomputeStats();
        this.texts.push({ x: e.pos.x, y: e.pos.y, z: e.pos.z + 44, text: 'HOLLOW FACET taken', life: 2.5, color: '#c94b5e' });
      }
      if (!this.player.ownedWeapons.includes('facetblade')) {
        this.player.ownedWeapons.push('facetblade');
        this.texts.push({ x: e.pos.x, y: e.pos.y, z: e.pos.z + 58, text: 'THE FACET BLADE is yours — [X] to draw it', life: 3, color: '#e8b04a' });
      }
      this.save();
    } else if (e instanceof Mother) {
      this.flags.motherDefeated = true;
      this.events.push('boss_dead');
      this.texts.push({ x: e.pos.x, y: e.pos.y, z: e.pos.z + 34, text: 'THE SEAM LIES OPEN', life: 3, color: COLORS.bloodBright });
      this.heartseam = { x: e.spawn.x + 32, y: e.spawn.y - 64 };
      this.camera.shake(12);
      this.save();
    }
  }

  private hurtFx(from: { pos: { x: number; y: number; z: number }; freezeT: number }) {
    this.events.push(this.player.dead ? 'death_bell' : 'hurt');
    this.hitStop(from, this.player, RABBLE.hitStop);
    this.camera.shake(JUICE.shakeHit + 1);
    this.particles.burst(this.player.pos.x, this.player.pos.y, this.player.pos.z, 8, COLORS.blood);
    this.decals.push({ x: this.player.pos.x + (Math.random() * 10 - 5), y: this.player.pos.y + (Math.random() * 10 - 5), z: this.player.pos.z, r: 3 + Math.random() * 3 });
  }

  // brute slam AoE / sweep arc / charge contact
  private resolveBruteAttacks() {
    const b = this.brute;
    if (!b || !b.alive || this.player.dead) return;

    if (b.state === 'slam-recover' && !b.attackHit) {
      b.attackHit = true;
      const cx = b.pos.x + Math.cos(b.attackDir) * 18;
      const cy = b.pos.y + Math.sin(b.attackDir) * 18;
      this.camera.shake(8);
      this.particles.burst(cx, cy, b.pos.z, 18, '#8a7a68', 110);
      this.decals.push({ x: cx, y: cy, z: b.pos.z, r: 10 });
      if (sameTier(b, this.player) && Math.hypot(this.player.pos.x - cx, this.player.pos.y - cy) < BRUTE.slam.radius + this.player.radius) {
        if (this.player.takeDamage(BRUTE.slam.dmg) > 0) this.hurtFx(b);
      }
    }

    if (b.state === 'sweep' && !b.attackHit && sameTier(b, this.player)) {
      const d = dist(b.pos, this.player.pos);
      if (d < BRUTE.sweep.range + this.player.radius &&
          Math.abs(angleDiff(angleTo(b.pos, this.player.pos), b.attackDir)) < BRUTE.sweep.arc / 2) {
        b.attackHit = true;
        if (this.player.takeDamage(BRUTE.sweep.dmg) > 0) this.hurtFx(b);
      }
    }

    if (b.state === 'charge' && !b.attackHit && sameTier(b, this.player)) {
      if (dist(b.pos, this.player.pos) < b.radius + this.player.radius + 3) {
        b.attackHit = true;
        if (this.player.takeDamage(BRUTE.charge.dmg) > 0) this.hurtFx(b);
      }
    }
  }

  private resolveGristAttacks(dt: number) {
    const g = this.grist;
    if (!g || !g.alive) {
      this.gristHook = null;
      return;
    }

    if (g.state === 'sweep' && !g.attackHit && sameTier(g, this.player) && !this.player.dead) {
      const d = dist(g.pos, this.player.pos);
      if (d < GRIST.sweep.range + this.player.radius &&
          Math.abs(angleDiff(angleTo(g.pos, this.player.pos), g.attackDir)) < GRIST.sweep.arc / 2) {
        g.attackHit = true;
        if (this.player.takeDamage(GRIST.sweep.dmg) > 0) this.hurtFx(g);
      }
    }

    if (g.state === 'slam-recover' && !g.attackHit) {
      g.attackHit = true;
      const cx = g.pos.x + Math.cos(g.attackDir) * 16;
      const cy = g.pos.y + Math.sin(g.attackDir) * 16;
      this.camera.shake(7);
      this.particles.burst(cx, cy, g.pos.z, 14, '#8a7a68', 100);
      this.decals.push({ x: cx, y: cy, z: g.pos.z, r: 9 });
      if (sameTier(g, this.player) && !this.player.dead &&
          Math.hypot(this.player.pos.x - cx, this.player.pos.y - cy) < GRIST.slam.radius + this.player.radius) {
        if (this.player.takeDamage(GRIST.slam.dmg) > 0) this.hurtFx(g);
      }
    }

    if (g.pendingHook) {
      const dir = g.pendingHook.dir;
      g.pendingHook = null;
      this.gristHook = { x: g.pos.x, y: g.pos.y, vx: Math.cos(dir) * GRIST.hook.speed, vy: Math.sin(dir) * GRIST.hook.speed, life: 0.9 };
    }
    const h = this.gristHook;
    if (h) {
      h.life -= dt;
      h.x += h.vx * dt;
      h.y += h.vy * dt;
      let done = h.life <= 0 || this.lvl.groundZAt(h.x, h.y) > g.pos.z + 8;
      if (!done && !this.player.dead && sameTier(g, this.player) &&
          Math.hypot(this.player.pos.x - h.x, this.player.pos.y - h.y) < this.player.radius + 5) {
        done = true;
        // the reel: dragged most of the way back to him — unless you dodged it
        if (this.player.takeDamage(GRIST.hook.dmg) > 0) {
          const t = 0.75;
          this.player.pos.x += (g.pos.x - this.player.pos.x) * t;
          this.player.pos.y += (g.pos.y - this.player.pos.y) * t;
          this.player.pos.z = this.lvl.groundZAt(this.player.pos.x, this.player.pos.y);
          this.player.dropLockT = 0.3;
          this.hurtFx(g);
          this.events.push('chain');
        }
      }
      if (done) this.gristHook = null;
    }
  }

  private resolveCassarAttacks() {
    const c = this.cassar;
    if (!c || !c.alive || this.player.dead) return;

    const swinging = c.state === 'combo1-active' || c.state === 'combo2-active';
    if (swinging && !c.attackHit && sameTier(c, this.player)) {
      const d = dist(c.pos, this.player.pos);
      if (d < CASSAR.combo.range + this.player.radius &&
          Math.abs(angleDiff(angleTo(c.pos, this.player.pos), c.attackDir)) < CASSAR.combo.arc / 2) {
        c.attackHit = true;
        if (this.player.takeDamage(CASSAR.combo.dmg) > 0) this.hurtFx(c);
      }
    }
    if (c.pendingShot) {
      c.pendingShot = false;
      const dir = c.attackDir;
      this.enemyShots.push({
        x: c.pos.x, y: c.pos.y, z: c.pos.z + 10,
        vx: Math.cos(dir) * CASSAR.shot.speed, vy: Math.sin(dir) * CASSAR.shot.speed, vz: 0,
        life: 1.2, dmg: CASSAR.shot.dmg,
      });
      this.events.push('shard');
    }
  }

  private resolveMotherAttacks() {
    const m = this.mother;
    if (!m || !m.alive) return;

    if (m.pendingVolley) {
      const v = m.pendingVolley;
      m.pendingVolley = null;
      const sz = m.pos.z + 12;
      if (v.kind === 'ring') {
        const n = m.phase2 ? MOTHER.ring.count2 : MOTHER.ring.count;
        for (let i = 0; i < n; i++) {
          const a = (Math.PI * 2 * i) / n + (m.phase2 ? 0.2 : 0);
          this.enemyShots.push({ x: m.pos.x, y: m.pos.y, z: sz, vx: Math.cos(a) * MOTHER.ring.speed, vy: Math.sin(a) * MOTHER.ring.speed, vz: 0, life: 2.2, dmg: MOTHER.ring.dmg });
        }
      } else {
        for (let i = 0; i < MOTHER.lance.count; i++) {
          const a = v.dir + (i - (MOTHER.lance.count - 1) / 2) * MOTHER.lance.spread;
          this.enemyShots.push({ x: m.pos.x, y: m.pos.y, z: sz, vx: Math.cos(a) * MOTHER.lance.speed, vy: Math.sin(a) * MOTHER.lance.speed, vz: 0, life: 1.6, dmg: MOTHER.lance.dmg });
        }
      }
      this.events.push('stagger'); // crystal-crack report
      this.camera.shake(3);
    }

    if (m.state === 'claw' && !m.attackHit && sameTier(m, this.player) && !this.player.dead) {
      const d = dist(m.pos, this.player.pos);
      if (d < MOTHER.claw.range + this.player.radius &&
          Math.abs(angleDiff(angleTo(m.pos, this.player.pos), m.attackDir)) < MOTHER.claw.arc / 2) {
        m.attackHit = true;
        if (this.player.takeDamage(MOTHER.claw.dmg) > 0) this.hurtFx(m);
      }
    }
  }

  // bloodgem caches on the ground
  private resolvePickups() {
    for (const pk of this.lvl.pickups) {
      if (this.flags.gemsTaken.has(pk.gem)) continue;
      const gz = this.lvl.groundZAt(pk.x, pk.y);
      if (Math.abs(this.player.pos.z - gz) > TIER_H / 2) continue;
      if (Math.hypot(this.player.pos.x - pk.x, this.player.pos.y - pk.y) > 12) continue;
      this.flags.gemsTaken.add(pk.gem);
      this.player.gems.push(pk.gem);
      this.player.recomputeStats();
      const gem = GEMS[pk.gem];
      this.texts.push({ x: pk.x, y: pk.y, z: gz + 20, text: `${gem?.name ?? pk.gem} taken`, life: 2.2, color: '#c94b5e' });
      this.events.push('pickup');
      this.save();
    }
  }

  // cracked masonry gives way to the Seamsplitter — secrets for those who strike
  private resolveSecretWalls() {
    const a = this.player.attack;
    if (!a || a.phase !== 'active') return;
    for (const sec of this.lvl.secrets) {
      if (sec.broken) continue;
      const cx = (sec.tx + sec.w / 2) * 16;
      const cy = (sec.ty + 0.5) * 16;
      if (Math.hypot(this.player.pos.x - cx, this.player.pos.y - cy) > a.cfg.range + 18) continue;
      this.lvl.breakSecret(sec);
      this.flags.secretsBroken.add(sec.id);
      this.gainLucidity('what the wall hid');
      this.texts.push({ x: cx, y: cy, z: 30, text: 'THE WALL CRUMBLES', life: 2.2, color: '#e8b04a' });
      this.particles.burst(cx, cy - 8, 0, 22, '#7a6a5c', 110);
      this.camera.shake(5);
      this.events.push('stagger');
      this.save();
    }
  }

  gainLucidity(reason: string) {
    this.lucidity++;
    this.texts.push({ x: this.player.pos.x, y: this.player.pos.y, z: this.player.pos.z + 26, text: `LUCIDITY — ${reason}`, life: 2, color: '#b9c4d8' });
    if (this.lucidity === 3) this.events.push('lucidity_whispers'); // the city starts talking back
  }

  // knowing sharpens the enemy too
  get lucidityDmgMult(): number {
    return this.lucidity >= 5 ? 1.05 : 1;
  }

  npcVisible(id: string): boolean {
    return id !== 'broker' || this.lucidity >= 3; // the broker only trades with the lucid
  }

  npcInRange(): { id: string; x: number; y: number } | null {
    for (const n of this.lvl.npcs) {
      if (!this.npcVisible(n.id)) continue;
      if (Math.abs(this.player.pos.z - this.lvl.groundZAt(n.x, n.y)) > TIER_H / 2) continue;
      if (Math.hypot(this.player.pos.x - n.x, this.player.pos.y - n.y) < 22) return n;
    }
    return null;
  }

  // the night's current demand — shown on the pause screen
  get objective(): string {
    if (this.flags.motherDefeated) return 'The seam lies open. Choose what dawn gets to be.';
    if (this.lvl.name === 'undervein') {
      return this.flags.gristDefeated
        ? 'The Heartseam chamber waits in the north-east. She is singing.'
        : 'Descend. The Gantry creaks, and the seam sings below.';
    }
    if (this.flags.bruteDefeated) {
      return this.flags.cassarDefeated
        ? 'The Minehead Gate stands open. Descend into the Undervein.'
        : 'The Minehead Gate stands open. (A rival waits on the east rampart.)';
    }
    return 'Cross Ember Row. Something large holds Gallows Square.';
  }

  private resolveNpcTalk(input: Input) {
    if (this.player.busy || this.menuCd > 0) return;
    const n = this.npcInRange();
    if (!n) return;
    if (!input.consume('interact', PLAYER.inputBuffer)) return;
    const script = DIALOG[n.id];
    if (!script) return;
    this.dialogue = { name: script.name, lines: script.lines(this.flags), idx: 0, npcId: n.id };
    this.events.push('menu_open_silent');
  }

  advanceDialogue() {
    if (!this.dialogue) return;
    this.dialogue.idx++;
    if (this.dialogue.idx >= this.dialogue.lines.length) {
      const npcId = this.dialogue.npcId;
      this.dialogue = null;
      this.menuCd = 0.35; // the closing press must not re-open the talk
      if (npcId === 'broker') this.brokerDeal();
      if (npcId === 'dunhill') this.ferryRide();
    }
  }

  // the ferry: west dock ↔ east dock, along the canal underlayer
  private static FERRY_DOCKS = { west: { x: 4 * 16, y: 19 * 16 }, east: { x: 62 * 16, y: 44 * 16 } };

  private ferryRide() {
    const docks = Game.FERRY_DOCKS;
    const dun = this.lvl.npcs.find((n) => n.id === 'dunhill');
    if (!dun) return;
    const atWest = Math.abs(dun.x - docks.west.x) < 32;
    const dest = atWest ? docks.east : docks.west;
    // the barge glides: player + ferryman arrive at the far dock
    this.player.pos = { x: dest.x + 18, y: dest.y, z: this.lvl.groundZAt(dest.x + 18, dest.y) };
    dun.x = dest.x;
    dun.y = dest.y;
    this.camera.x = dest.x - 320;
    this.camera.y = dest.y - 180;
    this.fadeT = 0.8;
    this.texts.push({ x: dest.x, y: dest.y, z: 30, text: 'the barge glides through the dark', life: 2.2, color: '#b9c4d8' });
    this.events.push('elevator'); // creak of wood and chain
    this.menuCd = 0.5;
  }

  // stay and pay: 400 dust for the Serrated Facet
  private brokerDeal() {
    if (this.player.gems.includes('serrated-facet')) return;
    if (this.player.gemdust < 400) {
      this.texts.push({ x: this.player.pos.x, y: this.player.pos.y, z: 40, text: 'not enough dust — he grins wider', life: 2, color: '#b9c4d8' });
      return;
    }
    this.player.gemdust -= 400;
    this.player.gems.push('serrated-facet');
    this.player.recomputeStats();
    this.texts.push({ x: this.player.pos.x, y: this.player.pos.y, z: 40, text: 'SERRATED FACET bought — …sold.', life: 2.5, color: '#c94b5e' });
    this.events.push('pickup');
    this.save();
  }

  // pulled-up ladders drop from the TOP — the shortcut clicks from the far side
  private resolveLadderKick(input: Input) {
    if (this.player.busy) return;
    for (const l of this.lvl.ladders) {
      if (!l.locked || !l.id) continue;
      const cx = (l.tx + 0.5) * 16, cy = (l.topTy + 0.5) * 16;
      if (Math.abs(this.player.pos.z - l.highZ) > 8) continue;
      if (Math.hypot(this.player.pos.x - cx, this.player.pos.y - cy) > 22) continue;
      if (!input.consume('interact', PLAYER.inputBuffer)) continue;
      l.locked = false;
      this.flags.laddersDropped.add(l.id);
      this.texts.push({ x: cx, y: cy + 16, z: 40, text: 'THE LADDER FALLS', life: 2.2, color: '#e8b04a' });
      this.events.push('gate');
      this.camera.shake(3);
      this.save();
    }
  }

  // the Heartseam: the choice at the bottom of the world
  private resolveHeartseam(input: Input) {
    const h = this.heartseam;
    if (!h || this.player.busy) return;
    if (Math.hypot(this.player.pos.x - h.x, this.player.pos.y - h.y) > 30) return;
    if (!input.consume('interact', PLAYER.inputBuffer)) return;
    this.endingChoice = true;
    this.events.push('lamp');
  }

  // watchman muskets: 3D-aimed shots that cross tiers
  private resolveWatchmanShots(dt: number) {
    for (const e of this.enemies) {
      if (!e.pendingShot) continue;
      e.pendingShot = false;
      const sx = e.pos.x, sy = e.pos.y, sz = e.pos.z + 26; // raised muzzle clears the parapet lip
      const dx = e.lockX - sx, dy = e.lockY - sy, dz = e.lockZ + 8 - sz;
      const len3 = Math.hypot(dx, dy, dz) || 1;
      this.enemyShots.push({
        x: sx, y: sy, z: sz,
        vx: (dx / len3) * WATCHMAN.shotSpeed,
        vy: (dy / len3) * WATCHMAN.shotSpeed,
        vz: (dz / len3) * WATCHMAN.shotSpeed,
        life: 1.4,
        dmg: WATCHMAN.dmg,
      });
      this.events.push('shard');
    }
    for (let i = this.enemyShots.length - 1; i >= 0; i--) {
      const s = this.enemyShots[i];
      s.life -= dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.z += s.vz * dt;
      let dead = s.life <= 0 || s.z <= this.lvl.groundZAt(s.x, s.y);
      if (!dead && !this.player.dead) {
        const p = this.player.pos;
        if (Math.hypot(p.x - s.x, p.y - s.y, p.z + 10 - s.z) < this.player.radius + 4) {
          dead = true;
          if (this.player.takeDamage(s.dmg) > 0) {
            this.events.push(this.player.dead ? 'death_bell' : 'hurt');
            this.camera.shake(JUICE.shakeHit + 1);
            this.particles.burst(p.x, p.y, p.z, 8, COLORS.blood);
          }
        }
      }
      if (dead) this.enemyShots.splice(i, 1);
    }
  }

  // rest at a Vigil Lamp: refill, set checkpoint, the world re-wakes
  private resolveLampRest(input: Input) {
    if (this.player.busy || this.menuCd > 0) return;
    const lamp = this.lvl.lamps.find((l) => Math.hypot(this.player.pos.x - l.x, this.player.pos.y - l.y) < 26);
    if (!lamp) return;
    if (!input.consume('interact', PLAYER.inputBuffer)) return;
    this.player.hp = this.player.stats.maxHp;
    this.player.rally = 0;
    this.player.phials = PLAYER.phials;
    this.lvl.playerSpawn = { x: lamp.x, y: lamp.y + 12 };
    this.spawnEnemies();
    this.texts.push({ x: lamp.x, y: lamp.y, z: 30, text: 'VIGIL KEPT', life: 1.6, color: '#e8b04a' });
    this.events.push('lamp');
    this.menuOpen = true;
    this.events.push('menu_open');
    this.save();
  }

  // locked gates: auto-gates open on flags; manual gates only from the far side
  private resolveGates(input: Input) {
    for (const g of this.lvl.gates) {
      if (g.open) continue;
      if (g.auto === 'brute' && this.flags.bruteDefeated) {
        g.open = true;
        this.flags.gatesOpen.add(g.id);
        this.texts.push({ x: (g.tx + 0.5) * 16, y: (g.ty + g.h) * 16, z: 40, text: g.label, life: 2.2, color: '#e8b04a' });
        this.events.push('gate');
        continue;
      }
      if (!g.unlock) continue;
      const p = this.player.pos;
      const inside = p.x >= g.unlock.x0 && p.x <= g.unlock.x1 && p.y >= g.unlock.y0 && p.y <= g.unlock.y1;
      const near = Math.hypot(p.x - (g.tx + 0.5) * 16, p.y - (g.ty + g.h / 2) * 16) < 34;
      if (inside && near && input.consume('interact', PLAYER.inputBuffer)) {
        g.open = true;
        this.flags.gatesOpen.add(g.id);
        this.texts.push({ x: (g.tx + 0.5) * 16, y: (g.ty + g.h) * 16, z: 40, text: g.label, life: 2.2, color: '#e8b04a' });
        this.events.push('gate');
        this.camera.shake(4);
      }
    }
  }

  // elevators are moving ground: groundZAt already returns platform z, so we
  // only drive z and pin the player while riding
  private resolveElevators(input: Input, dt: number) {
    for (const el of this.lvl.elevators) {
      const p = this.player.pos;
      const x0 = el.tx * 16, y0 = el.ty * 16, x1 = (el.tx + el.w) * 16, y1 = (el.ty + el.h) * 16;
      const onIt = p.x >= x0 && p.x < x1 && p.y >= y0 && p.y < y1 && Math.abs(p.z - el.z) < 8;
      // standing beside the shaft at either landing — the platform can be called
      const nearIt =
        p.x >= x0 - 24 && p.x < x1 + 24 && p.y >= y0 - 24 && p.y < y1 + 24 && !onIt &&
        (Math.abs(p.z - el.lowZ) < 8 || Math.abs(p.z - el.highZ) < 8);

      if (el.target === null && onIt && !this.player.busy && input.consume('interact', PLAYER.inputBuffer)) {
        el.target = Math.abs(el.z - el.lowZ) < 1 ? el.highZ : el.lowZ;
        this.events.push('elevator');
      } else if (el.target === null && nearIt && !this.player.busy) {
        const myLanding = Math.abs(p.z - el.lowZ) < 8 ? el.lowZ : el.highZ;
        if (Math.abs(el.z - myLanding) > 1 && input.consume('interact', PLAYER.inputBuffer)) {
          el.target = myLanding; // recall — no more stranded platforms
          this.events.push('elevator');
        }
      }

      if (el.target !== null) {
        const dir = Math.sign(el.target - el.z);
        el.z += dir * 42 * dt;
        if ((dir > 0 && el.z >= el.target) || (dir < 0 && el.z <= el.target)) {
          el.z = el.target;
          el.target = null;
        }
        if (onIt || (Math.abs(p.z - el.z) < 46 && p.x >= x0 && p.x < x1 && p.y >= y0 && p.y < y1)) {
          this.player.pos.z = el.z;
          this.player.dropLockT = 0.06; // ride: input stays locked
        }
        // anything else standing on the platform rides too
        for (const e of this.enemies) {
          if (!e.alive) continue;
          if (e.pos.x >= x0 && e.pos.x < x1 && e.pos.y >= y0 && e.pos.y < y1 && Math.abs(e.pos.z - el.z) < 46) {
            e.pos.z = el.z;
          }
        }
      }
    }
  }

  private resolvePriestHeals() {
    for (const e of this.enemies) {
      if (e.kind !== 'priest' || !e.alive || !e.pendingHeal) continue;
      e.pendingHeal = false;
      let healed = false;
      for (const ally of this.enemies) {
        if (ally === e || !ally.alive || ally.kind === 'priest') continue;
        if (Math.hypot(ally.pos.x - e.pos.x, ally.pos.y - e.pos.y) > PRIEST.healRadius) continue;
        if (ally.hp >= ally.maxHp) continue;
        ally.hp = Math.min(ally.maxHp, ally.hp + PRIEST.healAmount);
        this.particles.burst(ally.pos.x, ally.pos.y, ally.pos.z + 10, 5, '#d98a8a', 50, false);
        healed = true;
      }
      if (healed) this.events.push('heal_pulse');
    }
  }

  private resolveTransitions() {
    if (this.fadeT > 0) return; // debounce right after a load
    const p = this.player.pos;
    for (const tr of this.lvl.transitions) {
      if (p.x >= tr.x0 && p.x <= tr.x1 && p.y >= tr.y0 && p.y <= tr.y1) {
        this.loadLevel(tr.target, tr.entry);
        return;
      }
    }
  }

  private resolveDustPickup() {
    const d = this.dustDrop;
    if (!d || d.level !== this.lvl.name) return;
    if (Math.abs(this.player.pos.z - d.z) < TIER_H / 2 && Math.hypot(this.player.pos.x - d.x, this.player.pos.y - d.y) < 12) {
      this.player.gemdust += d.amount;
      this.texts.push({ x: d.x, y: d.y, z: d.z + 16, text: `RECOVERED ${d.amount}`, life: 1.1, color: '#c94b5e' });
      this.particles.burst(d.x, d.y, d.z + 6, 12, '#c94b5e', 80, false);
      this.dustDrop = null;
      this.events.push('pickup');
    }
  }
}
