// THE CHAINED BRUTE — first mid-boss. Dormant until approached. Three attacks:
//   slam  — long parryable wind-up, ground AoE circle (red telegraph fills)
//   sweep — fast 260° chain arc; NOT parryable, dash through it
//   charge — from range; locked direction; long punish window if he hits a wall
// Gun-parrying the slam wind-up staggers him → visceral window.

import { BRUTE, STEP_UP } from './constants';
import { type Entity, moveGrounded, sameTier } from './entity';
import type { Level } from './level';
import type { Player } from './player';
import { angleTo, norm } from '../engine/math';

export type BruteState =
  | 'dormant' | 'chase'
  | 'slam-windup' | 'slam-recover'
  | 'sweep-windup' | 'sweep' | 'sweep-recover'
  | 'charge-windup' | 'charge' | 'charge-recover'
  | 'stagger' | 'dead';

export class Brute implements Entity {
  pos = { x: 0, y: 0, z: 0 };
  vel = { x: 0, y: 0, z: 0 };
  radius = BRUTE.radius;
  airborne = false;
  freezeT = 0;
  flashT = 0;

  readonly isBoss = true;
  hp = BRUTE.hp;
  maxHp = BRUTE.hp;
  state: BruteState = 'dormant';
  stateT = 0;
  attackDir = 0;
  attackHit = false;
  chargeHitWall = false;
  defeated = false;
  active = false; // fight started (drives boss bar + music)
  spawn = { x: 0, y: 0 };

  constructor(x: number, y: number, lvl: Level) {
    this.pos = { x, y, z: lvl.groundZAt(x, y) };
    this.spawn = { x, y };
  }

  get alive() { return this.state !== 'dead'; }

  // only the slam wind-up can be gun-parried
  get parryable(): boolean {
    return this.state === 'slam-windup' && this.stateT > BRUTE.slam.windup * 0.35;
  }

  get telegraphFlash(): boolean {
    return this.state === 'slam-windup' && BRUTE.slam.windup - this.stateT < 0.12;
  }

  reset(lvl: Level) {
    if (this.defeated) return;
    this.pos = { x: this.spawn.x, y: this.spawn.y, z: lvl.groundZAt(this.spawn.x, this.spawn.y) };
    this.hp = this.maxHp;
    this.state = 'dormant';
    this.stateT = 0;
    this.active = false;
  }

  update(dt: number, lvl: Level, player: Player, events: string[]) {
    if (this.freezeT > 0) { this.freezeT -= dt; return; }
    this.flashT = Math.max(0, this.flashT - dt);
    if (this.state === 'dead') return;
    this.stateT += dt;

    const dx = player.pos.x - this.pos.x;
    const dy = player.pos.y - this.pos.y;
    const d = Math.hypot(dx, dy);

    switch (this.state) {
      case 'dormant':
        if (!player.dead && sameTier(this, player) && d < BRUTE.triggerRange) {
          this.active = true;
          events.push('boss_start');
          this.setState('chase');
        }
        break;

      case 'chase': {
        if (player.dead) break;
        if (this.stateT > 0.35) {
          if (d > 95 && Math.random() < 0.6) { this.beginCharge(player); break; }
          if (d <= 42) {
            this.setState(Math.random() < 0.5 ? 'slam-windup' : 'sweep-windup');
            break;
          }
        }
        const dir = norm(dx, dy);
        moveGrounded(this, lvl, dir.x * BRUTE.speed * dt, dir.y * BRUTE.speed * dt);
        break;
      }

      case 'slam-windup':
        if (this.stateT >= BRUTE.slam.windup) {
          this.attackDir = angleTo(this.pos, player.pos);
          this.attackHit = false;
          this.setState('slam-recover');
          events.push('slam'); // game resolves the AoE on this event
        }
        break;
      case 'slam-recover':
        if (this.stateT >= BRUTE.slam.recover) this.setState('chase');
        break;

      case 'sweep-windup':
        if (this.stateT >= BRUTE.sweep.windup) {
          this.attackDir = angleTo(this.pos, player.pos);
          this.attackHit = false;
          this.setState('sweep');
        }
        break;
      case 'sweep':
        if (this.stateT >= BRUTE.sweep.active) this.setState('sweep-recover');
        break;
      case 'sweep-recover':
        if (this.stateT >= BRUTE.sweep.recover) this.setState('chase');
        break;

      case 'charge-windup':
        if (this.stateT >= BRUTE.charge.windup) {
          this.attackHit = false;
          this.chargeHitWall = false;
          this.setState('charge');
        }
        break;
      case 'charge': {
        const step = BRUTE.charge.speed * dt;
        const nx = this.pos.x + Math.cos(this.attackDir) * step;
        const ny = this.pos.y + Math.sin(this.attackDir) * step;
        const gz = lvl.groundZAt(nx + Math.cos(this.attackDir) * this.radius, ny + Math.sin(this.attackDir) * this.radius);
        if (gz > this.pos.z + STEP_UP) {
          this.chargeHitWall = true; // face-first into stone — long punish window
          events.push('slam');
          this.setState('charge-recover');
          break;
        }
        moveGrounded(this, lvl, Math.cos(this.attackDir) * step, Math.sin(this.attackDir) * step);
        if (this.stateT >= BRUTE.charge.maxTime) this.setState('charge-recover');
        break;
      }
      case 'charge-recover':
        if (this.stateT >= (this.chargeHitWall ? BRUTE.charge.wallRecover : BRUTE.charge.recover)) this.setState('chase');
        break;

      case 'stagger':
        if (this.stateT >= BRUTE.staggerTime) this.setState('chase');
        break;
    }
  }

  private beginCharge(player: Player) {
    this.attackDir = angleTo(this.pos, player.pos);
    this.setState('charge-windup');
  }

  setState(s: BruteState) {
    this.state = s;
    this.stateT = 0;
  }

  takeDamage(dmg: number, _fromDir: number, _knockForce = 0) {
    if (this.state === 'dead') return;
    this.hp -= dmg;
    this.flashT = 2 / 60;
    // a boss doesn't flinch from chip damage
    if (this.hp <= 0) {
      this.state = 'dead';
      this.defeated = true;
    }
  }
}
