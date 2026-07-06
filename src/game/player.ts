import { PLAYER, TIER_H, WEAPON_SETS, type WeaponForm } from './constants';
import { computeStats, type PlayerStats, BASE_STATS } from './skills';
import { type Entity, moveGrounded, applyGravity } from './entity';
import type { Level, Ladder } from './level';
import type { Input } from '../engine/input';
import { norm, type Vec2 } from '../engine/math';

export type AttackPhase = 'windup' | 'active' | 'recover';

export interface Attack {
  phase: AttackPhase;
  t: number;
  dir: number;      // radians, locked at swing start
  swing: number;    // alternates 0/1 for combo visuals
  hit: Set<object>; // each swing damages each target once
  cfg: WeaponForm;  // form snapshot at swing start
  bonus: number;    // transform-strike damage multiplier
}

export class Player implements Entity {
  pos = { x: 0, y: 0, z: 0 };
  vel = { x: 0, y: 0, z: 0 };
  radius = PLAYER.radius;
  airborne = false;
  freezeT = 0;
  flashT = 0;

  hp = PLAYER.hp;
  stats: PlayerStats = { ...BASE_STATS };
  skillRanks: Record<string, number> = {};
  gems: string[] = [];
  rally = 0;        // orange recoverable chunk
  rallyT = 0;
  stamina = PLAYER.stamina;
  staminaCd = 0;

  aim = 0;          // radians toward mouse
  facing: Vec2 = { x: 0, y: 1 };

  dashT = 0;        // > 0 while dashing
  dashDir: Vec2 = { x: 0, y: 1 };
  iframesCancelled = false;

  attack: Attack | null = null;
  comboQueued = false;
  weaponSet = 'seamsplitter';
  formB = false;
  ownedWeapons: string[] = ['seamsplitter'];
  transformLockT = 0; // idle transform commit
  transformed = false; // true for one frame when a transform happens (sfx hook)
  walkPhase = 0;
  moving = false;
  stepped = false; // one-frame flag on each stride (footstep sfx hook)
  heavySwung = false; // one-frame flag when a warpick swing starts (whoosh sfx)

  shardCd = 0;
  visceralT = 0;    // > 0 while performing a visceral (invulnerable)

  climbing: Ladder | null = null;
  climbUp = true;
  dropLockT = 0;    // brief input lock after hopping off a ledge

  phials = PLAYER.phials;
  shards = PLAYER.shardPouch; // quicksilver for the Shardcaster
  drinkT = 0;       // > 0 while committed to the swig

  hurtT = 0;
  dead = false;
  gemdust = 0;

  get invulnerable(): boolean {
    if (this.visceralT > 0) return true;
    if (this.dashT > 0 && !this.iframesCancelled) {
      const elapsed = PLAYER.dashDuration - this.dashT;
      return elapsed < this.stats.iframes; // front-loaded i-frames (GRACE extends)
    }
    return false;
  }

  recomputeStats() {
    const hpFrac = this.hp / this.stats.maxHp;
    this.stats = computeStats(this.skillRanks, this.gems);
    this.hp = Math.min(this.stats.maxHp, Math.round(this.stats.maxHp * hpFrac));
  }

  get busy(): boolean {
    return this.dead || this.climbing !== null || this.visceralT > 0 || this.dropLockT > 0 || this.drinkT > 0 || this.transformLockT > 0;
  }

  get form(): WeaponForm {
    const set = WEAPON_SETS[this.weaponSet] ?? WEAPON_SETS.seamsplitter;
    return this.formB ? set.b : set.a;
  }

  swapWeaponSet(): boolean {
    const idx = this.ownedWeapons.indexOf(this.weaponSet);
    if (this.ownedWeapons.length < 2) return false;
    this.weaponSet = this.ownedWeapons[(idx + 1) % this.ownedWeapons.length];
    this.formB = false;
    this.transformed = true;
    this.transformLockT = PLAYER.transformLock;
    return true;
  }

  update(dt: number, input: Input, lvl: Level, aimWorld: Vec2) {
    if (this.freezeT > 0) { this.freezeT -= dt; return; }
    this.flashT = Math.max(0, this.flashT - dt);
    this.hurtT = Math.max(0, this.hurtT - dt);
    this.shardCd = Math.max(0, this.shardCd - dt);
    this.dropLockT = Math.max(0, this.dropLockT - dt);
    if (this.visceralT > 0) this.visceralT -= dt;
    if (this.dead) return;

    this.aim = Math.atan2(aimWorld.y - this.pos.y, aimWorld.x - this.pos.x);

    // rally window decay
    if (this.rallyT > 0) {
      this.rallyT -= dt;
      if (this.rallyT <= 0) this.rally = 0;
    }

    // stamina
    this.staminaCd = Math.max(0, this.staminaCd - dt);
    if (this.staminaCd <= 0 && this.dashT <= 0 && !this.attack) {
      this.stamina = Math.min(PLAYER.stamina, this.stamina + this.stats.staminaRegen * dt);
    }

    if (this.climbing) { this.updateClimb(dt); return; }
    if (applyGravity(this, lvl, dt)) this.dropLockT = 0.08;
    this.transformLockT = Math.max(0, this.transformLockT - dt);

    // committed phial swig — vulnerable, uninterruptible, then the heal lands
    if (this.drinkT > 0) {
      this.drinkT -= dt;
      if (this.drinkT <= 0) {
        this.hp = Math.min(this.stats.maxHp, this.hp + PLAYER.phialHeal * this.stats.phialMult);
      }
      return;
    }
    if (this.busy) return;

    const move = input.moveAxis();

    // generous buffer: a heal pressed mid-swing starts as soon as the swing ends.
    // consume() must be the LAST condition — otherwise it eats the press while
    // the other conditions still fail and the input is lost.
    if (
      this.phials > 0 && this.hp < this.stats.maxHp && this.dashT <= 0 && !this.attack &&
      input.consume('heal', 0.4)
    ) {
      this.phials--;
      this.drinkT = PLAYER.phialDrinkTime;
      return;
    }

    // ladder mount: push toward the ladder while standing on its base/top cell
    const ladder = lvl.ladderNear(this.pos.x, this.pos.y);
    if (ladder && !ladder.locked && !this.airborne) {
      const onBase = Math.abs(this.pos.z - ladder.lowZ) < 8;
      if (onBase && move.y < 0 && Math.floor(this.pos.y / 16) === ladder.ty) {
        this.startClimb(ladder, true);
        return;
      }
      if (!onBase && move.y > 0 && Math.floor(this.pos.y / 16) === ladder.topTy) {
        this.startClimb(ladder, false);
        return;
      }
    }

    // dash — one consumed press per dash, buffered ~130ms
    if (this.dashT <= 0 && this.stamina >= this.stats.dashCost && input.consume('dash', PLAYER.inputBuffer)) {
      const d = move.x || move.y ? norm(move.x, move.y) : { ...this.facing };
      this.dashT = PLAYER.dashDuration;
      this.dashDir = d;
      this.iframesCancelled = false;
      this.stamina -= this.stats.dashCost;
      this.staminaCd = PLAYER.staminaDelay;
      this.attack = null;
    }

    if (this.dashT > 0) {
      this.dashT -= dt;
      moveGrounded(this, lvl, this.dashDir.x * PLAYER.dashSpeed * dt, this.dashDir.y * PLAYER.dashSpeed * dt);
      // attacking out of the dash cancels remaining i-frames (Hades' rule)
      if (this.stamina >= this.form.cost && input.consume('attack', PLAYER.inputBuffer)) {
        this.iframesCancelled = true;
        this.dashT = 0;
        this.startSwing();
      }
      return;
    }

    // trick weapon: mid-combo Q = transform strike; idle Q = committed switch
    if (this.attack) {
      if (this.attack.phase !== 'windup' && input.consume('transform', 0.2)) {
        this.formB = !this.formB;
        this.transformed = true;
        if (this.stamina >= 12) {
          this.stamina -= 12;
          this.startSwing(PLAYER.transformBonus);
        }
      } else {
        this.updateAttack(dt, input);
      }
    } else if (input.consume('transform', 0.3)) {
      this.formB = !this.formB;
      this.transformed = true;
      this.transformLockT = PLAYER.transformLock;
    } else if (input.consume('swap', 0.3)) {
      this.swapWeaponSet();
    } else if (this.stamina >= this.form.cost && input.consume('attack', PLAYER.inputBuffer)) {
      this.startSwing();
    }

    // movement (attacks root the player except a slight windup drift)
    this.moving = false;
    if (!this.attack) {
      const d = norm(move.x, move.y);
      if (d.x || d.y) {
        this.facing = d;
        this.moving = true;
        const before = Math.floor(this.walkPhase / Math.PI);
        this.walkPhase += dt * 11;
        if (Math.floor(this.walkPhase / Math.PI) !== before) this.stepped = true;
      }
      moveGrounded(this, lvl, d.x * PLAYER.speed * this.stats.speedMult * dt, d.y * PLAYER.speed * this.stats.speedMult * dt);
    }
  }

  private startSwing(bonus = 1) {
    const swing = this.attack ? 1 - this.attack.swing : 0;
    const cfg = this.form;
    if (cfg.style === 'longpick' || cfg.style === 'greatsword') this.heavySwung = true;
    this.attack = { phase: 'windup', t: 0, dir: this.aim, swing, hit: new Set(), cfg, bonus };
    if (bonus === 1) this.stamina = Math.max(0, this.stamina - cfg.cost);
    this.staminaCd = PLAYER.staminaDelay;
    this.comboQueued = false;
  }

  private updateAttack(dt: number, input: Input) {
    const a = this.attack!;
    const c = a.cfg;
    a.t += dt;
    if (a.phase === 'recover' && input.consume('attack', PLAYER.inputBuffer)) this.comboQueued = true;
    if (a.phase === 'windup' && a.t >= c.windup) { a.phase = 'active'; a.t = 0; a.dir = this.aim; }
    else if (a.phase === 'active' && a.t >= c.active) { a.phase = 'recover'; a.t = 0; }
    else if (a.phase === 'recover' && a.t >= c.recover) {
      this.attack = null;
      if (this.comboQueued && this.stamina >= this.form.cost) this.startSwing();
    }
  }

  private startClimb(ladder: Ladder, up: boolean) {
    this.climbing = ladder;
    this.climbUp = up;
    this.pos.x = (ladder.tx + 0.5) * 16;
    this.attack = null;
    this.dashT = 0;
  }

  private updateClimb(dt: number) {
    const l = this.climbing!;
    const speed = 55; // both hands busy — deliberately slow and tense
    const targetZ = this.climbUp ? l.highZ : l.lowZ;
    const targetY = (this.climbUp ? l.topTy + 0.5 : l.ty + 0.5) * 16;
    const dz = Math.sign(targetZ - this.pos.z);
    this.pos.z += dz * speed * dt;
    this.pos.y += Math.sign(targetY - this.pos.y) * Math.min(Math.abs(targetY - this.pos.y), 30 * dt);
    if ((dz > 0 && this.pos.z >= targetZ) || (dz < 0 && this.pos.z <= targetZ)) {
      this.pos.z = targetZ;
      this.pos.y = targetY;
      this.climbing = null;
    }
  }

  // returns actual damage taken (0 if i-framed)
  takeDamage(dmg: number): number {
    if (this.invulnerable || this.hurtT > 0 || this.dead) return 0;
    this.hp -= dmg;
    this.rally += dmg;
    this.rallyT = PLAYER.rallyWindow;
    this.hurtT = 0.25;
    this.flashT = 2 / 60;
    if (this.hp <= 0) { this.hp = 0; this.dead = true; }
    return dmg;
  }

  // rally conversion when dealing damage; returns amount healed
  rallyBack(dmgDealt: number, max = false): number {
    if (this.rally <= 0 || this.dead) return 0;
    const heal = max ? this.rally : Math.min(this.rally, dmgDealt * this.stats.rallyRate);
    this.rally -= heal;
    this.hp = Math.min(this.stats.maxHp, this.hp + heal);
    return heal;
  }

  respawn(lvl: Level) {
    this.pos = { x: lvl.playerSpawn.x, y: lvl.playerSpawn.y, z: lvl.groundZAt(lvl.playerSpawn.x, lvl.playerSpawn.y) };
    this.vel = { x: 0, y: 0, z: 0 };
    this.hp = this.stats.maxHp;
    this.rally = 0;
    this.stamina = PLAYER.stamina;
    this.phials = PLAYER.phials;
    this.shards = PLAYER.shardPouch;
    this.drinkT = 0;
    this.dead = false;
    this.attack = null;
    this.dashT = 0;
    this.climbing = null;
    this.airborne = false;
  }
}
