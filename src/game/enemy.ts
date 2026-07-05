// Enemy kinds:
//   rabble / husk — melee (rabble = parry dummy; husk = slower, tougher miner)
//   hound         — fast flanker; crouch (parryable) then a committed lunge
//   watchman / chorister — cross-tier snipers; aim line tracks then LOCKS 0.3s
//                   before firing (move during the lock to dodge)
//   priest        — keeps its distance and pulses heals into nearby mobs;
//                   the priority-target lesson
// Melee kinds can patrol waypoint routes (the hunt-mob set-piece).

import { RABBLE, HOUND, WATCHMAN, HUSK, PRIEST } from './constants';
import { type Entity, moveGrounded, applyGravity, sameTier } from './entity';
import type { Level, EnemyKindName } from './level';
import type { Player } from './player';
import { angleTo, norm } from '../engine/math';

export type EnemyState =
  | 'idle' | 'chase' | 'windup' | 'attack' | 'recover'
  | 'stumble' | 'stagger' | 'dead';

export interface MeleeStats { hp: number; speed: number; windup: number; dmg: number }

const MELEE: Record<string, MeleeStats> = {
  rabble: { hp: RABBLE.hp, speed: RABBLE.speed, windup: RABBLE.windup, dmg: RABBLE.dmg },
  husk: { hp: HUSK.hp, speed: HUSK.speed, windup: HUSK.windup, dmg: HUSK.dmg },
};

export class Enemy implements Entity {
  pos = { x: 0, y: 0, z: 0 };
  vel = { x: 0, y: 0, z: 0 };
  radius = RABBLE.radius;
  airborne = false;
  freezeT = 0;
  flashT = 0;

  kind: EnemyKindName;
  hp: number;
  maxHp: number;
  state: EnemyState = 'idle';
  stateT = 0;
  attackDir = 0;
  attackHit = false;
  home = { x: 0, y: 0 };
  knock = { x: 0, y: 0 };
  waypoints: { x: number; y: number }[] | null = null;
  wpIdx = 0;
  // sniper aim
  lockX = 0;
  lockY = 0;
  lockZ = 0;
  aimLocked = false;
  pendingShot = false;
  // priest
  healT = PRIEST.healInterval;
  pendingHeal = false;
  healFlashT = 0;

  constructor(x: number, y: number, lvl: Level, kind: EnemyKindName = 'rabble', waypoints?: { x: number; y: number }[]) {
    this.pos = { x, y, z: lvl.groundZAt(x, y) };
    this.home = { x, y };
    this.kind = kind;
    this.waypoints = waypoints ?? null;
    this.hp = this.maxHp =
      kind === 'hound' ? HOUND.hp :
      kind === 'watchman' || kind === 'chorister' ? WATCHMAN.hp :
      kind === 'priest' ? PRIEST.hp :
      MELEE[kind].hp;
  }

  get isMelee() { return this.kind === 'rabble' || this.kind === 'husk'; }
  get isSniper() { return this.kind === 'watchman' || this.kind === 'chorister'; }

  get meleeStats(): MeleeStats {
    return MELEE[this.kind] ?? MELEE.rabble;
  }

  get parryable(): boolean {
    if (this.state !== 'windup') return false;
    if (this.isMelee) return this.stateT > this.meleeStats.windup * 0.3;
    if (this.kind === 'hound') return this.stateT > HOUND.windup * 0.25;
    return false;
  }

  get alive() { return this.state !== 'dead'; }

  update(dt: number, lvl: Level, player: Player) {
    if (this.freezeT > 0) { this.freezeT -= dt; return; }
    this.flashT = Math.max(0, this.flashT - dt);
    this.healFlashT = Math.max(0, this.healFlashT - dt);
    if (this.state === 'dead') return;

    applyGravity(this, lvl, dt);
    this.stateT += dt;

    if (Math.abs(this.knock.x) > 1 || Math.abs(this.knock.y) > 1) {
      moveGrounded(this, lvl, this.knock.x * dt, this.knock.y * dt);
      this.knock.x *= 0.82;
      this.knock.y *= 0.82;
    }

    if (this.isSniper) this.updateSniper(player);
    else if (this.kind === 'hound') this.updateHound(dt, lvl, player);
    else if (this.kind === 'priest') this.updatePriest(dt, lvl, player);
    else this.updateMelee(dt, lvl, player);
  }

  private patrol(dt: number, lvl: Level, speed: number) {
    if (!this.waypoints || this.waypoints.length === 0) return;
    const wp = this.waypoints[this.wpIdx];
    const dx = wp.x - this.pos.x, dy = wp.y - this.pos.y;
    if (Math.hypot(dx, dy) < 8) {
      this.wpIdx = (this.wpIdx + 1) % this.waypoints.length;
      return;
    }
    const dir = norm(dx, dy);
    moveGrounded(this, lvl, dir.x * speed * dt, dir.y * speed * dt);
  }

  private updateMelee(dt: number, lvl: Level, player: Player) {
    const s = this.meleeStats;
    const dx = player.pos.x - this.pos.x;
    const dy = player.pos.y - this.pos.y;
    const d = Math.hypot(dx, dy);
    const canSee = sameTier(this, player) && d < RABBLE.aggroRange && !player.dead;

    switch (this.state) {
      case 'idle':
        if (canSee) { this.setState('chase'); break; }
        this.patrol(dt, lvl, s.speed * 0.55);
        break;
      case 'chase': {
        if (!canSee && d > RABBLE.aggroRange * 1.4) { this.setState('idle'); break; }
        if (d <= RABBLE.attackRange && sameTier(this, player)) { this.setState('windup'); break; }
        const dir = norm(dx, dy);
        moveGrounded(this, lvl, dir.x * s.speed * dt, dir.y * s.speed * dt);
        break;
      }
      case 'windup':
        if (this.stateT >= s.windup) {
          this.attackDir = angleTo(this.pos, player.pos);
          this.attackHit = false;
          this.setState('attack');
        }
        break;
      case 'attack':
        if (this.stateT >= RABBLE.active) this.setState('recover');
        break;
      case 'recover':
        if (this.stateT >= RABBLE.recover) this.setState('chase');
        break;
      case 'stumble':
        if (this.stateT >= RABBLE.stumbleTime) this.setState('chase');
        break;
      case 'stagger':
        if (this.stateT >= RABBLE.staggerTime) this.setState('chase');
        break;
    }
  }

  private updateHound(dt: number, lvl: Level, player: Player) {
    const dx = player.pos.x - this.pos.x;
    const dy = player.pos.y - this.pos.y;
    const d = Math.hypot(dx, dy);
    const canSee = sameTier(this, player) && d < HOUND.aggroRange && !player.dead;

    switch (this.state) {
      case 'idle':
        if (canSee) this.setState('chase');
        break;
      case 'chase': {
        if (!canSee && d > HOUND.aggroRange * 1.4) { this.setState('idle'); break; }
        if (d <= HOUND.lungeRange && sameTier(this, player)) { this.setState('windup'); break; }
        const dir = norm(dx, dy);
        moveGrounded(this, lvl, dir.x * HOUND.speed * dt, dir.y * HOUND.speed * dt);
        break;
      }
      case 'windup':
        if (this.stateT >= HOUND.windup) {
          this.attackDir = angleTo(this.pos, player.pos);
          this.attackHit = false;
          this.setState('attack');
        }
        break;
      case 'attack':
        moveGrounded(this, lvl, Math.cos(this.attackDir) * HOUND.lungeSpeed * dt, Math.sin(this.attackDir) * HOUND.lungeSpeed * dt);
        if (this.stateT >= HOUND.lungeTime) this.setState('recover');
        break;
      case 'recover':
        if (this.stateT >= HOUND.recover) this.setState('chase');
        break;
      case 'stumble':
        if (this.stateT >= RABBLE.stumbleTime) this.setState('chase');
        break;
      case 'stagger':
        if (this.stateT >= RABBLE.staggerTime) this.setState('chase');
        break;
    }
  }

  private updateSniper(player: Player) {
    const d = Math.hypot(player.pos.x - this.pos.x, player.pos.y - this.pos.y);
    const canSee = d < WATCHMAN.aggroRange && !player.dead; // any tier — that's the point

    switch (this.state) {
      case 'idle':
        if (canSee) this.setState('windup');
        break;
      case 'windup': {
        if (!canSee) { this.setState('idle'); break; }
        if (this.stateT < WATCHMAN.lockAt) {
          this.lockX = player.pos.x;
          this.lockY = player.pos.y;
          this.lockZ = player.pos.z;
          this.aimLocked = false;
        } else {
          this.aimLocked = true; // the dodge cue
        }
        if (this.stateT >= WATCHMAN.windup) {
          this.pendingShot = true;
          this.setState('recover');
        }
        break;
      }
      case 'recover':
        if (this.stateT >= WATCHMAN.recover) this.setState('idle');
        break;
      case 'stumble':
        if (this.stateT >= RABBLE.stumbleTime) this.setState('idle');
        break;
      case 'stagger':
        if (this.stateT >= RABBLE.staggerTime) this.setState('idle');
        break;
      default:
        this.setState('idle');
    }
  }

  private updatePriest(dt: number, lvl: Level, player: Player) {
    const dx = player.pos.x - this.pos.x;
    const dy = player.pos.y - this.pos.y;
    const d = Math.hypot(dx, dy);

    // heals fire regardless of what the priest is doing (except stagger states)
    if (this.state !== 'stumble' && this.state !== 'stagger') {
      this.healT -= dt;
      if (this.healT <= 0) {
        this.healT = PRIEST.healInterval;
        this.pendingHeal = true;
        this.healFlashT = 0.4;
      }
    }

    switch (this.state) {
      case 'idle':
      case 'chase': {
        if (!player.dead && sameTier(this, player) && d < PRIEST.fleeRange) {
          // scuttle away, censer swinging
          const dir = norm(-dx, -dy);
          moveGrounded(this, lvl, dir.x * PRIEST.speed * dt, dir.y * PRIEST.speed * dt);
        } else {
          this.patrol(dt, lvl, PRIEST.speed * 0.5);
        }
        break;
      }
      case 'stumble':
        if (this.stateT >= RABBLE.stumbleTime) this.setState('idle');
        break;
      case 'stagger':
        if (this.stateT >= RABBLE.staggerTime) this.setState('idle');
        break;
      default:
        this.setState('idle');
    }
  }

  setState(s: EnemyState) {
    this.state = s;
    this.stateT = 0;
    if (s !== 'windup') this.aimLocked = false;
  }

  // white flash just before a melee swing lands — the parry cue
  get telegraphFlash(): boolean {
    if (this.state !== 'windup') return false;
    if (this.isMelee) return this.meleeStats.windup - this.stateT < RABBLE.parryFlash;
    if (this.kind === 'hound') return HOUND.windup - this.stateT < RABBLE.parryFlash;
    return false;
  }

  takeDamage(dmg: number, fromDir: number, knockForce = 90) {
    if (this.state === 'dead') return;
    this.hp -= dmg;
    this.flashT = 2 / 60;
    this.knock.x += Math.cos(fromDir) * knockForce;
    this.knock.y += Math.sin(fromDir) * knockForce;
    if (this.hp <= 0) {
      this.setState('dead');
    } else if (this.state !== 'stagger' && this.state !== 'windup' && this.state !== 'attack') {
      this.setState('stumble');
    }
  }
}
